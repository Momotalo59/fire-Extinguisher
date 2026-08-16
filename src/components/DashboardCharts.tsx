import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';
import { 
  PieChart as PieIcon, 
  BarChart3, 
  TrendingUp, 
  ShieldAlert, 
  Award, 
  Layers, 
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Flame,
  Radio,
  Boxes,
  DoorClosed,
  Activity,
  Filter,
  Eye
} from 'lucide-react';
import { FireExtinguisher, InspectionLog, AssetType } from '../types';
import { getAssetCategory, ASSET_CATEGORIES } from '../lib/assetHelpers';
import { isInspectedInCurrentMonth } from '../lib/dbHelpers';

interface DashboardChartsProps {
  extinguishers: FireExtinguisher[];
  logs: InspectionLog[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onNavigateToInventory?: (category: string, status?: string | null) => void;
}

type TrendViewMode = 
  | 'compare_categories' 
  | 'all_separate_grid'
  | 'category_extinguisher' 
  | 'category_cabinet' 
  | 'category_door' 
  | 'category_fcp' 
  | 'category_emlight' 
  | 'category_exitsign' 
  | 'overall_result';

export default function DashboardCharts({ 
  extinguishers, 
  logs,
  selectedCategory = 'All',
  onSelectCategory,
  onNavigateToInventory
}: DashboardChartsProps) {
  // Chart active tab
  const [activeTab, setActiveTab] = useState<'categories' | 'status' | 'types' | 'building' | 'trend'>('categories');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  
  // Trend chart specific options
  const [trendMode, setTrendMode] = useState<TrendViewMode>('all_separate_grid');
  const [trendChartType, setTrendChartType] = useState<'area' | 'line' | 'bar'>('area');

  // Helper map for fast extinguisher lookup by feId
  const extMap = new Map<string, FireExtinguisher>();
  extinguishers.forEach(e => extMap.set(e.id, e));

  // Determine category for an inspection log
  const getLogCategory = (log: InspectionLog): AssetType => {
    if (log.assetType) return log.assetType;
    if (extMap.has(log.feId)) {
      return getAssetCategory(extMap.get(log.feId)!);
    }
    const idUpper = (log.feId || '').toUpperCase();
    if (idUpper.startsWith('EM-') || idUpper.startsWith('EL-') || log.checklist?.emergencyLightStatus) return 'ไฟฉุกเฉิน';
    if (idUpper.startsWith('EX-') || idUpper.startsWith('EXIT-') || idUpper.startsWith('ES-') || log.checklist?.exitSignStatus) return 'ป้ายบอกทางหนีไฟ';
    if (idUpper.startsWith('FCP-') || idUpper.startsWith('FA-') || log.inspectionType === 'ประจำวัน' || log.checklist?.fcpMainStatus || log.checklist?.fcpStatusLed) return 'ตู้แจ้งเหตุเพลิงไหม้';
    if (idUpper.startsWith('FHC-') || log.checklist?.cabinetCondition || log.checklist?.hoseCondition || log.checklist?.valveStatus) return 'ตู้ดับเพลิง';
    if (idUpper.startsWith('FD-') || log.checklist?.doorCondition || log.checklist?.autoCloseSpeed || log.checklist?.panicBar) return 'ประตูกันไฟ';
    return 'ถังดับเพลิง';
  };

  // Filter pool based on selected category (if not All)
  const currentPool = selectedCategory === 'All' 
    ? extinguishers 
    : extinguishers.filter(e => getAssetCategory(e) === selectedCategory);

  const totalAll = extinguishers.length || 1;
  const totalInPool = currentPool.length || 1;

  // --- 1. Data Preparation: Categories Breakdown (6 ระบบความปลอดภัย) ---
  const CATEGORY_COLORS: Record<AssetType, string> = {
    'ถังดับเพลิง': '#ef4444',     // Red
    'ตู้ดับเพลิง': '#3b82f6',     // Blue
    'ประตูกันไฟ': '#f59e0b',     // Amber
    'ตู้แจ้งเหตุเพลิงไหม้': '#a855f7', // Purple
    'ไฟฉุกเฉิน': '#eab308',       // Yellow
    'ป้ายบอกทางหนีไฟ': '#10b981'  // Emerald
  };

  const categoryPieData = ASSET_CATEGORIES.map(cat => {
    const list = extinguishers.filter(e => getAssetCategory(e) === cat.id);
    const count = list.length;
    const normalCount = list.filter(e => e.status === 'ปกติ').length;
    const issueCount = count - normalCount;
    const inspected = list.filter(e => isInspectedInCurrentMonth(e.lastInspectedAt, cat.id)).length;
    return {
      id: cat.id,
      name: cat.name.split(' (')[0],
      fullName: cat.name,
      icon: cat.icon,
      value: count,
      color: CATEGORY_COLORS[cat.id] || '#64748b',
      percent: Math.round((count / totalAll) * 100),
      normal: normalCount,
      issue: issueCount,
      readyRate: count > 0 ? Math.round((normalCount / count) * 100) : 0,
      inspectedCount: inspected,
      inspectedRate: count > 0 ? Math.round((inspected / count) * 100) : 0,
      cycle: cat.cycle
    };
  }).filter(d => d.value > 0);

  // --- 2. Data Preparation: Status Breakdown (Current Pool) ---
  const normalCount = currentPool.filter(e => e.status === 'ปกติ').length;
  const lowCount = currentPool.filter(e => e.status === 'แรงดันต่ำ').length;
  const damagedCount = currentPool.filter(e => e.status === 'ชำรุด').length;
  const expiringCount = currentPool.filter(e => e.status === 'ใกล้หมดอายุ' || e.status === 'หมดอายุ').length;
  const repairCount = currentPool.filter(e => e.status === 'ส่งซ่อม').length;

  const rawStatusList = [
    { id: 'normal', name: 'ปกติ (พร้อมใช้)', value: normalCount, color: '#10b981', percent: Math.round((normalCount / totalInPool) * 100) },
    { id: 'low_pressure_or_trouble', name: selectedCategory === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'Trouble / เตือน' : 'แรงดันต่ำ / ผิดปกติ', value: lowCount, color: '#f59e0b', percent: Math.round((lowCount / totalInPool) * 100) },
    { id: 'damaged', name: 'ชำรุด / มีปัญหา', value: damagedCount, color: '#f43f5e', percent: Math.round((damagedCount / totalInPool) * 100) },
    { id: 'expiring', name: 'ใกล้/หมดอายุ', value: expiringCount, color: '#3b82f6', percent: Math.round((expiringCount / totalInPool) * 100) },
    { id: 'repair', name: 'ส่งซ่อมบำรุง', value: repairCount, color: '#a855f7', percent: Math.round((repairCount / totalInPool) * 100) }
  ];

  const statusPieData = rawStatusList.filter(d => {
    if (selectedCategory === 'ตู้ดับเพลิง' || selectedCategory === 'ประตูกันไฟ') {
      if (d.id === 'low_pressure_or_trouble' || d.id === 'expiring') return false;
    }
    if (selectedCategory === 'ตู้แจ้งเหตุเพลิงไหม้') {
      if (d.id === 'expiring') return false;
    }
    return d.value > 0;
  });

  // --- 3. Data Preparation: Types Distribution (Current Pool) ---
  const typeMap: Record<string, number> = {};
  currentPool.forEach(e => {
    const rawType = e.type || (e.brand ? `${e.brand} ${e.model || ''}`.trim() : 'ไม่ระบุประเภท');
    typeMap[rawType] = (typeMap[rawType] || 0) + 1;
  });

  const SUBTYPE_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];
  const typePieData = Object.entries(typeMap).map(([typeName, count], idx) => {
    return {
      name: typeName,
      value: count,
      color: SUBTYPE_COLORS[idx % SUBTYPE_COLORS.length],
      percent: Math.round((count / totalInPool) * 100)
    };
  }).sort((a, b) => b.value - a.value);

