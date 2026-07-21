import React from 'react';
import { motion } from 'motion/react';
import { Flame, ShieldCheck, AlertTriangle, XCircle, Clock, Wrench } from 'lucide-react';
import { FireExtinguisher } from '../types';

interface DashboardStatsProps {
  extinguishers: FireExtinguisher[];
  onSelectStatus: (status: string | null) => void;
  selectedStatus: string | null;
}

export default function DashboardStats({ extinguishers, onSelectStatus, selectedStatus }: DashboardStatsProps) {
  const total = extinguishers.length;
  const normal = extinguishers.filter(e => e.status === 'ปกติ').length;
  const damaged = extinguishers.filter(e => e.status === 'ชำรุด').length;
  const lowPressure = extinguishers.filter(e => e.status === 'แรงดันต่ำ').length;
  const expiring = extinguishers.filter(e => e.status === 'ใกล้หมดอายุ' || e.status === 'หมดอายุ').length;
  const repair = extinguishers.filter(e => e.status === 'ส่งซ่อม').length;

  const stats = [
    {
      label: 'ทั้งหมด',
      value: total,
      icon: Flame,
      color: 'bg-slate-800 text-slate-300 border-slate-700',
      activeColor: 'ring-2 ring-slate-600 bg-slate-900 shadow-md border-slate-600',
      statusValue: null,
      desc: 'ถังดับเพลิงทั้งหมดในระบบ'
    },
    {
      label: 'ปกติ',
      value: normal,
      icon: ShieldCheck,
      color: 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50',
      activeColor: 'ring-2 ring-emerald-500 bg-slate-900 shadow-md border-emerald-800',
      statusValue: 'ปกติ',
      desc: 'สภาพปกติพร้อมใช้งาน'
    },
    {
      label: 'แรงดันต่ำ',
      value: lowPressure,
      icon: AlertTriangle,
      color: 'bg-amber-950/50 text-amber-400 border-amber-900/50',
      activeColor: 'ring-2 ring-amber-500 bg-slate-900 shadow-md border-amber-800',
      statusValue: 'แรงดันต่ำ',
      desc: 'เข็มต่ำกว่าเกณฑ์ปกติ'
    },
    {
      label: 'ชำรุด',
      value: damaged,
      icon: XCircle,
      color: 'bg-rose-950/50 text-rose-400 border-rose-900/50',
      activeColor: 'ring-2 ring-rose-500 bg-slate-900 shadow-md border-rose-800',
      statusValue: 'ชำรุด',
      desc: 'ถังเสียหาย/ไม่ปลอดภัย'
    },
    {
      label: 'ใกล้หมดอายุ',
      value: expiring,
      icon: Clock,
      color: 'bg-blue-950/50 text-blue-400 border-blue-900/50',
      activeColor: 'ring-2 ring-blue-500 bg-slate-900 shadow-md border-blue-800',
      statusValue: 'ใกล้หมดอายุ', // will filter 'ใกล้หมดอายุ' or 'หมดอายุ'
      desc: 'ถังใกล้/หมดอายุการใช้งาน'
    },
    {
      label: 'ส่งซ่อม',
      value: repair,
      icon: Wrench,
      color: 'bg-purple-950/50 text-purple-400 border-purple-900/50',
      activeColor: 'ring-2 ring-purple-500 bg-slate-900 shadow-md border-purple-800',
      statusValue: 'ส่งซ่อม',
      desc: 'อยู่ระหว่างดำเนินการซ่อม'
    }
  ];

  return (
    <div id="dashboard-stats-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const isActive = selectedStatus === stat.statusValue || 
          (stat.statusValue === 'ใกล้หมดอายุ' && (selectedStatus === 'ใกล้หมดอายุ' || selectedStatus === 'หมดอายุ'));
        return (
          <motion.div
            key={stat.label}
            id={`stat-card-${idx}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -2 }}
            onClick={() => onSelectStatus(stat.statusValue)}
            className={`cursor-pointer p-3 rounded-xl border flex flex-col justify-between transition-all duration-250 select-none ${
              isActive ? stat.activeColor : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
              <div className={`p-1.5 rounded-lg ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]}`}>
                <Icon size={14} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-white tracking-tight font-sans">
                {stat.value}
              </span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-semibold tracking-wide uppercase line-clamp-1">{stat.desc}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
