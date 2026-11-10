// ═══════════════════════════════════════════════════════════
// NAVIK — Browser YOLO Engine
// Runs YOLOv8 ONNX model directly in the browser
// No server needed — real object detection on client
//
// Prerequisites:
//   1. npm install onnxruntime-web
//   2. Copy yolov8n.onnx to /public/models/yolov8n.onnx
//      (export from Python: model.export(format='onnx'))
// ═══════════════════════════════════════════════════════════

import { getClassInfo, computeSeverity, COCO_NAMES } from './yoloClasses';

export interface BoundingBox {
  x1: number; y1: number; x2: number; y2: number;  // pixel coordinates
  xc: number; yc: number; w: number; h: number;     // normalised [0-1]
}

export interface YoloDetection {
  classId: number;
  label: string;
  confidence: number;
  bbox: BoundingBox;
  navikCategory: string;
  incidentType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  color: string;
  isVehicle: boolean;
  isPedestrian: boolean;
  isDefect: boolean;
}

export interface YoloResult {
  detections: YoloDetection[];
  inferenceMs: number;
  imageWidth: number;
  imageHeight: number;
  vehicleCount: number;
  pedestrianCount: number;
  defectCount: number;
}

// Model input size (must match what ONNX was exported with)
const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.5;
const IOU_THRESHOLD  = 0.45;

// ── Lazy-load ONNX Runtime ────────────────────────────────
let ort: typeof import('onnxruntime-web') | null = null;
let session: import('onnxruntime-web').InferenceSession | null = null;
let modelLoading = false;
let modelLoaded  = false;
let loadError: string | null = null;

async function getORT() {
  if (!ort) {
    ort = await import('onnxruntime-web');
    // Use WASM backend (CPU — works everywhere)
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
  }
  return ort;
}

export async function loadModel(
  modelPath = '/models/yolov8n.onnx',
  onProgress?: (msg: string) => void
): Promise<{ ok: boolean; error?: string }> {
  if (modelLoaded && session) return { ok: true };
  if (modelLoading) return { ok: false, error: 'Already loading' };

  modelLoading = true;
  loadError = null;

  try {
    onProgress?.('Loading ONNX Runtime...');
    const ortLib = await getORT();

    onProgress?.('Fetching model weights...');

    // Check model file exists
    const check = await fetch(modelPath, { method: 'HEAD' });
    if (!check.ok) {
      throw new Error(
        `Model not found at ${modelPath}.\n` +
        `Run: python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')" ` +
        `then copy yolov8n.onnx to public/models/`
      );
    }

    onProgress?.('Creating inference session (this takes ~10-20s on first load)...');
    session = await ortLib.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    modelLoaded = true;
    modelLoading = false;
    onProgress?.('Model ready');
    return { ok: true };
  } catch (e) {
    loadError = String(e);
    modelLoading = false;
    modelLoaded  = false;
    return { ok: false, error: loadError };
  }
}

export function isModelLoaded() { return modelLoaded; }
export function getLoadError()  { return loadError; }

// ── Preprocess image for YOLO ─────────────────────────────
function preprocessImage(
  imageElement: HTMLImageElement | HTMLCanvasElement,
): { tensor: Float32Array; paddedW: number; paddedH: number; scale: number; padX: number; padY: number } {
  const canvas = document.createElement('canvas');
  canvas.width  = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d')!;

  const srcW = 'naturalWidth' in imageElement ? imageElement.naturalWidth  : imageElement.width;
  const srcH = 'naturalWidth' in imageElement ? imageElement.naturalHeight : imageElement.height;

  // Letterbox: fit into INPUT_SIZE×INPUT_SIZE with grey padding
  const scale = Math.min(INPUT_SIZE / srcW, INPUT_SIZE / srcH);
  const newW  = Math.round(srcW * scale);
  const newH  = Math.round(srcH * scale);
  const padX  = (INPUT_SIZE - newW) / 2;
  const padY  = (INPUT_SIZE - newH) / 2;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.drawImage(imageElement, padX, padY, newW, newH);

  const imgData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;

  // CHW format, normalised [0,1]
  const tensor = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    tensor[i]                              = imgData[i * 4]     / 255; // R
    tensor[i + INPUT_SIZE * INPUT_SIZE]    = imgData[i * 4 + 1] / 255; // G
    tensor[i + 2 * INPUT_SIZE * INPUT_SIZE]= imgData[i * 4 + 2] / 255; // B
  }

  return { tensor, paddedW: newW, paddedH: newH, scale, padX, padY };
}