  // Helper function to extract building name reliably
  const getBuildingName = (e: FireExtinguisher): string => {
    if (e.building && e.building.trim().length > 0) return e.building.trim();
    if (e.locationDetails) {
      const locClean = e.locationDetails.replace(/[()]/g, '').trim();
      if (locClean) return locClean;
    }
    if (e.floor) return e.floor.trim();
    return 'ไม่ระบุอาคาร';
  };

  // --- 4. Data Preparation: Building Distribution ---
  const buildings = Array.from(new Set(currentPool.map(e => getBuildingName(e))));
  const BUILDING_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'];
  
  const buildingPieData = buildings.map((building, idx) => {
    const bExts = currentPool.filter(e => getBuildingName(e) === building);
    return {
      name: building,
      value: bExts.length,
      color: BUILDING_COLORS[idx % BUILDING_COLORS.length],
      percent: Math.round((bExts.length / totalInPool) * 100),
      normal: bExts.filter(e => e.status === 'ปกติ').length,
      issue: bExts.filter(e => e.status !== 'ปกติ').length
    };
  }).sort((a, b) => b.value - a.value);

  const statusByBuildingBarData = buildings.map(building => {
    const bExts = currentPool.filter(e => getBuildingName(e) === building);
    return {
      name: building,
      'ปกติ': bExts.filter(e => e.status === 'ปกติ').length,
      'แรงดันต่ำ/เตือน': bExts.filter(e => e.status === 'แรงดันต่ำ').length,
      'ชำรุด': bExts.filter(e => e.status === 'ชำรุด').length,
      'ใกล้หมดอายุ': bExts.filter(e => e.status === 'ใกล้หมดอายุ' || e.status === 'หมดอายุ').length,
      'ส่งซ่อม': bExts.filter(e => e.status === 'ส่งซ่อม').length,
    };
  });

  // --- 5. Data Preparation: Multi-Dimensional 6-Month Inspection Trend ---
  const monthlyLogsData: any[] = [];
  const ThaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthIndex = d.getMonth();
    const yearTh = (d.getFullYear() + 543) % 100;
    const label = `${ThaiMonths[monthIndex]} ${yearTh}`;
    
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const logsInMonth = logs.filter(log => {
      const logDate = new Date(log.inspectionDate);
      return logDate >= startOfMonth && logDate <= endOfMonth;
    });

    // 1) Category counts
    const extLogs = logsInMonth.filter(l => getLogCategory(l) === 'ถังดับเพลิง');
    const cabLogs = logsInMonth.filter(l => getLogCategory(l) === 'ตู้ดับเพลิง');
    const doorLogs = logsInMonth.filter(l => getLogCategory(l) === 'ประตูกันไฟ');
    const fcpLogs = logsInMonth.filter(l => getLogCategory(l) === 'ตู้แจ้งเหตุเพลิงไหม้');
    const emLogs = logsInMonth.filter(l => getLogCategory(l) === 'ไฟฉุกเฉิน');
    const exitLogs = logsInMonth.filter(l => getLogCategory(l) === 'ป้ายบอกทางหนีไฟ');

