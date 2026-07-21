import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Layers,
  MapPin,
  Camera,
  Compass,
  FileSignature
} from 'lucide-react';
import { InspectionLog, FireExtinguisher } from '../types';

interface LogHistoryProps {
  logs: InspectionLog[];
  extinguisher: FireExtinguisher | null;
}

export default function LogHistory({ logs, extinguisher }: LogHistoryProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' น.';
    } catch (e) {
      return isoString;
    }
  };

  if (!extinguisher) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
        <Layers size={32} className="text-slate-650 mb-2" />
        <p className="text-sm font-semibold text-slate-300">เลือกถังดับเพลิงเพื่อดูข้อมูลและประวัติ</p>
        <p className="text-xs mt-1 text-slate-550">คลิกเลือกถังในรายการด้านซ้ายเพื่อดูรายละเอียดประวัติการตรวจสอบอย่างละเอียด</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-full">
      {/* Title Header */}
      <div id="log-history-header" className="p-5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <History size={16} className="text-red-500" />
            ประวัติการตรวจเช็ค: <span className="font-mono text-red-500">{extinguisher.id}</span>
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
            COUNT: {logs.length}
          </span>
        </div>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">
          {extinguisher.building} • {extinguisher.floor} ({extinguisher.locationDetails})
        </p>
      </div>

      {/* Logs List */}
      <div id="log-history-list" className="flex-1 overflow-y-auto p-5 space-y-3">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full">
            <Info size={24} className="text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-400">ยังไม่มีประวัติการบันทึกสำหรับถังนี้</p>
            <p className="text-[11px] text-slate-550 mt-1">กดปุ่มไอคอนตรวจเช็คถัง เพื่อเริ่มบันทึกการตรวจสอบความปลอดภัย</p>
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.inspectionId;
            return (
              <div 
                key={log.inspectionId} 
                className={`border rounded-xl transition-all overflow-hidden ${
                  isExpanded ? 'border-slate-700 bg-slate-950 shadow-md' : 'border-slate-800 bg-slate-900 hover:bg-slate-850'
                }`}
              >
                {/* Accordion Trigger */}
                <div 
                  onClick={() => toggleExpand(log.inspectionId)}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wider ${
                        log.inspectionResult === 'ผ่าน' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' 
                          : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'
                      }`}>
                        {log.inspectionResult === 'ผ่าน' ? 'ผ่าน (PASS)' : 'ไม่ผ่าน (FAIL)'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {log.inspectionType || 'รายเดือน'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-300 mt-2 font-semibold">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-500" />
                        {log.inspectorName}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 font-mono">
                        <Calendar size={12} className="text-slate-500" />
                        {formatDate(log.inspectionDate)}
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-850 bg-slate-950 p-4 space-y-3.5"
                    >
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {/* Gauge */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-bold">1. เกจวัดความดัน</span>
                          <span className={`font-extrabold ${
                            log.checklist?.pressure === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {log.checklist?.pressure || 'ปกติ'}
                          </span>
                        </div>

                        {/* Safety Pin */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-bold">2. สลักนิรภัย/ซีล</span>
                          <span className={`font-extrabold ${
                            log.checklist?.safetyPin === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {log.checklist?.safetyPin || 'ปกติ'}
                          </span>
                        </div>

                        {/* Hose & Nozzle */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-bold">3. สายฉีด/หัวฉีด</span>
                          <span className={`font-extrabold ${
                            log.checklist?.hoseNozzle === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {log.checklist?.hoseNozzle || 'ปกติ'}
                          </span>
                        </div>

                        {/* Body status */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-bold">4. ตัวถังภายนอก</span>
                          <span className={`font-extrabold ${
                            log.checklist?.bodyCondition === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {log.checklist?.bodyCondition || 'ปกติ'}
                          </span>
                        </div>

                        {/* Instruction Label */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-bold">5. ป้ายแนะนำวิธีใช้</span>
                          <span className={`font-extrabold ${
                            log.checklist?.instructionLabel === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {log.checklist?.instructionLabel || 'ปกติ'}
                          </span>
                        </div>

                        {/* Accessibility */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-bold">6. สิ่งกีดขวางติดตั้ง</span>
                          <span className={`font-extrabold ${
                            log.checklist?.accessibility === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {log.checklist?.accessibility || 'ปกติ'}
                          </span>
                        </div>

                        {/* Weight Status */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-850 col-span-2">
                          <span className="text-slate-400 font-bold">7. ระดับน้ำหนักตัวถัง</span>
                          <span className={`font-extrabold ${
                            log.checklist?.weightStatus === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {log.checklist?.weightStatus === 'ปกติ' ? 'ปกติ (น้ำหนักเต็ม)' : 'ชำรุด (น้ำหนักพร่อง)'}
                          </span>
                        </div>
                      </div>

                      {/* GPS distance check */}
                      {log.inspectorGPS && (
                        <div className="p-2.5 bg-sky-950/40 border border-sky-900/50 rounded-lg text-xs flex items-center justify-between text-sky-300 font-medium font-mono">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Compass size={13} className="text-sky-400" />
                            ตรวจสอบระยะพิกัด GPS:
                          </span>
                          <span>
                            {log.distanceDiff ?? 0} เมตร (พิกัด: {log.inspectorGPS.latitude.toFixed(4)}, {log.inspectorGPS.longitude.toFixed(4)})
                          </span>
                        </div>
                      )}

                      {/* Photo evidence URLs */}
                      {((log.photos?.before) || (log.photos?.after)) && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                            <Camera size={12} className="text-slate-500" />
                            ภาพถ่ายหลักฐานบันทึกตรวจงาน (Photos)
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {log.photos?.before ? (
                              <div className="bg-slate-900 p-1 rounded-lg border border-slate-850">
                                <img 
                                  src={log.photos.before} 
                                  alt="ก่อนตรวจสอบ" 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-24 object-cover rounded" 
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                                <p className="text-[9px] text-center text-slate-500 mt-1 font-bold">ภาพก่อนตรวจ/ขณะตรวจ</p>
                              </div>
                            ) : null}
                            {log.photos?.after ? (
                              <div className="bg-slate-900 p-1 rounded-lg border border-slate-850">
                                <img 
                                  src={log.photos.after} 
                                  alt="หลังตรวจสอบ" 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-24 object-cover rounded" 
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                                <p className="text-[9px] text-center text-slate-500 mt-1 font-bold">ภาพถ่ายหลังตรวจเสร็จ</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Signature Name validation */}
                      {log.signatureUrl && (
                        <div className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <FileSignature size={12} className="text-slate-500" />
                            ลายมือชื่อกำกับ:
                          </span>
                          {log.signatureUrl.startsWith('data:image/') ? (
                            <div className="bg-slate-850 px-2 py-1 rounded border border-slate-700 flex items-center justify-center">
                              <img 
                                src={log.signatureUrl} 
                                alt="Signature" 
                                referrerPolicy="no-referrer"
                                className="h-8 max-w-[120px] object-contain invert brightness-200" 
                              />
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-300 font-mono italic">
                              {log.signatureUrl}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Remarks */}
                      {log.notes && (
                        <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">บันทึกเพิ่มเติมจากผู้ตรวจสอบ</p>
                          <p className="text-xs text-slate-250 mt-1 leading-relaxed font-semibold">{log.notes}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
