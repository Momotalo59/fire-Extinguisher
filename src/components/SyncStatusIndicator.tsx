import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Clock,
  HardDrive,
  Info,
  ChevronDown
} from 'lucide-react';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

interface SyncStatusIndicatorProps {
  syncState: SyncState;
  isOnline: boolean;
  lastSyncTime: Date | null;
  extinguishersCount: number;
  logsCount: number;
  onManualSync: () => Promise<void>;
  compact?: boolean;
  className?: string;
}

export default function SyncStatusIndicator({
  syncState,
  isOnline,
  lastSyncTime,
  extinguishersCount,
  logsCount,
  onManualSync,
  compact = false,
  className = ''
}: SyncStatusIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await onManualSync();
    } catch (err) {
      console.error('Manual sync error:', err);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'ยังไม่มีประวัติ';
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' น.';
  };

  // Determine styles & labels based on sync state & connectivity
  const effectiveState: SyncState = !isOnline ? 'offline' : (isManualSyncing ? 'syncing' : syncState);

  const config = {
    synced: {
      label: 'All data synced',
      thaiLabel: 'ซิงค์ข้อมูลสมบูรณ์',
      shortLabel: 'Synced',
      bg: 'bg-emerald-950/70 hover:bg-emerald-900/60',
      border: 'border-emerald-800/60 text-emerald-300',
      dotBg: 'bg-emerald-400',
      dotPing: 'bg-emerald-400',
      icon: <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />,
      description: 'ข้อมูลทั้งหมดถูกบันทึกและซิงค์ตรงกับระบบคลาวด์ Firebase แล้ว'
    },
    syncing: {
      label: 'Syncing...',
      thaiLabel: 'กำลังซิงค์ข้อมูล...',
      shortLabel: 'Syncing',
      bg: 'bg-sky-950/80 hover:bg-sky-900/70',
      border: 'border-sky-700/70 text-sky-200',
      dotBg: 'bg-sky-400',
      dotPing: 'bg-sky-400',
      icon: <RefreshCw size={13} className="text-sky-400 animate-spin shrink-0" />,
      description: 'กำลังรับ-ส่งข้อมูลกับ Cloud Firestore...'
    },
    offline: {
      label: 'Offline (Local Cache)',
      thaiLabel: 'ออฟไลน์ (โหมดแคช)',
      shortLabel: 'Offline',
      bg: 'bg-amber-950/80 hover:bg-amber-900/70',
      border: 'border-amber-700/80 text-amber-200',
      dotBg: 'bg-amber-400',
      dotPing: 'bg-amber-400',
      icon: <WifiOff size={13} className="text-amber-400 shrink-0" />,
      description: 'อุปกรณ์อยู่ในโหมดออฟไลน์ ระบบจะบันทึกข้อมูลลงเครื่องอัตโนมัติและส่งขึ้น Cloud เมื่อมีสัญญาณ'
    },
    error: {
      label: 'Sync Error',
      thaiLabel: 'การซิงค์ขัดข้อง',
      shortLabel: 'Error',
      bg: 'bg-rose-950/80 hover:bg-rose-900/70',
      border: 'border-rose-800 text-rose-200',
      dotBg: 'bg-rose-500',
      dotPing: 'bg-rose-500',
      icon: <AlertCircle size={13} className="text-rose-400 shrink-0" />,
      description: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ชั่วคราว ข้อมูลยังคงปลอดภัยในหน่วยความจำของเครื่อง'
    }
  }[effectiveState];

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id="sync-status-header-button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs ${config.bg} ${config.border}`}
        title={`สถานะการเชื่อมต่อ: ${config.thaiLabel} (คลิกเพื่อดูรายละเอียดและสั่งซิงค์)`}
      >
        {/* Pulsing indicator dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          {effectiveState === 'syncing' || effectiveState === 'synced' ? (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotPing}`}></span>
          ) : null}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotBg}`}></span>
        </span>

        {config.icon}

        {/* Text */}
        <span className="whitespace-nowrap font-sans font-semibold tracking-tight">
          {compact ? (
            <span>{config.shortLabel}</span>
          ) : (
            <>
              <span className="hidden lg:inline">{config.label}</span>
              <span className="inline lg:hidden">{config.shortLabel}</span>
            </>
          )}
        </span>

        <ChevronDown size={11} className={`opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Detail Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for closing popup */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3.5 sm:p-4 text-slate-200 overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${effectiveState === 'offline' ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-emerald-400'}`}>
                    {isOnline ? <CloudCheck size={16} /> : <CloudOff size={16} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>สถานะการซิงค์ข้อมูล</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${config.bg} ${config.border}`}>
                        {config.shortLabel}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Cloud Firestore & Offline Engine
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Details */}
              <div className="py-3 space-y-2.5 text-xs">
                {/* Network connectivity */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300">
                    {isOnline ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-amber-400" />}
                    <span className="text-[11px]">การเชื่อมต่อเครือข่าย:</span>
                  </div>
                  <span className={`text-[11px] font-bold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isOnline ? 'Online (อินเทอร์เน็ตพร้อม)' : 'Offline (ไม่มีอินเทอร์เน็ต)'}
                  </span>
                </div>

                {/* Last Synced */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock size={14} className="text-blue-400" />
                    <span className="text-[11px]">ซิงค์ล่าสุดเมื่อ:</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-100">
                    {formatLastSync(lastSyncTime)}
                  </span>
                </div>

                {/* Storage & Local Cache Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Database size={11} className="text-red-400" />
                      อุปกรณ์ในระบบ
                    </span>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {extinguishersCount} <span className="text-[10px] text-slate-400 font-normal">รายการ</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <HardDrive size={11} className="text-amber-400" />
                      บันทึกตรวจเช็ค
                    </span>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {logsCount} <span className="text-[10px] text-slate-400 font-normal">รายการ</span>
                    </div>
                  </div>
                </div>

                {/* Info Note for Inspector */}
                <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-[11px] text-slate-300 flex items-start gap-2">
                  <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed text-[10.5px]">
                    {effectiveState === 'offline' ? (
                      <span className="text-amber-200">
                        <strong>โหมดตรวจเช็คออฟไลน์:</strong> สามารถสแกนและกรอกผลตรวจได้ตามปกติ ข้อมูลจะถูกเก็บใน IndexedDB และซิงค์ขึ้นระบบเมื่อมีสัญญาณ
                      </span>
                    ) : (
                      <span>
                        <strong>ระบบพร้อมใช้งาน:</strong> ข้อมูลทั้งหมดซิงค์ตรงกับฐานข้อมูลส่วนกลางของโรงพยาบาลแบบเรียลไทม์
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: Force Sync Now */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  {effectiveState === 'synced' ? '✓ Synced & Secured' : 'Ready to Sync'}
                </span>
                
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isManualSyncing}
                  className="py-1.5 px-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw size={12} className={isManualSyncing ? 'animate-spin' : ''} />
                  <span>{isManualSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
