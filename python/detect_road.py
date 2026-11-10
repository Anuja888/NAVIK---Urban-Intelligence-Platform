"""
NAVIK — YOLO Road Detection Pipeline
SIH PS #26124 · BEL Urban Intelligence Platform

Usage:
    python detect_road.py <video_path> [--output detections] [--conf 0.5] [--every-n 5]

What it detects:
    - Vehicles (car, bus, truck, motorcycle) → vehicle density / congestion
    - Pedestrians / school children → pedestrian hazard
    - Road defects (potholes, waterlogging) → requires fine-tuned model
    - License plates → ANPR (hit-and-run evidence)

Output:
    detections/detections.json  — all events with bbox, confidence, timestamp
    detections/frames/          — cropped evidence images
    detections/annotated/       — full frames with drawn boxes (optional)
"""

import cv2
import json
import time
import argparse
import base64
from pathlib import Path
from datetime import datetime, timezone

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics not installed. Run: pip install ultralytics")
    exit(1)

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("WARNING: easyocr not installed. ANPR disabled. Run: pip install easyocr")

# ── YOLO class → NAVIK category mapping ───────────────────────────
# Standard COCO classes (yolov8n.pt built-in)
COCO_TO_NAVIK = {
    0:  {"navik": "pedestrian",   "severity": "high"},
    1:  {"navik": "bicycle",      "severity": "low"},
    2:  {"navik": "vehicle_car",  "severity": "low"},
    3:  {"navik": "vehicle_two_wheeler", "severity": "low"},
    5:  {"navik": "vehicle_bus",  "severity": "low"},
    7:  {"navik": "vehicle_truck","severity": "low"},
    # NOTE: Potholes / waterlogging / signboards require fine-tuned model
    # Custom class IDs after fine-tuning on IDD/RDD2022:
    80: {"navik": "pothole",           "severity": "high"},
    81: {"navik": "waterlogging",      "severity": "high"},
    82: {"navik": "missing_signboard", "severity": "medium"},
    83: {"navik": "damaged_road",      "severity": "high"},
    84: {"navik": "missing_divider",   "severity": "high"},
    85: {"navik": "missing_zebra",     "severity": "medium"},
}

# Indian plate regex
import re
PLATE_PATTERN = re.compile(r'[A-Z]{2}\s*\d{2}\s*[A-Z]{1,3}\s*\d{4}', re.IGNORECASE)

def frame_to_base64(frame):
    """Encode OpenCV frame to base64 JPEG"""
    _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf).decode('utf-8')

