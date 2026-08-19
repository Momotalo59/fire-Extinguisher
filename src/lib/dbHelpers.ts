import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  writeBatch,
  Timestamp,
  GeoPoint
} from "firebase/firestore";
import { db } from "./firebase";
import { uploadExtinguisherProfilePhoto, uploadInspectionPhotosAndSignature } from "./storageHelpers";
import { FireExtinguisher, InspectionLog, ExtinguisherType, UserProfile, SystemLog, AssetType, BuildingInfo } from "../types";
import { DEFAULT_HOSPITAL_BUILDINGS } from "./assetHelpers";

const EXTINGUISHERS_COLLECTION = "fireExtinguishers";
const INSPECTIONS_COLLECTION = "inspections";
const USERS_COLLECTION = "users";
const SYSTEM_LOGS_COLLECTION = "systemLogs";
const BUILDINGS_COLLECTION = "hospitalBuildings";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  
  // If this is a custom application error (like "รหัสถัง...มีอยู่แล้ว"), re-throw as is
  if (error instanceof Error && !errMsg.includes('FirebaseError') && !errMsg.includes('permission') && !errMsg.includes('unavailable')) {
    throw error;
  }

  // Handle network / connection offline gracefully
  if (errMsg.includes('unavailable') || errMsg.includes('Could not reach Cloud Firestore backend') || errMsg.includes('client is offline')) {
    console.warn(`[Firestore Offline/Network Warning] Operation ${operationType} on ${path}:`, errMsg);
    throw new Error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ชั่วคราว หรือสัญญาณอินเทอร์เน็ตขัดข้อง ระบบจะสลับไปใช้โหมดแคชออฟไลน์');
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Map from Firestore (convert Timestamps to ISO strings, and GeoPoints to {latitude, longitude})
function mapFromFirestore(data: any): any {
  if (!data) return data;
  const result = { ...data };
  
  const timestampFields = ['installationDate', 'expiryDate', 'lastInspectedAt', 'createdAt', 'inspectionDate', 'timestamp', 'lastLogin'];
  for (const field of timestampFields) {
    if (result[field] && typeof result[field].toDate === 'function') {
      result[field] = result[field].toDate().toISOString();
    }
  }
  
  if (result.locationGPS && typeof result.locationGPS.latitude === 'number') {
    result.locationGPS = {
      latitude: result.locationGPS.latitude,
      longitude: result.locationGPS.longitude
    };
  }
  if (result.inspectorGPS && typeof result.inspectorGPS.latitude === 'number') {
    result.inspectorGPS = {
      latitude: result.inspectorGPS.latitude,
      longitude: result.inspectorGPS.longitude
    };
  }
  
  return result;
}

// Map to Firestore (convert ISO strings to Timestamps, GPS objects to GeoPoints, and sanitize undefined values)
function mapToFirestore(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (data instanceof Timestamp || data instanceof GeoPoint || data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => (typeof item === 'object' && item !== null ? mapToFirestore(item) : item));
  }

  const result: any = {};
  
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) {
      continue; // Skip undefined keys completely so Firestore never rejects them
    }
    if (val !== null && typeof val === 'object' && !(val instanceof Timestamp) && !(val instanceof GeoPoint) && !(val instanceof Date)) {
      result[key] = mapToFirestore(val);
    } else {
      result[key] = val;
    }
  }
  
  const timestampFields = ['installationDate', 'expiryDate', 'lastInspectedAt', 'createdAt', 'inspectionDate', 'timestamp', 'lastLogin'];
  for (const field of timestampFields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = Timestamp.fromDate(new Date(result[field]));
      } catch (e) {
        // Fallback if not a valid ISO date
      }
    }
  }
  
  if (result.locationGPS && typeof result.locationGPS.latitude === 'number') {
    result.locationGPS = new GeoPoint(result.locationGPS.latitude, result.locationGPS.longitude);
  }
  if (result.inspectorGPS && typeof result.inspectorGPS.latitude === 'number') {
    result.inspectorGPS = new GeoPoint(result.inspectorGPS.latitude, result.inspectorGPS.longitude);
  }
  
  return result;
}

