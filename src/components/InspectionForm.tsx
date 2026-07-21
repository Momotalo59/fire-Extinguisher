import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Lock,
  Gauge, 
  ShieldAlert, 
  FileText, 
  Wrench, 
  Activity, 
  ClipboardCheck,
  AlertCircle,
  Eye,
  Camera,
  Compass,
  FileEdit,
  MapPin,
  Settings,
  Trash2,
  RotateCcw,
  Upload
} from 'lucide-react';
import { 
  FireExtinguisher, 
  InspectionLog, 
  InspectionChecklist 
} from '../types';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface InspectionFormProps {
  extinguisher: FireExtinguisher;
  onSubmit: (log: Omit<InspectionLog, 'inspectionId'>) => Promise<void>;
  onCancel: () => void;
}

// Haversine formula to calculate distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // in metres
}

// Custom Signature Pad component using canvas touch/mouse events
interface SignaturePadProps {
  onChange: (base64: string) => void;
  value: string;
}

function SignaturePad({ onChange, value }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset size with Device Pixel Ratio for sharp drawing on retina screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      // Prevent screen scrolling when drawing with finger
      if (e.cancelable) e.preventDefault();
    }
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
    }
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64 = canvas.toDataURL('image/png');
    onChange(base64);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950 overflow-hidden h-40">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none bg-slate-950"
        />
        {!value && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none select-none">
            <span className="text-xs font-bold text-slate-400">เซ็นลายมือชื่อของท่านตรงนี้ด้วยนิ้วหรือปากกา</span>
            <span className="text-[10px] text-slate-500 mt-1">Draw your signature here</span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-slate-400 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          บันทึกเป็นลายเซ็นอิเล็กทรอนิกส์แล้ว
        </span>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw size={11} />
          <span>เคลียร์เซ็นใหม่ (Clear)</span>
        </button>
      </div>
    </div>
  );
}

// Custom Photo Uploader that compresses the image and runs nicely on phone cameras
interface PhotoUploaderProps {
  label: string;
  value: string;
  onChange: (base64: string) => void;
}

