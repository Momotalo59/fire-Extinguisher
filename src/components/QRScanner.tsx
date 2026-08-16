import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertCircle, Scan, X, KeyRound, Search, Upload, CheckCircle2 } from 'lucide-react';
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
  
  // Auto-activate camera if running in standalone window tab (not inside iframe) or if opened with ?scan=true
  const isStandalone = typeof window !== 'undefined' && window.self === window.top;
  const isScanParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('scan') === 'true';
  const [isCameraActive, setIsCameraActive] = useState(isStandalone || isScanParam);
  
  const [scanSuccessText, setScanSuccessText] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerId = "qr-reader-container-clean";

  // Open app in new standalone browser tab with auto-open QR scanner parameter
  const openNewTabWithScan = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('scan', 'true');
    window.open(url.toString(), '_blank');
  };

  // Play a beep sound when scanning is successful
  const playBeep = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.setValueAtTime(1200, context.currentTime);
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
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          qrScannerRef.current.stop().catch(() => {});
        }
      } catch (_) {}
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

  // Scan QR code from photo upload / phone camera photo capture
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);
    setInputError(null);

    try {
      const html5QrCode = new Html5Qrcode("qr-file-scanner-temp");
      const result = await html5QrCode.scanFile(file, true);
      handleSuccess(result);
    } catch (err: any) {
      console.warn("QR file scan failed:", err);
      setInputError("ไม่พบ QR Code ในรูปภาพนี้ กรุณาลองถ่ายภาพใหม่ให้ชัดเจน หรือพิมพ์รหัสถังด้านล่าง");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Start QR scanner using html5-qrcode safely
  useEffect(() => {
    let isMounted = true;

    if (isCameraActive) {
      setCameraError(null);
      
      const timer = setTimeout(async () => {
        try {
          const element = document.getElementById(readerId);
          if (!element || !isMounted) return;

          // Check if camera API exists
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (isMounted) {
              setCameraError("บราวเซอร์หรือสภาพแวดล้อมระบบไม่อนุญาตให้เปิดกล้องสด (สามารถถ่ายภาพ QR Code หรือกรอกรหัสถังด้านล่างได้)");
              setIsCameraActive(false);
            }
            return;
          }

          const html5QrCode = new Html5Qrcode(readerId);
          qrScannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.65;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              if (isMounted) {
                handleSuccess(decodedText);
              }
            },
            () => {}
          );
        } catch (err: any) {
          console.warn("Camera scan start error:", err);
          if (isMounted) {
            setCameraError("ไม่สามารถเปิดสตรีมกล้องสดได้ (โปรดใช้ปุ่ม 'ถ่ายภาพ/อัปโหลดรูป QR Code' หรือกรอกรหัสถังดับเพลิงด้านล่าง)");
            setIsCameraActive(false);
          }
        }
      }, 300);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (qrScannerRef.current) {
          const scannerInstance = qrScannerRef.current;
          qrScannerRef.current = null;
          try {
            if (scannerInstance.isScanning) {
              scannerInstance.stop().catch(() => {}).finally(() => {
                try { scannerInstance.clear(); } catch (_) {}
              });
            } else {
              try { scannerInstance.clear(); } catch (_) {}
            }
          } catch (_) {}
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
      {/* Hidden element for file scanning */}
      <div id="qr-file-scanner-temp" className="hidden"></div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

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
          <div className="relative w-full h-full">
            {/* CLEAN EMPTY DIV FOR HTML5QRCODE TO PREVENT REACT DOM RECONCILIATION CRASH */}
            <div id={readerId} className="w-full h-full object-cover"></div>

            {/* Viewfinder Overlay Grid (Rendered outside the reader element) */}
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
            <p className="text-xs text-slate-300 font-bold">โหมดสแกนคิวอาร์โค้ด</p>
            <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed mt-1">
              เลือกสแกนสดผ่านกล้อง หรือ ถ่ายภาพ/อัปโหลดรูป QR Code จากมือถือได้โดยตรง
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsCameraActive(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] py-2 px-4 rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Camera size={13} />
                <span>เปิดสแกนผ่านกล้องสด</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] py-2 px-4 rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isProcessingFile ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Upload size={13} />
                )}
                <span>ถ่ายภาพ / เลือกรูป QR Code</span>
              </button>
            </div>
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
          <div className="absolute bottom-3 left-3 right-3 bg-red-950/95 text-red-200 border border-red-800/60 p-3 rounded-xl flex items-start gap-2.5 text-[11px] z-10 shadow-xl backdrop-blur-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <div className="space-y-1 text-left w-full">
              <p className="font-bold text-red-300 flex items-center justify-between">
                <span>แจ้งเตือนสิทธิ์การใช้งานกล้อง</span>
                <span className="text-[9px] bg-red-900/60 px-1.5 py-0.5 rounded text-red-200">ข้อจำกัด iFrame Preview</span>
              </p>
              <p className="text-[10px] text-red-200 leading-relaxed">
                เนื่องจากหน้านี้ทำงานอยู่ในระบบ Preview เบราว์เซอร์จึงไม่อนุญาตให้เปิดสตรีมวิดีโอกล้องสดใน iframe
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openNewTabWithScan}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-xs cursor-pointer"
                >
                  เปิดแอปในแท็บใหม่ (เปิดกล้องสแกนสดได้ทันที)
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] px-2.5 py-1 rounded border border-slate-700 cursor-pointer"
                >
                  ถ่ายภาพ / อัปโหลด QR
                </button>
              </div>
            </div>
          </div>
        )}

        {isCameraActive && (
          <button
            type="button"
            onClick={() => setIsCameraActive(false)}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white text-[10px] py-1 px-3 rounded border border-slate-700 font-bold transition-colors z-20 cursor-pointer"
          >
            ปิดกล้องสด
          </button>
        )}
      </div>

      {/* Clean Manual Form (Production Style fallback) */}
      <div className="p-5 bg-slate-950 flex-1 flex flex-col justify-between">
        <form onSubmit={handleManualSubmit} className="space-y-3">
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
            <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 pt-1">
              <AlertCircle size={12} />
              <span>{inputError}</span>
            </p>
          )}
        </form>

        <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
          <span>รองรับการสแกนป้ายมาตรฐาน NFPA 10</span>
          <span>ระบบบันทึกเวลาอัตโนมัติ</span>
        </div>
      </div>
    </motion.div>
  );
}