// Seed data in Thai to match schema
const sampleExtinguishers: FireExtinguisher[] = [
  {
    id: "FE-001",
    assetType: "ถังดับเพลิง",
    qrCode: "FE-001",
    serialNumber: "SN-20260718-A",
    type: "Dry Chemical",
    size: "15 lbs",
    building: "อาคารหมอบริกส์",
    floor: "ชั้น 1",
    locationDetails: "หน้าห้องคลังยา",
    locationGPS: { latitude: 19.9075, longitude: 99.8294 },
    installationDate: "2024-01-15T00:00:00.000Z",
    expiryDate: "2029-01-15T00:00:00.000Z",
    status: "ปกติ",
    photoUrl: "https://images.unsplash.com/photo-1618579895757-ef48e2f69904?auto=format&fit=crop&w=400&q=85",
    lastInspectedAt: "2026-06-10T10:30:00.000Z",
    createdAt: "2024-01-15T00:00:00.000Z"
  },
  {
    id: "FE-002",
    assetType: "ถังดับเพลิง",
    qrCode: "FE-002",
    serialNumber: "SN-20260718-B",
    type: "CO2",
    size: "10 lbs",
    building: "อาคารหมอบริกส์",
    floor: "ชั้น 2",
    locationDetails: "ข้างลิฟต์โดยสารห้อง IT",
    locationGPS: { latitude: 19.9076, longitude: 99.8295 },
    installationDate: "2024-02-10T00:00:00.000Z",
    expiryDate: "2029-02-10T00:00:00.000Z",
    status: "ปกติ",
    photoUrl: null,
    lastInspectedAt: "2026-06-12T11:15:00.000Z",
    createdAt: "2024-02-10T00:00:00.000Z"
  },
  {
    id: "FHC-001",
    assetType: "ตู้ดับเพลิง",
    qrCode: "FHC-001",
    serialNumber: "SN-FHC-101",
    type: "ตู้สายน้ำดับเพลิง (Hose Cabinet)",
    size: "ตู้มาตรฐาน 1.5 นิ้ว x 100 ฟุต",
    building: "อาคารหมอบริกส์",
    floor: "ชั้น 1",
    locationDetails: "ทางเดินโถงกลางข้างบันไดหนีไฟ",
    locationGPS: { latitude: 19.9077, longitude: 99.8296 },
    installationDate: "2024-01-10T00:00:00.000Z",
    expiryDate: "2029-01-10T00:00:00.000Z",
    status: "ปกติ",
    photoUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=400&q=85",
    lastInspectedAt: "2026-06-15T09:00:00.000Z",
    createdAt: "2024-01-10T00:00:00.000Z"
  },
  {
    id: "FD-001",
    assetType: "ประตูกันไฟ",
    qrCode: "FD-001",
    serialNumber: "SN-FD-201",
    type: "ประตูกันไฟเหล็ก",
    size: "มาตรฐาน 1.0 x 2.1 เมตร (ทนไฟ 2 ชม.)",
    building: "อาคารหมอบริกส์",
    floor: "ชั้น 1",
    locationDetails: "ประตูออกทางหนีไฟทิศตะวันออก",
    locationGPS: { latitude: 19.9079, longitude: 99.8297 },
    installationDate: "2024-01-05T00:00:00.000Z",
    expiryDate: "2034-01-05T00:00:00.000Z",
    status: "ปกติ",
    photoUrl: null,
    lastInspectedAt: "2026-06-16T14:20:00.000Z",
    createdAt: "2024-01-05T00:00:00.000Z"
  }
];

// Seed database if empty
export async function seedDatabaseIfEmpty() {
  // No-op: Disabled to reference actual database only as requested.
  console.log("Seeding disabled to reference actual user database only.");
}

// Helper to sanitize document IDs containing slashes for Firestore path safety
export function encodeDocId(id: string): string {
  if (!id) return id;
  return encodeURIComponent(id).replace(/\./g, '%2E');
}

export function decodeDocId(docId: string): string {
  if (!docId) return docId;
  try {
    return decodeURIComponent(docId);
  } catch (e) {
    return docId;
  }
}

// Check if inspected today (for daily inspection items like Fire Alarm Control Panel - FCP)
export function isInspectedToday(lastInspectedAt?: string | null): boolean {
  if (!lastInspectedAt) return false;
  const inspectedDate = new Date(lastInspectedAt);
  if (isNaN(inspectedDate.getTime())) return false;
  const now = new Date();
  return (
    inspectedDate.getFullYear() === now.getFullYear() &&
    inspectedDate.getMonth() === now.getMonth() &&
    inspectedDate.getDate() === now.getDate()
  );
}