// ── NMS (Non-Maximum Suppression) ────────────────────────
function iou(a: number[], b: number[]): number {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]);
  const iy2 = Math.min(a[3], b[3]);
  const iw  = Math.max(0, ix2 - ix1);
  const ih  = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const aArea = (a[2]-a[0]) * (a[3]-a[1]);
  const bArea = (b[2]-b[0]) * (b[3]-b[1]);
  return inter / (aArea + bArea - inter + 1e-6);
}

function nms(boxes: number[][], scores: number[], threshold: number): number[] {
  const order = scores.map((_s,i) => i).sort((a,b) => scores[b]-scores[a]);
  const keep: number[] = [];
  const suppressed = new Set<number>();
  for (const i of order) {
    if (suppressed.has(i)) continue;
    keep.push(i);
    for (const j of order) {
      if (j === i || suppressed.has(j)) continue;
      if (iou(boxes[i], boxes[j]) > threshold) suppressed.add(j);
    }
  }
  return keep;
}

// ── Main inference function ───────────────────────────────
export async function runInference(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  options: {
    confThreshold?: number;
    iouThreshold?: number;
    isNearSchool?: boolean;
  } = {}
): Promise<YoloResult> {
  if (!session) throw new Error('Model not loaded. Call loadModel() first.');

  const ortLib   = await getORT();
  const conf     = options.confThreshold ?? CONF_THRESHOLD;
  const iouThres = options.iouThreshold  ?? IOU_THRESHOLD;
  const nearSchool = options.isNearSchool ?? false;

  const srcW = 'naturalWidth' in imageElement ? imageElement.naturalWidth  : imageElement.width;
  const srcH = 'naturalWidth' in imageElement ? imageElement.naturalHeight : imageElement.height;

  const { tensor, scale, padX, padY } = preprocessImage(imageElement);

  // Run ONNX inference
  const t0 = performance.now();
  const inputTensor = new ortLib.Tensor('float32', tensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const outputs = await session.run({ images: inputTensor });
  const inferenceMs = Math.round(performance.now() - t0);

  // YOLOv8 output: [1, 84, num_boxes] (4 bbox coords + 80 class scores)
  const output = outputs[Object.keys(outputs)[0]];
  const data   = output.data as Float32Array;
  const dims   = output.dims;  // [1, 84, 8400] for yolov8n 640

  const numBoxes   = dims[2];  // 8400
  const numClasses = dims[1] - 4;  // 80

  // Parse boxes
  const rawBoxes: number[][] = [];
  const rawScores: number[]  = [];
  const rawClassIds: number[]= [];

  for (let i = 0; i < numBoxes; i++) {
    // cx, cy, w, h (normalised to INPUT_SIZE)
    const cx = data[0 * numBoxes + i];
    const cy = data[1 * numBoxes + i];
    const bw = data[2 * numBoxes + i];
    const bh = data[3 * numBoxes + i];

    // Find best class
    let bestConf = 0, bestClass = 0;
    for (let c = 0; c < numClasses; c++) {
      const score = data[(4 + c) * numBoxes + i];
      if (score > bestConf) { bestConf = score; bestClass = c; }
    }

    if (bestConf < conf) continue;

    // Convert to pixel coords (undo letterbox)
    const x1 = ((cx - bw/2) - padX) / scale;
    const y1 = ((cy - bh/2) - padY) / scale;
    const x2 = ((cx + bw/2) - padX) / scale;
    const y2 = ((cy + bh/2) - padY) / scale;

    rawBoxes.push([
      Math.max(0, x1), Math.max(0, y1),
      Math.min(srcW, x2), Math.min(srcH, y2),
    ]);
    rawScores.push(bestConf);
    rawClassIds.push(bestClass);
  }

  // Apply NMS
  const keepIdx = nms(rawBoxes, rawScores, iouThres);

  // Count vehicles for severity calculation
  const vehicleCountNearby = keepIdx.filter(i => {
    const info = getClassInfo(rawClassIds[i]);
    return info.isVehicle;
  }).length;

  // Build results
  const detections: YoloDetection[] = keepIdx.map(i => {
    const [x1, y1, x2, y2] = rawBoxes[i];
    const classId = rawClassIds[i];
    const confidence = rawScores[i];
    const cocoLabel = COCO_NAMES[classId] ?? `class_${classId}`;
    const classInfo = getClassInfo(classId, cocoLabel);
    const severity  = computeSeverity(classInfo, confidence, vehicleCountNearby, nearSchool);

    return {
      classId,
      label: cocoLabel,
      confidence: Math.round(confidence * 1000) / 10, // 0-100%
      bbox: {
        x1: Math.round(x1), y1: Math.round(y1),
        x2: Math.round(x2), y2: Math.round(y2),
        xc: (x1+x2) / 2 / srcW,
        yc: (y1+y2) / 2 / srcH,
        w:  (x2-x1) / srcW,
        h:  (y2-y1) / srcH,
      },
      navikCategory: classInfo.navikCategory,
      incidentType:  classInfo.incidentType,
      severity,
      color: classInfo.color,
      isVehicle:    classInfo.isVehicle,
      isPedestrian: classInfo.isPedestrian,
      isDefect:     classInfo.isDefect,
    };
  });

  return {
    detections,
    inferenceMs,
    imageWidth: srcW,
    imageHeight: srcH,
    vehicleCount:    detections.filter(d => d.isVehicle).length,
    pedestrianCount: detections.filter(d => d.isPedestrian).length,
    defectCount:     detections.filter(d => d.isDefect).length,
  };
}

// ── Draw bounding boxes on canvas ────────────────────────
export function drawDetections(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | HTMLCanvasElement,
  result: YoloResult,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width  = result.imageWidth;
  canvas.height = result.imageHeight;
  ctx.drawImage(image, 0, 0);

  for (const det of result.detections) {
    const { x1, y1, x2, y2 } = det.bbox;
    const color = det.color;

    // Box
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.strokeRect(x1, y1, x2-x1, y2-y1);

    // Label background
    const label = `${det.label} ${det.confidence.toFixed(0)}%`;
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    const tw = ctx.measureText(label).width;
    const lh = 18;
    const lx = x1;
    const ly = y1 > lh + 2 ? y1 - lh - 2 : y1 + 2;

    ctx.fillStyle = color + 'DD';
    ctx.fillRect(lx, ly, tw + 10, lh + 4);

    // Label text
    ctx.fillStyle = '#000000';
    ctx.fillText(label, lx + 5, ly + lh);
  }
}

// ── Process base64 image ──────────────────────────────────
export async function runInferenceOnBase64(
  base64: string,
  mime = 'image/jpeg',
  options = {}
): Promise<YoloResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        resolve(await runInference(img, options));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = `data:${mime};base64,${base64}`;
  });
}

// ── Process video file (extract frames) ──────────────────
export async function* processVideoFrames(
  videoFile: File,
  everyNSeconds = 1.0,
  onProgress?: (pct: number, frameResult: YoloResult) => void,
): AsyncGenerator<YoloResult> {
  const url    = URL.createObjectURL(videoFile);
  const video  = document.createElement('video');
  video.src    = url;
  video.muted  = true;

  await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });

  const duration = video.duration;
  const canvas   = document.createElement('canvas');
  canvas.width   = video.videoWidth;
  canvas.height  = video.videoHeight;
  const ctx      = canvas.getContext('2d')!;

  for (let t = 0; t < duration; t += everyNSeconds) {
    video.currentTime = t;
    await new Promise<void>((res) => { video.onseeked = () => res(); });
    ctx.drawImage(video, 0, 0);

    const result = await runInference(canvas);
    result.detections.forEach(d => { (d as any).videoTimeSec = t; });

    onProgress?.(t / duration, result);
    yield result;
  }

  URL.revokeObjectURL(url);
}
