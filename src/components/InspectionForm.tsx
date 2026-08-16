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
  Upload,
  Radio,
  Sliders,
  Bell,
  AlertTriangle
} from 'lucide-react';
import { 
  FireExtinguisher, 
  InspectionLog, 
  InspectionChecklist,
  AssetType
} from '../types';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import PhotoUploader from './PhotoUploader';
import { isAssetAlreadyInspected } from '../lib/dbHelpers';

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

export default function InspectionForm({ extinguisher, onSubmit, onCancel }: InspectionFormProps) {
  const [inspectorName, setInspectorName] = useState('');
  
  // Identify current asset type
  const currentAssetType: AssetType = extinguisher.assetType || (
    extinguisher.id.startsWith('EM-') || extinguisher.id.startsWith('EL-') || extinguisher.type?.includes('ไฟฉุกเฉิน') || extinguisher.type?.includes('Emergency Light')
      ? 'ไฟฉุกเฉิน'
      : extinguisher.id.startsWith('EX-') || extinguisher.id.startsWith('EXIT-') || extinguisher.id.startsWith('ES-') || extinguisher.type?.includes('ป้ายบอกทางหนีไฟ') || extinguisher.type?.includes('Exit Sign')
      ? 'ป้ายบอกทางหนีไฟ'
      : extinguisher.id.startsWith('FCP-') || extinguisher.id.startsWith('FA-') || extinguisher.type?.includes('FCP') || extinguisher.type?.includes('แจ้งเหตุ')
      ? 'ตู้แจ้งเหตุเพลิงไหม้'
      : extinguisher.id.startsWith('FHC-') || extinguisher.type?.includes('ตู้') || extinguisher.type?.includes('Hose')
      ? 'ตู้ดับเพลิง'
      : extinguisher.id.startsWith('FD-') || extinguisher.type?.includes('ประตู')
      ? 'ประตูกันไฟ'
      : 'ถังดับเพลิง'
  );

  const [inspectionType, setInspectionType] = useState<'ประจำวัน' | 'รายเดือน' | 'ก่อนเปิดอาคาร' | 'ประจำปี'>(
    currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'ประจำวัน' : 'รายเดือน'
  );

  // Fire Extinguisher checklist states
  const [pressure, setPressure] = useState<InspectionChecklist['pressure']>('ปกติ');
  const [safetyPin, setSafetyPin] = useState<InspectionChecklist['safetyPin']>('ปกติ');
  const [hoseNozzle, setHoseNozzle] = useState<InspectionChecklist['hoseNozzle']>('ปกติ');
  const [bodyCondition, setBodyCondition] = useState<InspectionChecklist['bodyCondition']>('ปกติ');
  const [instructionLabel, setInstructionLabel] = useState<InspectionChecklist['instructionLabel']>('ปกติ');
  const [accessibility, setAccessibility] = useState<InspectionChecklist['accessibility']>('ปกติ');
  const [weightStatus, setWeightStatus] = useState<InspectionChecklist['weightStatus']>('ปกติ');

  // Fire Hose Cabinet states (ตู้ดับเพลิง)
  const [cabinetCondition, setCabinetCondition] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');
  const [valveStatus, setValveStatus] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');
  const [hoseCondition, setHoseCondition] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');
  const [cabinetEquipment, setCabinetEquipment] = useState<'ครบ' | 'ไม่ครบ'>('ครบ');

  // Fire Door states (ประตูกันไฟอัตโนมัติ)
  const [doorCondition, setDoorCondition] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');
  const [magnetSwitch, setMagnetSwitch] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');
  const [autoCloseSpeed, setAutoCloseSpeed] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');

  // Fire Alarm Panel states (ตู้แจ้งเหตุเพลิงไหม้ - FCP ประจำวัน)
  const [fcpStatusLed, setFcpStatusLed] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');
  const [fcpLampTest, setFcpLampTest] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');
  const [fcpMainStatus, setFcpMainStatus] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');
  const [fcpTrouble, setFcpTrouble] = useState<'ปกติ' | 'มี Trouble'>('ปกติ');
  const [fcpTroubleZone, setFcpTroubleZone] = useState('');
  const [fcpTroubleCause, setFcpTroubleCause] = useState('');
  const [fcpDisable, setFcpDisable] = useState<'ปกติ' | 'มี Disable'>('ปกติ');
  const [fcpDisableZone, setFcpDisableZone] = useState('');
  const [fcpDisableCause, setFcpDisableCause] = useState('');

  // Emergency Light states (ไฟฉุกเฉิน)
  const [emergencyLightStatus, setEmergencyLightStatus] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');

  // Exit Sign states (ป้ายบอกทางหนีไฟ)
  const [exitSignStatus, setExitSignStatus] = useState<'ปกติ' | 'ไม่ปกติ'>('ปกติ');

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
              setInspectorName(userDoc.data().fullName);
            } else if (user.email) {
              setInspectorName(user.email.split('@')[0]);
            } else {
              setInspectorName('');
            }
          } catch (err) {
            console.error("Failed to fetch user profile:", err);
            setInspectorName(user.email ? user.email.split('@')[0] : '');
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
    let isPass = true;
    if (currentAssetType === 'ถังดับเพลิง') {
      isPass = 
        pressure === 'ปกติ' &&
        safetyPin === 'ปกติ' &&
        hoseNozzle === 'ปกติ' &&
        bodyCondition === 'ปกติ' &&
        instructionLabel === 'ปกติ' &&
        accessibility === 'ปกติ';
    } else if (currentAssetType === 'ตู้ดับเพลิง') {
      isPass = 
        cabinetCondition === 'ปกติ' &&
        valveStatus === 'ปกติ' &&
        hoseCondition === 'ปกติ' &&
        cabinetEquipment === 'ครบ' &&
        accessibility === 'ปกติ';
    } else if (currentAssetType === 'ประตูกันไฟ') {
      isPass = 
        doorCondition === 'ปกติ' &&
        magnetSwitch === 'ปกติ' &&
        autoCloseSpeed === 'ปกติ' &&
        accessibility === 'ปกติ';
    } else if (currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้') {
      isPass =
        fcpStatusLed === 'ปกติ' &&
        fcpLampTest === 'ปกติ' &&
        fcpMainStatus === 'ปกติ' &&
        fcpTrouble === 'ปกติ' &&
        fcpDisable === 'ปกติ' &&
        accessibility === 'ปกติ';
    } else if (currentAssetType === 'ไฟฉุกเฉิน') {
      isPass = emergencyLightStatus === 'ปกติ' && accessibility === 'ปกติ';
    } else if (currentAssetType === 'ป้ายบอกทางหนีไฟ') {
      isPass = exitSignStatus === 'ปกติ' && accessibility === 'ปกติ';
    }
    
    setInspectionResult(isPass ? 'ผ่าน' : 'ไม่ผ่าน');
  }, [
    currentAssetType, 
    pressure, 
    safetyPin, 
    hoseNozzle, 
    bodyCondition, 
    instructionLabel, 
    accessibility, 
    cabinetCondition, 
    valveStatus, 
    hoseCondition, 
    cabinetEquipment, 
    doorCondition, 
    magnetSwitch, 
    autoCloseSpeed,
    fcpStatusLed,
    fcpLampTest,
    fcpMainStatus,
    fcpTrouble,
    fcpDisable,
    emergencyLightStatus,
    exitSignStatus
  ]);

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

  const isAlreadyInspected = isAssetAlreadyInspected(extinguisher);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyInspected) {
      setErrorMsg(
        currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
          ? 'ตู้แจ้งเหตุเพลิงไหม้นี้ได้รับการตรวจเช็คประจำวันนี้เรียบร้อยแล้ว'
          : 'อุปกรณ์นี้ได้รับการตรวจเช็คในประจำเดือนนี้เรียบร้อยแล้ว'
      );
      return;
    }
    if (!inspectorName.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้รับผิดชอบตรวจเช็ค');
      return;
    }
    if (!signatureUrl) {
      setErrorMsg('กรุณาเซ็นลายมือชื่อผู้ตรวจเช็คลงบนหน้าจอเพื่อยืนยัน');
      return;
    }

    if (currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้') {
      if (fcpTrouble === 'มี Trouble' && (!fcpTroubleZone.trim() || !fcpTroubleCause.trim())) {
        setErrorMsg('กรณีพบ Trouble กรุณาระบุโซนและสาเหตุให้ครบถ้วน');
        return;
      }
      if (fcpDisable === 'มี Disable' && (!fcpDisableZone.trim() || !fcpDisableCause.trim())) {
        setErrorMsg('กรณีมีการ Disable กรุณาระบุโซนและสาเหตุให้ครบถ้วน');
        return;
      }
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

      const checklistPayload: InspectionChecklist = {
        accessibility
      };

      if (currentAssetType === 'ถังดับเพลิง') {
        checklistPayload.pressure = pressure;
        checklistPayload.safetyPin = safetyPin;
        checklistPayload.hoseNozzle = hoseNozzle;
        checklistPayload.bodyCondition = bodyCondition;
        checklistPayload.instructionLabel = instructionLabel;
        checklistPayload.weightStatus = weightStatus;
      } else if (currentAssetType === 'ตู้ดับเพลิง') {
        checklistPayload.cabinetCondition = cabinetCondition;
        checklistPayload.valveStatus = valveStatus;
        checklistPayload.hoseCondition = hoseCondition;
        checklistPayload.cabinetEquipment = cabinetEquipment;
      } else if (currentAssetType === 'ประตูกันไฟ') {
        checklistPayload.doorCondition = doorCondition;
        checklistPayload.magnetSwitch = magnetSwitch;
        checklistPayload.autoCloseSpeed = autoCloseSpeed;
      } else if (currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้') {
        checklistPayload.fcpStatusLed = fcpStatusLed;
        checklistPayload.fcpLampTest = fcpLampTest;
        checklistPayload.fcpMainStatus = fcpMainStatus;
        checklistPayload.fcpTrouble = fcpTrouble;
        if (fcpTrouble === 'มี Trouble') {
          checklistPayload.fcpTroubleZone = fcpTroubleZone.trim();
          checklistPayload.fcpTroubleCause = fcpTroubleCause.trim();
        }
        checklistPayload.fcpDisable = fcpDisable;
        if (fcpDisable === 'มี Disable') {
          checklistPayload.fcpDisableZone = fcpDisableZone.trim();
          checklistPayload.fcpDisableCause = fcpDisableCause.trim();
        }
      } else if (currentAssetType === 'ไฟฉุกเฉิน') {
        checklistPayload.emergencyLightStatus = emergencyLightStatus;
        checklistPayload.generalStatus = emergencyLightStatus;
      } else if (currentAssetType === 'ป้ายบอกทางหนีไฟ') {
        checklistPayload.exitSignStatus = exitSignStatus;
        checklistPayload.generalStatus = exitSignStatus;
      }

      await onSubmit({
        feId: extinguisher.id,
        inspectionDate: new Date().toISOString(),
        inspectorUid: auth.currentUser?.uid || 'guest',
        inspectorName: inspectorName.trim(),
        inspectionType,
        checklist: checklistPayload,
        inspectionResult,
        inspectorGPS,
        distanceDiff,
        photos: {
          before: extinguisher.photoUrl || '',
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
            บันทึกการตรวจสอบมาตรฐาน ({currentAssetType}) {currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? '• ตรวจประจำวัน' : '• ตรวจประจำเดือน'}
          </span>
          <h3 className="font-extrabold text-white text-base md:text-lg mt-1.5">
            รหัสอุปกรณ์: <span className="text-red-500 font-mono">{extinguisher.id}</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {extinguisher.building} • {extinguisher.floor} ({extinguisher.locationDetails})
            {extinguisher.brand && <span className="text-slate-300 ml-2 font-mono">• ยี่ห้อ: {extinguisher.brand} {extinguisher.model ? `(${extinguisher.model})` : ''}</span>}
          </p>
        </div>
      </div>

      <div className="p-5 overflow-y-auto space-y-5 flex-1">
        {isAlreadyInspected && (
          <div className="bg-amber-950/60 border border-amber-800/80 text-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-300">
                {currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'ได้รับการตรวจเช็คประจำวันนี้แล้ว' : 'ได้รับการตรวจเช็คประจำเดือนนี้แล้ว'}
              </h4>
              <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                อุปกรณ์รหัส <span className="font-bold font-mono text-white">{extinguisher.id}</span> ได้รับการตรวจเช็คเรียบร้อยแล้วเมื่อวันที่{' '}
                <span className="font-bold text-white font-mono">
                  {extinguisher.lastInspectedAt ? new Date(extinguisher.lastInspectedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                </span>{' '}
                {currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' 
                  ? 'จะสามารถตรวจเช็คประจำวันได้อีกครั้งในวันพรุ่งนี้'
                  : 'จะไม่สามารถตรวจเช็คซ้ำในเดือนเดียวกันได้ จะสามารถตรวจเช็คได้อีกครั้งเมื่อเข้าสู่เดือนถัดไป'}
              </p>
            </div>
          </div>
        )}

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
              <option value="ประจำวัน">ประจำวัน (Daily)</option>
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
            เกณฑ์หัวข้อตรวจสอบมาตรฐาน ({currentAssetType})
          </h4>

          {/* Fire Alarm Panel (FCP) Checklist - Daily Inspection */}
          {currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' && (
            <div className="space-y-3.5">
              {/* 1. ไฟแสดงสถานะหน้าตู้ */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Radio size={14} className="text-amber-400" />
                    <span className="text-xs font-bold text-slate-300">1. ไฟแสดงสถานะหน้าตู้ (Status LED Indicators)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">ไฟ AC Power ติดสว่าง / ไม่มีไฟ Alarm ค้าง</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['ปกติ', 'ไม่ปกติ'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFcpStatusLed(opt)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        fcpStatusLed === opt
                          ? opt === 'ปกติ' ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs' : 'border-rose-600 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt === 'ปกติ' ? '✓ ปกติ (ไฟสถานะปกติ)' : '✕ ไม่ปกติ (ไฟดับ/ผิดปกติ)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. ทดสอบสัญญาณไฟหน้าตู้ */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-blue-400" />
                    <span className="text-xs font-bold text-slate-300">2. ทดสอบสัญญาณไฟหน้าตู้ (Lamp Test)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">กดปุ่ม Lamp Test หลอดไฟหน้าตู้ติดครบทุกดวง</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['ปกติ', 'ไม่ปกติ'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFcpLampTest(opt)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        fcpLampTest === opt
                          ? opt === 'ปกติ' ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs' : 'border-rose-600 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt === 'ปกติ' ? '✓ ปกติ (หลอดไฟติดครบสมบูรณ์)' : '✕ ไม่ปกติ (มีหลอดไฟขาด/ไม่ติด)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. สถานะตู้ FCP */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300">3. สถานะตู้ FCP (System Normal State)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">หน้าจอขึ้นสถานะ SYSTEM NORMAL หรือพร้อมทำงาน</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['ปกติ', 'ไม่ปกติ'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFcpMainStatus(opt)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        fcpMainStatus === opt
                          ? opt === 'ปกติ' ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs' : 'border-rose-600 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt === 'ปกติ' ? '✓ ปกติ (System Normal)' : '✕ ไม่ปกติ (ระบบขัดข้อง)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Trouble */}
              <div className={`p-3.5 rounded-xl border transition-all ${fcpTrouble === 'มี Trouble' ? 'bg-amber-950/30 border-amber-800/80' : 'bg-slate-950/40 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-300">4. Trouble (รายงานความผิดปกติในระบบ)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">ตรวจพบสัญญาณเตือน Trouble หรือไม่</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFcpTrouble('ปกติ');
                      setFcpTroubleZone('');
                      setFcpTroubleCause('');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      fcpTrouble === 'ปกติ'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    ✓ ปกติ (ไม่มี Trouble)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFcpTrouble('มี Trouble')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      fcpTrouble === 'มี Trouble'
                        ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    ⚠️ มี Trouble (พบความผิดปกติ)
                  </button>
                </div>

                {fcpTrouble === 'มี Trouble' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2 border-t border-amber-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        ระบุโซน Trouble (Zone) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น โซน 4 ชั้น 2 แผนกผู้ป่วยใน"
                        value={fcpTroubleZone}
                        onChange={(e) => setFcpTroubleZone(e.target.value)}
                        className="w-full p-2 border border-amber-700/60 rounded-lg text-xs bg-slate-950 text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        ระบุสาเหตุ Trouble (Cause) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น สายสัญญาณ Loop ขาด, หัว Detector ขัดข้อง"
                        value={fcpTroubleCause}
                        onChange={(e) => setFcpTroubleCause(e.target.value)}
                        className="w-full p-2 border border-amber-700/60 rounded-lg text-xs bg-slate-950 text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 5. Disable */}
              <div className={`p-3.5 rounded-xl border transition-all ${fcpDisable === 'มี Disable' ? 'bg-purple-950/30 border-purple-800/80' : 'bg-slate-950/40 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-purple-400" />
                    <span className="text-xs font-bold text-slate-300">5. Disable (การปิดการทำงานชั่วคราว)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">มีการ Disable อุปกรณ์หรือโซนไว้หรือไม่</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFcpDisable('ปกติ');
                      setFcpDisableZone('');
                      setFcpDisableCause('');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      fcpDisable === 'ปกติ'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    ✓ ปกติ (ไม่มี Disable)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFcpDisable('มี Disable')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      fcpDisable === 'มี Disable'
                        ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    🛑 มีการ Disable (ปิดบางจุด)
                  </button>
                </div>

                {fcpDisable === 'มี Disable' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2 border-t border-purple-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div>
                      <label className="block text-[11px] font-bold text-purple-300 mb-1">
                        ระบุโซนที่ Disable (Zone) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น โซน 7 ชั้น 4 ห้องผ่าตัด"
                        value={fcpDisableZone}
                        onChange={(e) => setFcpDisableZone(e.target.value)}
                        className="w-full p-2 border border-purple-700/60 rounded-lg text-xs bg-slate-950 text-slate-200 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-purple-300 mb-1">
                        ระบุสาเหตุที่ Disable (Cause) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ปิดระหว่างงานก่อสร้าง/เชื่อมโลหะชั่วคราว"
                        value={fcpDisableCause}
                        onChange={(e) => setFcpDisableCause(e.target.value)}
                        className="w-full p-2 border border-purple-700/60 rounded-lg text-xs bg-slate-950 text-slate-200 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Fire Extinguisher Checklist */}
          {currentAssetType === 'ถังดับเพลิง' && (
            <>
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
                  <span className="text-xs font-bold text-slate-300">5. ป้ายแนะนำวิธีใช้งาน (Instruction Label)</span>
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
            </>
          )}

          {/* Fire Hose Cabinet Checklist */}
          {currentAssetType === 'ตู้ดับเพลิง' && (
            <>
              {/* 1. สภาพตู้ดับเพลิง */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">1. สภาพตู้ดับเพลิง</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCabinetCondition(opt as any)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        cabinetCondition === opt
                          ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. วาวล์เปิดปิดน้ำ */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">2. วาวล์เปิดปิดน้ำ</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setValveStatus(opt as any)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        valveStatus === opt
                          ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. สายฉีดน้ำดับเพลิง */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">3. สายฉีดน้ำดับเพลิง</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setHoseCondition(opt as any)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        hoseCondition === opt
                          ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. อุปกรณ์ภายในตู้ */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">4. อุปกรณ์ภายในตู้</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['ครบ', 'ไม่ครบ'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCabinetEquipment(opt as any)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        cabinetEquipment === opt
                          ? opt === 'ครบ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fire Door Checklist */}
          {currentAssetType === 'ประตูกันไฟ' && (
            <>
              {/* 1. สภาพประตู */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">1. สภาพประตู</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDoorCondition(opt as any)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        doorCondition === opt
                          ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. สวิต์ปุ่มกด-แม่เหล็ก */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">2. สวิต์ปุ่มกด-แม่เหล็ก</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setMagnetSwitch(opt as any)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        magnetSwitch === opt
                          ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. ประตูปิดภายใน 15 วินาที */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">3. ประตูปิดภายใน 15 วินาที</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAutoCloseSpeed(opt as any)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        autoCloseSpeed === opt
                          ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Emergency Light Checklist (ไฟฉุกเฉิน) */}
          {currentAssetType === 'ไฟฉุกเฉิน' && (
            <div className="bg-slate-950/40 p-3.5 rounded-xl border border-yellow-800/40">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-slate-200">1. การทำงานของหลอดไฟฉุกเฉินและการชาร์จแบตเตอรี่ (Emergency Light Function)</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">กดปุ่ม Test หรือตรวจสอบสถานะไฟติดสว่างเมื่อไม่มีไฟเลี้ยง และระบบประจุไฟทำงานปกติ</p>
              <div className="grid grid-cols-2 gap-2">
                {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEmergencyLightStatus(opt as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      emergencyLightStatus === opt
                        ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    {opt === 'ปกติ' ? '✓ ปกติ (ไฟติดสว่างสมบูรณ์)' : '✕ ไม่ปกติ (ไฟดับ/ไม่ติด/ชำรุด)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exit Sign Checklist (ป้ายบอกทางหนีไฟ) */}
          {currentAssetType === 'ป้ายบอกทางหนีไฟ' && (
            <div className="bg-slate-950/40 p-3.5 rounded-xl border border-emerald-800/40">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">1. ความสว่างและสภาพป้ายบอกทางหนีไฟ (Exit Sign Illumination & Box)</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">ตรวจสอบความสว่างของไฟป้ายทางออกฉุกเฉิน ตัวอักษร/สัญลักษณ์ชัดเจน ตัวกล่องสมบูรณ์</p>
              <div className="grid grid-cols-2 gap-2">
                {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setExitSignStatus(opt as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      exitSignStatus === opt
                        ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    {opt === 'ปกติ' ? '✓ ปกติ (ไฟสว่างชัดเจนสมบูรณ์)' : '✕ ไม่ปกติ (ไฟดับ/ป้ายชำรุด)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Common: Accessibility / Visibility */}
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">
                {currentAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                  ? '6. การเข้าถึงพื้นที่หน้าตู้ FCP สะดวกปราศจากสิ่งกีดขวาง (Clearance)'
                  : currentAssetType === 'ประตูกันไฟ' 
                  ? '4. ทางหนีไฟว่างปราศจากสิ่งกีดขวาง (Clearance)' 
                  : currentAssetType === 'ตู้ดับเพลิง'
                  ? '5. การเข้าถึงหน้าตู้ดับเพลิง (Accessibility)'
                  : currentAssetType === 'ไฟฉุกเฉิน'
                  ? '2. สภาพพื้นที่ติดตั้งและการมองเห็นไฟฉุกเฉิน (Clear Visibility)'
                  : currentAssetType === 'ป้ายบอกทางหนีไฟ'
                  ? '2. สภาพพื้นที่ติดตั้งและการมองเห็นป้ายบอกทางหนีไฟ (Clear Visibility)'
                  : '6. การเข้าถึงสะดวกปราศจากสิ่งกีดขวาง (Accessibility)'}
              </span>
            </div>
            
            {/* For High-Mounted Assets (Emergency Light & Exit Sign) -> ปกติ / ไม่ปกติ */}
            {currentAssetType === 'ไฟฉุกเฉิน' || currentAssetType === 'ป้ายบอกทางหนีไฟ' ? (
              <div className="grid grid-cols-2 gap-2">
                {['ปกติ', 'ไม่ปกติ'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAccessibility(opt as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      accessibility === opt
                        ? opt === 'ปกติ' ? 'border-emerald-650 bg-emerald-600 text-white shadow-xs' : 'border-rose-650 bg-rose-600 text-white shadow-xs'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    {opt === 'ปกติ' ? '✓ ปกติ (มองเห็นชัดเจน/ติดตั้งปกติ)' : '✕ ไม่ปกติ (มีสิ่งบดบัง/ชำรุด)'}
                  </button>
                ))}
              </div>
            ) : (
              /* For Floor/Wall Level Assets -> ปกติ / มีสิ่งกีดขวาง */
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
                    {opt === 'ปกติ' ? 'ปกติ (ทางสะดวก)' : 'มีสิ่งของกีดขวางทางเข้า'}
                  </button>
                ))}
              </div>
            )}
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
              <span className="text-[10px] font-bold text-slate-500">ระยะห่างคำนวณจากเสาพิกัดจุดจริง:</span>
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
            {/* Read-only Original Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">ภาพถ่ายก่อนตรวจ (Before)</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">จากฐานข้อมูล</span>
              </div>
              <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
                {extinguisher.photoUrl ? (
                  <img 
                    src={extinguisher.photoUrl} 
                    alt="Original" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-600 font-semibold">ไม่มีภาพถ่ายตั้งต้น</span>
                )}
              </div>
            </div>

            {/* Live New Photo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">ภาพถ่ายหลักฐานหลังตรวจ (After)</span>
                <span className="text-[10px] text-emerald-400 font-bold">ถ่ายใหม่หน้างาน</span>
              </div>
              <PhotoUploader 
                value={photoAfter}
                onChange={setPhotoAfter}
                label="ถ่ายรูปภาพหลักฐานการตรวจเช็ค"
              />
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            ลายมือชื่ออิเล็กทรอนิกส์ผู้ตรวจสอบ (Digital Signature) <span className="text-rose-500">*</span>
          </label>
          <SignaturePad 
            value={signatureUrl}
            onChange={setSignatureUrl}
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
            บันทึกข้อความ / ข้อเสนอแนะเพิ่มเติม (Notes)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="เช่น ตรวจสอบเรียบร้อยทุกรายการพร้อมใช้งาน หรือ รายละเอียดที่ต้องการให้ช่างมาแก้ไข..."
            className="w-full p-2.5 border border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 placeholder-slate-600 font-normal"
          />
        </div>

        {/* Auto Result Preview */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
              ผลสรุปการประเมินสภาพ (Automated Assessment)
            </span>
            <p className="text-sm font-extrabold mt-0.5 text-white flex items-center gap-1.5">
              {inspectionResult === 'ผ่าน' ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-emerald-400">ผ่านเกณฑ์มาตรฐานความปลอดภัย (PASS)</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-rose-400" />
                  <span className="text-rose-400">ไม่ผ่านเกณฑ์มาตรฐาน - ต้องปรับปรุงแก้ไข (FAIL)</span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setInspectionResult('ผ่าน')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                inspectionResult === 'ผ่าน' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400'
              }`}
            >
              ผ่าน
            </button>
            <button
              type="button"
              onClick={() => setInspectionResult('ไม่ผ่าน')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                inspectionResult === 'ไม่ผ่าน' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400'
              }`}
            >
              ไม่ผ่าน
            </button>
          </div>
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          ยกเลิก (Cancel)
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isAlreadyInspected}
          className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-red-900/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>กำลังบันทึกข้อมูล...</span>
            </>
          ) : (
            <>
              <ClipboardCheck size={14} />
              <span>บันทึกผลการตรวจเช็ค</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
