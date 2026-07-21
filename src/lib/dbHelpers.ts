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
import { FireExtinguisher, InspectionLog, ExtinguisherType, UserProfile, SystemLog } from "../types";

const EXTINGUISHERS_COLLECTION = "fireExtinguishers";
const INSPECTIONS_COLLECTION = "inspections";
const USERS_COLLECTION = "users";
const SYSTEM_LOGS_COLLECTION = "systemLogs";

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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

// Map to Firestore (convert ISO strings to Timestamps, and GPS objects to GeoPoints)
function mapToFirestore(data: any): any {
  if (!data) return data;
  const result = { ...data };
  
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
    id: "FE-003",
    qrCode: "FE-003",
    serialNumber: "SN-20260718-C",
    type: "Clean Agent",
    size: "10 lbs",
    building: "อาคารต้นแก้ว",
    floor: "ชั้น GF",
    locationDetails: "ห้องควบคุมระบบไฟฟ้า",
    locationGPS: { latitude: 19.9073, longitude: 99.8291 },
    installationDate: "2024-05-20T00:00:00.000Z",
    expiryDate: "2029-05-20T00:00:00.000Z",
    status: "ปกติ",
    photoUrl: null,
    lastInspectedAt: null,
    createdAt: "2024-05-20T00:00:00.000Z"
  },
  {
    id: "FE-004",
    qrCode: "FE-004",
    serialNumber: "SN-20260718-D",
    type: "Dry Chemical",
    size: "15 lbs",
    building: "อาคารต้นแก้ว",
    floor: "ชั้น 3",
    locationDetails: "หน้าแผนกกายภาพบำบัด",
    locationGPS: { latitude: 19.9078, longitude: 99.8298 },
    installationDate: "2023-11-05T00:00:00.000Z",
    expiryDate: "2028-11-05T00:00:00.000Z",
    status: "แรงดันต่ำ",
    photoUrl: null,
    lastInspectedAt: "2026-05-02T14:45:00.000Z",
    createdAt: "2023-11-05T00:00:00.000Z"
  },
  {
    id: "FE-005",
    qrCode: "FE-005",
    serialNumber: "SN-20260718-E",
    type: "Foam",
    size: "9.0 L",
    building: "อาคารจอดรถ",
    floor: "ชั้น 1",
    locationDetails: "ทางขึ้นบันไดหนีไฟหลัก",
    locationGPS: { latitude: 19.9080, longitude: 99.8300 },
    installationDate: "2023-08-12T00:00:00.000Z",
    expiryDate: "2028-08-12T00:00:00.000Z",
    status: "ชำรุด",
    photoUrl: null,
    lastInspectedAt: "2026-04-15T09:00:00.000Z",
    createdAt: "2023-08-12T00:00:00.000Z"
  }
];

// Seed database if empty
export async function seedDatabaseIfEmpty() {
  // No-op: Disabled to reference actual database only as requested.
  console.log("Seeding disabled to reference actual user database only.");
}

// Fetch all fire extinguishers
export async function getExtinguishers(): Promise<FireExtinguisher[]> {
  try {
    const querySnapshot = await getDocs(collection(db, EXTINGUISHERS_COLLECTION));
    const items: FireExtinguisher[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push(mapFromFirestore({ id: docSnap.id, ...docSnap.data() }) as FireExtinguisher);
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
    const feDocRef = doc(db, EXTINGUISHERS_COLLECTION, extinguisher.id);
    
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
    handleFirestoreError(error, OperationType.CREATE, `${EXTINGUISHERS_COLLECTION}/${extinguisher.id}`);
  }
}

// Update a fire extinguisher
export async function updateExtinguisher(extinguisher: FireExtinguisher): Promise<void> {
  try {
    const feDocRef = doc(db, EXTINGUISHERS_COLLECTION, extinguisher.id);

    // Upload/Update profile photo to storage if present
    const uploadedPhotoUrl = await uploadExtinguisherProfilePhoto(extinguisher.id, extinguisher.photoUrl || "");

    const updatedExtinguisher = {
      ...extinguisher,
      photoUrl: uploadedPhotoUrl || null
    };

    await setDoc(feDocRef, mapToFirestore(updatedExtinguisher), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${EXTINGUISHERS_COLLECTION}/${extinguisher.id}`);
  }
}

// Delete a fire extinguisher
export async function deleteExtinguisher(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, EXTINGUISHERS_COLLECTION, id));
    
    // Also try to delete its inspections
    const q = query(collection(db, INSPECTIONS_COLLECTION), where("feId", "==", id));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.delete(doc(db, INSPECTIONS_COLLECTION, docSnap.id));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${EXTINGUISHERS_COLLECTION}/${id}`);
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

    // Calculate new status for the extinguisher based on the checklist
    let newStatus: FireExtinguisher['status'] = 'ปกติ';
    
    const isPass = 
      fullLog.checklist.pressure === 'ปกติ' &&
      fullLog.checklist.safetyPin === 'ปกติ' &&
      fullLog.checklist.hoseNozzle === 'ปกติ' &&
      fullLog.checklist.bodyCondition === 'ปกติ' &&
      fullLog.checklist.instructionLabel === 'ปกติ' &&
      fullLog.checklist.accessibility === 'ปกติ' &&
      fullLog.checklist.weightStatus === 'ปกติ';

    if (!isPass || fullLog.inspectionResult === 'ไม่ผ่าน') {
      newStatus = 'ชำรุด';
    } else {
      newStatus = 'ปกติ';
    }

    // Update Extinguisher's fields
    const feDocRef = doc(db, EXTINGUISHERS_COLLECTION, log.feId);
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
