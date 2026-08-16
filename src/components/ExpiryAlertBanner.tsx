import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, Clock, Bell, ChevronRight, X, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { ExpiryAlertItem } from '../lib/autoExpiryAlert';

interface ExpiryAlertBannerProps {
  alerts: ExpiryAlertItem[];
  onViewAlerts: () => void;
  onDismiss: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRequestNotificationPermission: () => void;
  hasNotificationPermission: boolean;
}

export default function ExpiryAlertBanner({
  alerts,
  onViewAlerts,
  onDismiss,
  soundEnabled,
  onToggleSound,
  onRequestNotificationPermission,
  hasNotificationPermission
}: ExpiryAlertBannerProps) {
  if (alerts.length === 0) return null;

  const expiredCount = alerts.filter(a => a.isExpired).length;
  const warningCount = alerts.filter(a => a.isWarning && !a.isExpired).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        className="w-full bg-gradient-to-r from-amber-950/90 via-slate-900 to-red-950/90 border border-amber-600/50 rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-amber-950/30 backdrop-blur-md mb-5 text-white relative overflow-hidden"
      >
        {/* Glow ambient background element */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-red-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          
          {/* Main Title & Counts */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner mt-0.5 sm:mt-0">
              <ShieldAlert size={22} className="animate-bounce" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wide">
                  ⚡ แจ้งเตือนอัตโนมัติ (Auto Alert)
                </span>
                {expiredCount > 0 && (
                  <span className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                    หมดอายุ {expiredCount} ถัง
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-100 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>ตรวจพบถังดับเพลิงที่ต้องเร่งดำเนินการ</span>
                <span className="text-amber-400 font-extrabold underline decoration-amber-500/50">
                  รวม {alerts.length} ถัง
                </span>
              </h4>

              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                {expiredCount > 0 && `มีถังหมดอายุแล้ว ${expiredCount} ถัง `}
                {warningCount > 0 && `และถังที่ใกล้หมดอายุใน 30 วัน ${warningCount} ถัง`}
              </p>
            </div>
          </div>

          {/* Action Buttons & Quick Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-amber-900/40 pt-2.5 sm:pt-0 shrink-0">
            
            {/* Toggle Sound */}
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={soundEnabled ? 'เปิดเสียงเตือนอัตโนมัติอยู่' : 'ปิดเสียงเตือน'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Browser Push Permission Request */}
            {!hasNotificationPermission && (
              <button
                onClick={onRequestNotificationPermission}
                className="hidden md:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/60 px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="เปิดการแจ้งเตือนบนเบราว์เซอร์มือถือ/คอมพิวเตอร์"
              >
                <Bell size={14} className="text-amber-400 animate-pulse" />
                <span>เปิดแจ้งเตือนเบราว์เซอร์</span>
              </button>
            )}

            {/* View Alerts Button */}
            <button
              onClick={onViewAlerts}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <span>ตรวจสอบถังเหล่านี้</span>
              <ChevronRight size={15} />
            </button>

            {/* Dismiss Banner */}
            <button
              onClick={onDismiss}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="ซ่อนคำเตือนนี้ชั่วคราว"
            >
              <X size={16} />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