// Check if a fire extinguisher / asset was already inspected in its required inspection cycle
// (Daily for FCP, Monthly for Fire Extinguishers, Hose Cabinets, Fire Doors)
export function isInspectedInCurrentMonth(lastInspectedAt?: string | null, assetType?: AssetType | string): boolean {
  if (!lastInspectedAt) return false;
  const inspectedDate = new Date(lastInspectedAt);
  if (isNaN(inspectedDate.getTime())) return false;
  const now = new Date();
  
  // If asset is Fire Alarm Control Panel (FCP), inspection is Daily
  if (assetType === 'ตู้แจ้งเหตุเพลิงไหม้') {
    return (
      inspectedDate.getFullYear() === now.getFullYear() &&
      inspectedDate.getMonth() === now.getMonth() &&
      inspectedDate.getDate() === now.getDate()
    );
  }

  return (
    inspectedDate.getFullYear() === now.getFullYear() &&
    inspectedDate.getMonth() === now.getMonth()
  );
}

export function isAssetAlreadyInspected(ext: FireExtinguisher): boolean {
  return isInspectedInCurrentMonth(ext.lastInspectedAt, ext.assetType || inferAssetType(ext));
}

export function inferAssetType(data: any): AssetType {
  if (data && data.assetType) return data.assetType as AssetType;
  const idUpper = (data?.id || '').toUpperCase();
  const typeStr = (data?.type || '');
  if (idUpper.startsWith('EM-') || idUpper.startsWith('EL-') || typeStr.includes('ไฟฉุกเฉิน') || typeStr.includes('Emergency Light')) return 'ไฟฉุกเฉิน';
  if (idUpper.startsWith('EX-') || idUpper.startsWith('EXIT-') || idUpper.startsWith('ES-') || typeStr.includes('ป้ายบอกทางหนีไฟ') || typeStr.includes('ป้ายหนีไฟ') || typeStr.includes('Exit Sign')) return 'ป้ายบอกทางหนีไฟ';
  if (idUpper.startsWith('FCP-') || idUpper.startsWith('FA-') || typeStr.includes('FCP') || typeStr.includes('แจ้งเหตุ') || typeStr.includes('Fire Alarm')) return 'ตู้แจ้งเหตุเพลิงไหม้';
  if (idUpper.startsWith('FHC-') || typeStr.includes('ตู้') || typeStr.includes('Hose')) return 'ตู้ดับเพลิง';
  if (idUpper.startsWith('FD-') || typeStr.includes('ประตู')) return 'ประตูกันไฟ';
  return 'ถังดับเพลิง';
}

// Fetch all fire extinguishers / safety assets
export async function getExtinguishers(): Promise<FireExtinguisher[]> {
  try {
    const querySnapshot = await getDocs(collection(db, EXTINGUISHERS_COLLECTION));
    const items: FireExtinguisher[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = data.id || decodeDocId(docSnap.id);
      const mapped = mapFromFirestore({ ...data, id }) as FireExtinguisher;
      mapped.assetType = inferAssetType(mapped);
      items.push(mapped);
    });
    // Sort by id naturally
    return items.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, EXTINGUISHERS_COLLECTION);
  }
}

// Add a new fire extinguisher
export async function addExtinguisher(extinguisher: Omit<FireExtinguisher, 'createdAt'>): Promise<void> {
  try {
    const docId = encodeDocId(extinguisher.id);
    const feDocRef = doc(db, EXTINGUISHERS_COLLECTION, docId);
    
    // Check if ID already exists
    const docSnap = await getDoc(feDocRef);
    if (docSnap.exists()) {
      throw new Error(`รหัสถังดับเพลิง ${extinguisher.id} นี้มีอยู่ในระบบแล้ว`);
    }

    // Upload profile photo to storage if present
    const uploadedPhotoUrl = await uploadExtinguisherProfilePhoto(extinguisher.id, extinguisher.photoUrl || "");

    const fullFe = {
      ...extinguisher,
      photoUrl: uploadedPhotoUrl || null,
      createdAt: new Date().toISOString()
    };

    await setDoc(feDocRef, mapToFirestore(fullFe));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${EXTINGUISHERS_COLLECTION}/${encodeDocId(extinguisher.id)}`);
  }
}

// Update a fire extinguisher
export async function updateExtinguisher(extinguisher: FireExtinguisher): Promise<void> {
  try {
    const docId = encodeDocId(extinguisher.id);
    const feDocRef = doc(db, EXTINGUISHERS_COLLECTION, docId);

    // Upload/Update profile photo to storage if present
    const uploadedPhotoUrl = await uploadExtinguisherProfilePhoto(extinguisher.id, extinguisher.photoUrl || "");

    const updatedExtinguisher = {
      ...extinguisher,
      photoUrl: uploadedPhotoUrl || null
    };

    await setDoc(feDocRef, mapToFirestore(updatedExtinguisher), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${EXTINGUISHERS_COLLECTION}/${encodeDocId(extinguisher.id)}`);
  }
}