def try_anpr(frame, bbox, reader):
    """Try to read license plate from cropped region"""
    if not EASYOCR_AVAILABLE or reader is None:
        return None
    x1, y1, x2, y2 = [int(v) for v in bbox]
    # Expand crop slightly to capture full plate
    h, w = frame.shape[:2]
    x1 = max(0, x1 - 10); y1 = max(0, y1 - 10)
    x2 = min(w, x2 + 10); y2 = min(h, y2 + 10)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return None
    try:
        results = reader.readtext(crop, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ')
        for (_, text, conf) in results:
            clean = text.upper().replace(' ', '')
            if PLATE_PATTERN.match(clean) and conf > 0.5:
                return {"plate": text.upper().strip(), "confidence": round(conf * 100, 1)}
    except Exception:
        pass
    return None

def calculate_severity(cls_id, confidence, vehicle_count_in_frame):
    """Calculate severity based on class and context"""
    base = COCO_TO_NAVIK.get(cls_id, {}).get("severity", "low")
    if cls_id == 0 and vehicle_count_in_frame > 10:  # pedestrian in heavy traffic
        return "critical"
    if confidence > 0.9:
        return base
    if confidence > 0.75:
        return base
    return "low"

def process_video(
    video_path: str,
    output_dir: str = "output",
    conf_threshold: float = 0.5,
    every_n_frames: int = 5,
    save_frames: bool = True,
    send_to_api: bool = False,
    api_url: str = "http://localhost:8000/api/events",
    gps_lat: float = 17.4065,
    gps_lng: float = 78.4772,
    bus_id: str = "BUS-001",
):
    Path(output_dir).mkdir(exist_ok=True)
    Path(f"{output_dir}/frames").mkdir(exist_ok=True)
    if save_frames:
        Path(f"{output_dir}/annotated").mkdir(exist_ok=True)

    print(f"Loading YOLOv8 model...")
    model = YOLO('yolov8n.pt')  # Downloads automatically on first run (~6MB)

    anpr_reader = None
    if EASYOCR_AVAILABLE:
        print("Loading EasyOCR for ANPR...")
        anpr_reader = easyocr.Reader(['en'], verbose=False)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: Cannot open video: {video_path}")
        return []

    fps        = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps

    print(f"\nVideo: {video_path}")
    print(f"  FPS: {fps:.1f}  Frames: {total_frames}  Duration: {duration_sec:.1f}s")
    print(f"  Processing every {every_n_frames} frames (~{fps/every_n_frames:.1f} detections/sec)")
    print(f"  Confidence threshold: {conf_threshold}")
    print()

    all_detections = []
    frame_count = 0
    det_count   = 0
    start_time  = time.time()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % every_n_frames == 0:
            ts_sec = frame_count / fps
            results = model(frame, conf=conf_threshold, verbose=False)

            vehicle_count = 0
            frame_dets = []

            for r in results:
                for box in r.boxes:
                    cls_id  = int(box.cls[0])
                    conf    = float(box.conf[0])
                    bbox    = box.xyxy[0].tolist()
                    label   = model.names.get(cls_id, str(cls_id))
                    navik   = COCO_TO_NAVIK.get(cls_id, {})

                    # Count vehicles for congestion
                    if navik.get("navik", "").startswith("vehicle"):
                        vehicle_count += 1

                    frame_dets.append({
                        "cls_id": cls_id,
                        "label": label,
                        "navik_category": navik.get("navik", label),
                        "confidence": round(conf, 3),
                        "bbox": [round(x, 1) for x in bbox],
                    })

            # Build NAVIK event per detection
            for det in frame_dets:
                severity = calculate_severity(det["cls_id"], det["confidence"], vehicle_count)

                # Try ANPR for vehicles (potential hit-and-run)
                plate_info = None
                if det["navik_category"] in ("vehicle_car", "vehicle_truck", "vehicle_two_wheeler"):
                    plate_info = try_anpr(frame, det["bbox"], anpr_reader)

                # Save evidence crop
                frame_path = None
                if save_frames:
                    x1,y1,x2,y2 = [int(v) for v in det["bbox"]]
                    crop = frame[max(0,y1):y2, max(0,x1):x2]
                    if crop.size > 0:
                        frame_path = f"{output_dir}/frames/f{frame_count:06d}_{det['navik_category']}.jpg"
                        cv2.imwrite(frame_path, crop)

                event = {
                    "id": f"YOLO-{frame_count:06d}-{det['cls_id']}",
                    "frame": frame_count,
                    "timestamp_sec": round(ts_sec, 2),
                    "timestamp_iso": datetime.fromtimestamp(ts_sec, tz=timezone.utc).isoformat(),
                    "navik_category": det["navik_category"],
                    "yolo_class": det["label"],
                    "severity": severity,
                    "confidence": det["confidence"],
                    "bbox": det["bbox"],
                    "vehicle_density": vehicle_count,
                    "gps": {"lat": gps_lat, "lng": gps_lng},
                    "bus_id": bus_id,
                    "frame_path": frame_path,
                    "plate": plate_info,
                }

                all_detections.append(event)
                det_count += 1

                # Optional: send to FastAPI backend in real time
                if send_to_api:
                    try:
                        import requests
                        requests.post(api_url, json=event, timeout=2)
                    except Exception:
                        pass

            # Annotate frame
            if save_frames and len(frame_dets) > 0:
                ann_frame = results[0].plot() if results else frame
                cv2.imwrite(f"{output_dir}/annotated/f{frame_count:06d}.jpg", ann_frame)

            # Progress
            if frame_count % (every_n_frames * 20) == 0:
                elapsed = time.time() - start_time
                pct = (frame_count / max(total_frames, 1)) * 100
                print(f"  {pct:5.1f}% — frame {frame_count}/{total_frames} — {det_count} detections — {elapsed:.0f}s elapsed")

        frame_count += 1

    cap.release()
    elapsed = time.time() - start_time

    # Save JSON
    output_file = f"{output_dir}/detections.json"
    with open(output_file, 'w') as f:
        json.dump({
            "source": video_path,
            "bus_id": bus_id,
            "fps": fps,
            "total_frames": total_frames,
            "duration_sec": duration_sec,
            "processed_at": datetime.now().isoformat(),
            "total_detections": len(all_detections),
            "conf_threshold": conf_threshold,
            "detections": all_detections,
        }, f, indent=2)

    # Summary
    print(f"\n{'='*50}")
    print(f"DETECTION COMPLETE")
    print(f"{'='*50}")
    print(f"Video duration : {duration_sec:.1f}s")
    print(f"Frames processed: {frame_count // every_n_frames}")
    print(f"Total detections: {len(all_detections)}")
    print(f"Processing time : {elapsed:.1f}s")
    print(f"Output JSON     : {output_file}")

    # Category summary
    from collections import Counter
    cats = Counter(d["navik_category"] for d in all_detections)
    print(f"\nDetection breakdown:")
    for cat, count in cats.most_common():
        print(f"  {cat:30s}: {count}")

    # ANPR summary
    plates = [d["plate"] for d in all_detections if d.get("plate")]
    if plates:
        print(f"\nPlates detected: {len(plates)}")
        for p in plates[:5]:
            print(f"  {p['plate']} ({p['confidence']}%)")

    return all_detections


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NAVIK Road Detection Pipeline")
    parser.add_argument("video",         help="Path to road video file")
    parser.add_argument("--output",      default="output",   help="Output directory")
    parser.add_argument("--conf",        default=0.5, type=float, help="Confidence threshold")
    parser.add_argument("--every-n",     default=5,  type=int,   help="Process every N frames")
    parser.add_argument("--no-frames",   action="store_true",    help="Don't save frame crops")
    parser.add_argument("--send-to-api", action="store_true",    help="POST events to FastAPI server")
    parser.add_argument("--api-url",     default="http://localhost:8000/api/events")
    parser.add_argument("--bus-id",      default="BUS-001")
    parser.add_argument("--lat",         default=17.4065, type=float)
    parser.add_argument("--lng",         default=78.4772, type=float)
    args = parser.parse_args()

    process_video(
        video_path  = args.video,
        output_dir  = args.output,
        conf_threshold  = args.conf,
        every_n_frames  = args.every_n,
        save_frames     = not args.no_frames,
        send_to_api     = args.send_to_api,
        api_url         = args.api_url,
        bus_id          = args.bus_id,
        gps_lat         = args.lat,
        gps_lng         = args.lng,
    )
