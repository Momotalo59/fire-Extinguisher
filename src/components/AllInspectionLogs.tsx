import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Camera, 
  FileSignature, 
  Download,
  Building2,
  BookmarkCheck,
  FileSpreadsheet
} from 'lucide-react';
import { InspectionLog, FireExtinguisher } from '../types';

interface AllInspectionLogsProps {
  logs: InspectionLog[];
  extinguishers: FireExtinguisher[];
}

export default function AllInspectionLogs({ logs, extinguishers }: AllInspectionLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<'All' | 'ผ่าน' | 'ไม่ผ่าน'>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
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

  // Helper to find building/location info for an extinguisher in logs
  const getExtinguisherInfo = (feId: string) => {
    const ext = extinguishers.find(e => e.id === feId);
    return ext ? `${ext.building} • ชั้น ${ext.floor}` : 'ไม่พบข้อมูลสถานที่';
  };

  const getExtinguisherType = (feId: string) => {
    const ext = extinguishers.find(e => e.id === feId);
    return ext ? ext.type : '';
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.feId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.inspectorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesResult = resultFilter === 'All' || log.inspectionResult === resultFilter;
    const matchesType = typeFilter === 'All' || log.inspectionType === typeFilter;

    return matchesSearch && matchesResult && matchesType;
  });

  // Export to CSV Helper
  const handleExportCSV = () => {
    try {
      const headers = ['รหัสใบตรวจสอบ', 'รหัสถังดับเพลิง', 'ประเภทถัง', 'ประเภทการตรวจ', 'ผู้ตรวจเช็ค', 'วันที่ตรวจเช็ค', 'ผลการตรวจสอบ', 'หมายเหตุ'];
      const rows = filteredLogs.map(log => [
        log.inspectionId,
        log.feId,
        getExtinguisherType(log.feId),
        log.inspectionType,
        log.inspectorName,
        new Date(log.inspectionDate).toLocaleString('th-TH'),
        log.inspectionResult,
        log.notes || '-'
      ]);

      const csvContent = "\uFEFF" + [
        headers.join(','),
        ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `fire_safe_inspection_history_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV Export Failed:", err);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col min-h-[500px]">
      
      {/* Search and Filters panel */}
      <div className="p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <History className="text-red-500" size={18} />
              <span>ประวัติบันทึกการตรวจเช็คทั้งหมดในระบบ ({filteredLogs.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-semibold">
              ดูประวัติการดำเนินงาน ตรวจเช็คสถานะ อัปโหลดรูปภาพ และลายเซ็นดิจิทัลของผู้ตรวจสอบความปลอดภัย
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="self-start sm:self-center py-1.5 px-3.5 bg-slate-950 hover:bg-slate-850 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-850 text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-800 shadow-xs"
          >
            <FileSpreadsheet size={13} className="text-emerald-400" />
            <span>ส่งออกรายการคัดกรอง (CSV)</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={13} />
            </div>
            <input
              type="text"
              placeholder="ค้นหาด้วยรหัสถัง, ชื่อผู้ตรวจสอบ, หรือบันทึกข้อความ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none placeholder-slate-500 text-slate-200 bg-slate-950"
            />
          </div>

          {/* Result Filter */}
          <div className="sm:col-span-3 relative">
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none text-slate-200 bg-slate-950 appearance-none cursor-pointer font-medium"
            >
              <option value="All">ทุกผลลัพธ์ (ผ่าน/ไม่ผ่าน)</option>
              <option value="ผ่าน">เฉพาะที่ ผ่าน (PASS)</option>
              <option value="ไม่ผ่าน">เฉพาะที่ ไม่ผ่าน (FAIL)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-3 relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none text-slate-200 bg-slate-950 appearance-none cursor-pointer font-medium"
            >
              <option value="All">ทุกรอบการตรวจ</option>
              <option value="รายเดือน">รอบตรวจรายเดือน</option>
              <option value="ก่อนเปิดอาคาร">รอบตรวจก่อนเปิดอาคาร</option>
              <option value="ประจำปี">รอบตรวจประจำปี</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table / Accordion List */}
      <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-800">
        {filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <History size={32} className="text-slate-650 mx-auto mb-2 animate-pulse" />
            <p className="text-sm font-bold text-slate-400">ไม่พบประวัติการตรวจตามเงื่อนไขที่ระบุ</p>
            <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองด้านบนเพื่อขยายขอบเขตการแสดงผล</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.inspectionId;
            const extinguisherType = getExtinguisherType(log.feId);
            return (
              <div 
                key={log.inspectionId} 
                className={`transition-all ${
                  isExpanded ? 'bg-slate-950' : 'bg-slate-900 hover:bg-slate-850/60'
                }`}
              >
                {/* Accordion Row Trigger */}
                <div 
                  onClick={() => toggleExpand(log.inspectionId)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-white font-mono tracking-tight bg-slate-850 py-0.5 px-2 rounded border border-slate-750">
                        {log.feId}
                      </span>
                      {extinguisherType && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {extinguisherType}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded tracking-wider border ${
                        log.inspectionResult === 'ผ่าน' 
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                          : 'bg-rose-950/40 text-rose-400 border-rose-900/50'
                      }`}>
                        {log.inspectionResult === 'ผ่าน' ? 'ผ่าน (PASS)' : 'ไม่ผ่าน (FAIL)'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {log.inspectionType || 'รายเดือน'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 mt-2.5 font-semibold">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Building2 size={13} className="text-slate-500" />
                        {getExtinguisherInfo(log.feId)}
                      </span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <User size={13} className="text-slate-500" />
                        ผู้ตรวจ: {log.inspectorName}
                      </span>
                      <span className="flex items-center gap-1 text-slate-450 font-mono">
                        <Calendar size={13} className="text-slate-500" />
                        {formatDate(log.inspectionDate)}
                      </span>
                    </div>

                    {log.notes && (
                      <p className="text-xs text-slate-400 mt-2 bg-slate-950 border border-slate-850 rounded-lg p-2 max-w-xl truncate">
                        <strong className="text-slate-300">หมายเหตุ:</strong> {log.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center text-slate-400">
                    <span className="text-[10px] text-slate-500 font-semibold font-mono hidden md:inline">ID: {log.inspectionId.substring(0, 8)}...</span>
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
                      className="border-t border-slate-850 bg-slate-950 p-5 space-y-4"
                    >
                      {/* Grid Checklist Results */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                          <BookmarkCheck size={14} className="text-red-500" />
                          <span>รายการเช็คลิสต์ด้านวิศวกรรมความปลอดภัย (Safety Checklist Items)</span>
                        </h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {/* 1. Pressure Gauge */}
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] text-slate-500 font-bold">1. เกจวัดแรงดัน</span>
                            <span className={`text-xs font-extrabold mt-1.5 ${
                              log.checklist?.pressure === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {log.checklist?.pressure || 'ปกติ'}
                            </span>
                          </div>

                          {/* 2. Safety Pin */}
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] text-slate-500 font-bold">2. สลักนิรภัย/ซีล</span>
                            <span className={`text-xs font-extrabold mt-1.5 ${
                              log.checklist?.safetyPin === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {log.checklist?.safetyPin || 'ปกติ'}
                            </span>
                          </div>

                          {/* 3. Hose & Nozzle */}
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] text-slate-500 font-bold">3. สายฉีดและหัวฉีด</span>
                            <span className={`text-xs font-extrabold mt-1.5 ${
                              log.checklist?.hoseNozzle === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {log.checklist?.hoseNozzle || 'ปกติ'}
                            </span>
                          </div>

                          {/* 4. Body Condition */}
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] text-slate-500 font-bold">4. สภาพตัวถังภายนอก</span>
                            <span className={`text-xs font-extrabold mt-1.5 ${
                              log.checklist?.bodyCondition === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {log.checklist?.bodyCondition || 'ปกติ'}
                            </span>
                          </div>

                          {/* 5. Instruction Label */}
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] text-slate-500 font-bold">5. ป้ายแนะนำวิธีใช้งาน</span>
                            <span className={`text-xs font-extrabold mt-1.5 ${
                              log.checklist?.instructionLabel === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {log.checklist?.instructionLabel || 'ปกติ'}
                            </span>
                          </div>

                          {/* 6. Accessibility */}
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] text-slate-500 font-bold">6. การเข้าถึงได้ง่าย</span>
                            <span className={`text-xs font-extrabold mt-1.5 ${
                              log.checklist?.accessibility === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {log.checklist?.accessibility || 'ปกติ'}
                            </span>
                          </div>

                          {/* 7. Weight Status */}
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex flex-col justify-between shadow-sm">
                            <span className="text-[10px] text-slate-500 font-bold">7. น้ำหนักก๊าซ/เคมี</span>
                            <span className={`text-xs font-extrabold mt-1.5 ${
                              log.checklist?.weightStatus === 'ปกติ' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {log.checklist?.weightStatus || 'ปกติ'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Photo Evidences & Signature & Metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Photos */}
                        <div className="md:col-span-6 space-y-2">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                            <Camera size={14} className="text-slate-500" />
                            ภาพถ่ายหลักฐานก่อนและหลังตรวจ
                          </span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] text-slate-500 font-extrabold mb-1">ภาพถ่ายก่อนตรวจ (Before)</p>
                              {log.photos?.before ? (
                                <div className="aspect-video bg-slate-900 border border-slate-850 rounded-xl overflow-hidden relative">
                                  <img 
                                    src={log.photos.before} 
                                    alt="Before inspection" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-video bg-slate-900 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-semibold">
                                  ไม่มีภาพถ่าย
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-[10px] text-slate-500 font-extrabold mb-1">ภาพถ่ายหลังตรวจ (After)</p>
                              {log.photos?.after ? (
                                <div className="aspect-video bg-slate-900 border border-slate-850 rounded-xl overflow-hidden relative">
                                  <img 
                                    src={log.photos.after} 
                                    alt="After inspection" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-video bg-slate-900 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-semibold">
                                  ไม่มีภาพถ่าย
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Signature & Location GPS info */}
                        <div className="md:col-span-6 flex flex-col md:flex-row gap-4">
                          {/* Location metadata */}
                          <div className="flex-1 space-y-2">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={14} className="text-slate-500" />
                              ข้อมูลระบุพิกัดและระยะห่าง
                            </span>
                            <div className="bg-slate-900 rounded-xl border border-slate-850 p-3 text-[11px] space-y-2 h-full justify-center flex flex-col font-medium text-slate-300">
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-bold">พิกัด GPS:</span>
                                <span className="font-mono text-slate-200">
                                  {log.inspectorGPS ? `${log.inspectorGPS.latitude.toFixed(5)}, ${log.inspectorGPS.longitude.toFixed(5)}` : 'ไม่มีข้อมูล'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-bold">ระยะห่างจากตําแหน่งติดตั้ง:</span>
                                <span className={`font-mono font-bold ${log.distanceDiff > 10 ? 'text-amber-400' : 'text-slate-200'}`}>
                                  {log.distanceDiff ? `${log.distanceDiff.toFixed(1)} เมตร` : '0 เมตร (ตรวจสอบ ณ จุดติดตั้ง)'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-bold">หมายเลขตรวจสอบ:</span>
                                <span className="font-mono text-slate-500 text-[10px] break-all max-w-[130px]">
                                  {log.inspectionId}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Digital Signature */}
                          <div className="w-full md:w-44 space-y-2">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                              <FileSignature size={14} className="text-slate-500" />
                              ลายเซ็นดิจิทัลผู้เช็ค
                            </span>
                            <div className="aspect-video md:aspect-square bg-slate-900 border border-slate-850 rounded-xl p-2 flex flex-col items-center justify-center relative shadow-sm overflow-hidden">
                              {log.signatureUrl ? (
                                <img 
                                  src={log.signatureUrl} 
                                  alt="Inspector signature" 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain invert brightness-200"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-500 font-semibold">ไม่มีภาพลายเซ็น</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

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
