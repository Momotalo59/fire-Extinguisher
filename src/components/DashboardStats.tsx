import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Wrench, 
  Layers, 
  Flame, 
  CheckCircle2, 
  ChevronRight,
  Shield,
  Activity
} from 'lucide-react';
import { FireExtinguisher, AssetType } from '../types';
import { getAssetCategory, ASSET_CATEGORIES } from '../lib/assetHelpers';
import { isInspectedInCurrentMonth } from '../lib/dbHelpers';

interface DashboardStatsProps {
  extinguishers: FireExtinguisher[];
  selectedCategory: string; // 'All' | AssetType
  onSelectCategory: (category: string) => void;
  selectedStatus: string | null;
  onSelectStatus: (status: string | null) => void;
  onNavigateToInventory?: (category: string, status?: string | null) => void;
}

export default function DashboardStats({ 
  extinguishers, 
  selectedCategory, 
  onSelectCategory, 
  selectedStatus, 
  onSelectStatus,
  onNavigateToInventory
}: DashboardStatsProps) {

  // 1. Group extinguishers by category
  const extsByCategory: Record<AssetType, FireExtinguisher[]> = {
    'ถังดับเพลิง': extinguishers.filter(e => getAssetCategory(e) === 'ถังดับเพลิง'),
    'ตู้ดับเพลิง': extinguishers.filter(e => getAssetCategory(e) === 'ตู้ดับเพลิง'),
    'ประตูกันไฟ': extinguishers.filter(e => getAssetCategory(e) === 'ประตูกันไฟ'),
    'ตู้แจ้งเหตุเพลิงไหม้': extinguishers.filter(e => getAssetCategory(e) === 'ตู้แจ้งเหตุเพลิงไหม้'),
    'ไฟฉุกเฉิน': extinguishers.filter(e => getAssetCategory(e) === 'ไฟฉุกเฉิน'),
    'ป้ายบอกทางหนีไฟ': extinguishers.filter(e => getAssetCategory(e) === 'ป้ายบอกทางหนีไฟ'),
  };

  // 2. Active pool of extinguishers based on category filter
  const activeExts = selectedCategory === 'All' 
    ? extinguishers 
    : extinguishers.filter(e => getAssetCategory(e) === selectedCategory);

  const total = activeExts.length;
  const normal = activeExts.filter(e => e.status === 'ปกติ').length;
  const damaged = activeExts.filter(e => e.status === 'ชำรุด').length;
  const lowPressure = activeExts.filter(e => e.status === 'แรงดันต่ำ').length;
  const expiring = activeExts.filter(e => e.status === 'ใกล้หมดอายุ' || e.status === 'หมดอายุ').length;
  const repair = activeExts.filter(e => e.status === 'ส่งซ่อม').length;

  const totalInspectedInCycle = activeExts.filter(e => 
    isInspectedInCurrentMonth(e.lastInspectedAt, e.assetType || getAssetCategory(e))
  ).length;
  const inspectionRate = total > 0 ? Math.round((totalInspectedInCycle / total) * 100) : 0;
  const readyRate = total > 0 ? Math.round((normal / total) * 100) : 0;

  // Status Cards configuration
  const allStats = [
    {
      id: 'total',
      label: 'ทั้งหมด',
      value: total,
      icon: Layers,
      color: 'bg-slate-800 text-slate-300 border-slate-700',
      activeColor: 'ring-2 ring-slate-500 bg-slate-900 shadow-lg border-slate-600',
      statusValue: null,
      desc: selectedCategory === 'All' ? 'อุปกรณ์ความปลอดภัยทุกหมวด' : `จำนวน${selectedCategory}ทั้งหมด`
    },
    {
      id: 'normal',
      label: 'ปกติ / พร้อมใช้',
      value: normal,
      icon: ShieldCheck,
      color: 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50',
      activeColor: 'ring-2 ring-emerald-500 bg-slate-900 shadow-lg border-emerald-800',
      statusValue: 'ปกติ',
      desc: 'สภาพสมบูรณ์พร้อมใช้งาน'
    },
    {
      id: 'low_pressure_or_trouble',
      label: selectedCategory === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'มี Trouble / สัญญาณเตือน' : 'แรงดันต่ำ / ผิดปกติ',
      value: lowPressure,
      icon: AlertTriangle,
      color: 'bg-amber-950/50 text-amber-400 border-amber-900/50',
      activeColor: 'ring-2 ring-amber-500 bg-slate-900 shadow-lg border-amber-800',
      statusValue: 'แรงดันต่ำ',
      desc: selectedCategory === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'ระบบตรวจพบ Trouble Zone' : 'เกจ์แรงดันต่ำ/พร่อง'
    },
    {
      id: 'damaged',
      label: (selectedCategory === 'ไฟฉุกเฉิน' || selectedCategory === 'ป้ายบอกทางหนีไฟ') ? 'ไม่ปกติ / ชำรุด' : 'ชำรุด / มีปัญหา',
      value: damaged,
      icon: XCircle,
      color: 'bg-rose-950/50 text-rose-400 border-rose-900/50',
      activeColor: 'ring-2 ring-rose-500 bg-slate-900 shadow-lg border-rose-800',
      statusValue: 'ชำรุด',
      desc: (selectedCategory === 'ไฟฉุกเฉิน' || selectedCategory === 'ป้ายบอกทางหนีไฟ') ? 'หลอดดับ/ไม่สว่าง/ชำรุด' : 'อุปกรณ์ชำรุด/ไม่พร้อมใช้'
    },
    {
      id: 'expiring',
      label: 'ใกล้ / หมดอายุ',
      value: expiring,
      icon: Clock,
      color: 'bg-blue-950/50 text-blue-400 border-blue-900/50',
      activeColor: 'ring-2 ring-blue-500 bg-slate-900 shadow-lg border-blue-800',
      statusValue: 'ใกล้หมดอายุ',
      desc: 'ครบกำหนดตรวจทดสอบ/หมดอายุ'
    },
    {
      id: 'repair',
      label: 'ส่งซ่อมบำรุง',
      value: repair,
      icon: Wrench,
      color: 'bg-purple-950/50 text-purple-400 border-purple-900/50',
      activeColor: 'ring-2 ring-purple-500 bg-slate-900 shadow-lg border-purple-800',
      statusValue: 'ส่งซ่อม',
      desc: 'อยู่ระหว่างรออะไหล่/ซ่อม'
    }
  ];

  // Tailored card list per category:
  // - ตู้ดับเพลิง & ประตูกันไฟ: ตัด 'แรงดันต่ำ/ผิดปกติ' และ 'ใกล้/หมดอายุ' ออก
  // - ตู้แจ้งเหตุเพลิงไหม้: ตัด 'ใกล้/หมดอายุ' ออก
  // - ไฟฉุกเฉิน & ป้ายบอกทางหนีไฟ: ตัด 'แรงดันต่ำ/ผิดปกติ' และ 'ใกล้/หมดอายุ' ออก (มีเฉพาะ ทั้งหมด, ปกติ, ชำรุด/ไม่ปกติ, ส่งซ่อม)
  const stats = allStats.filter(stat => {
    if (selectedCategory === 'ตู้ดับเพลิง' || selectedCategory === 'ประตูกันไฟ' || selectedCategory === 'ไฟฉุกเฉิน' || selectedCategory === 'ป้ายบอกทางหนีไฟ') {
      if (stat.id === 'low_pressure_or_trouble' || stat.id === 'expiring') {
        return false;
      }
    }
    if (selectedCategory === 'ตู้แจ้งเหตุเพลิงไหม้') {
      if (stat.id === 'expiring') {
        return false;
      }
    }
    return true;
  });

  // Responsive grid class based on visible card count
  const gridLayoutClass = stats.length === 4
    ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-4'
    : stats.length === 5
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6';

  return (
    <div id="safety-dashboard-stats-wrapper" className="space-y-4">
      
      {/* 1. Category Overview & Quick Switcher Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {ASSET_CATEGORIES.map((cat, idx) => {
          const list = extsByCategory[cat.id];
          const catTotal = list.length;
          const catNormal = list.filter(e => e.status === 'ปกติ').length;
          const catIssue = catTotal - catNormal;
          const catInspected = list.filter(e => isInspectedInCurrentMonth(e.lastInspectedAt, cat.id)).length;
          const catPercent = catTotal > 0 ? Math.round((catNormal / catTotal) * 100) : 0;
          const isSelected = selectedCategory === cat.id;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -2 }}
              onClick={() => onSelectCategory(isSelected ? 'All' : cat.id)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected 
                  ? 'bg-slate-900 border-red-500 ring-2 ring-red-500/60 shadow-xl shadow-red-950/30' 
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900 shadow-md'
              }`}
            >
              {/* Category Header with 2-tier layout for zero truncation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg shrink-0 p-1.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center shadow-xs">
                    {cat.icon}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg whitespace-nowrap ${
                    catPercent >= 90 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' :
                    catPercent >= 70 ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' :
                    'bg-rose-950/60 text-rose-400 border border-rose-900/50'
                  }`}>
                    {catPercent}% พร้อมใช้
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100 leading-snug tracking-tight">
                    {cat.name.split(' (')[0]}
                  </h4>
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={10} className="text-red-400 shrink-0" />
                    <span>{cat.cycle}</span>
                  </span>
                </div>
              </div>

              {/* Counts & Progress Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white font-mono tracking-tight">{catTotal}</span>
                  <div className="text-[10px] font-medium text-right text-slate-400">
                    <span className="text-emerald-400 font-bold">{catNormal} ปกติ</span>
                    {catIssue > 0 && <span className="text-rose-400 font-bold ml-1.5">• {catIssue} มีปัญหา</span>}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800 flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${catTotal > 0 ? (catNormal / catTotal) * 100 : 0}%` }} 
                  />
                  <div 
                    className="bg-rose-500 h-full transition-all duration-500" 
                    style={{ width: `${catTotal > 0 ? (catIssue / catTotal) * 100 : 0}%` }} 
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1 font-semibold">
                    <CheckCircle2 size={10} className="text-emerald-400" />
                    ตรวจแล้วในรอบ: <strong className="text-white font-mono">{catInspected}/{catTotal}</strong>
                  </span>
                  {isSelected && (
                    <span className="text-red-400 font-bold uppercase tracking-wider">กำลังกรอง</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 2. Category Selector Pills & Scope Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800/90">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'All'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <Shield size={13} />
            <span>อุปกรณ์ทั้งหมด ({extinguishers.length})</span>
          </button>

          {ASSET_CATEGORIES.map(cat => {
            const count = extsByCategory[cat.id].length;
            const isCatSelected = selectedCategory === cat.id;
            return (
              <button
                key={`pill-${cat.id}`}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isCatSelected
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name.split(' (')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isCatSelected ? 'bg-red-800 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scope helper badge */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300">
          <Activity size={13} className="text-red-400" />
          <span>
            มุมมอง: <strong className="text-white">{selectedCategory === 'All' ? 'ความปลอดภัยรวม 4 ระบบ' : selectedCategory}</strong>
          </span>
          {onNavigateToInventory && (
            <button
              type="button"
              onClick={() => onNavigateToInventory(selectedCategory === 'All' ? 'ถังดับเพลิง' : selectedCategory, selectedStatus)}
              className="ml-1 text-[10px] font-bold text-red-400 hover:text-red-300 underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>ดูตารางรายการ</span>
              <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Interactive Status Cards Grid */}
      <div id="dashboard-stats-grid" className={`grid ${gridLayoutClass} gap-3 w-full`}>
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const isActive = selectedStatus === stat.statusValue || 
            (stat.statusValue === 'ใกล้หมดอายุ' && (selectedStatus === 'ใกล้หมดอายุ' || selectedStatus === 'หมดอายุ'));
          return (
            <motion.div
              key={stat.label}
              id={`stat-card-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              whileHover={{ y: -2 }}
              onClick={() => onSelectStatus(isActive ? null : stat.statusValue)}
              className={`cursor-pointer p-3.5 rounded-2xl border flex flex-col justify-between transition-all duration-200 select-none ${
                isActive ? stat.activeColor : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{stat.label}</span>
                <div className={`p-1.5 rounded-lg ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]}`}>
                  <Icon size={14} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-white tracking-tight font-sans">
                  {stat.value}
                </span>
                <p className="text-[9px] text-slate-400 mt-0.5 font-semibold tracking-wide line-clamp-1">{stat.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
