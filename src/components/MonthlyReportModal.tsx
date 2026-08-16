import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Download,
  Calendar,
  Building2,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Shield,
  FileCheck,
  Eye,
  Printer,
  Sparkles,
  Search
} from 'lucide-react';
import { FireExtinguisher, InspectionLog, AssetType } from '../types';
import { HOSPITAL_BUILDINGS, ASSET_CATEGORIES, getAssetCategory, getAssetIcon } from '../lib/assetHelpers';
import { exportMonthlyInspectionReportPDF, formatThaiDate } from '../lib/exportUtils';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  extinguishers: FireExtinguisher[];
  logs: InspectionLog[];
  initialBuilding?: string;
  initialCategory?: string;
  defaultInspectorName?: string;
}

const THAI_MONTHS = [
  { value: '01', name: 'มกราคม' },
  { value: '02', name: 'กุมภาพันธ์' },
  { value: '03', name: 'มีนาคม' },
  { value: '04', name: 'เมษายน' },
  { value: '05', name: 'พฤษภาคม' },
  { value: '06', name: 'มิถุนายน' },
  { value: '07', name: 'กรกฎาคม' },
  { value: '08', name: 'สิงหาคม' },
  { value: '09', name: 'กันยายน' },
  { value: '10', name: 'ตุลาคม' },
  { value: '11', name: 'พฤศจิกายน' },
  { value: '12', name: 'ธันวาคม' },
];

