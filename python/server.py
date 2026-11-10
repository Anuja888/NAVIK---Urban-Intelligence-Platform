"""
NAVIK — FastAPI Backend Server
SIH PS #26124 · BEL Urban Intelligence Platform

This server bridges the Python YOLO pipeline and the React dashboard.

Endpoints:
    POST /api/events       — receive detection events from bus edge agents
    GET  /api/events       — serve events to React dashboard
    POST /api/buses        — receive bus GPS positions
    GET  /api/buses        — serve bus positions to React dashboard
    GET  /api/health       — health check
    WS   /ws               — WebSocket for real-time push to dashboard

Run:
    pip install fastapi uvicorn python-multipart
    python server.py
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import asyncio
import json
import uuid

app = FastAPI(title="NAVIK Backend", version="1.0.0")

# Allow requests from React dev server and Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://navik-urban-intelligence-platform.vercel.app",
        "*",  # For development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory database (replace with PostgreSQL for production) ────
db: Dict[str, List] = {
    "incidents": [],
    "buses": [],
    "defects": [],
}

# ── WebSocket connection manager ───────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)
        print(f"WebSocket connected. Total: {len(self.connections)}")

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)
        print(f"WebSocket disconnected. Total: {len(self.connections)}")

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.connections.remove(ws)

manager = ConnectionManager()

# ── Models ─────────────────────────────────────────────────────────
class DetectionEvent(BaseModel):
    id: Optional[str] = None
    navik_category: str
    severity: str
    confidence: float
    bbox: List[float]
    gps: Dict[str, float]
    bus_id: str
    timestamp_iso: Optional[str] = None
    yolo_class: Optional[str] = None
    vehicle_density: Optional[int] = None
    plate: Optional[Dict[str, Any]] = None
    frame_path: Optional[str] = None

class BusPosition(BaseModel):
    id: str
    lat: float
    lng: float
    speed: float
    heading: float
    route_number: Optional[str] = None
    driver_name: Optional[str] = None
    timestamp: Optional[str] = None

# ── Routes ─────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "incidents": len(db["incidents"]),
        "buses": len(db["buses"]),
        "ws_connections": len(manager.connections),
        "timestamp": datetime.now().isoformat(),
    }

@app.post("/api/events")
async def receive_event(event: DetectionEvent):
    """
    Called by bus edge agent (detect_road.py) when a detection is made.
    Stores the event and pushes to all connected dashboard clients via WebSocket.
    """
    evt = event.dict()
    if not evt.get("id"):
        evt["id"] = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    if not evt.get("timestamp_iso"):
        evt["timestamp_iso"] = datetime.now().isoformat()

    # Map to NAVIK incident format
    incident = {
        "id": evt["id"],
        "type": _category_to_incident_type(evt["navik_category"]),
        "status": "new",
        "severity": evt["severity"],
        "position": {"lat": evt["gps"]["lat"], "lng": evt["gps"]["lng"]},
        "detectedBy": evt["bus_id"],
        "timestamp": evt["timestamp_iso"],
        "description": f"YOLO detected {evt['navik_category']} with {evt['confidence']*100:.0f}% confidence.",
        "locationLabel": f"GPS {evt['gps']['lat']:.4f}, {evt['gps']['lng']:.4f}",
        "confidence": evt["confidence"],
        "yolo_raw": evt,
        # ANPR data
        "plateNumber": evt["plate"]["plate"] if evt.get("plate") else None,
        "plateConfidence": evt["plate"]["confidence"] if evt.get("plate") else None,
        # Congestion data
        "congestionScore": min(100, (evt.get("vehicle_density", 0) or 0) * 2),
    }

    db["incidents"].insert(0, incident)
    # Keep last 500 incidents in memory
    db["incidents"] = db["incidents"][:500]

    # Push to dashboard in real time
    await manager.broadcast({
        "type": "new_incident",
        "data": incident,
    })

    return {"status": "ok", "id": evt["id"]}

@app.get("/api/events")
async def get_events(limit: int = 100, type: Optional[str] = None):
    """Serve stored events to React dashboard"""
    events = db["incidents"][:limit]
    if type:
        events = [e for e in events if e.get("type") == type]
    return events

@app.post("/api/buses")
async def update_bus(bus: BusPosition):
    """Receive bus GPS position from edge agent"""
    pos = bus.dict()
    if not pos.get("timestamp"):
        pos["timestamp"] = datetime.now().isoformat()

    # Update or insert
    existing = next((b for b in db["buses"] if b["id"] == bus.id), None)
    if existing:
        existing.update(pos)
    else:
        db["buses"].append(pos)

    # Push to dashboard
    await manager.broadcast({"type": "bus_update", "data": pos})
    return {"status": "ok"}

@app.get("/api/buses")
async def get_buses():
    return db["buses"]

@app.post("/api/bulk-import")
async def bulk_import(file: UploadFile = File(...)):
    """
    Import detections.json produced by detect_road.py
    Usage: curl -X POST http://localhost:8000/api/bulk-import -F "file=@output/detections.json"
    """
    content = await file.read()
    data = json.loads(content)

    detections = data.get("detections", [])
    imported = 0

    for det in detections:
        incident = {
            "id": det.get("id", f"IMP-{uuid.uuid4().hex[:8].upper()}"),
            "type": _category_to_incident_type(det.get("navik_category", "unknown")),
            "status": "new",
            "severity": det.get("severity", "medium"),
            "position": {"lat": det["gps"]["lat"], "lng": det["gps"]["lng"]},
            "detectedBy": det.get("bus_id", "YOLO-IMPORT"),
            "timestamp": det.get("timestamp_iso", datetime.now().isoformat()),
            "description": f"YOLO detected {det.get('navik_category')} ({det.get('confidence', 0)*100:.0f}% confidence) at frame {det.get('frame', 0)}.",
            "locationLabel": f"GPS {det['gps']['lat']:.4f}, {det['gps']['lng']:.4f}",
            "confidence": det.get("confidence"),
            "plateNumber": det["plate"]["plate"] if det.get("plate") else None,
            "plateConfidence": det["plate"]["confidence"] if det.get("plate") else None,
            "congestionScore": min(100, (det.get("vehicle_density", 0) or 0) * 2),
        }
        db["incidents"].insert(0, incident)
        imported += 1

    return {"status": "ok", "imported": imported, "total": len(db["incidents"])}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send current state on connect
        await websocket.send_json({
            "type": "init",
            "incidents": db["incidents"][:50],
            "buses": db["buses"],
        })
        # Keep connection alive
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ── Helpers ────────────────────────────────────────────────────────

def _category_to_incident_type(category: str) -> str:
    mapping = {
        "pothole":              "road_defect",
        "waterlogging":         "waterlogging_critical",
        "missing_signboard":    "road_defect",
        "damaged_road":         "road_defect",
        "missing_divider":      "road_defect",
        "missing_zebra":        "road_defect",
        "pedestrian":           "pedestrian_hazard",
        "vehicle_car":          "congestion_alert",
        "vehicle_bus":          "congestion_alert",
        "vehicle_truck":        "congestion_alert",
        "vehicle_two_wheeler":  "congestion_alert",
    }
    return mapping.get(category, "road_defect")

# ── Entry point ────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 50)
    print("NAVIK Backend Server")
    print("=" * 50)
    print("Endpoints:")
    print("  POST /api/events      — receive YOLO detections")
    print("  GET  /api/events      — serve to React dashboard")
    print("  POST /api/buses       — receive bus GPS")
    print("  GET  /api/buses       — serve bus positions")
    print("  POST /api/bulk-import — import detections.json")
    print("  WS   /ws              — real-time WebSocket")
    print()
    print("To import a video's detections:")
    print("  1. python detect_road.py your_video.mp4")
    print("  2. curl -X POST http://localhost:8000/api/bulk-import -F 'file=@output/detections.json'")
    print()
    print("Dashboard: http://localhost:5173")
    print("API docs:  http://localhost:8000/docs")
    print("=" * 50)

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
