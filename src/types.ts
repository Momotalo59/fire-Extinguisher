export type ExtinguisherType = 'CO2' | 'Dry Chemical' | 'Foam' | 'Water' | 'Clean Agent';

export type ExtinguisherStatus = 'ปกติ' | 'ชำรุด' | 'แรงดันต่ำ' | 'ใกล้หมดอายุ' | 'หมดอายุ' | 'ส่งซ่อม';

export interface FireExtinguisher {
  id: string; // Document ID (e.g., "FE-001")
  qrCode: string;
  serialNumber: string;
  type: ExtinguisherType;
  size: string;
  building: string;
  floor: string;
  locationDetails: string;
  locationGPS: { latitude: number; longitude: number } | null;
  installationDate: string; // ISO string in UI, converted to/from Timestamp in DB helpers
  expiryDate: string; // ISO string in UI, converted to/from Timestamp in DB helpers
  status: ExtinguisherStatus;
  photoUrl: string | null;
  lastInspectedAt: string | null; // ISO string in UI, converted to/from Timestamp in DB helpers
  createdAt: string; // ISO string in UI, converted to/from Timestamp in DB helpers
}

export interface InspectionChecklist {
  pressure: 'ปกติ' | 'ต่ำ' | 'ไม่มีเกจ์';
  safetyPin: 'ปกติ' | 'ชำรุด';
  hoseNozzle: 'ปกติ' | 'ชำรุด';
  bodyCondition: 'ปกติ' | 'ชำรุด';
  instructionLabel: 'ปกติ' | 'ชำรุด';
  accessibility: 'ปกติ' | 'มีสิ่งกีดขวาง';
  weightStatus: 'ปกติ' | 'พร่อง';
}

export interface InspectionLog {
  inspectionId: string; // Auto-generated document ID or custom
  feId: string;
  inspectionDate: string; // ISO string in UI, Timestamp in DB
  inspectorUid: string;
  inspectorName: string;
  inspectionType: 'รายเดือน' | 'ก่อนเปิดอาคาร' | 'ประจำปี';
  checklist: InspectionChecklist;
  inspectionResult: 'ผ่าน' | 'ไม่ผ่าน';
  inspectorGPS: { latitude: number; longitude: number } | null;
  distanceDiff: number;
  photos: {
    before: string;
    after: string;
  };
  signatureUrl: string;
  notes: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  department: string;
  role: 'Admin' | 'Inspector';
  isActive: boolean;
  lastLogin: string;
}

export interface SystemLog {
  timestamp: string;
  userEmail: string;
  action: 'LOGIN' | 'ADD_FIRE_EXTINGUISHER' | 'EDIT_FIRE_EXTINGUISHER' | 'DELETE_TANK' | 'EXPORT_PDF' | string;
  details: string;
  ipAddress: string;
}