export default function MonthlyReportModal({
  isOpen,
  onClose,
  extinguishers,
  logs,
  initialBuilding = 'All',
  initialCategory = 'All',
  defaultInspectorName = 'นายช่างเทคนิคประจำเวร'
}: MonthlyReportModalProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

  // Report configuration states
  const [reportMode, setReportMode] = useState<'monthly' | 'custom'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  
  // Custom Date Range
  const [startDate, setStartDate] = useState<string>(() => {
    const firstDay = new Date(currentYear, currentDate.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return currentDate.toISOString().split('T')[0];
  });

  // Scope Filters
  const [selectedBuilding, setSelectedBuilding] = useState<string>(initialBuilding);
  const [selectedFloor, setSelectedFloor] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedResult, setSelectedResult] = useState<'All' | 'ผ่าน' | 'ไม่ผ่าน'>('All');

  // Signatures & Metadata
  const [inspectorName, setInspectorName] = useState<string>(defaultInspectorName);
  const [inspectorPosition, setInspectorPosition] = useState<string>('เจ้าหน้าที่ตรวจสอบความปลอดภัย / ช่างเทคนิค');
  const [approverName, setApproverName] = useState<string>('นายช่างเทคนิคหัวหน้างาน');
  const [approverPosition, setApproverPosition] = useState<string>('หัวหน้าแผนกช่างเทคนิคและควบคุมระบบอาคาร');
  const [reportNotes, setReportNotes] = useState<string>('อุปกรณ์ส่วนใหญ่อยู่ในสภาพพร้อมใช้งานตามมาตรฐานความปลอดภัย');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Available floors for selected building
  const availableFloors = useMemo(() => {
    const targetExts = selectedBuilding === 'All'
      ? extinguishers
      : extinguishers.filter(e => (e.building || '').trim() === selectedBuilding.trim());

    const floorSet = new Set<string>();
    targetExts.forEach(e => {
      if (e.floor && e.floor.trim()) {
        floorSet.add(e.floor.trim());
      }
    });

    return Array.from(floorSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [extinguishers, selectedBuilding]);

  // If selected floor is not in available floors, reset to All
  React.useEffect(() => {
    if (selectedFloor !== 'All' && !availableFloors.includes(selectedFloor)) {
      setSelectedFloor('All');
    }
  }, [availableFloors, selectedFloor]);

  // Filter logs based on date range and selected scope
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.inspectionDate);
      if (isNaN(logDate.getTime())) return false;

      // 1. Date filter
      if (reportMode === 'monthly') {
        const logYear = logDate.getFullYear();
        const logMonth = String(logDate.getMonth() + 1).padStart(2, '0');
        if (logYear !== selectedYear || logMonth !== selectedMonth) {
          return false;
        }
      } else {
        const logDateStr = logDate.toISOString().split('T')[0];
        if (logDateStr < startDate || logDateStr > endDate) {
          return false;
        }
      }

      // 2. Extinguisher match for building, floor, category
      const ext = extinguishers.find(e => e.id === log.feId);
      if (ext) {
        if (selectedBuilding !== 'All' && (ext.building || '').trim() !== selectedBuilding.trim()) {
          return false;
        }
        if (selectedFloor !== 'All' && (ext.floor || '').trim() !== selectedFloor.trim()) {
          return false;
        }
        const cat = getAssetCategory(ext);
        if (selectedCategory !== 'All' && cat !== selectedCategory) {
          return false;
        }
      } else {
        if (selectedBuilding !== 'All' || selectedFloor !== 'All' || selectedCategory !== 'All') {
          return false;
        }
      }

      // 3. Result filter
      if (selectedResult !== 'All' && log.inspectionResult !== selectedResult) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime());
  }, [logs, extinguishers, reportMode, selectedYear, selectedMonth, startDate, endDate, selectedBuilding, selectedFloor, selectedCategory, selectedResult]);

  // Filtered equipment inventory in the selected scope
  const scopedExtinguishers = useMemo(() => {
    return extinguishers.filter(ext => {
      if (selectedBuilding !== 'All' && (ext.building || '').trim() !== selectedBuilding.trim()) {
        return false;
      }
      if (selectedFloor !== 'All' && (ext.floor || '').trim() !== selectedFloor.trim()) {
        return false;
      }
      const cat = getAssetCategory(ext);
      if (selectedCategory !== 'All' && cat !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [extinguishers, selectedBuilding, selectedFloor, selectedCategory]);

  // Statistics calculation for the report
  const reportStats = useMemo(() => {
    const totalEquipment = scopedExtinguishers.length;
    const inspectedExtIds = new Set(filteredLogs.map(l => l.feId));
    const inspectedCount = inspectedExtIds.size;
    const pendingCount = Math.max(0, totalEquipment - inspectedCount);
    
    let passLogsCount = 0;
    let failLogsCount = 0;

    filteredLogs.forEach(l => {
      if (l.inspectionResult === 'ผ่าน') {
        passLogsCount++;
      } else {
        failLogsCount++;
      }
    });

    const completionRate = totalEquipment > 0 ? Math.round((inspectedCount / totalEquipment) * 100) : 0;
    const passRate = filteredLogs.length > 0 ? Math.round((passLogsCount / filteredLogs.length) * 100) : 0;

    // Breakdown per category
    const categoryStats: Record<string, { total: number; inspected: number; pass: number; fail: number }> = {};
    ASSET_CATEGORIES.forEach(c => {
      categoryStats[c.id] = { total: 0, inspected: 0, pass: 0, fail: 0 };
    });

    scopedExtinguishers.forEach(ext => {
      const cat = getAssetCategory(ext);
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, inspected: 0, pass: 0, fail: 0 };
      }
      categoryStats[cat].total++;
      if (inspectedExtIds.has(ext.id)) {
        categoryStats[cat].inspected++;
      }
    });

    filteredLogs.forEach(l => {
      const ext = extinguishers.find(e => e.id === l.feId);
      const cat = ext ? getAssetCategory(ext) : 'ถังดับเพลิง';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, inspected: 0, pass: 0, fail: 0 };
      }
      if (l.inspectionResult === 'ผ่าน') {
        categoryStats[cat].pass++;
      } else {
        categoryStats[cat].fail++;
      }
    });

    return {
      totalEquipment,
      inspectedCount,
      pendingCount,
      totalInspectionEvents: filteredLogs.length,
      passLogsCount,
      failLogsCount,
      completionRate,
      passRate,
      categoryStats
    };
  }, [scopedExtinguishers, filteredLogs, extinguishers]);

  // Formatted report title string
  const reportPeriodLabel = useMemo(() => {
    if (reportMode === 'monthly') {
      const mName = THAI_MONTHS.find(m => m.value === selectedMonth)?.name || selectedMonth;
      return `ประจำเดือน ${mName} พ.ศ. ${selectedYear + 543}`;
    } else {
      const startThai = new Date(startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      const endThai = new Date(endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      return `ช่วงวันที่ ${startThai} ถึง ${endThai}`;
    }
  }, [reportMode, selectedMonth, selectedYear, startDate, endDate]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportMonthlyInspectionReportPDF({
        periodLabel: reportPeriodLabel,
        reportMode,
        year: selectedYear,
        monthName: THAI_MONTHS.find(m => m.value === selectedMonth)?.name || selectedMonth,
        building: selectedBuilding,
        floor: selectedFloor,
        category: selectedCategory,
        stats: reportStats,
        logs: filteredLogs,
        scopedExtinguishers,
        allExtinguishers: extinguishers,
        inspectorName,
        inspectorPosition,
        approverName,
        approverPosition,
        reportNotes
      });
    } catch (err) {
      console.error('Export Monthly PDF failed:', err);
      alert('เกิดข้อผิดพลาดในการสร้างรายงาน PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-950/80 border border-red-900/80 rounded-xl text-red-400">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>ออกรายงานสรุปผลการตรวจเช็ค (PDF Report)</span>
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-900/60 font-mono py-0.5 px-2 rounded-full">
                  MONTHLY AUDIT
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                สร้างรายงานสรุปสถานะการตรวจเช็คอุปกรณ์ความปลอดภัยและระงับอัคคีภัยตามรอบเวลา
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 divide-y divide-slate-800/80 flex-1">
          
          {/* Section 1: Period Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Calendar size={14} className="text-red-400" />
                <span>1. เลือกช่วงเวลาการออกรายงาน</span>
              </label>
              
              {/* Report Mode Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReportMode('monthly')}
                  className={`py-1 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    reportMode === 'monthly'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ประจำเดือน (Monthly)
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode('custom')}
                  className={`py-1 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    reportMode === 'custom'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  กำหนดช่วงวันที่ (Custom)
                </button>
              </div>
            </div>

            {reportMode === 'monthly' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    เลือกเดือนที่ต้องการสรุป:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl py-2 px-3 focus:ring-1 focus:ring-red-500 focus:outline-none cursor-pointer"
                  >
                    {THAI_MONTHS.map(m => (
                      <option key={m.value} value={m.value}>เดือน {m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    เลือกปี พ.ศ. / ค.ศ.:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl py-2 px-3 focus:ring-1 focus:ring-red-500 focus:outline-none cursor-pointer"
                  >
                    {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                      <option key={y} value={y}>พ.ศ. {y + 543} ({y})</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    ตั้งแต่วันที่:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl py-2 px-3 focus:ring-1 focus:ring-red-500 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    ถึงวันที่:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl py-2 px-3 focus:ring-1 focus:ring-red-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Scope & Location Filters */}
          <div className="space-y-3 pt-4">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Filter size={14} className="text-blue-400" />
              <span>2. ขอบเขตสถานที่และประเภทอุปกรณ์ (Scope Filters)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Building selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  อาคาร:
                </label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl py-2 px-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="All">ทุกอาคารรวม</option>
                  {HOSPITAL_BUILDINGS.map(b => (
                    <option key={b.id} value={b.name}>{b.icon} {b.name}</option>
                  ))}
                </select>
              </div>

              {/* Floor selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  ชั้น (Floor):
                </label>
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl py-2 px-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="All">ทุกชั้น ({availableFloors.length} ชั้น)</option>
                  {availableFloors.map(fl => (
                    <option key={fl} value={fl}>{fl}</option>
                  ))}
                </select>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  ประเภทอุปกรณ์:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl py-2 px-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="All">ทุกประเภทอุปกรณ์</option>
                  {ASSET_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.id}</option>
                  ))}
                </select>
              </div>

              {/* Inspection result filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  ผลการตรวจ:
                </label>
                <select
                  value={selectedResult}
                  onChange={(e) => setSelectedResult(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl py-2 px-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="All">ทั้งหมด (ผ่านและไม่ผ่าน)</option>
                  <option value="ผ่าน">เฉพาะที่ผ่านเกณฑ์ (PASS)</option>
                  <option value="ไม่ผ่าน">เฉพาะที่พบปัญหา (FAIL)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Summary KPI Statistics Preview */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileCheck size={14} className="text-emerald-400" />
                <span>3. สรุปสถิติข้อมูลที่จะรวมในรายงาน ({reportPeriodLabel})</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                พบข้อมูลบันทึก <strong className="text-white">{filteredLogs.length}</strong> รายการ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <span className="text-[10px] font-semibold text-slate-400">อุปกรณ์ในขอบเขต</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold text-white">{reportStats.totalEquipment}</span>
                  <span className="text-[10px] text-slate-400">รายการ</span>
                </div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl">
                <span className="text-[10px] font-semibold text-emerald-400">ตรวจแล้วในงวด</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold text-emerald-400">{reportStats.inspectedCount}</span>
                  <span className="text-[10px] text-emerald-400/80 font-bold">({reportStats.completionRate}%)</span>
                </div>
              </div>

              <div className="bg-blue-950/40 border border-blue-800/60 p-3 rounded-xl">
                <span className="text-[10px] font-semibold text-blue-400">ผ่านเกณฑ์ (PASS)</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold text-blue-400">{reportStats.passLogsCount}</span>
                  <span className="text-[10px] text-blue-400/80 font-bold">({reportStats.passRate}%)</span>
                </div>
              </div>

              <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl">
                <span className="text-[10px] font-semibold text-rose-400">พบข้อบกพร่อง/ชำรุด</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold text-rose-400">{reportStats.failLogsCount}</span>
                  <span className="text-[10px] text-rose-400/80 font-bold">รายการ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Signatures and Executive Notes */}
          <div className="space-y-3 pt-4">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <User size={14} className="text-amber-400" />
              <span>4. ข้อมูลผู้จัดทำรายงานและผู้รับรอง (Signatures & Remarks)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-300">ผู้ตรวจสอบ / ผู้สรุปรายงาน:</span>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล ผู้ตรวจสอบ"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="ตำแหน่ง"
                  value={inspectorPosition}
                  onChange={(e) => setInspectorPosition(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-[11px] rounded-lg py-1 px-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-300">หัวหน้าแผนก / ผู้รับรองรายงาน:</span>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล หัวหน้างาน"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <input
                  type="text"
                  placeholder="ตำแหน่ง"
                  value={approverPosition}
                  onChange={(e) => setApproverPosition(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-[11px] rounded-lg py-1 px-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                หมายเหตุสรุปภาพรวมในรายงาน:
              </label>
              <textarea
                rows={2}
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="ระบุข้อเสนอแนะหรือสรุปภาพรวม..."
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span>รายงานจะถูกสร้างในรูปแบบมาตรฐาน PDF A4 พร้อมลายเซ็นและตราสัญลักษณ์โรงพยาบาล</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex-1 sm:flex-initial py-2.5 px-5 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
              <span>{isExporting ? 'กำลังประมวลผล PDF...' : 'ดาวน์โหลดรายงาน PDF'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
