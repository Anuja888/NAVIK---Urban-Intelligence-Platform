// ═══════════════════════════════════════════════════════════
// NAVIK — YOLO Class Definitions
// Maps COCO class IDs → NAVIK incident categories
// ═══════════════════════════════════════════════════════════

export interface NavikDetection {
  classId: number;
  cocoLabel: string;
  navikCategory: string;
  incidentType: string;
  defaultSeverity: 'critical' | 'high' | 'medium' | 'low';
  color: string;        // hex for bounding box
  isVehicle: boolean;
  isPedestrian: boolean;
  isDefect: boolean;
}

// Standard COCO classes (yolov8n built-in)
export const YOLO_CLASSES: Record<number, NavikDetection> = {
  // ── Pedestrians ──
  0:  { classId: 0,  cocoLabel: 'person',       navikCategory: 'pedestrian',          incidentType: 'pedestrian_hazard',    defaultSeverity: 'high',   color: '#FBBF24', isVehicle: false, isPedestrian: true,  isDefect: false },

  // ── Two-wheelers ──
  1:  { classId: 1,  cocoLabel: 'bicycle',      navikCategory: 'vehicle_two_wheeler', incidentType: 'congestion_alert',     defaultSeverity: 'low',    color: '#60A5FA', isVehicle: true,  isPedestrian: false, isDefect: false },
  3:  { classId: 3,  cocoLabel: 'motorcycle',   navikCategory: 'vehicle_two_wheeler', incidentType: 'congestion_alert',     defaultSeverity: 'low',    color: '#60A5FA', isVehicle: true,  isPedestrian: false, isDefect: false },

  // ── Cars / light vehicles ──
  2:  { classId: 2,  cocoLabel: 'car',          navikCategory: 'vehicle_car',         incidentType: 'congestion_alert',     defaultSeverity: 'low',    color: '#34D399', isVehicle: true,  isPedestrian: false, isDefect: false },

  // ── Heavy vehicles ──
  5:  { classId: 5,  cocoLabel: 'bus',          navikCategory: 'vehicle_bus',         incidentType: 'congestion_alert',     defaultSeverity: 'low',    color: '#A78BFA', isVehicle: true,  isPedestrian: false, isDefect: false },
  7:  { classId: 7,  cocoLabel: 'truck',        navikCategory: 'vehicle_truck',       incidentType: 'congestion_alert',     defaultSeverity: 'low',    color: '#F87171', isVehicle: true,  isPedestrian: false, isDefect: false },

  // ── Traffic infrastructure ──
  9:  { classId: 9,  cocoLabel: 'traffic light',navikCategory: 'traffic_signal',      incidentType: 'road_defect',          defaultSeverity: 'medium', color: '#FCD34D', isVehicle: false, isPedestrian: false, isDefect: true  },
  11: { classId: 11, cocoLabel: 'stop sign',    navikCategory: 'traffic_sign',        incidentType: 'road_defect',          defaultSeverity: 'medium', color: '#F87171', isVehicle: false, isPedestrian: false, isDefect: true  },

  // ── Custom fine-tuned classes (road defects) ──
  // These IDs only work with a fine-tuned model (RDD2022 / Pothole-600)
  80: { classId: 80, cocoLabel: 'pothole',           navikCategory: 'pothole',           incidentType: 'road_defect',          defaultSeverity: 'high',   color: '#F87171', isVehicle: false, isPedestrian: false, isDefect: true  },
  81: { classId: 81, cocoLabel: 'waterlogging',      navikCategory: 'waterlogging',      incidentType: 'waterlogging_critical',defaultSeverity: 'high',   color: '#60A5FA', isVehicle: false, isPedestrian: false, isDefect: true  },
  82: { classId: 82, cocoLabel: 'missing_signboard', navikCategory: 'missing_signboard', incidentType: 'road_defect',          defaultSeverity: 'medium', color: '#FBBF24', isVehicle: false, isPedestrian: false, isDefect: true  },
  83: { classId: 83, cocoLabel: 'damaged_road',      navikCategory: 'damaged_road',      incidentType: 'road_defect',          defaultSeverity: 'high',   color: '#F87171', isVehicle: false, isPedestrian: false, isDefect: true  },
  84: { classId: 84, cocoLabel: 'missing_divider',   navikCategory: 'missing_divider',   incidentType: 'road_defect',          defaultSeverity: 'high',   color: '#FB923C', isVehicle: false, isPedestrian: false, isDefect: true  },
  85: { classId: 85, cocoLabel: 'missing_zebra',     navikCategory: 'missing_zebra',     incidentType: 'road_defect',          defaultSeverity: 'medium', color: '#FBBF24', isVehicle: false, isPedestrian: false, isDefect: true  },
};

// Get class info with fallback
export function getClassInfo(classId: number, label?: string): NavikDetection {
  if (YOLO_CLASSES[classId]) return YOLO_CLASSES[classId];
  // Unknown class — treat as generic detection
  return {
    classId,
    cocoLabel: label ?? `class_${classId}`,
    navikCategory: 'unknown',
    incidentType: 'road_defect',
    defaultSeverity: 'medium',
    color: '#94A3B8',
    isVehicle: false,
    isPedestrian: false,
    isDefect: false,
  };
}

// COCO label names (index = class ID, matches yolov8 built-in)
export const COCO_NAMES = [
  'person','bicycle','car','motorcycle','airplane','bus','train','truck','boat',
  'traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat',
  'dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack',
  'umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball',
  'kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket',
  'bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple',
  'sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair',
  'couch','potted plant','bed','dining table','toilet','tv','laptop','mouse',
  'remote','keyboard','cell phone','microwave','oven','toaster','sink','refrigerator',
  'book','clock','vase','scissors','teddy bear','hair drier','toothbrush',
];

// Severity based on context
export function computeSeverity(
  classInfo: NavikDetection,
  confidence: number,
  vehicleCountNearby: number,
  isNearSchool: boolean,
): 'critical' | 'high' | 'medium' | 'low' {
  if (classInfo.isPedestrian && vehicleCountNearby > 5) return 'critical';
  if (classInfo.isPedestrian && isNearSchool) return 'critical';
  if (classInfo.navikCategory === 'pothole' && confidence > 0.85) return 'high';
  if (classInfo.navikCategory === 'waterlogging' && confidence > 0.80) return 'high';
  if (confidence < 0.6) return 'low';
  return classInfo.defaultSeverity;
}
