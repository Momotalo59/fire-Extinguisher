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
import { BarChart3, PieChart as PieIcon, TrendingUp, ShieldAlert, Award } from 'lucide-react';
import { FireExtinguisher, InspectionLog } from '../types';

interface DashboardChartsProps {
  extinguishers: FireExtinguisher[];
  logs: InspectionLog[];
}

export default function DashboardCharts({ extinguishers, logs }: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<'building' | 'status' | 'trend' | 'types'>('building');

  // --- 1. Data Preparation: Status by Building ---
  // Get all unique buildings
  const buildings = Array.from(new Set(extinguishers.map(e => e.building || 'ไม่ระบุสถานที่')));
  const statusByBuildingData = buildings.map(building => {
    const bExts = extinguishers.filter(e => e.building === building);
    return {
      name: building,
      'ปกติ': bExts.filter(e => e.status === 'ปกติ').length,
      'แรงดันต่ำ': bExts.filter(e => e.status === 'แรงดันต่ำ').length,
      'ชำรุด': bExts.filter(e => e.status === 'ชำรุด').length,
      'ใกล้หมดอายุ': bExts.filter(e => e.status === 'ใกล้หมดอายุ' || e.status === 'หมดอายุ').length,
      'ส่งซ่อม': bExts.filter(e => e.status === 'ส่งซ่อม').length,
    };
  });

  // --- 2. Data Preparation: Overall Status Pie ---
  const normalCount = extinguishers.filter(e => e.status === 'ปกติ').length;
  const lowCount = extinguishers.filter(e => e.status === 'แรงดันต่ำ').length;
  const damagedCount = extinguishers.filter(e => e.status === 'ชำรุด').length;
  const expiringCount = extinguishers.filter(e => e.status === 'ใกล้หมดอายุ' || e.status === 'หมดอายุ').length;
  const repairCount = extinguishers.filter(e => e.status === 'ส่งซ่อม').length;

  const statusPieData = [
    { name: 'ปกติ', value: normalCount, color: '#10b981' }, // emerald-500
    { name: 'แรงดันต่ำ', value: lowCount, color: '#f59e0b' }, // amber-500
    { name: 'ชำรุด', value: damagedCount, color: '#f43f5e' }, // rose-500
    { name: 'ใกล้หมดอายุ', value: expiringCount, color: '#3b82f6' }, // blue-500
    { name: 'ส่งซ่อม', value: repairCount, color: '#a855f7' } // purple-500
  ].filter(d => d.value > 0);

  // --- 3. Data Preparation: Type Distribution ---
  const types = Array.from(new Set(extinguishers.map(e => e.type)));
  const typeData = types.map(type => {
    return {
      name: type,
      'จำนวนถัง': extinguishers.filter(e => e.type === type).length
    };
  });

  // --- 4. Data Preparation: Monthly Inspection Trend ---
  // Let's parse inspection logs from the last 6 months
  const monthlyLogsData: { name: string; 'ตรวจผ่าน': number; 'ตรวจพบปัญหา': number }[] = [];
  const ThaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  
  // Create last 6 months entries
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthIndex = d.getMonth();
    const yearTh = (d.getFullYear() + 543) % 100;
    const label = `${ThaiMonths[monthIndex]} ${yearTh}`;
    
    // Filter logs for this specific month
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const logsInMonth = logs.filter(log => {
      const logDate = new Date(log.inspectionDate);
      return logDate >= startOfMonth && logDate <= endOfMonth;
    });

    const passed = logsInMonth.filter(log => log.inspectionResult === 'ผ่าน').length;
    const failed = logsInMonth.filter(log => log.inspectionResult === 'ไม่ผ่าน').length;

    monthlyLogsData.push({
      name: label,
      'ตรวจผ่าน': passed,
      'ตรวจพบปัญหา': failed
    });
  }

  // Calculate some safety index
  const totalInspections = logs.length;
  const passedInspections = logs.filter(l => l.inspectionResult === 'ผ่าน').length;
  const complianceRate = totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 100;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg space-y-6">
      
      {/* Header section with KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <span className="p-1.5 bg-slate-800 text-red-500 rounded-lg">
              <BarChart3 size={18} />
            </span>
            <span>แดชบอร์ดสรุปสถิติ & สรุปวิเคราะห์ข้อมูลถังดับเพลิง</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-bold">ข้อมูลสถิติล่าสุด อัปเดตแบบเรียลไทม์จากฐานข้อมูล Firestore</p>
        </div>

        {/* Highlight Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-950/40 border border-emerald-900/40 px-3 py-2 rounded-xl flex items-center gap-2">
            <Award className="text-emerald-400 shrink-0" size={16} />
            <div>
              <p className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider">ดัชนีพร้อมใช้งาน</p>
              <p className="text-xs font-black text-white font-mono mt-0.5">{complianceRate}% Safety Rate</p>
            </div>
          </div>
          <div className="bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl flex items-center gap-2">
            <ShieldAlert className="text-red-400 shrink-0" size={16} />
            <div>
              <p className="text-[9px] font-extrabold text-red-400 uppercase tracking-wider">ถังที่ต้องซ่อมบำรุง</p>
              <p className="text-xs font-black text-white font-mono mt-0.5">{lowCount + damagedCount + repairCount} ถัง</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs selectors */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl text-xs font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('building')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'building' ? 'bg-slate-800 text-white shadow-md' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <BarChart3 size={14} />
          <span>จำแนกตามอาคาร ({buildings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'status' ? 'bg-slate-800 text-white shadow-md' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <PieIcon size={14} />
          <span>สัดส่วนสภาพถังทั้งหมด</span>
        </button>

        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'types' ? 'bg-slate-800 text-white shadow-md' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <PieIcon size={14} />
          <span>จำแนกตามประเภทถัง</span>
        </button>

        <button
          onClick={() => setActiveTab('trend')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'trend' ? 'bg-slate-800 text-white shadow-md' : 'hover:text-white hover:bg-slate-900'
          }`}
        >
          <TrendingUp size={14} />
          <span>แนวโน้มการตรวจเช็ค (6 ด.)</span>
        </button>
      </div>

      {/* Rendering Charts workspace */}
      <div className="min-h-[320px] w-full flex items-center justify-center bg-slate-950/40 p-4 rounded-2xl border border-slate-800 relative">
        {extinguishers.length === 0 ? (
          <div className="text-center py-10 space-y-2 text-slate-500 font-semibold text-xs">
            <BarChart3 size={32} className="mx-auto text-slate-600 animate-bounce" />
            <p>ยังไม่มีข้อมูลถังดับเพลิงเพียงพอสำหรับการวิเคราะห์กราฟ</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {activeTab === 'building' ? (
              <BarChart
                data={statusByBuildingData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  allowDecimals={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #1e293b', 
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
                />
                <Bar dataKey="ปกติ" stackId="status" fill="#10b981" maxBarSize={32} radius={[0, 0, 0, 0]} />
                <Bar dataKey="แรงดันต่ำ" stackId="status" fill="#f59e0b" maxBarSize={32} radius={[0, 0, 0, 0]} />
                <Bar dataKey="ชำรุด" stackId="status" fill="#f43f5e" maxBarSize={32} radius={[0, 0, 0, 0]} />
                <Bar dataKey="ใกล้หมดอายุ" stackId="status" fill="#3b82f6" maxBarSize={32} radius={[0, 0, 0, 0]} />
                <Bar dataKey="ส่งซ่อม" stackId="status" fill="#a855f7" maxBarSize={32} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : activeTab === 'status' ? (
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #1e293b', 
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
              </PieChart>
            ) : activeTab === 'types' ? (
              <BarChart
                data={typeData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  allowDecimals={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #1e293b', 
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
                />
                <Bar dataKey="จำนวนถัง" fill="#ef4444" maxBarSize={35} radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart
                data={monthlyLogsData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  allowDecimals={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: '1px solid #1e293b', 
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }}
                />
                <Area type="monotone" dataKey="ตรวจผ่าน" stroke="#10b981" fillOpacity={1} fill="url(#colorPassed)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="ตรวจพบปัญหา" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Mini Insight Text footer */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-medium text-slate-300 leading-relaxed">
        <strong>คำแนะนำ:</strong> จากสถิติพบว่าในระบบมีถังสถานะปกติทั้งหมด {normalCount} ถัง ({Math.round((normalCount / (extinguishers.length || 1)) * 100)}%) ควรวางแผนเข้าตรวจเช็คถังประเภทที่ไม่ได้ตรวจเช็คประวัตินานกว่า 30 วันเพื่อความปลอดภัยสูงสุดของอาคารสถานที่
      </div>

    </div>
  );
}
