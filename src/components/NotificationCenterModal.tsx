import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, ShieldAlert, Volume2, VolumeX, Clock, Calendar, MapPin, ChevronRight, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { ExpiryAlertItem } from '../lib/autoExpiryAlert';
import { FireExtinguisher } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: ExpiryAlertItem[];
  allExtinguishers: FireExtinguisher[];
  onSelectExtinguisher: (id: string) => void;
  onInspectExtinguisher: (extinguisher: FireExtinguisher) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRequestNotificationPermission: () => void;
  hasNotificationPermission: boolean;
}

export default function NotificationCenterModal({
  isOpen,
  onClose,
  alerts,
  allExtinguishers,
  onSelectExtinguisher,
  onInspectExtinguisher,
  soundEnabled,
  onToggleSound,
  onRequestNotificationPermission,
  hasNotificationPermission
}: NotificationCenterModalProps) {
  if (!isOpen) return null;

  // Other damaged/low pressure tanks
  const damagedOrLowPressure = allExtinguishers.filter(
    e => e.status === 'ชำรุด' || e.status === 'แรงดันต่ำ'
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-white"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400 flex items-center justify-center shadow-inner">
                <Bell size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>ศูนย์แจ้งเตือนถังดับเพลิงอัตโนมัติ</span>
                  <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/30 font-mono">
                    {alerts.length + damagedOrLowPressure.length} รายการ
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  ระบบตรวจเช็ควันหมดอายุและสถานะอุปกรณ์พร้อมใช้งานแบบเรียลไทม์
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Settings Bar */}
          <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">การตั้งค่าการแจ้งเตือน:</span>
              
              <button
                onClick={onToggleSound}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                <span>{soundEnabled ? 'เปิดเสียงเตือน' : 'ปิดเสียงเตือน'}</span>
              </button>
            </div>

            <button
              onClick={onRequestNotificationPermission}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                hasNotificationPermission
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                  : 'bg-red-950/40 text-red-300 border-red-800/60 hover:bg-red-900/40'
              }`}
            >
              <Bell size={13} />
              <span>{hasNotificationPermission ? 'เบราว์เซอร์อนุญาตแล้ว' : 'ขอสิทธิ์แจ้งเตือนเบราว์เซอร์'}</span>
            </button>
          </div>

          {/* Alert List Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* Section 1: Expiring & Expired Tanks */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>ถังหมดอายุ / ใกล้หมดอายุ ({alerts.length})</span>
                </h4>
              </div>

              {alerts.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-center text-slate-400 text-xs">
                  <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-400" />
                  <p>ไม่พบถังดับเพลิงที่หมดอายุหรือใกล้หมดอายุในระยะ 30 วัน</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((item) => {
                    const ext = item.extinguisher;
                    const isExpired = item.isExpired;
                    return (
                      <div
                        key={ext.id}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          isExpired
                            ? 'bg-red-950/30 border-red-900/60 hover:border-red-600/80'
                            : 'bg-amber-950/20 border-amber-900/50 hover:border-amber-600/80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                            isExpired ? 'bg-red-600/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}>
                            {isExpired ? <AlertOctagon size={18} /> : <Clock size={18} />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-white">{ext.id}</span>
                              <span className="text-xs font-medium text-slate-400">({ext.type} • {ext.size})</span>
                              
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isExpired
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}>
                                {isExpired 
                                  ? `หมดอายุแล้ว (ผ่านมา ${Math.abs(item.daysRemaining)} วัน)` 
                                  : `ใกล้หมดอายุ (เหลืออีก ${item.daysRemaining} วัน)`}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
                              <MapPin size={12} className="text-slate-400 shrink-0" />
                              <span>{ext.building} {ext.floor} — {ext.locationDetails}</span>
                            </p>

                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Calendar size={11} className="text-slate-500" />
                              <span>วันหมดอายุตามกำหนด: {ext.expiryDate ? new Date(ext.expiryDate).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => {
                              onSelectExtinguisher(ext.id);
                              onClose();
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                          >
                            ดูรายละเอียด
                          </button>
                          
                          <button
                            onClick={() => {
                              onInspectExtinguisher(ext);
                              onClose();
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                          >
                            <span>ตรวจเช็คถังนี้</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Damaged / Low Pressure Tanks */}
            {damagedOrLowPressure.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-2.5">
                  <AlertTriangle size={14} />
                  <span>ถังชำรุด / แรงดันต่ำ ({damagedOrLowPressure.length})</span>
                </h4>

                <div className="space-y-2">
                  {damagedOrLowPressure.map((ext) => (
                    <div
                      key={ext.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{ext.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            ext.status === 'ชำรุด'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {ext.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">{ext.building} {ext.floor} — {ext.locationDetails}</p>
                      </div>

                      <button
                        onClick={() => {
                          onInspectExtinguisher(ext);
                          onClose();
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/50 px-2.5 py-1 rounded-xl font-bold text-xs shrink-0 cursor-pointer"
                      >
                        ตรวจเช็คซ้ำ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
            <span>* ระบบจะตรวจสอบและอัปเดตสถานะถังดับเพลิงให้อัตโนมัติทุกครั้งที่เปิดใช้งาน</span>
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
