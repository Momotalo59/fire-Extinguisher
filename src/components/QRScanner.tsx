import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertCircle, Scan, X, KeyRound, Search, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { FireExtinguisher } from '../types';

interface QRScannerProps {
  extinguishers: FireExtinguisher[];
  onScanSuccess: (extinguisherId: string) => void;
  onClose?: () => void;
}

export default function QRScanner({ extinguishers, onScanSuccess, onClose }: QRScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanSuccessText, setScanSuccessText] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "qr-reader-container-element";

  // Play a beautiful beep sound when scanning is successful
  const playBeep = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.setValueAtTime(1200, context.currentTime); // High pitch beep
      gainNode.gain.setValueAtTime(0.1, context.currentTime);
      
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio feedback not available:", e);
    }
  };

  const handleSuccess = (id: string) => {
    const cleanId = id.trim().toUpperCase();
    playBeep();
    setScanSuccessText(cleanId);
    
    // Stop scanner if active
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      qrScannerRef.current.stop().catch(err => console.error("Error stopping scanner:", err));
    }

    setTimeout(() => {
      onScanSuccess(cleanId);
      if (onClose) onClose();
    }, 1200);
  };

  // Handle manual submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    const cleanId = manualCode.trim().toUpperCase();
    
    if (!cleanId) {
      setInputError('กรุณากรอกรหัสถังดับเพลิง');
      return;
    }

    const found = extinguishers.some(ext => ext.id.toUpperCase() === cleanId);
    if (!found) {
      setInputError(`ไม่พบรหัสถังดับเพลิง "${cleanId}" ในระบบฐานข้อมูลความปลอดภัย`);
      return;
    }

    handleSuccess(cleanId);
  };

  // Start QR scanner using html5-qrcode
  useEffect(() => {
    if (isCameraActive) {
      setCameraError(null);
      
      // Delay initialization slightly to ensure container is fully rendered in the DOM
      const timer = setTimeout(() => {
        try {
          const html5QrCode = new Html5Qrcode(readerId);
          qrScannerRef.current = html5QrCode;

          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.65;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              handleSuccess(decodedText);
            },
            (errorMessage) => {
              // Verbose scan failure log (ignored to avoid spam)
            }
          ).catch((err) => {
            console.error("Camera scan start error:", err);
            setCameraError("ไม่สามารถเปิดกล้องได้ (อาจเกิดจากการจำกัดสิทธิ์ใน iframe หรือไม่ได้อนุญาตการใช้กล้อง)");
            setIsCameraActive(false);
          });
        } catch (err) {
          console.error("Html5Qrcode initialization error:", err);
          setCameraError("อุปกรณ์นี้ไม่รองรับการสแกนผ่านเว็บบราวเซอร์");
          setIsCameraActive(false);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (qrScannerRef.current && qrScannerRef.current.isScanning) {
          qrScannerRef.current.stop().catch(err => console.error("Error stopping scanner during unmount:", err));
        }
      };
    }
  }, [isCameraActive]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900 text-white rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full"
    >
      {/* Header */}
      <div id="scanner-header" className="p-4.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Scan className="text-red-500 animate-pulse" size={18} />
          <h3 className="font-bold text-xs md:text-sm tracking-wider text-slate-100">เครื่องสแกนคิวอาร์โค้ดตรวจสอบถังดับเพลิง</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Viewfinder/Scanner Area */}
      <div id="scanner-viewfinder" className="relative bg-black h-72 flex flex-col items-center justify-center overflow-hidden border-b border-slate-800">
        
        {isCameraActive ? (
          <div id={readerId} className="w-full h-full object-cover relative">
            {/* Viewfinder Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-48 h-48 border-2 border-dashed border-red-500/80 rounded-2xl relative">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-red-500 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-red-500 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-red-500 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-red-500 -mb-1 -mr-1"></div>
                
                {/* Laser scan effect */}
                <motion.div
                  initial={{ top: '10%' }}
                  animate={{ top: '90%' }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: 1.8,
                    ease: "easeInOut"
                  }}
                  className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <Camera size={38} className="text-slate-600 mb-3" />
            <p className="text-xs text-slate-300 font-bold">โหมดสแกนผ่านกล้องถ่ายภาพ</p>
            <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed mt-1">
              เปิดสิทธิ์กล้องเพื่อเปิดการทำงานสแกน QR Code ตรวจสอบถังดับเพลิงประจำจุดติดตั้งโดยตรง
            </p>
            <button
              onClick={() => setIsCameraActive(true)}
              className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] py-2 px-5 rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Camera size={13} />
              <span>เปิดสิทธิ์สแกนผ่านกล้องจริง</span>
            </button>
          </div>
        )}

        {/* Scan Success text overlay */}
        <AnimatePresence>
          {scanSuccessText && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bg-emerald-600 border border-emerald-500 text-white font-extrabold py-2.5 px-6 rounded-xl flex items-center gap-2 text-xs z-20 shadow-xl"
            >
              <CheckCircle2 size={15} />
              <span>ตรวจพบ: {scanSuccessText}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera error notification */}
        {cameraError && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-950/95 text-red-200 border border-red-900/40 p-3 rounded-xl flex items-start gap-2 text-[11px] z-10 shadow-lg">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">ไม่สามารถเข้าถึงอุปกรณ์กล้องได้</p>
              <p className="text-[10px] text-red-300">กรุณาใช้วิธีป้อนรหัสถังดับเพลิงที่ติดตั้งด้วยตนเองด้านล่างแทน</p>
            </div>
          </div>
        )}

        {isCameraActive && (
          <button
            onClick={() => setIsCameraActive(false)}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white text-[10px] py-1 px-3 rounded border border-slate-800 font-bold transition-colors z-20"
          >
            ปิดกล้อง
          </button>
        )}
      </div>

      {/* Clean Manual Form (Production Style fallback) */}
      <div className="p-5 bg-slate-950 flex-1 flex flex-col justify-between">
        <form onSubmit={handleManualSubmit} className="space-y-3.5">
          <div>
            <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1">
              <KeyRound size={12} className="text-red-500" />
              <span>รหัสถังดับเพลิงประจำจุด (Fire Extinguisher ID)</span>
            </label>
            <p className="text-[10px] text-slate-500 mt-0.5">
              ระบุรหัสประจำตัวถังดับเพลิงจากป้ายสติ๊กเกอร์คิวอาร์ที่ติดอยู่ที่ตัวถังเพื่อทำรายการตรวจสอบ
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ระบุรหัสถังดับเพลิง เช่น FE-001, FE-002"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setInputError(null);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3.5 text-xs text-white focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none placeholder-slate-650"
              />
            </div>
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-500 text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-900/20 text-white"
            >
              <Search size={13} />
              <span>เริ่มตรวจเช็ค</span>
            </button>
          </div>

          {inputError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-950/60 text-rose-300 border border-rose-900/40 p-2.5 rounded-lg flex items-center gap-1.5 text-[10px] font-semibold"
            >
              <AlertCircle size={13} className="shrink-0" />
              <span>{inputError}</span>
            </motion.div>
          )}
        </form>

        {/* Safety Note */}
        <div className="border-t border-slate-900/80 pt-4 mt-4 flex items-start gap-2.5 text-[10px] text-slate-500 leading-normal">
          <HelpCircle size={14} className="text-slate-650 shrink-0 mt-0.5" />
          <p>
            การสแกนหรือยืนยันรหัสถังมีความสำคัญต่อมาตรฐาน NFPA 10 เพื่อพิสูจน์ว่าผู้ตรวจเช็คได้เดินทางมาตรวจสอบหน้างาน ณ จุดติดตั้งจริง ไม่ใช่การประเมินจากระยะไกล
          </p>
        </div>
      </div>
    </motion.div>
  );
}