// Delete a fire extinguisher
export async function deleteExtinguisher(id: string): Promise<void> {
  try {
    const docId = encodeDocId(id);
    await deleteDoc(doc(db, EXTINGUISHERS_COLLECTION, docId));
    
    // Also try to delete its inspections
    const q = query(collection(db, INSPECTIONS_COLLECTION), where("feId", "==", id));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.delete(doc(db, INSPECTIONS_COLLECTION, docSnap.id));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${EXTINGUISHERS_COLLECTION}/${encodeDocId(id)}`);
  }
}

// Add an inspection log and update fire extinguisher status
export async function addInspectionLog(log: Omit<InspectionLog, 'inspectionId'>): Promise<InspectionLog> {
  try {
    const inspectionId = `INSP-${Date.now()}`;
    const logRef = doc(db, INSPECTIONS_COLLECTION, inspectionId);

    // Upload photos and signature to Firebase Storage
    const { beforeUrl, afterUrl, signatureUrl } = await uploadInspectionPhotosAndSignature(
      log.feId,
      log.inspectionDate,
      log.photos?.before || "",
      log.photos?.after || "",
      log.signatureUrl || ""
    );
    
    const fullLog: InspectionLog = {
      inspectionId,
      ...log,
      photos: {
        before: beforeUrl,
        after: afterUrl
      },
      signatureUrl: signatureUrl
    };

    // Save log
    await setDoc(logRef, mapToFirestore(fullLog));

    // Calculate new status for the extinguisher / asset based on the checklist
    let newStatus: FireExtinguisher['status'] = 'ปกติ';
    
    const checklistValues = Object.values(fullLog.checklist);
    const hasFailItem = checklistValues.some(val => 
      val === 'ชำรุด' || 
      val === 'ต่ำ' || 
      val === 'มีสิ่งกีดขวาง' || 
      val === 'ไม่ปกติ' || 
      val === 'มี Trouble' || 
      val === 'มี Disable' || 
      val === 'ไม่ครบ' ||
      val === 'พร่อง'
    );

    if (hasFailItem || fullLog.inspectionResult === 'ไม่ผ่าน') {
      newStatus = 'ชำรุด';
    } else {
      newStatus = 'ปกติ';
    }

    // Update Extinguisher's fields
    const feDocId = encodeDocId(log.feId);
    const feDocRef = doc(db, EXTINGUISHERS_COLLECTION, feDocId);
    await updateDoc(feDocRef, mapToFirestore({
      lastInspectedAt: log.inspectionDate,
      status: newStatus
    }));

    return fullLog;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, INSPECTIONS_COLLECTION);
  }
}

// Get all inspections, optionally filtered by extinguisher ID
export async function getInspectionLogs(feId?: string): Promise<InspectionLog[]> {
  try {
    const inspectionsRef = collection(db, INSPECTIONS_COLLECTION);
    let q = query(inspectionsRef, orderBy("inspectionDate", "desc"));
    
    if (feId) {
      q = query(inspectionsRef, where("feId", "==", feId), orderBy("inspectionDate", "desc"));
    }
    
    const querySnapshot = await getDocs(q);
    const logs: InspectionLog[] = [];
    querySnapshot.forEach((docSnap) => {
      logs.push(mapFromFirestore(docSnap.data()) as InspectionLog);
    });
    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, INSPECTIONS_COLLECTION);
  }
}

// Write system audit logs
export async function addSystemLog(action: string, details: string, userEmail: string = 'Guest'): Promise<void> {
  try {
    const logId = `LOG-${Date.now()}`;
    const logRef = doc(db, SYSTEM_LOGS_COLLECTION, logId);
    await setDoc(logRef, mapToFirestore({
      timestamp: new Date().toISOString(),
      userEmail,
      action,
      details,
      ipAddress: '127.0.0.1' // default mock/local IP
    }));
  } catch (error) {
    console.error("Error writing system log:", error);
  }
}

// Fetch all registered user profiles (for Admin user management)
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersRef);
    const users: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push(mapFromFirestore({ ...data, uid: data.uid || docSnap.id }) as UserProfile);
    });
    return users.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'th'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
  }
}

// Update a user's role (Admin only)
export async function updateUserRole(uid: string, newRole: 'Admin' | 'Inspector', updatedByEmail: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDocRef, {
      role: newRole
    });
    await addSystemLog('UPDATE_USER_ROLE', `เปลี่ยนสิทธิ์ผู้ใช้งาน (UID: ${uid}) เป็น ${newRole}`, updatedByEmail);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

// -------------------------------------------------------------
// Hospital Buildings Management (Firestore CRUD)
// -------------------------------------------------------------

// Fetch all hospital buildings from Firestore, or initialize with defaults if collection is empty
export async function getHospitalBuildings(): Promise<BuildingInfo[]> {
  try {
    const buildingsRef = collection(db, BUILDINGS_COLLECTION);
    const querySnapshot = await getDocs(buildingsRef);

    if (querySnapshot.empty) {
      // Seed default hospital buildings into Firestore
      const seeded: BuildingInfo[] = [];
      for (const bldg of DEFAULT_HOSPITAL_BUILDINGS) {
        const docRef = doc(db, BUILDINGS_COLLECTION, bldg.id);
        const bldgData = {
          ...bldg,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, mapToFirestore(bldgData));
        seeded.push(bldgData);
      }
      return seeded;
    }

    const buildings: BuildingInfo[] = [];
    const existingNamesOrIds = new Set<string>();
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const bldg = mapFromFirestore({ ...data, id: data.id || docSnap.id }) as BuildingInfo;
      buildings.push(bldg);
      if (bldg.id) existingNamesOrIds.add(bldg.id);
      if (bldg.name) existingNamesOrIds.add(bldg.name);
    });

    // Check if any default hospital buildings are missing from Firestore and sync them
    for (const defaultBldg of DEFAULT_HOSPITAL_BUILDINGS) {
      if (!existingNamesOrIds.has(defaultBldg.id) && !existingNamesOrIds.has(defaultBldg.name)) {
        try {
          const docRef = doc(db, BUILDINGS_COLLECTION, defaultBldg.id);
          const bldgData = {
            ...defaultBldg,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(docRef, mapToFirestore(bldgData));
          buildings.push(bldgData);
        } catch (e) {
          console.warn("Auto-sync default building warning:", e);
        }
      }
    }

    // Sort logically or alphabetically
    return buildings.sort((a, b) => (a.id || '').localeCompare(b.id || '', undefined, { numeric: true }));
  } catch (error) {
    console.error("Error fetching hospital buildings, returning defaults:", error);
    return DEFAULT_HOSPITAL_BUILDINGS;
  }
}

// Save or update hospital building details (with support for cascading name updates on equipment)
export async function saveHospitalBuilding(
  building: BuildingInfo,
  oldName?: string,
  updatedByEmail: string = 'System'
): Promise<BuildingInfo> {
  try {
    const bldgId = building.id || `BLD-${Date.now()}`;
    const bldgRef = doc(db, BUILDINGS_COLLECTION, bldgId);

    const bldgData: BuildingInfo = {
      ...building,
      id: bldgId,
      name: building.name.trim(),
      icon: building.icon.trim() || '🏢',
      desc: building.desc?.trim() || '',
      department: building.department?.trim() || '',
      contactPerson: building.contactPerson?.trim() || '',
      notes: building.notes?.trim() || '',
      totalFloors: Number(building.totalFloors) || 1,
      hasFireDoor: Boolean(building.hasFireDoor),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(bldgRef, mapToFirestore(bldgData), { merge: true });

    // If building name was changed and oldName was provided, update all fire extinguishers located in this building
    if (oldName && oldName.trim() !== bldgData.name) {
      try {
        const extsRef = collection(db, EXTINGUISHERS_COLLECTION);
        const q = query(extsRef, where("building", "==", oldName.trim()));
        const snapshot = await getDocs(q);
        
        const updatePromises: Promise<void>[] = [];
        snapshot.forEach((docSnap) => {
          updatePromises.push(
            updateDoc(docSnap.ref, {
              building: bldgData.name
            })
          );
        });
        await Promise.all(updatePromises);
      } catch (cascadeError) {
        console.warn("Cascade update of building name on equipment warning:", cascadeError);
      }
    }

    await addSystemLog(
      'UPDATE_BUILDING',
      `แก้ไขข้อมูลอาคาร "${bldgData.name}" (${bldgData.desc || 'ไม่มีคำอธิบาย'})`,
      updatedByEmail
    );

    return bldgData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BUILDINGS_COLLECTION}/${building.id}`);
  }
}

// Delete a hospital building from Firestore
export async function deleteHospitalBuilding(
  buildingId: string,
  buildingName: string,
  deletedByEmail: string = 'System'
): Promise<void> {
  try {
    const bldgRef = doc(db, BUILDINGS_COLLECTION, buildingId);
    await deleteDoc(bldgRef);

    await addSystemLog(
      'DELETE_BUILDING',
      `ลบข้อมูลอาคาร "${buildingName}" (ID: ${buildingId})`,
      deletedByEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BUILDINGS_COLLECTION}/${buildingId}`);
  }
}
