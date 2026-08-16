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
 * Upload a single base64 image to Firebase Storage with timeout fallback
 */
async function uploadImageWithTimeout(
  path: string,
  base64Data: string,
  timeoutMs = 4000
): Promise<string> {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return base64Data;
  }

  const uploadTask = (async () => {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, base64Data, 'data_url');
    return await getDownloadURL(storageRef);
  })();

  const timeoutTask = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('Storage upload timed out')), timeoutMs)
  );

  try {
    return await Promise.race([uploadTask, timeoutTask]);
  } catch (error) {
    console.warn(`[Storage Warning] Skipped or fallback for ${path}:`, error);
    return base64Data;
  }
}

/**
 * Upload profile photo for fire extinguisher
 * Path: /fire_protection_system/extinguishers/{feId}_profile.jpg
 */
export async function uploadExtinguisherProfilePhoto(feId: string, base64Data: string): Promise<string> {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return base64Data;
  }
  const cleanId = feId.replace(/\//g, '_');
  const path = `fire_protection_system/extinguishers/${cleanId}_profile.jpg`;
  return await uploadImageWithTimeout(path, base64Data, 4000);
}

/**
 * Upload inspection photos and digital signature concurrently with fast timeout
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
  const yearMonth = getYearMonthFromDate(dateStr);
  const cleanFeId = feId.replace(/\//g, '_');

  const beforeTask = uploadImageWithTimeout(
    `fire_protection_system/inspections/${cleanFeId}/${yearMonth}_before.jpg`,
    beforeBase64,
    4000
  );

  const afterTask = uploadImageWithTimeout(
    `fire_protection_system/inspections/${cleanFeId}/${yearMonth}_after.jpg`,
    afterBase64,
    4000
  );

  const ext = signatureBase64.includes('image/png') ? 'png' : 'jpg';
  const signatureTask = uploadImageWithTimeout(
    `fire_protection_system/inspections/${cleanFeId}/${yearMonth}_signature.${ext}`,
    signatureBase64,
    4000
  );

  const [beforeUrl, afterUrl, signatureUrl] = await Promise.all([
    beforeTask,
    afterTask,
    signatureTask
  ]);

  return { beforeUrl, afterUrl, signatureUrl };
}
