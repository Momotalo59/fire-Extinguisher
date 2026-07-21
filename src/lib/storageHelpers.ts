import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Get YYYYMM format from ISO date string
 */
function getYearMonthFromDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}${mm}`;
  } catch (e) {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Upload profile photo for fire extinguisher
 * Path: /fire_protection_system/extinguishers/{feId}_profile.jpg
 */
export async function uploadExtinguisherProfilePhoto(feId: string, base64Data: string): Promise<string> {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    // If empty or already a HTTP URL, return as-is
    return base64Data;
  }

  try {
    const path = `fire_protection_system/extinguishers/${feId}_profile.jpg`;
    const storageRef = ref(storage, path);
    
    // Upload base64 string
    await uploadString(storageRef, base64Data, 'data_url');
    
    // Get and return download URL
    const downloadUrl = await getDownloadURL(storageRef);
    console.log(`[Storage] Uploaded profile photo for ${feId} to ${path}`);
    return downloadUrl;
  } catch (error) {
    console.warn(`[Storage Warning] Failed to upload profile photo to Firebase Storage. Falling back to inline Base64 storage.`, error);
    // Return original base64 as fallback so the app does not break
    return base64Data;
  }
}

/**
 * Upload inspection photos and digital signature
 * Paths:
 * - /fire_protection_system/inspections/{feId}/{yearMonth}_before.jpg
 * - /fire_protection_system/inspections/{feId}/{yearMonth}_after.jpg
 * - /fire_protection_system/inspections/{feId}/{yearMonth}_signature.png
 */
export async function uploadInspectionPhotosAndSignature(
  feId: string,
  dateStr: string,
  beforeBase64: string,
  afterBase64: string,
  signatureBase64: string
): Promise<{ beforeUrl: string; afterUrl: string; signatureUrl: string }> {
  const result = {
    beforeUrl: beforeBase64,
    afterUrl: afterBase64,
    signatureUrl: signatureBase64,
  };

  const yearMonth = getYearMonthFromDate(dateStr);

  // 1. Upload Before Photo
  if (beforeBase64 && beforeBase64.startsWith('data:image/')) {
    try {
      const path = `fire_protection_system/inspections/${feId}/${yearMonth}_before.jpg`;
      const storageRef = ref(storage, path);
      await uploadString(storageRef, beforeBase64, 'data_url');
      result.beforeUrl = await getDownloadURL(storageRef);
      console.log(`[Storage] Uploaded before photo to ${path}`);
    } catch (error) {
      console.warn('[Storage Warning] Failed to upload before photo.', error);
    }
  }

  // 2. Upload After Photo
  if (afterBase64 && afterBase64.startsWith('data:image/')) {
    try {
      const path = `fire_protection_system/inspections/${feId}/${yearMonth}_after.jpg`;
      const storageRef = ref(storage, path);
      await uploadString(storageRef, afterBase64, 'data_url');
      result.afterUrl = await getDownloadURL(storageRef);
      console.log(`[Storage] Uploaded after photo to ${path}`);
    } catch (error) {
      console.warn('[Storage Warning] Failed to upload after photo.', error);
    }
  }

  // 3. Upload Digital Signature
  if (signatureBase64 && signatureBase64.startsWith('data:image/')) {
    try {
      // Determine file extension (usually base64 is image/png for signature pad)
      const extension = signatureBase64.includes('image/png') ? 'png' : 'jpg';
      const path = `fire_protection_system/inspections/${feId}/${yearMonth}_signature.${extension}`;
      const storageRef = ref(storage, path);
      await uploadString(storageRef, signatureBase64, 'data_url');
      result.signatureUrl = await getDownloadURL(storageRef);
      console.log(`[Storage] Uploaded signature to ${path}`);
    } catch (error) {
      console.warn('[Storage Warning] Failed to upload signature.', error);
    }
  }

  return result;
}
