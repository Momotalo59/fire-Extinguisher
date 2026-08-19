export type AssetType = 
  | 'ถังดับเพลิง' 
  | 'ตู้ดับเพลิง' 
  | 'ประตูกันไฟ' 
  | 'ตู้แจ้งเหตุเพลิงไหม้'
  | 'ไฟฉุกเฉิน'
  | 'ป้ายบอกทางหนีไฟ';

export type ExtinguisherType = 
  | 'CO2' 
  | 'Dry Chemical' 
  | 'Foam' 
  | 'Water' 
  | 'Clean Agent'
  | 'ตู้วงล้อสายดับเพลิง Fire Hose Reel Cabinet (แบบฝัง)'
  | 'ตู้สายน้ำดับเพลิง (Hose Cabinet)'
  | 'ตู้โฮสรีล (Hose Reel)'
  | 'ประตูกันไฟเหล็ก'
  | 'ประตูกันไฟกระจก'
  | 'ตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)'
  | 'โคมไฟฉุกเฉิน LED อัตโนมัติ (Emergency Light)'
  | 'ป้ายไฟทางออกฉุกเฉิน LED (Exit Sign Box)'
  | string;

export type ExtinguisherStatus = 'ปกติ' | 'ชำรุด' | 'แรงดันต่ำ' | 'ใกล้หมดอายุ' | 'หมดอายุ' | 'ส่งซ่อม';

export interface FireExtinguisher {
  id: string; // Document ID (e.g., "FE-001", "FHC-001", "FD-001", "FCP-001")
  assetType?: AssetType; // Default to 'ถังดับเพลิง' if not specified
  category?: AssetType; // Category alias
  qrCode: string;
  serialNumber: string;
  type: ExtinguisherType;
  size: string;
  brand?: string; // ยี่ห้อ เช่น Notifier, Edwards, Bosch, Hochiki, GST
  model?: string; // รุ่น เช่น NFS-320, EST3, FPA-5000
  building: string;
  floor: string;
  locationDetails: string;
  locationGPS: { latitude: number; longitude: number } | null;
  installationDate: string; // ISO string in UI
  expiryDate: string; // ISO string in UI
  status: ExtinguisherStatus;
  photoUrl: string | null;
  details?: string; // รายละเอียดเพิ่มเติม เช่น ยี่ห้อ, อุปกรณ์ประกอบ, ผู้รับผิดชอบ
  notes?: string;
  lastInspectedAt: string | null;
  createdAt: string;
}

export interface InspectionChecklist {
  // Fire Extinguisher Fields
  pressure?: 'ปกติ' | 'ต่ำ' | 'ไม่มีเกจ์';
  safetyPin?: 'ปกติ' | 'ชำรุด';
  hoseNozzle?: 'ปกติ' | 'ชำรุด';
  bodyCondition?: 'ปกติ' | 'ชำรุด';
  instructionLabel?: 'ปกติ' | 'ชำรุด';
  accessibility?: 'ปกติ' | 'มีสิ่งกีดขวาง' | 'ไม่ปกติ' | string;
  weightStatus?: 'ปกติ' | 'พร่อง';

  // Fire Hose Cabinet (ตู้ดับเพลิง) Fields
  cabinetCondition?: 'ปกติ' | 'ไม่ปกติ';
  valveStatus?: 'ปกติ' | 'ไม่ปกติ' | 'ชำรุด';
  hoseCondition?: 'ปกติ' | 'ไม่ปกติ' | 'ชำรุด';
  cabinetEquipment?: 'ครบ' | 'ไม่ครบ';
  cabinetGlass?: 'ปกติ' | 'ชำรุด' | 'ไม่ปกติ';
  signalLight?: 'ปกติ' | 'ชำรุด' | 'ไม่ปกติ';

  // Fire Door (ประตูกันไฟอัตโนมัติ) Fields
  doorCondition?: 'ปกติ' | 'ไม่ปกติ';
  magnetSwitch?: 'ปกติ' | 'ไม่ปกติ';
  autoCloseSpeed?: 'ปกติ' | 'ไม่ปกติ';
  doorCloser?: 'ปกติ' | 'ชำรุด' | 'ไม่ปกติ';
  panicBar?: 'ปกติ' | 'ชำรุด' | 'ไม่ปกติ';
  fireGasket?: 'ปกติ' | 'ชำรุด' | 'ไม่ปกติ';
  doorLatchLock?: 'ปกติ' | 'ชำรุด' | 'ไม่ปกติ';

  // Fire Alarm Control Panel (ตู้แจ้งเหตุเพลิงไหม้ - FCP) Fields (ตรวจเช็คประจำวัน)
  fcpStatusLed?: 'ปกติ' | 'ไม่ปกติ';      // 1. ไฟแสดงสถานะหน้าตู้
  fcpLampTest?: 'ปกติ' | 'ไม่ปกติ';       // 2. ทดสอบสัญญาณไฟหน้าตู้
  fcpMainStatus?: 'ปกติ' | 'ไม่ปกติ';     // 3. สถานะตู้ FCP
  fcpTrouble?: 'ปกติ' | 'มี Trouble';     // 4. Trouble
  fcpTroubleZone?: string;                // ระบุโซน Trouble
  fcpTroubleCause?: string;               // ระบุสาเหตุ Trouble
  fcpDisable?: 'ปกติ' | 'มี Disable';     // 5. Disable
  fcpDisableZone?: string;                // ระบุโซน Disable
  fcpDisableCause?: string;               // ระบุสาเหตุ Disable

  // Emergency Light & Exit Sign (ไฟฉุกเฉิน & ป้ายบอกทางหนีไฟ) Fields (ตรวจเช็ค: ปกติ, ไม่ปกติ)
  emergencyLightStatus?: 'ปกติ' | 'ไม่ปกติ'; // สถานะการทำงานไฟฉุกเฉิน
  exitSignStatus?: 'ปกติ' | 'ไม่ปกติ';       // สถานะการทำงานป้ายบอกทางหนีไฟ
  generalStatus?: 'ปกติ' | 'ไม่ปกติ';        // สภาพทั่วไปและการทำงาน
}

export interface InspectionLog {
  inspectionId: string; // Auto-generated document ID or custom
  feId: string;
  assetType?: AssetType; // Optional category tag
  inspectionDate: string; // ISO string in UI, Timestamp in DB
  inspectorUid: string;
  inspectorName: string;
  inspectionType: 'ประจำวัน' | 'รายเดือน' | 'ก่อนเปิดอาคาร' | 'ประจำปี';
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

export interface BuildingInfo {
  id: string; // e.g. "อาคารอำนวยการ" or "BLD-01"
  name: string;
  icon: string;
  desc?: string;
  floors?: string[];
  totalFloors?: number;
  department?: string;
  contactPerson?: string;
  notes?: string;
  color?: string;
  hasFireDoor?: boolean;
  onlyFireExtinguisher?: boolean;
  updatedAt?: string;
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
