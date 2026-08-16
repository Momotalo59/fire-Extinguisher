import { FireExtinguisher } from '../types';
import { updateExtinguisher } from './dbHelpers';

export interface ExpiryAlertItem {
  extinguisher: FireExtinguisher;
  daysRemaining: number;
  isExpired: boolean;
  isWarning: boolean; // <= 30 days
}

// Calculate days remaining until expiry
export function getDaysUntilExpiry(expiryDateStr?: string | null): number {
  if (!expiryDateStr) return 9999;
  const expDate = new Date(expiryDateStr);
  if (isNaN(expDate.getTime())) return 9999;
  
  const now = new Date();
  // Reset time to start of day for accurate day calculation
  now.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get list of expiring or expired extinguishers
export function checkExpiringExtinguishers(extinguishers: FireExtinguisher[], warningDaysThreshold = 30): ExpiryAlertItem[] {
  const alerts: ExpiryAlertItem[] = [];

  extinguishers.forEach((ext) => {
    const days = getDaysUntilExpiry(ext.expiryDate);
    const isExpired = days <= 0;
    const isWarning = days > 0 && days <= warningDaysThreshold;

    if (isExpired || isWarning || ext.status === 'ใกล้หมดอายุ' || ext.status === 'หมดอายุ') {
      alerts.push({
        extinguisher: ext,
        daysRemaining: days,
        isExpired,
        isWarning
      });
    }
  });

  // Sort by days remaining (most urgent first)
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// Auto-sync statuses in Firestore if expiry date has arrived/nearing, but status is still 'ปกติ'
export async function autoSyncExpiryStatuses(
  extinguishers: FireExtinguisher[],
  onDataRefreshed?: () => Promise<void>
): Promise<number> {
  let updatedCount = 0;

  for (const ext of extinguishers) {
    // Only auto-update if status is currently 'ปกติ' or 'ใกล้หมดอายุ' or 'หมดอายุ'
    // (Preserve 'ชำรุด' or 'ส่งซ่อม' or 'แรงดันต่ำ' which indicate physical damage)
    if (ext.status === 'ปกติ' || ext.status === 'ใกล้หมดอายุ' || ext.status === 'หมดอายุ') {
      const days = getDaysUntilExpiry(ext.expiryDate);
      let newStatus: FireExtinguisher['status'] | null = null;

      if (days <= 0 && ext.status !== 'หมดอายุ') {
        newStatus = 'หมดอายุ';
      } else if (days > 0 && days <= 30 && ext.status !== 'ใกล้หมดอายุ') {
        newStatus = 'ใกล้หมดอายุ';
      } else if (days > 30 && (ext.status === 'ใกล้หมดอายุ' || ext.status === 'หมดอายุ')) {
        // If expiry date was extended/updated
        newStatus = 'ปกติ';
      }

      if (newStatus && newStatus !== ext.status) {
        try {
          await updateExtinguisher({
            ...ext,
            status: newStatus
          });
          updatedCount++;
        } catch (err) {
          console.error(`Failed to auto-update status for ${ext.id}:`, err);
        }
      }
    }
  }

  if (updatedCount > 0 && onDataRefreshed) {
    await onDataRefreshed();
  }

  return updatedCount;
}

// Web Audio API Sound Synthesizer Chime for Auto Alerts
export function playAlertChimeSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Friendly warning chime sequence (A5 -> C6 -> E6)
    playNote(880, now, 0.2);
    playNote(1046.5, now + 0.15, 0.2);
    playNote(1318.5, now + 0.3, 0.35);
  } catch (e) {
    console.warn("Audio Context playback prevented or unsupported:", e);
  }
}

// Browser Push Notification Helper
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function sendBrowserExpiryNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'fire-extinguisher-expiry-alert'
      });
    } catch (e) {
      console.warn("Notification trigger failed:", e);
    }
  }
}
