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
  ChevronDown,
  History,
  Users,
  Shield,
  Bell,
  Building2,
  MapPin,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import { useTheme } from './lib/ThemeContext';
import { 
  getExtinguishers, 
  getInspectionLogs, 
  addExtinguisher, 
  updateExtinguisher, 
  deleteExtinguisher, 
  addInspectionLog,
  seedDatabaseIfEmpty,
  isInspectedInCurrentMonth
} from './lib/dbHelpers';
import { FireExtinguisher, InspectionLog } from './types';
import { cleanInspectorName } from './lib/exportUtils';
import { ASSET_CATEGORIES, HOSPITAL_BUILDINGS, getAssetCategory, getBuildingEquipmentStats, buildingSupportsFireDoor } from './lib/assetHelpers';
import { 
  checkExpiringExtinguishers, 
  autoSyncExpiryStatuses, 
  playAlertChimeSound, 
  requestBrowserNotificationPermission, 
  sendBrowserExpiryNotification, 
  ExpiryAlertItem 
} from './lib/autoExpiryAlert';
import ExpiryAlertBanner from './components/ExpiryAlertBanner';
import NotificationCenterModal from './components/NotificationCenterModal';
import DashboardStats from './components/DashboardStats';
import DashboardCharts from './components/DashboardCharts';
import ExtinguisherList from './components/ExtinguisherList';
import InspectionForm from './components/InspectionForm';
import LogHistory from './components/LogHistory';
import QRScanner from './components/QRScanner';
import AuthScreen from './components/AuthScreen';
import AllInspectionLogs from './components/AllInspectionLogs';
import UserManagementModal from './components/UserManagementModal';
import SafetyGuidelineCard from './components/SafetyGuidelineCard';
import FloorPlanViewer from './components/FloorPlanViewer';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [extinguishers, setExtinguishers] = useState<FireExtinguisher[]>([]);
  const [logs, setLogs] = useState<InspectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-Expiry Alerts & Notifications States
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlertItem[]>([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [dismissBanner, setDismissBanner] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Auth States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<{ fullName?: string; department?: string; role?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Selection & UI States
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'extinguishers' | 'history' | 'floorplan'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>('All');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('All');
  const [dashboardCategory, setDashboardCategory] = useState<string>('All');
  const [isEquipmentSubmenuOpen, setIsEquipmentSubmenuOpen] = useState<boolean>(true);
  const [isBuildingSubmenuOpen, setIsBuildingSubmenuOpen] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [activeInspection, setActiveInspection] = useState<FireExtinguisher | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Live clock
  useEffect(() => {
    // Auto-open QR scanner if launched via ?scan=true URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('scan') === 'true' || window.location.hash === '#scan') {
      setIsScannerOpen(true);
    }

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

      setCurrentTime(now.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
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
      let exData = await getExtinguishers();
      const logsData = await getInspectionLogs();
      
      // Auto-sync expiry status in Firestore if expiry date passed or is within 30 days
      const updatedCount = await autoSyncExpiryStatuses(exData);
      if (updatedCount > 0) {
        exData = await getExtinguishers();
      }

      setExtinguishers(exData);
      setLogs(logsData);

      // Compute auto-expiry alerts
      const alerts = checkExpiringExtinguishers(exData);
      setExpiryAlerts(alerts);

      // Trigger sound alert & push notification if expiring tanks detected
      if (alerts.length > 0) {
        if (soundEnabled) {
          playAlertChimeSound();
        }
        if (hasNotificationPermission) {
          sendBrowserExpiryNotification(
            '⚡ แจ้งเตือนถังดับเพลิงใกล้หมดอายุ',
            `ตรวจพบถังดับเพลิงใกล้/หมดอายุรวม ${alerts.length} ถัง โปรดตรวจสอบในระบบ`
          );
        }
      }

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

  // Request browser notification permission helper
  const handleRequestNotificationPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      triggerToast('เปิดรับการแจ้งเตือนบนเบราว์เซอร์สำเร็จ!');
    } else {
      triggerToast('ไม่สามารถเปิดการแจ้งเตือนได้ หรือถูกปฏิเสธสิทธิ์ในเบราว์เซอร์');
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
  const handleSelectStatusFilter = (status: string | null, category?: string) => {
    setActiveInspection(null);
    setSelectedId(null);
    if (category) {
      setSelectedAssetCategory(category);
    } else if (dashboardCategory !== 'All') {
      setSelectedAssetCategory(dashboardCategory);
    }
    setSelectedStatusFilter(status);
    setCurrentTab('extinguishers');
    if (status) {
      triggerToast(`กรองรายการอุปกรณ์สถานะ: "${status}" เรียบร้อยแล้ว`);
    }
  };

  // Trigger from QR scanner simulator
  const handleScannerSuccess = (id: string) => {
    const found = extinguishers.find(e => e.id.toLowerCase() === id.toLowerCase());
    if (found) {
      setSelectedId(found.id);
      setActiveInspection(found); // Open inspection form for this scanned item!
      if (isInspectedInCurrentMonth(found.lastInspectedAt)) {
        triggerToast(`ถังรหัส ${found.id} ถูกตรวจเช็คในประจำเดือนนี้แล้ว`);
      } else {
        triggerToast(`ตรวจพบรหัสถัง ${found.id} เริ่มทำรายการตรวจเช็ค...`);
      }
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
    <div id="app-root-container" className="h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col overflow-hidden">
      
      {/* Header Bar - Fixed Top Navigation */}
      <nav id="app-main-header" className="sticky top-0 bg-slate-900 text-white px-2.5 sm:px-4 md:px-6 h-16 flex items-center justify-between shadow-lg shrink-0 z-40 gap-2 border-b border-slate-800">
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Mobile Hamburger Menu Button (3 horizontal lines / X when open) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95"
            title={isMobileMenuOpen ? "ปิดเมนูหลัก" : "เปิดเมนูหลัก"}
            aria-label={isMobileMenuOpen ? "ปิดเมนูหลัก" : "เปิดเมนูหลัก"}
          >
            {isMobileMenuOpen ? (
              <X size={20} className="text-red-400 animate-in fade-in" />
            ) : (
              <Menu size={20} className="text-slate-100 animate-in fade-in" />
            )}
          </button>

          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white shadow-md shadow-red-600/30 shrink-0">
            <Flame size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center">
              <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight whitespace-nowrap text-white">Safety Management</span>
            </div>
          </div>
        </div>

        {/* Status badges & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 text-sm font-medium shrink-0 max-w-full overflow-hidden">
          
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-850/80 border border-slate-800/50 px-2 sm:px-2.5 py-1 rounded-xl shrink-0 max-w-[120px] md:max-w-[180px]">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-600/95 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">
                <User size={11} />
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-[10px] sm:text-[11px] text-slate-100 font-bold truncate leading-tight">
                  {userProfile?.fullName ? userProfile.fullName.split(' ')[0] : (user.email?.split('@')[0] || 'User')}
                </span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-semibold leading-none mt-0.5 truncate hidden md:block">
                  {userProfile?.role === 'Admin' ? 'Admin' : 'Inspector'} • {userProfile?.department || 'ช่าง'}
                </span>
              </div>
            </div>
          )}

          {/* Date Month Year - Desktop only */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-300 font-medium font-mono shrink-0">
            <Clock size={13} className="text-slate-400 shrink-0" />
            <span>{currentDate ? currentDate.split(' ')[1] + ' ' + currentDate.split(' ')[2] + ' ' + currentDate.split(' ')[3] : 'กำลังโหลด...'}</span>
          </div>

          {/* Online badge & Digital Clock */}
          <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-800 pl-2 sm:pl-2.5 shrink-0">
            <div className="flex items-center gap-1 bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden md:inline">Online</span>
            </div>

            {currentTime && (
              <div className="hidden lg:flex items-center gap-1.5 text-slate-200 font-mono text-xs bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 shadow-inner shrink-0">
                <Clock size={11} className="text-red-400 shrink-0" />
                <span className="font-semibold tracking-wider text-slate-100">{currentTime}</span>
              </div>
            )}
          </div>

          {/* Theme Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="relative p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={17} className="text-amber-400" />
                <span className="hidden xl:inline text-[11px] font-bold text-slate-200">โหมดสว่าง</span>
              </>
            ) : (
              <>
                <Moon size={17} className="text-indigo-400" />
                <span className="hidden xl:inline text-[11px] font-bold text-slate-200">โหมดมืด</span>
              </>
            )}
          </button>

          {/* Notification Bell Button with Badge */}
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="relative p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer shrink-0"
            title="ศูนย์แจ้งเตือนถังใกล้หมดอายุ/ชำรุด"
          >
            <Bell size={17} className={expiryAlerts.length > 0 ? "text-amber-400 animate-pulse" : "text-slate-400"} />
            {expiryAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md animate-bounce">
                {expiryAlerts.length}
              </span>
            )}
          </button>

          {/* Scan QR Button - PROMINENT & ALWAYS VISIBLE */}
          <button
            onClick={() => {
              setActiveInspection(null);
              setIsScannerOpen(true);
            }}
            className="bg-red-600 hover:bg-red-500 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-red-900/40 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0 z-10 border border-red-500/50"
            title="สแกน QR Code"
          >
            <Scan size={15} className="animate-pulse shrink-0" />
            <span className="whitespace-nowrap font-extrabold text-xs">สแกน QR</span>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Down Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-navigation-drawer"
            key="mobile-nav-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden bg-slate-900 border-b border-slate-800 shadow-2xl z-40 overflow-y-auto max-h-[85vh] divide-y divide-slate-800"
          >
            {/* User Profile Bar on Mobile */}
            {user && (
              <div className="p-3 bg-slate-950/70 flex items-center justify-between gap-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-md shrink-0">
                    <User size={15} />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-100 truncate">
                      {userProfile?.fullName || user.email?.split('@')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">
                      {userProfile?.role === 'Admin' ? 'ผู้ดูแลระบบ (Admin)' : 'เจ้าหน้าที่ตรวจเช็ค'} • {userProfile?.department || 'ช่าง'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut(auth);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-800 flex items-center gap-1 shrink-0 transition-colors"
                  title="ออกจากระบบ"
                >
                  <LogOut size={13} />
                  <span>ออก</span>
                </button>
              </div>
            )}

            {/* Menu List */}
            <div className="p-3 space-y-2 bg-slate-900">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                เมนูหลักระบบ (Main Menu)
              </div>

              {/* 1. Dashboard */}
              <button
                onClick={() => {
                  setActiveInspection(null);
                  setCurrentTab('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp size={16} className={currentTab === 'dashboard' ? 'text-white' : 'text-red-400'} />
                  <span>แดชบอร์ดความปลอดภัย</span>
                </div>
                <span className="text-[10px] opacity-80 font-mono">ภาพรวม</span>
              </button>

              {/* 2. Equipment Categories Expandable Section */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2 space-y-2">
                <button
                  onClick={() => setIsEquipmentSubmenuOpen(!isEquipmentSubmenuOpen)}
                  className="w-full flex items-center justify-between p-1.5 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-red-400" />
                    <span>รายการอุปกรณ์ ({extinguishers.length})</span>
                  </div>
                  <ChevronDown size={15} className={`transition-transform duration-200 ${isEquipmentSubmenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isEquipmentSubmenuOpen && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() => {
                        setActiveInspection(null);
                        setCurrentTab('extinguishers');
                        setSelectedAssetCategory('All');
                        setSelectedBuilding('All');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        currentTab === 'extinguishers' && selectedAssetCategory === 'All' && selectedBuilding === 'All'
                          ? 'bg-red-600 text-white font-extrabold shadow-xs'
                          : 'bg-slate-850 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>📋</span>
                        <span>ทั้งหมด</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-80">({extinguishers.length})</span>
                    </button>

                    {ASSET_CATEGORIES.map((cat) => {
                      const count = extinguishers.filter(e => getAssetCategory(e) === cat.id).length;
                      const isSelected = currentTab === 'extinguishers' && selectedAssetCategory === cat.id;

                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setActiveInspection(null);
                            setCurrentTab('extinguishers');
                            setSelectedAssetCategory(cat.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-red-600 text-white font-extrabold shadow-xs'
                              : 'bg-slate-850 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span>{cat.icon}</span>
                            <span className="truncate">{cat.name.split(' (')[0]}</span>
                          </span>
                          <span className="font-mono text-[10px] opacity-80 shrink-0 ml-1">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Buildings Expandable Section */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2 space-y-2">
                <button
                  onClick={() => setIsBuildingSubmenuOpen(!isBuildingSubmenuOpen)}
                  className="w-full flex items-center justify-between p-1.5 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-400" />
                    <span>แยกตามอาคาร ({HOSPITAL_BUILDINGS.length})</span>
                  </div>
                  <ChevronDown size={15} className={`transition-transform duration-200 ${isBuildingSubmenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isBuildingSubmenuOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60">
                    {HOSPITAL_BUILDINGS.map((bldg) => {
                      const stats = getBuildingEquipmentStats(extinguishers, bldg.name);
                      const isSelected = (currentTab === 'extinguishers' || currentTab === 'floorplan') && selectedBuilding === bldg.name;

                      return (
                        <button
                          key={bldg.id}
                          onClick={() => {
                            setActiveInspection(null);
                            setSelectedBuilding(bldg.name);
                            setSelectedAssetCategory('All');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                              : 'bg-slate-850 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span>{bldg.icon}</span>
                            <span className="truncate">{bldg.name}</span>
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                            isSelected ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {stats.total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Interactive Floor Plan Menu Item */}
              <button
                onClick={() => {
                  setActiveInspection(null);
                  setCurrentTab('floorplan');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'floorplan'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} className={currentTab === 'floorplan' ? 'text-white' : 'text-emerald-400'} />
                  <span>แผนผังจุดติดตั้ง (Floor Plan)</span>
                </div>
                <span className="text-[10px] bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 font-mono py-0.5 px-2 rounded-full">
                  LIVE CAD
                </span>
              </button>

              {/* 5. Inspection History */}
              <button
                onClick={() => {
                  setActiveInspection(null);
                  setCurrentTab('history');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentTab === 'history'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History size={16} className={currentTab === 'history' ? 'text-white' : 'text-blue-400'} />
                  <span>ประวัติการตรวจเช็คย้อนหลัง</span>
                </div>
                <span className="text-[10px] opacity-80 font-mono">({logs.length})</span>
              </button>

              {/* 5. User Management if Admin */}
              {userProfile?.role === 'Admin' && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsUserMgmtOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold bg-amber-950/50 border border-amber-800/60 text-amber-300 hover:bg-amber-900/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Users size={16} className="text-amber-400" />
                    <span>จัดการผู้ใช้งาน</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black">Admin</span>
                </button>
              )}
            </div>

            {/* Quick Actions Footer inside Mobile Menu */}
            <div className="p-3 bg-slate-950/80 flex items-center justify-between gap-2 border-t border-slate-800/60">
              <button
                onClick={() => {
                  toggleTheme();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 cursor-pointer transition-colors"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun size={15} className="text-amber-400" />
                    <span>โหมดสว่าง</span>
                  </>
                ) : (
                  <>
                    <Moon size={15} className="text-indigo-400" />
                    <span>โหมดมืด</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsNotificationModalOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 cursor-pointer relative transition-colors"
              >
                <Bell size={15} className={expiryAlerts.length > 0 ? "text-amber-400" : "text-slate-400"} />
                <span>แจ้งเตือน</span>
                {expiryAlerts.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
                    {expiryAlerts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setActiveInspection(null);
                  setIsScannerOpen(true);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-md cursor-pointer transition-colors"
              >
                <Scan size={15} />
                <span>สแกน QR</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Body Layout with Fixed Left Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto overflow-hidden min-h-0">
        
        {/* Left Sidebar Navigation (Desktop only, clean and spacious) */}
        <aside className="hidden md:flex flex-col md:w-60 lg:w-64 bg-slate-900/95 border-r border-slate-800 p-3 md:p-4 shrink-0 justify-between h-full z-30 shadow-none">
          <div className="flex flex-col items-stretch space-y-1.5 w-full">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 py-1.5 hidden md:block">
              เมนูหลักระบบ (Main Menu)
            </div>

            <button
              onClick={() => {
                setActiveInspection(null);
                setCurrentTab('dashboard');
              }}
              className={`flex items-center gap-2 md:gap-2.5 px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full ${
                currentTab === 'dashboard'
                  ? 'bg-red-950/70 text-red-400 border border-red-900/60 shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
              }`}
            >
              <TrendingUp size={16} />
              <span>แดชบอร์ดความปลอดภัย</span>
            </button>

            {/* รายการอุปกรณ์ Menu with Dropdown */}
            <div className="w-full space-y-1">
              <button
                onClick={() => {
                  setActiveInspection(null);
                  setCurrentTab('extinguishers');
                  setIsEquipmentSubmenuOpen(!isEquipmentSubmenuOpen);
                }}
                className={`flex items-center justify-between gap-2 px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap w-full ${
                  currentTab === 'extinguishers'
                    ? 'bg-red-950/70 text-red-400 border border-red-900/60 shadow-inner'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 md:gap-2.5">
                  <Database size={16} />
                  <span>รายการอุปกรณ์</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                    {extinguishers.length}
                  </span>
                </div>
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-200 text-slate-400 ${isEquipmentSubmenuOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Submenu List */}
              {isEquipmentSubmenuOpen && (
                <div className="flex md:flex-col items-center md:items-stretch gap-1 pl-2 md:pl-3 mt-1 border-l-2 border-red-900/40 ml-2 md:ml-3">
                  <button
                    onClick={() => {
                      setActiveInspection(null);
                      setCurrentTab('extinguishers');
                      setSelectedAssetCategory('All');
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap w-full ${
                      currentTab === 'extinguishers' && selectedAssetCategory === 'All' && selectedBuilding === 'All'
                        ? 'bg-red-600 text-white font-extrabold shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 bg-slate-950/40 md:bg-transparent border border-slate-800 md:border-0'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">📋</span>
                      <span>อุปกรณ์ทั้งหมด</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-80 shrink-0 ml-1">({extinguishers.length})</span>
                  </button>

                  {ASSET_CATEGORIES.map((cat) => {
                    const count = extinguishers.filter(e => getAssetCategory(e) === cat.id).length;
                    const isSelected = currentTab === 'extinguishers' && selectedAssetCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveInspection(null);
                          setCurrentTab('extinguishers');
                          setSelectedAssetCategory(cat.id);
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap w-full ${
                          isSelected
                            ? 'bg-red-600 text-white font-extrabold shadow-xs'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 bg-slate-950/40 md:bg-transparent border border-slate-800 md:border-0'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs">{cat.icon}</span>
                          <span className="truncate">{cat.name.split(' (')[0]}</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-80 shrink-0 ml-1">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* รายการอาคารและสถานที่ (Hospital Buildings Menu) */}
            <div className="w-full space-y-1">
              <button
                onClick={() => {
                  setIsBuildingSubmenuOpen(!isBuildingSubmenuOpen);
                }}
                className={`flex items-center justify-between gap-2 px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap w-full ${
                  currentTab === 'extinguishers' && selectedBuilding !== 'All'
                    ? 'bg-blue-950/70 text-blue-400 border border-blue-900/60 shadow-inner'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 md:gap-2.5">
                  <Building2 size={16} className="text-blue-400" />
                  <span>แยกตามอาคาร ({HOSPITAL_BUILDINGS.length})</span>
                </div>
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-200 text-slate-400 ${isBuildingSubmenuOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Buildings Submenu List */}
              {isBuildingSubmenuOpen && (
                <div className="flex md:flex-col items-center md:items-stretch gap-1 pl-2 md:pl-3 mt-1 border-l-2 border-blue-900/40 ml-2 md:ml-3">
                  {HOSPITAL_BUILDINGS.map((bldg) => {
                    const stats = getBuildingEquipmentStats(extinguishers, bldg.name);
                    const isSelected = currentTab === 'extinguishers' && selectedBuilding === bldg.name;

                    return (
                      <button
                        key={bldg.id}
                        onClick={() => {
                          setActiveInspection(null);
                          setCurrentTab('extinguishers');
                          setSelectedBuilding(bldg.name);
                          setSelectedAssetCategory('All');
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap w-full ${
                          isSelected
                            ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 bg-slate-950/40 md:bg-transparent border border-slate-800 md:border-0'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm">{bldg.icon}</span>
                          <span className="truncate">{bldg.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ml-1.5 ${
                          isSelected 
                            ? 'bg-blue-800 text-white' 
                            : stats.total > 0 
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/60' 
                              : 'bg-slate-800 text-slate-500'
                        }`}>
                          {stats.total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setActiveInspection(null);
                setCurrentTab('history');
              }}
              className={`flex items-center gap-2 md:gap-2.5 px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full ${
                currentTab === 'history'
                  ? 'bg-red-950/70 text-red-400 border border-red-900/60 shadow-inner'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
              }`}
            >
              <History size={16} />
              <span>ประวัติการตรวจเช็ค</span>
            </button>

            {userProfile?.role === 'Admin' && (
              <button
                onClick={() => setIsUserMgmtOpen(true)}
                className="flex items-center gap-2 md:gap-2.5 px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full text-amber-400 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60"
              >
                <Users size={16} className="text-amber-400" />
                <span>จัดการผู้ใช้</span>
              </button>
            )}

            {/* Theme Toggle Button in Sidebar */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 md:gap-2.5 px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
              title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={16} className="text-amber-400" />
                  <span>โหมดสว่าง (Light Mode)</span>
                </>
              ) : (
                <>
                  <Moon size={16} className="text-indigo-400" />
                  <span>โหมดมืด (Dark Mode)</span>
                </>
              )}
            </button>
          </div>

          {/* Logout button in Sidebar - Desktop */}
          {user && (
            <div className="pt-3 mt-3 border-t border-slate-800">
              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-slate-800 hover:border-red-900/50"
                title="ออกจากระบบ"
              >
                <LogOut size={16} />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Workspace (Scrollable) */}
        <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0 overflow-y-auto h-full">
        
        {/* Automatic Expiry Alert Banner */}
        {!dismissBanner && expiryAlerts.length > 0 && (
          <ExpiryAlertBanner
            alerts={expiryAlerts}
            onViewAlerts={() => {
              setSelectedStatusFilter('ใกล้หมดอายุ');
              setCurrentTab('extinguishers');
            }}
            onDismiss={() => setDismissBanner(true)}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            onRequestNotificationPermission={handleRequestNotificationPermission}
            hasNotificationPermission={hasNotificationPermission}
          />
        )}

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
                                <p className="font-bold text-slate-800">{cleanInspectorName(log.inspectorName)}</p>
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
                      selectedCategory={dashboardCategory}
                      onSelectCategory={(cat) => setDashboardCategory(cat)}
                      selectedStatus={selectedStatusFilter}
                      onSelectStatus={handleSelectStatusFilter}
                      onNavigateToInventory={(cat, status) => {
                        setActiveInspection(null);
                        setSelectedAssetCategory(cat === 'All' ? 'ถังดับเพลิง' : cat);
                        setSelectedStatusFilter(status || null);
                        setCurrentTab('extinguishers');
                      }}
                    />

                    {/* Dashboard Analytics & Charts */}
                    <DashboardCharts 
                      extinguishers={extinguishers}
                      logs={logs}
                      selectedCategory={dashboardCategory}
                      onSelectCategory={(cat) => setDashboardCategory(cat)}
                      onNavigateToInventory={(cat, status) => {
                        setActiveInspection(null);
                        setSelectedAssetCategory(cat === 'All' ? 'ถังดับเพลิง' : cat);
                        setSelectedStatusFilter(status || null);
                        setCurrentTab('extinguishers');
                      }}
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
                          selectedAssetCategory={selectedAssetCategory}
                          selectedBuilding={selectedBuilding}
                          onSelectAssetCategory={(cat) => setSelectedAssetCategory(cat)}
                          onSelectBuilding={(bldg) => setSelectedBuilding(bldg)}
                          onSelectStatusFilter={(status) => setSelectedStatusFilter(status)}
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
                          onOpenFloorPlan={() => setCurrentTab('floorplan')}
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

                        {/* Dynamic Safety Quick Guide card matching equipment category */}
                        <SafetyGuidelineCard 
                          extinguisher={selectedExtinguisher}
                          selectedAssetCategory={selectedAssetCategory}
                        />
                      </div>

                    </div>
                  </motion.div>
                )}

                {currentTab === 'floorplan' && (
                  <motion.div
                    key="floorplan-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <FloorPlanViewer 
                      extinguishers={extinguishers}
                      selectedBuilding={selectedBuilding}
                      selectedAssetCategory={selectedAssetCategory}
                      selectedId={selectedId}
                      onSelectExtinguisher={(id) => {
                        setSelectedId(id || null);
                      }}
                      onInspect={(ext) => {
                        setSelectedId(ext.id);
                        setIsScannerOpen(false);
                        setActiveInspection(ext);
                      }}
                      onSelectBuilding={(bldg) => setSelectedBuilding(bldg)}
                      onSelectCategory={(cat) => setSelectedAssetCategory(cat)}
                    />
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
      </div>

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

      {/* Admin User Management Modal */}
      <AnimatePresence>
        {isUserMgmtOpen && (
          <UserManagementModal
            currentUserEmail={user?.email || 'Admin'}
            onClose={() => setIsUserMgmtOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Auto Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        alerts={expiryAlerts}
        allExtinguishers={extinguishers}
        onSelectExtinguisher={(id) => {
          setSelectedId(id);
          setCurrentTab('extinguishers');
        }}
        onInspectExtinguisher={(ext) => {
          setActiveInspection(ext);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onRequestNotificationPermission={handleRequestNotificationPermission}
        hasNotificationPermission={hasNotificationPermission}
      />

      {/* Floating QR Code Scanner Action Button for Mobile & Tablet */}
      <div className="fixed bottom-14 right-4 z-40 md:hidden">
        <button
          onClick={() => {
            setActiveInspection(null);
            setIsScannerOpen(true);
          }}
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-full shadow-2xl shadow-red-900/80 flex items-center gap-2 border-2 border-red-400/80 cursor-pointer active:scale-95 transition-transform"
          title="สแกน QR Code"
        >
          <Scan size={20} className="animate-pulse shrink-0" />
          <span className="text-xs font-black tracking-wide">สแกน QR</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="h-11 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 shrink-0 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-auto">
        <div>System Version: 1.0.0-Stable</div>
        <div>Real-time sync with Cloud Firestore</div>
        <div>&copy; {new Date().getFullYear()} แผนกช่างเทคนิคควบคุมระบบ โรงพยาบาลโอเวอร์บรุ๊คเชียงราย.</div>
      </footer>

    </div>
  );
}
