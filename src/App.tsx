import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Database, 
  Scan, 
  HelpCircle, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  FileCheck2,
  BookmarkCheck,
  Check,
  LogOut,
  User,
  ChevronLeft,
  History
} from 'lucide-react';
import { 
  getExtinguishers, 
  getInspectionLogs, 
  addExtinguisher, 
  updateExtinguisher, 
  deleteExtinguisher, 
  addInspectionLog,
  seedDatabaseIfEmpty 
} from './lib/dbHelpers';
import { FireExtinguisher, InspectionLog } from './types';
import DashboardStats from './components/DashboardStats';
import DashboardCharts from './components/DashboardCharts';
import ExtinguisherList from './components/ExtinguisherList';
import InspectionForm from './components/InspectionForm';
import LogHistory from './components/LogHistory';
import QRScanner from './components/QRScanner';
import AuthScreen from './components/AuthScreen';
import AllInspectionLogs from './components/AllInspectionLogs';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';

export default function App() {
  const [extinguishers, setExtinguishers] = useState<FireExtinguisher[]>([]);
  const [logs, setLogs] = useState<InspectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ fullName?: string; department?: string; role?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Selection & UI States
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'extinguishers' | 'history'>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [activeInspection, setActiveInspection] = useState<FireExtinguisher | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' น.');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            setUserProfile({
              fullName: currentUser.isAnonymous ? 'ผู้ใช้งานทั่วไป (Guest User)' : currentUser.email?.split('@')[0],
              department: 'แผนกความปลอดภัยทั่วไป',
              role: 'Inspector'
            });
          }
        } catch (err) {
          console.error("Error fetching profile in App.tsx:", err);
          setUserProfile({
            fullName: currentUser.email?.split('@')[0] || 'Guest User',
            department: 'แผนกความปลอดภัยทั่วไป',
            role: 'Inspector'
          });
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial data & seed if empty (only if user is logged in!)
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure database has standard fire extinguishers to interact with immediately
      await seedDatabaseIfEmpty();
      
      // Load from Firestore
      const exData = await getExtinguishers();
      const logsData = await getInspectionLogs();
      
      setExtinguishers(exData);
      setLogs(logsData);

      // Auto-select first extinguisher if none selected
      if (exData.length > 0 && !selectedId) {
        setSelectedId(exData[0].id);
      }
    } catch (err: any) {
      console.error("Error loading data from Firestore:", err);
      setError("ไม่สามารถดึงข้อมูลจากฐานข้อมูล Firebase ได้ กรุณาตรวจสอบอินเทอร์เน็ตหรือตั้งค่า Firebase: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setExtinguishers([]);
      setLogs([]);
    }
  }, [user]);

  // Toast feedback helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Database actions callbacks
  const handleAddExtinguisher = async (newExt: Omit<FireExtinguisher, 'createdAt'>) => {
    try {
      await addExtinguisher(newExt);
      await loadData();
      setSelectedId(newExt.id);
      triggerToast(`ลงทะเบียนถังดับเพลิง ${newExt.id} สำเร็จ!`);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleEditExtinguisher = async (updatedExt: FireExtinguisher) => {
    try {
      await updateExtinguisher(updatedExt);
      await loadData();
      triggerToast(`อัปเดตข้อมูลถัง ${updatedExt.id} สำเร็จ`);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteExtinguisher = async (id: string) => {
    try {
      await deleteExtinguisher(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
      await loadData();
      triggerToast(`ลบถังดับเพลิง ${id} สำเร็จ`);
    } catch (err: any) {
      console.error(err);
      triggerToast("เกิดข้อผิดพลาดในการลบถังดับเพลิง");
    }
  };

  const handleInspectionSubmit = async (newLog: Omit<InspectionLog, 'inspectionId'>) => {
    try {
      await addInspectionLog(newLog);
      await loadData();
      setActiveInspection(null);
      setSelectedId(newLog.feId);
      triggerToast(`บันทึกการตรวจสอบถัง ${newLog.feId} ผ่านระบบสำเร็จ!`);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Trigger from stats card clicking
  const handleSelectStatusFilter = (status: string | null) => {
    setSelectedStatusFilter(status);
    setCurrentTab('extinguishers');
  };

  // Trigger from QR scanner simulator
  const handleScannerSuccess = (id: string) => {
    const found = extinguishers.find(e => e.id.toLowerCase() === id.toLowerCase());
    if (found) {
      setSelectedId(found.id);
      setActiveInspection(found); // Open inspection form for this scanned item!
      triggerToast(`ตรวจพบรหัสถัง ${found.id} เริ่มทำรายการตรวจเช็ค...`);
    } else {
      triggerToast(`ไม่พบรหัสถังดับเพลิง ${id} ในระบบของคุณ`);
    }
    setIsScannerOpen(false);
  };

  const filteredLogs = selectedId 
    ? logs.filter(l => l.feId === selectedId)
    : [];

  const selectedExtinguisher = selectedId
    ? extinguishers.find(e => e.id === selectedId) || null
    : null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin"></div>
          <Flame className="absolute text-red-600 animate-pulse" size={18} />
        </div>
        <p className="text-xs text-slate-400 font-medium font-sans animate-pulse">กำลังตรวจสอบสิทธิ์การใช้งานระบบ...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSuccess={() => loadData()} />;
  }

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      
      {/* Header Bar - Professional Polish Edition */}
      <nav id="app-main-header" className="bg-slate-900 text-white px-6 md:px-8 h-16 flex items-center justify-between shadow-lg shrink-0 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white shadow-md shadow-red-600/30">
            <Flame size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center">
              <span className="text-base md:text-lg font-bold tracking-tight">FIRE SAFE</span>
              <span className="text-xs font-medium text-slate-400 border-l border-slate-700 ml-2 pl-2 hidden sm:inline">Asset Manager</span>
            </div>
          </div>
        </div>

        {/* Status badges & Controls */}
        <div className="flex items-center space-x-3 md:space-x-4 text-sm font-medium">
          
          {user && (
            <div className="flex items-center gap-2 bg-slate-850/80 border border-slate-800/50 px-2.5 py-1 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-red-600/95 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">
                <User size={12} />
              </div>
              <div className="flex flex-col text-left max-w-[130px] md:max-w-[180px]">
                <span className="text-[11px] text-slate-100 font-bold truncate leading-tight">
                  {userProfile?.fullName || user.email || 'Guest User'}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5 truncate">
                  {userProfile?.role === 'Admin' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ตรวจสอบ (Inspector)'} • {userProfile?.department || 'ทั่วไป'}
                </span>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="text-[10px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer border-l border-slate-700/80 pl-2 ml-1 flex items-center gap-1 font-bold"
                title="ออกจากระบบ"
              >
                <LogOut size={11} />
                <span className="hidden sm:inline">ออก</span>
              </button>
            </div>
          )}

          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 font-medium font-mono">
            <Clock size={13} className="text-slate-500" />
            <span>{currentDate ? currentDate.split(' ')[1] + ' ' + currentDate.split(' ')[2] + ' ' + currentDate.split(' ')[3] : 'กำลังโหลด...'}</span>
          </div>

          <button
            onClick={() => {
              setActiveInspection(null);
              setIsScannerOpen(true);
            }}
            className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-md shadow-red-900/30 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Scan size={13} />
            <span className="hidden sm:inline">สแกน QR Code</span>
            <span className="sm:hidden">สแกน</span>
          </button>
        </div>
      </nav>

      {/* Sub-header Navigation Tabs */}
      <div id="app-sub-navigation" className="bg-slate-900 border-b border-slate-800 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between overflow-x-auto scrollbar-none">
          <div className="flex space-x-1 md:space-x-2 py-3">
            <button
              onClick={() => {
                setActiveInspection(null);
                setCurrentTab('dashboard');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-red-950/50 text-red-400 border border-red-900/50 shadow-inner'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'
              }`}
            >
              <TrendingUp size={14} />
              <span>แดชบอร์ดความปลอดภัย</span>
            </button>

            <button
              onClick={() => {
                setActiveInspection(null);
                setCurrentTab('extinguishers');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentTab === 'extinguishers'
                  ? 'bg-red-950/50 text-red-400 border border-red-900/50 shadow-inner'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Database size={14} />
              <span>รายการถังดับเพลิง</span>
            </button>

            <button
              onClick={() => {
                setActiveInspection(null);
                setCurrentTab('history');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentTab === 'history'
                  ? 'bg-red-950/50 text-red-400 border border-red-900/50 shadow-inner'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-transparent'
              }`}
            >
              <History size={14} />
              <span>ประวัติการตรวจเช็ค</span>
            </button>
          </div>
          
          {/* Quick status message */}
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-450 uppercase font-extrabold tracking-wider border-l border-slate-800 pl-4 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
            <span>ซิงค์สดผ่านคลาวด์</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Loading Spinner */}
        {loading && extinguishers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
              <Flame className="absolute text-red-600 animate-pulse" size={18} />
            </div>
            <p className="text-xs text-slate-500 font-medium animate-pulse">กำลังเชื่อมต่อระบบรักษาความปลอดภัยกับ Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 max-w-xl mx-auto shadow-sm">
            <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold">ไม่สามารถดึงข้อมูลได้</p>
              <p className="text-xs mt-0.5 text-rose-700 leading-relaxed">{error}</p>
              <button 
                onClick={loadData}
                className="mt-2 text-xs font-bold text-rose-900 underline hover:no-underline"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeInspection ? (
              <motion.div
                key="inspection-workspace"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Back button row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveInspection(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      title="กลับหน้าหลัก"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-950/40 border border-red-900/50 py-0.5 px-2.5 rounded">
                          พื้นที่ตรวจเช็คเฉพาะทาง (Dedicated Inspection Workspace)
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          STATUS: ACTIVE
                        </span>
                      </div>
                      <h2 className="text-sm md:text-base font-extrabold text-slate-100 mt-0.5">
                        ระบบบันทึกการตรวจเช็คถังดับเพลิง: <span className="font-mono text-red-500">{activeInspection.id}</span>
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveInspection(null)}
                    className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 py-1.5 px-4 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>กลับสู่หน้าหลัก</span>
                  </button>
                </div>

                {/* Main Inspection Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Target Extinguisher Card & History */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Extinguisher Profile card */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold tracking-wide ${
                            activeInspection.status === 'ปกติ' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                            activeInspection.status === 'แรงดันต่ำ' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                            'bg-rose-950/40 text-rose-400 border border-rose-900/40'
                          }`}>
                            {activeInspection.status}
                          </span>
                          <h3 className="text-base font-extrabold text-white mt-2 font-mono">
                            รหัสถัง: {activeInspection.id}
                          </h3>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
                          {activeInspection.type}
                        </span>
                      </div>

                      {activeInspection.photoUrl ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                          <img 
                            src={activeInspection.photoUrl} 
                            alt={activeInspection.id} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video w-full rounded-xl border border-dashed border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center text-slate-500">
                          <Flame size={24} className="text-slate-600 animate-pulse" />
                          <span className="text-[10px] font-bold mt-1">ไม่มีภาพถ่ายในระบบ</span>
                        </div>
                      )}

                      <div className="space-y-2 text-xs border-t border-slate-800 pt-3 font-semibold text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">อาคาร / สถานที่:</span>
                          <span className="font-bold text-white">{activeInspection.building}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">ชั้น / ตําแหน่ง:</span>
                          <span className="font-bold text-white">ชั้น {activeInspection.floor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">รายละเอียดจุดติดตั้ง:</span>
                          <span className="font-bold text-white">{activeInspection.locationDetails}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">ขนาดน้วนน้ำหนัก:</span>
                          <span className="font-bold text-white font-mono">{activeInspection.weightKg} กิโลกรัม</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">วันลงทะเบียน:</span>
                          <span className="font-bold text-white font-mono">{new Date(activeInspection.createdAt).toLocaleDateString('th-TH')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick logs check */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <History size={14} className="text-red-500 animate-pulse" />
                        ประวัติการตรวจเช็คที่ผ่านมา
                      </h4>
                      <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                        {filteredLogs.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-4 font-bold">ยังไม่มีข้อมูลการตรวจที่ผ่านมา</p>
                        ) : (
                          filteredLogs.map(log => (
                            <div key={log.inspectionId} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-[11px]">
                              <div>
                                <p className="font-bold text-slate-800">{log.inspectorName}</p>
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  {new Date(log.inspectionDate).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                log.inspectionResult === 'ผ่าน' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                              }`}>
                                {log.inspectionResult}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Inspection Form */}
                  <div className="lg:col-span-8 min-h-[500px]">
                    <InspectionForm 
                      extinguisher={activeInspection}
                      onSubmit={handleInspectionSubmit}
                      onCancel={() => setActiveInspection(null)}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {currentTab === 'dashboard' && (
                  <motion.div
                    key="dashboard-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Interactive Stats Grid */}
                    <DashboardStats 
                      extinguishers={extinguishers}
                      onSelectStatus={handleSelectStatusFilter}
                      selectedStatus={selectedStatusFilter}
                    />

                    {/* Dashboard Analytics & Charts */}
                    <DashboardCharts 
                      extinguishers={extinguishers}
                      logs={logs}
                    />
                  </motion.div>
                )}

                {currentTab === 'extinguishers' && (
                  <motion.div
                    key="extinguishers-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Content Split Grid */}
                    <div id="app-split-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left Column (Inventory List) */}
                      <div className="lg:col-span-7 h-[calc(100vh-250px)] min-h-[500px]">
                        <ExtinguisherList 
                          extinguishers={extinguishers}
                          selectedId={selectedId}
                          selectedStatusFilter={selectedStatusFilter}
                          onSelectExtinguisher={(id) => {
                            setSelectedId(id || null);
                            // Clear other active forms when changing extinguisher selection
                            setActiveInspection(null);
                            setIsScannerOpen(false);
                          }}
                          onInspect={(ext) => {
                            setSelectedId(ext.id);
                            setIsScannerOpen(false);
                            setActiveInspection(ext);
                          }}
                          onAddExtinguisher={handleAddExtinguisher}
                          onEditExtinguisher={handleEditExtinguisher}
                          onDeleteExtinguisher={handleDeleteExtinguisher}
                          isAdmin={userProfile?.role === 'Admin'}
                        />
                      </div>

                      {/* Right Column (Dynamic Area: History Logs) */}
                      <div className="lg:col-span-5 h-[calc(100vh-250px)] min-h-[500px] flex flex-col gap-4">
                        <div className="flex-1 min-h-[300px]">
                          <LogHistory 
                            logs={filteredLogs}
                            extinguisher={selectedExtinguisher}
                          />
                        </div>

                        {/* Safety Quick Guide card */}
                        {selectedExtinguisher && (
                          <div id="safety-checklist-guide-card" className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 flex items-start gap-3 shadow-lg">
                            <HelpCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-wider">
                                แนวทางการเช็คถังดับเพลิงเบื้องต้น
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                                ตรวจสอบเกจวัดแรงดันทุกเดือน เข็มจะต้องอยู่ในแถบสีเขียวเสมอ สลักซีลนิรภัยไม่สูญหายหรือขาด ตัวถังภายนอกปราศจากสนิม คราบน้ำมัน หรือรอยบุบร้าว และสายฉีดสะอาดไม่มีรอยแยกหรืออุดตัน
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}

                {currentTab === 'history' && (
                  <motion.div
                    key="history-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AllInspectionLogs 
                      logs={logs}
                      extinguishers={extinguishers}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Professional QR Scanner Modal Overlay */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-lg"
            >
              <QRScanner 
                extinguishers={extinguishers}
                onScanSuccess={handleScannerSuccess}
                onClose={() => setIsScannerOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-in Toast Feedback Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-slate-900 border border-slate-850 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-semibold"
          >
            <div className="p-1 rounded bg-emerald-500 text-white shrink-0">
              <Check size={14} />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="h-11 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 shrink-0 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-auto">
        <div>System Version: 1.0.0-Stable</div>
        <div>Real-time sync with Cloud Firestore</div>
        <div>&copy; {new Date().getFullYear()} แผนกช่างเทคนิคควบคุมระบบ โรงพยาบาลโอเวอร์บรุ๊คเชียงราย.</div>
      </footer>

    </div>
  );
}