function PhotoUploader({ label, value, onChange }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.65 quality for high performance and tiny database storage (approx 60-80KB)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          onChange(compressedBase64);
        } else {
          onChange(reader.result as string);
        }
        setLoading(false);
      };
      img.onerror = () => {
        onChange(reader.result as string);
        setLoading(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const triggerFile = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[140px] relative transition-all hover:border-slate-750">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {loading ? (
        <div className="text-center space-y-2 py-4">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[10px] text-slate-400 font-bold">กำลังย่อขนาดรูปภาพ...</p>
        </div>
      ) : value ? (
        <div className="w-full relative">
          <img
            src={value}
            alt={label}
            referrerPolicy="no-referrer"
            className="w-full h-28 object-cover rounded-lg border border-slate-800"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-md transition-colors cursor-pointer"
            title="ลบรูปภาพ"
          >
            <Trash2 size={12} />
          </button>
          <div className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-extrabold px-2 py-0.5 rounded">
            {label}
          </div>
        </div>
      ) : (
        <div 
          onClick={triggerFile} 
          className="w-full h-full flex flex-col items-center justify-center py-6 cursor-pointer text-center space-y-2 select-none group"
        >
          <div className="p-3 bg-slate-900 rounded-full text-slate-500 group-hover:text-red-500 group-hover:bg-slate-850 border border-slate-800 transition-all shadow-xs">
            <Camera size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">{label}</p>
            <p className="text-[9px] text-slate-500 font-semibold mt-0.5">กดที่นี่เพื่อ ถ่ายรูปสดจากกล้อง หรือ แนบภาพ</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InspectionForm({ extinguisher, onSubmit, onCancel }: InspectionFormProps) {
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionType, setInspectionType] = useState<'รายเดือน' | 'ก่อนเปิดอาคาร' | 'ประจำปี'>('รายเดือน');
  
  // Checklist states
  const [pressure, setPressure] = useState<InspectionChecklist['pressure']>('ปกติ');
  const [safetyPin, setSafetyPin] = useState<InspectionChecklist['safetyPin']>('ปกติ');
  const [hoseNozzle, setHoseNozzle] = useState<InspectionChecklist['hoseNozzle']>('ปกติ');
  const [bodyCondition, setBodyCondition] = useState<InspectionChecklist['bodyCondition']>('ปกติ');
  const [instructionLabel, setInstructionLabel] = useState<InspectionChecklist['instructionLabel']>('ปกติ');
  const [accessibility, setAccessibility] = useState<InspectionChecklist['accessibility']>('ปกติ');
  const [weightStatus, setWeightStatus] = useState<InspectionChecklist['weightStatus']>('ปกติ');

  const [inspectionResult, setInspectionResult] = useState<'ผ่าน' | 'ไม่ผ่าน'>('ผ่าน');
  const [notes, setNotes] = useState('');
  
  // Photos and Signature URL
  const [photoBefore, setPhotoBefore] = useState('');
  const [photoAfter, setPhotoAfter] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  // Inspector GPS Coordinates
  const [inspectorLat, setInspectorLat] = useState<string>('');
  const [inspectorLng, setInspectorLng] = useState<string>('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default inspector name based on logged-in email/fullName from Firestore
  useEffect(() => {
    const fetchUserProfileAndSetName = async () => {
      const user = auth.currentUser;
      if (user) {
        if (user.isAnonymous) {
          setInspectorName('ผู้ใช้งานทั่วไป (Guest User)');
        } else {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data().fullName) {
              setInspectorName(`${userDoc.data().fullName} (${user.email})`);
            } else {
              setInspectorName(user.email || '');
            }
          } catch (err) {
            console.error("Failed to fetch user profile:", err);
            setInspectorName(user.email || '');
          }
        }
      }
    };

    fetchUserProfileAndSetName();
    
    // Automatically retrieve Inspector's Current Location on mount
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setInspectorLat(position.coords.latitude.toFixed(6));
          setInspectorLng(position.coords.longitude.toFixed(6));
          setGpsLoading(false);
        },
        (error) => {
          console.warn("Could not acquire location automatically:", error);
          setGpsError("กรุณากดเปิดสิทธิ์พิกัด GPS เพื่อความแม่นยำในการระบุระยะห่างจุดตรวจ");
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Recalculate automatic recommended result based on checklist values
  useEffect(() => {
    const isPass = 
      pressure === 'ปกติ' &&
      safetyPin === 'ปกติ' &&
      hoseNozzle === 'ปกติ' &&
      bodyCondition === 'ปกติ' &&
      instructionLabel === 'ปกติ' &&
      accessibility === 'ปกติ' &&
      weightStatus === 'ปกติ';
    
    setInspectionResult(isPass ? 'ผ่าน' : 'ไม่ผ่าน');
  }, [pressure, safetyPin, hoseNozzle, bodyCondition, instructionLabel, accessibility, weightStatus]);

  // Handle manual trigger to grab location
  const refreshInspectorGps = () => {
    if (!navigator.geolocation) {
      alert("เครื่องนี้ไม่รองรับระบบพิกัด GPS");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setInspectorLat(position.coords.latitude.toFixed(6));
        setInspectorLng(position.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (error) => {
        console.error("GPS retrieval error: ", error);
        setGpsError("ไม่สามารถดึงตำแหน่งได้ กรุณาตรวจสอบสิทธิ์ของเบราว์เซอร์");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorName.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้รับผิดชอบตรวจเช็ค');
      return;
    }
    if (!signatureUrl) {
      setErrorMsg('กรุณาเซ็นลายมือชื่อผู้ตรวจเช็คลงบนหน้าจอเพื่อยืนยัน');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const uLat = parseFloat(inspectorLat);
      const uLng = parseFloat(inspectorLng);
      const inspectorGPS = (!isNaN(uLat) && !isNaN(uLng)) ? { latitude: uLat, longitude: uLng } : null;

      // Calculate distance difference
      let distanceDiff = 0;
      if (inspectorGPS && extinguisher.locationGPS) {
        distanceDiff = getDistanceInMeters(
          extinguisher.locationGPS.latitude,
          extinguisher.locationGPS.longitude,
          inspectorGPS.latitude,
          inspectorGPS.longitude
        );
      }

      await onSubmit({
        feId: extinguisher.id,
        inspectionDate: new Date().toISOString(),
        inspectorUid: auth.currentUser?.uid || 'guest',
        inspectorName: inspectorName.trim(),
        inspectionType,
        checklist: {
          pressure,
          safetyPin,
          hoseNozzle,
          bodyCondition,
          instructionLabel,
          accessibility,
          weightStatus
        },
        inspectionResult,
        inspectorGPS,
        distanceDiff,
        photos: {
          before: photoBefore.trim() || extinguisher.photoUrl || '',
          after: photoAfter.trim() || ''
        },
        signatureUrl: signatureUrl.trim() || inspectorName.trim(),
        notes: notes.trim()
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการตรวจสอบ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg flex flex-col h-full text-slate-200">
      {/* Title Header */}
      <div id="inspection-form-header" className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-950/50 py-0.5 px-2.5 rounded border border-red-900/30">
            บันทึกการตรวจสอบมาตรฐานถังดับเพลิง
          </span>
          <h3 className="font-extrabold text-white text-base md:text-lg mt-1.5">
            เครื่องหมายรหัสถัง: <span className="text-red-500 font-mono">{extinguisher.id}</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {extinguisher.building} • {extinguisher.floor} ({extinguisher.locationDetails})
          </p>
        </div>
      </div>

      <div className="p-5 overflow-y-auto space-y-5 flex-1">
        {errorMsg && (
          <div className="bg-rose-950/50 border border-rose-900/50 text-rose-200 p-3 rounded-lg flex items-center gap-2 text-xs font-bold animate-shake">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Basic Metadata Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Inspector Name */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex justify-between items-center">
              <span>ผู้ทำการตรวจเช็ค (Inspector) <span className="text-rose-500">*</span></span>
              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/40 py-0.5 px-1.5 rounded flex items-center gap-1">
                <Lock size={10} />
                <span>ผูกกับบัญชีล็อกอิน</span>
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock size={15} />
              </div>
              <input
                type="text"
                required
                readOnly
                placeholder="ชื่อ-นามสกุลจริงผู้ตรวจ"
                value={inspectorName}
                className="w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl text-xs font-semibold text-slate-550 bg-slate-950 cursor-not-allowed select-none focus:outline-none"
              />
            </div>
          </div>

          {/* Inspection Type */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              ประเภทการตรวจเช็ครอบวงรอบ
            </label>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value as any)}
              className="w-full p-2 border border-slate-800 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 cursor-pointer"
            >
              <option value="รายเดือน">รายเดือน (Monthly)</option>
              <option value="ก่อนเปิดอาคาร">ก่อนเปิดอาคาร (Pre-opening)</option>
              <option value="ประจำปี">ประจำปี (Annual)</option>
            </select>
          </div>
        </div>

        {/* Checklist Steps */}
        <div className="space-y-4">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <ClipboardCheck size={14} className="text-red-500" />
            เกณฑ์หัวข้อตรวจสอบมาตรฐาน
          </h4>

          {/* 1. Pressure Gauge */}
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">1. เกจวัดความดัน (Pressure Gauge)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['ปกติ', 'ต่ำ', 'ไม่มีเกจ์'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPressure(opt as any)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    pressure === opt
                      ? 'border-red-650 bg-red-600 text-white shadow-xs'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {opt === 'ปกติ' ? 'ปกติ (เขียว)' : opt === 'ต่ำ' ? 'ต่ำ (แดง)' : 'ไม่มีเกจ CO2'}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Safety Pin & Seal */}
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">2. สลักนิรภัยและสายรัดซีล (Safety Pin)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['ปกติ', 'ชำรุด'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSafetyPin(opt as any)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    safetyPin === opt
                      ? 'border-red-650 bg-red-600 text-white shadow-xs'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {opt === 'ปกติ' ? 'ปกติ (สมบูรณ์)' : 'ชำรุด (ขาด/หาย)'}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Hose & Nozzle */}
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">3. สายฉีดและหัวฉีดพ่น (Hose & Nozzle)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['ปกติ', 'ชำรุด'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHoseNozzle(opt as any)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    hoseNozzle === opt
                      ? 'border-red-650 bg-red-600 text-white shadow-xs'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {opt === 'ปกติ' ? 'ปกติ (พร้อมใช้)' : 'ชำรุด (แตก/อุดตัน)'}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Body Condition */}
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">4. สภาพภายนอกตัวถัง (Body Condition)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['ปกติ', 'ชำรุด'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBodyCondition(opt as any)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    bodyCondition === opt
                      ? 'border-red-650 bg-red-600 text-white shadow-xs'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {opt === 'ปกติ' ? 'ปกติ (ไม่เป็นสนิม/ไม่ผุ)' : 'ชำรุด (บุบ/ขึ้นสนิมมาก)'}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Instruction Label */}
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <FileEdit size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">5. ป้ายแนะนำวิธีใช้งานหน้าเครื่อง (Instruction Label)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['ปกติ', 'ชำรุด'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInstructionLabel(opt as any)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    instructionLabel === opt
                      ? 'border-red-650 bg-red-600 text-white shadow-xs'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {opt === 'ปกติ' ? 'ปกติ (ชัดเจน)' : 'ชำรุด (ฉีกขาด/ลอก)'}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Accessibility */}
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">6. การเข้าถึงสะดวกปราศจากสิ่งกีดขวาง (Accessibility)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['ปกติ', 'มีสิ่งกีดขวาง'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAccessibility(opt as any)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    accessibility === opt
                      ? 'border-red-650 bg-red-600 text-white shadow-xs'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {opt === 'ปกติ' ? 'ปกติ (สะดวก)' : 'มีสิ่งของกีดขวางทางเข้า'}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Weight Status */}
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">7. น้ำหนักตัวถังเทียบเคียงเกณฑ์จริง (Weight Status)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['ปกติ', 'พร่อง'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWeightStatus(opt as any)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    weightStatus === opt
                      ? 'border-red-650 bg-red-600 text-white shadow-xs'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {opt === 'ปกติ' ? 'ปกติ (น้ำหนักเต็ม)' : 'พร่อง (น้ำหนักขาดไป)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* GPS Distance verification tracker */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Compass size={14} className="text-blue-400" />
              ตำแหน่ง GPS ผู้ตรวจสอบขณะตรวจวัด
            </span>
            <button
              type="button"
              onClick={refreshInspectorGps}
              disabled={gpsLoading}
              className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-200 font-extrabold px-2 py-1 rounded transition-colors"
            >
              {gpsLoading ? 'กำลังดึงพิกัด...' : 'อัปเดตพิกัดตรวจ'}
            </button>
          </div>
          {gpsError && (
            <p className="text-[10px] text-amber-550 font-semibold">{gpsError}</p>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-500">ละติจูด:</span>{' '}
              <span className="font-bold text-slate-200">{inspectorLat || 'ยังไม่มีค่า'}</span>
            </div>
            <div>
              <span className="text-slate-500">ลองจิจูด:</span>{' '}
              <span className="font-bold text-slate-200">{inspectorLng || 'ยังไม่มีค่า'}</span>
            </div>
          </div>
          {inspectorLat && inspectorLng && extinguisher.locationGPS && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500">ระยะห่างคำนวณจากเสาพิกัดถังจริง:</span>
              <span className="text-xs font-extrabold text-blue-400 font-mono">
                {getDistanceInMeters(
                  extinguisher.locationGPS.latitude,
                  extinguisher.locationGPS.longitude,
                  parseFloat(inspectorLat),
                  parseFloat(inspectorLng)
                )}{' '}
                เมตร
              </span>
            </div>
          )}
        </div>

        {/* Photographic Evidence Attachment */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-slate-800 pb-2">
            <Camera size={14} className="text-slate-500" />
            แนบภาพหลักฐานการตรวจเช็คจากมือถือ (Capture Photos)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhotoUploader 
              label="ภาพถ่ายตอนตรวจเช็ค (Before Photo)" 
              value={photoBefore} 
              onChange={setPhotoBefore} 
            />
            <PhotoUploader 
              label="ภาพถ่ายหลังทำการตรวจ (After Photo)" 
              value={photoAfter} 
              onChange={setPhotoAfter} 
            />
          </div>
        </div>

        {/* Signature & Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              ลายเซ็นผู้ตรวจเช็ค (เซ็นลงหน้าจอได้เลย) <span className="text-rose-500">*</span>
            </label>
            <SignaturePad 
              value={signatureUrl} 
              onChange={setSignatureUrl} 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              ความคิดเห็นเพิ่มเติม / บันทึกข้อสังเกต
            </label>
            <textarea
              rows={6}
              placeholder="รายละเอียดบันทึกเพิ่มเติม (ตัวเลือก เช่น ระบุจุดบกพร่อง การทำความสะอาด)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-slate-800 rounded-2xl text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-slate-950"
            />
          </div>
        </div>

        {/* Evaluation Summary Visual */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs ${
          inspectionResult === 'ผ่าน' 
            ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-900/40 text-rose-300'
        }`}>
          <div className="pt-0.5">
            {inspectionResult === 'ผ่าน' 
              ? <CheckCircle className="text-emerald-500" size={18} />
              : <XCircle className="text-rose-500" size={18} />
            }
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold">
              ผลการประเมินวิเคราะห์: {inspectionResult === 'ผ่าน' ? 'ผ่านเกณฑ์มาตรฐาน (PASS)' : 'ไม่ผ่านเกณฑ์มาตรฐาน (FAIL)'}
            </p>
            <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed font-medium text-slate-400">
              {inspectionResult === 'ผ่าน' 
                ? 'ถังดับเพลิงมีสภาพสมบูรณ์ทุกหัวข้อตามระเบียบรักษาความปลอดภัยประจำอาคาร' 
                : 'พบประเด็นผิดปกติอย่างน้อย 1 รายการ ถังดับเพลิงชำรุดเสี่ยงอันตรายในการใช้งาน'
              }
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setInspectionResult(inspectionResult === 'ผ่าน' ? 'ไม่ผ่าน' : 'ผ่าน')}
            className={`text-[10px] font-extrabold cursor-pointer shrink-0 py-1 px-2 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-900 shadow-xs`}
          >
            ปรับเปลี่ยนผลตรวจ
          </button>
        </div>
      </div>

      {/* Buttons Actions */}
      <div id="inspection-form-footer" className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-slate-800 bg-slate-950 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-600/15 flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
        >
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการตรวจสอบ'}
        </button>
      </div>
    </form>
  );
}