    // 2) Overall counts
    const passed = logsInMonth.filter(log => log.inspectionResult === 'ผ่าน').length;
    const failed = logsInMonth.filter(log => log.inspectionResult === 'ไม่ผ่าน').length;

    monthlyLogsData.push({
      name: label,
      // 6 Categories breakdown
      '🧯 ถังดับเพลิง': extLogs.length,
      '🗄️ ตู้ดับเพลิง (FHC)': cabLogs.length,
      '🚪 ประตูกันไฟ': doorLogs.length,
      '🚨 ตู้แจ้งเหตุ (FCP)': fcpLogs.length,
      '💡 ไฟฉุกเฉิน': emLogs.length,
      '🏃 ป้ายบอกทางหนีไฟ': exitLogs.length,

      // Extinguisher deep-dive
      'ถังดับเพลิง-ผ่าน': extLogs.filter(l => l.inspectionResult === 'ผ่าน').length,
      'ถังดับเพลิง-พบปัญหา': extLogs.filter(l => l.inspectionResult === 'ไม่ผ่าน').length,

      // Cabinet deep-dive
      'ตู้ดับเพลิง-ผ่าน': cabLogs.filter(l => l.inspectionResult === 'ผ่าน').length,
      'ตู้ดับเพลิง-พบปัญหา': cabLogs.filter(l => l.inspectionResult === 'ไม่ผ่าน').length,

      // Fire Door deep-dive
      'ประตูกันไฟ-ผ่าน': doorLogs.filter(l => l.inspectionResult === 'ผ่าน').length,
      'ประตูกันไฟ-พบปัญหา': doorLogs.filter(l => l.inspectionResult === 'ไม่ผ่าน').length,

      // FCP deep-dive
      'ตู้FCP-สถานะปกติ': fcpLogs.filter(l => l.inspectionResult === 'ผ่าน').length,
      'ตู้FCP-พบTrouble/เตือน': fcpLogs.filter(l => l.inspectionResult === 'ไม่ผ่าน').length,

      // Emergency Light deep-dive
      'ไฟฉุกเฉิน-ผ่าน': emLogs.filter(l => l.inspectionResult === 'ผ่าน').length,
      'ไฟฉุกเฉิน-พบปัญหา': emLogs.filter(l => l.inspectionResult === 'ไม่ผ่าน').length,

      // Exit Sign deep-dive
      'ป้ายทางหนีไฟ-ผ่าน': exitLogs.filter(l => l.inspectionResult === 'ผ่าน').length,
      'ป้ายทางหนีไฟ-พบปัญหา': exitLogs.filter(l => l.inspectionResult === 'ไม่ผ่าน').length,

      // Overall
      'ตรวจผ่านทั้งหมด': passed,
      'ตรวจพบปัญหาทั้งหมด': failed,
      'ยอดตรวจรวม': logsInMonth.length
    });
  }

  // 6-month aggregate metrics for each category
  const getCategory6MonthStats = (cat: AssetType) => {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const catLogs = logs.filter(l => {
      const logDate = new Date(l.inspectionDate);
      return logDate >= sixMonthsAgo && getLogCategory(l) === cat;
    });
    const total = catLogs.length;
    const passed = catLogs.filter(l => l.inspectionResult === 'ผ่าน').length;
    const failed = total - passed;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;
    return { total, passed, failed, passRate };
  };

  // Global KPIs across whole database
  const totalAllNormal = extinguishers.filter(e => e.status === 'ปกติ').length;
  const totalAllIssues = extinguishers.length - totalAllNormal;
  const globalSafetyRate = extinguishers.length > 0 ? Math.round((totalAllNormal / extinguishers.length) * 100) : 100;

  const totalInspections = logs.length;
  const passedInspections = logs.filter(l => l.inspectionResult === 'ผ่าน').length;
  const complianceRate = totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 100;

  const inspectedInCycleTotal = extinguishers.filter(e => isInspectedInCurrentMonth(e.lastInspectedAt, e.assetType || getAssetCategory(e))).length;
  const inspectedInCyclePercent = extinguishers.length > 0 ? Math.round((inspectedInCycleTotal / extinguishers.length) * 100) : 0;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl space-y-6">
      
      {/* Header section with KPIs & Chart mode toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <span className="p-1.5 bg-red-950/60 text-red-500 border border-red-900/50 rounded-xl shadow-xs">
              <ShieldCheck size={18} />
            </span>
            <span>แดชบอร์ดความปลอดภัย & สรุปสถิติอุปกรณ์ครบวงจร</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            ครอบคลุม 6 ระบบ: ถังดับเพลิง • ตู้สายน้ำดับเพลิง (FHC) • ประตูกันไฟ • ตู้แจ้งเหตุเพลิงไหม้ (FCP) • ไฟฉุกเฉิน • ป้ายบอกทางหนีไฟ
          </p>
        </div>

        {/* Highlight Stats & Chart Style Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-950/40 border border-emerald-900/40 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Award className="text-emerald-400 shrink-0" size={16} />
            <div>
              <p className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider">ดัชนีพร้อมใช้งานรวม</p>
              <p className="text-xs font-black text-white font-mono mt-0.5">{globalSafetyRate}% Safety Index</p>
            </div>
          </div>

          <div className="bg-blue-950/40 border border-blue-900/40 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="text-blue-400 shrink-0" size={16} />
            <div>
              <p className="text-[9px] font-extrabold text-blue-400 uppercase tracking-wider">ตรวจเช็คตามรอบ</p>
              <p className="text-xs font-black text-white font-mono mt-0.5">{inspectedInCyclePercent}% ({inspectedInCycleTotal}/{extinguishers.length})</p>
            </div>
          </div>

          <div className="bg-red-950/40 border border-red-900/40 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <ShieldAlert className="text-red-400 shrink-0" size={16} />
            <div>
              <p className="text-[9px] font-extrabold text-red-400 uppercase tracking-wider">อุปกรณ์ที่ต้องซ่อม</p>
              <p className="text-xs font-black text-white font-mono mt-0.5">{totalAllIssues} เครื่อง</p>
            </div>
          </div>

          {/* Chart format switcher for Pie / Bar */}
          {activeTab !== 'trend' && (
            <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  chartType === 'pie' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงเป็นกราฟวงกลม (Donut / Pie Chart)"
              >
                <PieIcon size={13} />
                <span className="text-[10px]">กราฟวงกลม</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  chartType === 'bar' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงเป็นกราฟแท่ง (Bar Chart)"
              >
                <BarChart3 size={13} />
                <span className="text-[10px]">กราฟแท่ง</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'categories' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers size={14} className={activeTab === 'categories' ? 'text-red-400' : ''} />
          <span>สัดส่วน 6 หมวดอุปกรณ์ความปลอดภัย</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'status' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <PieIcon size={14} className={activeTab === 'status' ? 'text-red-400' : ''} />
          <span>สัดส่วนสภาพความพร้อม {selectedCategory !== 'All' ? `(${selectedCategory})` : 'รวม'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'types' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles size={14} className={activeTab === 'types' ? 'text-red-400' : ''} />
          <span>จำแนกตามรุ่น / ชนิดย่อย ({typePieData.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('building')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'building' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 size={14} className={activeTab === 'building' ? 'text-red-400' : ''} />
          <span>จำแนกตามอาคาร / พื้นที่ ({buildings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trend')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer relative ${
            activeTab === 'trend' ? 'bg-red-600 text-white shadow-md' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <TrendingUp size={14} />
          <span>แนวโน้มการตรวจเช็ค 6 เดือน</span>
          <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.2 rounded-full ml-1">
            แยกรายอุปกรณ์
          </span>
        </button>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="min-h-[360px] w-full bg-slate-950/60 p-5 rounded-2xl border border-slate-800 relative flex flex-col justify-between space-y-4">
        
        {/* Trend Tab Header: Equipment Filter & Style Switcher */}
        {activeTab === 'trend' && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            {/* Trend Category View Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={12} className="text-red-400" />
                <span>มุมมองแนวโน้ม:</span>
              </span>

              <button
                type="button"
                onClick={() => setTrendMode('all_separate_grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  trendMode === 'all_separate_grid'
                    ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-400'
                    : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Layers size={12} />
                <span>📊 แยกกราฟ 6 อุปกรณ์ (Multi-Chart)</span>
              </button>

              <button
                type="button"
                onClick={() => setTrendMode('compare_categories')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  trendMode === 'compare_categories'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>📈 กราฟเปรียบเทียบรวม</span>
              </button>

              <button
                type="button"
                onClick={() => setTrendMode('category_extinguisher')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trendMode === 'category_extinguisher'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>🧯 ถังดับเพลิง</span>
              </button>

              <button
                type="button"
                onClick={() => setTrendMode('category_cabinet')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trendMode === 'category_cabinet'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>🗄️ ตู้ดับเพลิง</span>
              </button>

              <button
                type="button"
                onClick={() => setTrendMode('category_door')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trendMode === 'category_door'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>🚪 ประตูกันไฟ</span>
              </button>

              <button
                type="button"
                onClick={() => setTrendMode('category_fcp')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trendMode === 'category_fcp'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>🚨 ตู้แจ้งเหตุ</span>
              </button>

              <button
                type="button"
                onClick={() => setTrendMode('category_emlight')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trendMode === 'category_emlight'
                    ? 'bg-yellow-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>💡 ไฟฉุกเฉิน</span>
              </button>

              <button
                type="button"
                onClick={() => setTrendMode('category_exitsign')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trendMode === 'category_exitsign'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>🏃 ป้ายทางหนีไฟ</span>
              </button>

              <button
                type="button"
                onClick={() => setTrendMode('overall_result')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  trendMode === 'overall_result'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <ShieldCheck size={12} />
                <span>ผลตรวจรวม</span>
              </button>
            </div>

            {/* Chart type toggle for trend (Area vs Line vs Bar) */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setTrendChartType('area')}
                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  trendChartType === 'area' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="พื้นที่ไล่เฉดสี"
              >
                Area
              </button>
              <button
                type="button"
                onClick={() => setTrendChartType('line')}
                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  trendChartType === 'line' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="เส้นกราฟเปรียบเทียบ"
              >
                Line
              </button>
              <button
                type="button"
                onClick={() => setTrendChartType('bar')}
                className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  trendChartType === 'bar' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="กราฟแท่งรายเดือน"
              >
                Bar
              </button>
            </div>
          </div>
        )}

        {extinguishers.length === 0 ? (
          <div className="text-center py-16 space-y-2 text-slate-500 font-semibold text-xs my-auto">
            <PieIcon size={36} className="mx-auto text-slate-600 animate-pulse" />
            <p>ยังไม่มีข้อมูลอุปกรณ์ความปลอดภัยเพียงพอสำหรับการวิเคราะห์กราฟ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
            
            {/* Chart Area */}
            <div className={`${activeTab === 'trend' || chartType === 'bar' ? 'lg:col-span-12' : 'lg:col-span-7'} h-[310px] w-full relative`}>
              
              {/* Centered Donut Label when in Pie Mode */}
              {chartType === 'pie' && activeTab !== 'trend' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 pb-6">
                  <span className="text-2xl font-black text-white font-mono tracking-tight">
                    {activeTab === 'categories' ? extinguishers.length : currentPool.length}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activeTab === 'categories' ? 'อุปกรณ์รวม' : 'รายการในระบบ'}
                  </span>
                </div>
              )}

              <ResponsiveContainer width="100%" height="100%">
                {activeTab === 'categories' && chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="#020617"
                      strokeWidth={3}
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-cat-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                      }}
                      formatter={(val: number, name: string, props: any) => [
                        `${val} ชิ้น (${props.payload.percent}%) • พร้อมใช้ ${props.payload.readyRate}%`, 
                        name
                      ]}
                    />
                  </PieChart>
                ) : activeTab === 'status' && chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="#020617"
                      strokeWidth={3}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                      }}
                      formatter={(val: number, name: string, props: any) => [
                        `${val} ชิ้น (${props.payload.percent}%)`, 
                        name
                      ]}
                    />
                  </PieChart>
                ) : activeTab === 'types' && chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={typePieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="#020617"
                      strokeWidth={3}
                    >
                      {typePieData.map((entry, index) => (
                        <Cell key={`cell-type-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                      formatter={(val: number, name: string, props: any) => [
                        `${val} ชิ้น (${props.payload.percent}%)`, 
                        name
                      ]}
                    />
                  </PieChart>
                ) : activeTab === 'building' && chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={buildingPieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="#020617"
                      strokeWidth={3}
                    >
                      {buildingPieData.map((entry, index) => (
                        <Cell key={`cell-bld-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                      formatter={(val: number, name: string, props: any) => [
                        `${val} ชิ้น (${props.payload.percent}%)`, 
                        name
                      ]}
                    />
                  </PieChart>
                ) : activeTab === 'trend' ? (
                  /* --- Multi-Mode 6-Month Inspection Trend Charts --- */
                  trendMode === 'all_separate_grid' ? (
                    /* Multi-chart Grid: 6 separate individual equipment trend graphs */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full h-full overflow-y-auto pr-1">
                      {ASSET_CATEGORIES.map(cat => {
                        const isExt = cat.id === 'ถังดับเพลิง';
                        const isCab = cat.id === 'ตู้ดับเพลิง';
                        const isDoor = cat.id === 'ประตูกันไฟ';
                        const isFcp = cat.id === 'ตู้แจ้งเหตุเพลิงไหม้';
                        const isEm = cat.id === 'ไฟฉุกเฉิน';
                        const isExit = cat.id === 'ป้ายบอกทางหนีไฟ';

                        const passKey = isExt ? 'ถังดับเพลิง-ผ่าน' : isCab ? 'ตู้ดับเพลิง-ผ่าน' : isDoor ? 'ประตูกันไฟ-ผ่าน' : isFcp ? 'ตู้FCP-สถานะปกติ' : isEm ? 'ไฟฉุกเฉิน-ผ่าน' : 'ป้ายทางหนีไฟ-ผ่าน';
                        const failKey = isExt ? 'ถังดับเพลิง-พบปัญหา' : isCab ? 'ตู้ดับเพลิง-พบปัญหา' : isDoor ? 'ประตูกันไฟ-พบปัญหา' : isFcp ? 'ตู้FCP-พบTrouble/เตือน' : isEm ? 'ไฟฉุกเฉิน-พบปัญหา' : 'ป้ายทางหนีไฟ-พบปัญหา';
                        const primaryColor = isExt ? '#ef4444' : isCab ? '#3b82f6' : isDoor ? '#f59e0b' : isFcp ? '#a855f7' : isEm ? '#eab308' : '#10b981';

                        return (
                          <div key={`grid-chart-${cat.id}`} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800/80">
                              <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                                <span>{cat.icon}</span>
                                <span>{cat.name.split(' (')[0]}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isExt) setTrendMode('category_extinguisher');
                                  else if (isCab) setTrendMode('category_cabinet');
                                  else if (isDoor) setTrendMode('category_door');
                                  else if (isFcp) setTrendMode('category_fcp');
                                  else if (isEm) setTrendMode('category_emlight');
                                  else if (isExit) setTrendMode('category_exitsign');
                                }}
                                className="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                              >
                                ขยายกราฟ
                              </button>
                            </div>
                            <div className="h-[90px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyLogsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                                  <XAxis dataKey="name" stroke="#64748b" fontSize={8} tickLine={false} />
                                  <YAxis stroke="#64748b" fontSize={8} allowDecimals={false} tickLine={false} />
                                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '10px', padding: '4px 8px' }} />
                                  <Area type="monotone" dataKey={passKey} stroke={primaryColor} fill={primaryColor} fillOpacity={0.25} strokeWidth={2} name="ผ่าน" />
                                  <Area type="monotone" dataKey={failKey} stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25} strokeWidth={1.5} name="พบปัญหา" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : trendChartType === 'line' ? (
                    <LineChart data={monthlyLogsData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" allowDecimals={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                      
                      {trendMode === 'compare_categories' ? (
                        <>
                          <Line type="monotone" dataKey="🧯 ถังดับเพลิง" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="🗄️ ตู้ดับเพลิง (FHC)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="🚪 ประตูกันไฟ" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="🚨 ตู้แจ้งเหตุ (FCP)" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="💡 ไฟฉุกเฉิน" stroke="#eab308" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="🏃 ป้ายบอกทางหนีไฟ" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </>
                      ) : trendMode === 'category_extinguisher' ? (
                        <>
                          <Line type="monotone" dataKey="ถังดับเพลิง-ผ่าน" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ถังดับเพลิง-พบปัญหา" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </>
                      ) : trendMode === 'category_cabinet' ? (
                        <>
                          <Line type="monotone" dataKey="ตู้ดับเพลิง-ผ่าน" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ตู้ดับเพลิง-พบปัญหา" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </>
                      ) : trendMode === 'category_door' ? (
                        <>
                          <Line type="monotone" dataKey="ประตูกันไฟ-ผ่าน" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ประตูกันไฟ-พบปัญหา" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </>
                      ) : trendMode === 'category_fcp' ? (
                        <>
                          <Line type="monotone" dataKey="ตู้FCP-สถานะปกติ" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ตู้FCP-พบTrouble/เตือน" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </>
                      ) : trendMode === 'category_emlight' ? (
                        <>
                          <Line type="monotone" dataKey="ไฟฉุกเฉิน-ผ่าน" stroke="#eab308" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ไฟฉุกเฉิน-พบปัญหา" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </>
                      ) : trendMode === 'category_exitsign' ? (
                        <>
                          <Line type="monotone" dataKey="ป้ายทางหนีไฟ-ผ่าน" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ป้ายทางหนีไฟ-พบปัญหา" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </>
                      ) : (
                        <>
                          <Line type="monotone" dataKey="ตรวจผ่านทั้งหมด" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ตรวจพบปัญหาทั้งหมด" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </>
                      )}
                    </LineChart>
                  ) : trendChartType === 'bar' ? (
                    <BarChart data={monthlyLogsData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" allowDecimals={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />

                      {trendMode === 'compare_categories' ? (
                        <>
                          <Bar dataKey="🧯 ถังดับเพลิง" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={16} />
                          <Bar dataKey="🗄️ ตู้ดับเพลิง (FHC)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={16} />
                          <Bar dataKey="🚪 ประตูกันไฟ" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={16} />
                          <Bar dataKey="🚨 ตู้แจ้งเหตุ (FCP)" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={16} />
                          <Bar dataKey="💡 ไฟฉุกเฉิน" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={16} />
                          <Bar dataKey="🏃 ป้ายบอกทางหนีไฟ" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={16} />
                        </>
                      ) : trendMode === 'category_extinguisher' ? (
                        <>
                          <Bar dataKey="ถังดับเพลิง-ผ่าน" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="ถังดับเพลิง-พบปัญหา" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>
                      ) : trendMode === 'category_cabinet' ? (
                        <>
                          <Bar dataKey="ตู้ดับเพลิง-ผ่าน" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="ตู้ดับเพลิง-พบปัญหา" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>
                      ) : trendMode === 'category_door' ? (
                        <>
                          <Bar dataKey="ประตูกันไฟ-ผ่าน" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="ประตูกันไฟ-พบปัญหา" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>
                      ) : trendMode === 'category_fcp' ? (
                        <>
                          <Bar dataKey="ตู้FCP-สถานะปกติ" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="ตู้FCP-พบTrouble/เตือน" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>
                      ) : trendMode === 'category_emlight' ? (
                        <>
                          <Bar dataKey="ไฟฉุกเฉิน-ผ่าน" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="ไฟฉุกเฉิน-พบปัญหา" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>
                      ) : trendMode === 'category_exitsign' ? (
                        <>
                          <Bar dataKey="ป้ายทางหนีไฟ-ผ่าน" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="ป้ายทางหนีไฟ-พบปัญหา" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="ตรวจผ่านทั้งหมด" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="ตรวจพบปัญหาทั้งหมด" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>
                      )}
                    </BarChart>
                  ) : (
                    /* Default: AreaChart */
                    <AreaChart
                      data={monthlyLogsData}
                      margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorExt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCab" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDoor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorFcp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" allowDecimals={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />

                      {trendMode === 'compare_categories' ? (
                        <>
                          <Area type="monotone" dataKey="🧯 ถังดับเพลิง" stroke="#ef4444" fillOpacity={1} fill="url(#colorExt)" strokeWidth={2} />
                          <Area type="monotone" dataKey="🗄️ ตู้ดับเพลิง (FHC)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCab)" strokeWidth={2} />
                          <Area type="monotone" dataKey="🚪 ประตูกันไฟ" stroke="#f59e0b" fillOpacity={1} fill="url(#colorDoor)" strokeWidth={2} />
                          <Area type="monotone" dataKey="🚨 ตู้แจ้งเหตุ (FCP)" stroke="#a855f7" fillOpacity={1} fill="url(#colorFcp)" strokeWidth={2} />
                          <Area type="monotone" dataKey="💡 ไฟฉุกเฉิน" stroke="#eab308" fillOpacity={1} fill="url(#colorEm)" strokeWidth={2} />
                          <Area type="monotone" dataKey="🏃 ป้ายบอกทางหนีไฟ" stroke="#10b981" fillOpacity={1} fill="url(#colorExit)" strokeWidth={2} />
                        </>
                      ) : trendMode === 'category_extinguisher' ? (
                        <>
                          <Area type="monotone" dataKey="ถังดับเพลิง-ผ่าน" stroke="#10b981" fillOpacity={1} fill="url(#colorPassed)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="ถังดับเพลิง-พบปัญหา" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} />
                        </>
                      ) : trendMode === 'category_cabinet' ? (
                        <>
                          <Area type="monotone" dataKey="ตู้ดับเพลิง-ผ่าน" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCab)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="ตู้ดับเพลิง-พบปัญหา" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} />
                        </>
                      ) : trendMode === 'category_door' ? (
                        <>
                          <Area type="monotone" dataKey="ประตูกันไฟ-ผ่าน" stroke="#f59e0b" fillOpacity={1} fill="url(#colorDoor)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="ประตูกันไฟ-พบปัญหา" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} />
                        </>
                      ) : trendMode === 'category_fcp' ? (
                        <>
                          <Area type="monotone" dataKey="ตู้FCP-สถานะปกติ" stroke="#a855f7" fillOpacity={1} fill="url(#colorFcp)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="ตู้FCP-พบTrouble/เตือน" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} />
                        </>
                      ) : trendMode === 'category_emlight' ? (
                        <>
                          <Area type="monotone" dataKey="ไฟฉุกเฉิน-ผ่าน" stroke="#eab308" fillOpacity={1} fill="url(#colorEm)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="ไฟฉุกเฉิน-พบปัญหา" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} />
                        </>
                      ) : trendMode === 'category_exitsign' ? (
                        <>
                          <Area type="monotone" dataKey="ป้ายทางหนีไฟ-ผ่าน" stroke="#10b981" fillOpacity={1} fill="url(#colorExit)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="ป้ายทางหนีไฟ-พบปัญหา" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} />
                        </>
                      ) : (
                        <>
                          <Area type="monotone" dataKey="ตรวจผ่านทั้งหมด" stroke="#10b981" fillOpacity={1} fill="url(#colorPassed)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="ตรวจพบปัญหาทั้งหมด" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} />
                        </>
                      )}
                    </AreaChart>
                  )
                ) : activeTab === 'categories' ? (
                  <BarChart
                    data={categoryPieData.map(c => ({
                      name: c.name,
                      'ปกติ (พร้อมใช้)': c.normal,
                      'ต้องแก้ไข/ซ่อม': c.issue,
                      'ตรวจแล้วในรอบ': c.inspectedCount
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" allowDecimals={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="ปกติ (พร้อมใช้)" fill="#10b981" maxBarSize={30} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ต้องแก้ไข/ซ่อม" fill="#f43f5e" maxBarSize={30} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ตรวจแล้วในรอบ" fill="#3b82f6" maxBarSize={30} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : activeTab === 'building' ? (
                  <BarChart
                    data={statusByBuildingBarData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" allowDecimals={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="ปกติ" stackId="status" fill="#10b981" maxBarSize={32} />
                    <Bar dataKey="แรงดันต่ำ/เตือน" stackId="status" fill="#f59e0b" maxBarSize={32} />
                    <Bar dataKey="ชำรุด" stackId="status" fill="#f43f5e" maxBarSize={32} />
                    <Bar dataKey="ใกล้หมดอายุ" stackId="status" fill="#3b82f6" maxBarSize={32} />
                    <Bar dataKey="ส่งซ่อม" stackId="status" fill="#a855f7" maxBarSize={32} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart
                    data={
                      activeTab === 'types' 
                        ? typePieData.map(t => ({ name: t.name, 'จำนวนอุปกรณ์': t.value }))
                        : statusPieData.map(s => ({ name: s.name, 'จำนวนอุปกรณ์': s.value }))
                    }
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" allowDecimals={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '12px', 
                        border: '1px solid #334155', 
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="จำนวนอุปกรณ์" fill="#ef4444" maxBarSize={35} radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Side Custom Modern Legend & Breakdown for Pie Charts */}
            {chartType === 'pie' && activeTab !== 'trend' && (
              <div className="lg:col-span-5 space-y-2.5 bg-slate-900/90 p-4 rounded-xl border border-slate-800 max-h-[300px] overflow-y-auto scrollbar-thin">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>รายละเอียดจำแนกสัดส่วน</span>
                  <span className="text-red-400 font-mono">
                    สถิติ {activeTab === 'categories' ? `${extinguishers.length} ชิ้นรวม` : `${currentPool.length} รายการ`}
                  </span>
                </p>

                <div className="space-y-2 pt-1">
                  {(activeTab === 'categories' 
                    ? categoryPieData 
                    : activeTab === 'status' 
                    ? statusPieData 
                    : activeTab === 'types' 
                    ? typePieData 
                    : buildingPieData
                  ).map((item: any, idx) => (
                    <motion.div 
                      key={`legend-item-${idx}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => {
                        if (activeTab === 'categories' && onSelectCategory) {
                          onSelectCategory(item.id);
                        }
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors ${
                        activeTab === 'categories' ? 'cursor-pointer hover:bg-slate-900' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.icon ? (
                          <span className="text-sm shrink-0">{item.icon}</span>
                        ) : (
                          <span 
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-black text-white font-mono">
                          {item.value} <span className="text-[10px] font-normal text-slate-400">ชิ้น</span>
                        </span>
                        <span 
                          className="text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono shadow-xs"
                          style={{ 
                            backgroundColor: `${item.color}22`, 
                            color: item.color,
                            border: `1px solid ${item.color}44`
                          }}
                        >
                          {item.percent}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Mini 6-Category Trend Summary Cards when in Trend Tab */}
        {activeTab === 'trend' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/80">
            {ASSET_CATEGORIES.map(cat => {
              const stats = getCategory6MonthStats(cat.id);
              const isCurrentMode = (
                (cat.id === 'ถังดับเพลิง' && trendMode === 'category_extinguisher') ||
                (cat.id === 'ตู้ดับเพลิง' && trendMode === 'category_cabinet') ||
                (cat.id === 'ประตูกันไฟ' && trendMode === 'category_door') ||
                (cat.id === 'ตู้แจ้งเหตุเพลิงไหม้' && trendMode === 'category_fcp') ||
                (cat.id === 'ไฟฉุกเฉิน' && trendMode === 'category_emlight') ||
                (cat.id === 'ป้ายบอกทางหนีไฟ' && trendMode === 'category_exitsign')
              );

              return (
                <div
                  key={`mini-stat-${cat.id}`}
                  onClick={() => {
                    if (cat.id === 'ถังดับเพลิง') setTrendMode('category_extinguisher');
                    else if (cat.id === 'ตู้ดับเพลิง') setTrendMode('category_cabinet');
                    else if (cat.id === 'ประตูกันไฟ') setTrendMode('category_door');
                    else if (cat.id === 'ตู้แจ้งเหตุเพลิงไหม้') setTrendMode('category_fcp');
                    else if (cat.id === 'ไฟฉุกเฉิน') setTrendMode('category_emlight');
                    else if (cat.id === 'ป้ายบอกทางหนีไฟ') setTrendMode('category_exitsign');
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isCurrentMode 
                      ? 'bg-slate-900 border-red-500 ring-1 ring-red-500 shadow-md' 
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.name.split(' (')[0]}</span>
                    </span>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded ${
                      stats.passRate >= 90 ? 'bg-emerald-950/60 text-emerald-400' : 'bg-amber-950/60 text-amber-400'
                    }`}>
                      {stats.passRate}% ผ่าน
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between text-[10px] text-slate-400">
                    <span>ยอดตรวจ 6 เดือน: <strong className="text-white font-mono">{stats.total}</strong> ครั้ง</span>
                    {stats.failed > 0 && (
                      <span className="text-rose-400 font-bold">พบปัญหา {stats.failed}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Safety Equipment Health Matrix Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ตารางวิเคราะห์ความพร้อมระบบความปลอดภัย 6 ระบบ (Safety Health Matrix)</span>
          </h4>
          <span className="text-[11px] text-slate-400">คลิกที่แถวเพื่อเจาะลึกหมวดนั้น</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ASSET_CATEGORIES.map(cat => {
            const list = extinguishers.filter(e => getAssetCategory(e) === cat.id);
            const total = list.length;
            const normal = list.filter(e => e.status === 'ปกติ').length;
            const low = list.filter(e => e.status === 'แรงดันต่ำ').length;
            const damaged = list.filter(e => e.status === 'ชำรุด').length;
            const repair = list.filter(e => e.status === 'ส่งซ่อม').length;
            const inspected = list.filter(e => isInspectedInCurrentMonth(e.lastInspectedAt, cat.id)).length;
            const readyPct = total > 0 ? Math.round((normal / total) * 100) : 0;
            const inspPct = total > 0 ? Math.round((inspected / total) * 100) : 0;

            return (
              <div 
                key={`matrix-${cat.id}`}
                className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xl p-1 bg-slate-900 rounded-lg border border-slate-800">{cat.icon}</span>
                      <div>
                        <h5 className="text-xs font-extrabold text-white">{cat.name.split(' (')[0]}</h5>
                        <p className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                          <Clock size={9} className="text-red-400" />
                          {cat.cycle}
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-black text-white font-mono">{total}</span>
                  </div>

                  {/* Readiness status & Inspection rate */}
                  <div className="space-y-2 pt-2.5 text-[11px]">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-slate-400">อัตราพร้อมใช้:</span>
                      <span className={`font-mono font-bold ${
                        readyPct >= 90 ? 'text-emerald-400' : readyPct >= 75 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {readyPct}% ({normal}/{total})
                      </span>
                    </div>

                    <div className="flex justify-between items-center font-medium">
                      <span className="text-slate-400">ตรวจแล้วในรอบ:</span>
                      <span className="font-mono font-bold text-blue-400">
                        {inspPct}% ({inspected}/{total})
                      </span>
                    </div>

                    {(low > 0 || damaged > 0 || repair > 0) && (
                      <div className="flex justify-between items-center font-medium pt-1 text-[10px]">
                        <span className="text-rose-400 font-bold">ต้องเร่งแก้ไข/ซ่อม:</span>
                        <span className="font-mono font-bold text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/40">
                          {low + damaged + repair} รายการ
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectCategory) onSelectCategory(cat.id);
                      if (onNavigateToInventory) onNavigateToInventory(cat.id, null);
                    }}
                    className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>ตรวจสอบรายการ {cat.id}</span>
                    <ArrowRight size={12} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini Insight Text footer */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-medium text-slate-300 leading-relaxed flex items-center gap-2.5">
        <span className="text-lg">💡</span>
        <span>
          <strong>การวิเคราะห์เชิงลึก:</strong> ในระบบมีอุปกรณ์ความปลอดภัยทั้งหมด {extinguishers.length} ชิ้น สถานะปกติพร้อมใช้งาน {totalAllNormal} ชิ้น คิดเป็น {globalSafetyRate}% ของภาพรวมทั้งหมด มีอุปกรณ์ที่ต้องเร่งดำเนินการแก้ไข/ซ่อมบำรุง {totalAllIssues} ชิ้น และได้รับการตรวจเช็คตามรอบแล้ว {inspectedInCycleTotal} ชิ้น ({inspectedInCyclePercent}%)
        </span>
      </div>

    </div>
  );
}
