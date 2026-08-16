import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Printer, Download, X, Flame, MapPin, Layers, CheckSquare, Square, FileText } from 'lucide-react';
import QRCode from 'qrcode';
import { FireExtinguisher } from '../types';
import { HOSPITAL_LOGO_SRC, TECH_DEPT_LOGO_SRC } from '../assets/logoAssets';

interface QRCodeModalProps {
  extinguishers: FireExtinguisher[];
  initialSelectedId?: string | null;
  onClose: () => void;
}

export default function QRCodeModal({ extinguishers, initialSelectedId, onClose }: QRCodeModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedId) {
      return [initialSelectedId];
    }
    return extinguishers.map(e => e.id);
  });

  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(true);
  const printRef = useRef<HTMLDivElement | null>(null);

  // Filter mode: 'single' vs 'all'
  const isSingle = selectedIds.length === 1 && initialSelectedId;
  const singleExt = isSingle ? extinguishers.find(e => e.id === selectedIds[0]) : null;

  // Generate QR Code data URLs for all selected extinguishers
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      for (const ext of extinguishers) {
        try {
          // Generate QR code for tank ID
          const dataUrl = await QRCode.toDataURL(ext.id, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 280,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          urls[ext.id] = dataUrl;
        } catch (err) {
          console.error(`Error generating QR for ${ext.id}:`, err);
        }
      }

      if (isMounted) {
        setQrDataUrls(urls);
        setIsGenerating(false);
      }
    };

    generateQRs();

    return () => {
      isMounted = false;
    };
  }, [extinguishers]);

  // Toggle selection for batch print
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === extinguishers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(extinguishers.map(e => e.id));
    }
  };

  // Download single QR Code as PNG
  const downloadSingleQR = (ext: FireExtinguisher) => {
    const qrUrl = qrDataUrls[ext.id];
    if (!qrUrl) return;

    const isFCP = ext.assetType === 'ตู้แจ้งเหตุเพลิงไหม้' || ext.id.startsWith('FCP-') || ext.id.startsWith('FA-') || ext.type.includes('ตู้ควบคุม') || ext.type.includes('FCP');
    const isFHC = ext.assetType === 'ตู้ดับเพลิง' || ext.id.startsWith('FHC-') || ext.type.includes('ตู้ดับเพลิง');
    const isFD = ext.assetType === 'ประตูกันไฟ' || ext.id.startsWith('FD-') || ext.type.includes('ประตู');

    // Create a canvas to draw a styled sticker card for download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 750;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Inner header background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, 16, canvas.width - 32, 100);

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('โรงพยาบาลโอเวอร์บรุ๊ค เชียงราย', canvas.width / 2, 55);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 18px sans-serif';
    const subTitle = isFCP
      ? 'FIRE SAFE - ระบบตรวจเช็คตู้แจ้งเหตุเพลิงไหม้ (FCP)'
      : isFHC
      ? 'FIRE SAFE - ระบบบันทึกการตรวจเช็คตู้ดับเพลิง'
      : isFD
      ? 'FIRE SAFE - ระบบบันทึกการตรวจเช็คประตูกันไฟ'
      : 'FIRE SAFE - ระบบบันทึกการตรวจเช็คถังดับเพลิง';
    ctx.fillText(subTitle, canvas.width / 2, 88);

    // Load QR Code Image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw QR Code
      ctx.drawImage(img, (canvas.width - 300) / 2, 130, 300, 300);

      // Asset ID
      ctx.fillStyle = '#0f172a';
      ctx.font = 'black 36px monospace';
      ctx.textAlign = 'center';
      const idLabel = isFCP ? `รหัสตู้ FCP: ${ext.id}` : isFHC ? `รหัสตู้: ${ext.id}` : isFD ? `รหัสประตู: ${ext.id}` : `รหัสถัง: ${ext.id}`;
      ctx.fillText(idLabel, canvas.width / 2, 475);

      // Details line
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 20px sans-serif';
      if (isFCP) {
        ctx.fillText(`ยี่ห้อ: ${ext.brand || '-'} | รุ่น: ${ext.model || '-'} (${ext.size || 'Main'})`, canvas.width / 2, 515);
      } else if (isFHC || isFD) {
        ctx.fillText(`ชนิด: ${ext.type} (${ext.size || '-'})`, canvas.width / 2, 515);
      } else {
        ctx.fillText(`S/N: ${ext.serialNumber} | ประเภท: ${ext.type} (${ext.size})`, canvas.width / 2, 515);
      }

      // Location
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`ตำแหน่ง: ${ext.building} ${ext.floor}`, canvas.width / 2, 560);

      ctx.fillStyle = '#64748b';
      ctx.font = '18px sans-serif';
      ctx.fillText(`(${ext.locationDetails})`, canvas.width / 2, 595);

      // Footer notice
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(16, 640, canvas.width - 32, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      const scanInstruction = isFCP
        ? 'สแกน QR Code เพื่อบันทึกผลการตรวจเช็คประจำวัน'
        : 'สแกน QR Code เพื่อตรวจสอบและบันทึกผลการตรวจเช็ค';
      ctx.fillText(scanInstruction, canvas.width / 2, 685);

      // Download link
      const link = document.createElement('a');
      const prefix = isFCP ? 'QRCode_ตู้แจ้งเหตุเพลิงไหม้_' : isFHC ? 'QRCode_ตู้ดับเพลิง_' : isFD ? 'QRCode_ประตูกันไฟ_' : 'QRCode_ถังดับเพลิง_';
      link.download = `${prefix}${ext.id.replace(/[/\\?%*:|"<>]/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrUrl;
  };

  // Browser Print
  const handlePrint = () => {
    window.print();
  };

  const selectedExtinguishers = extinguishers.filter(e => selectedIds.includes(e.id));

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Print styles injected for clean sticker layout on paper */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-qr-area, #printable-qr-area * {
            visibility: visible !important;
          }
          #printable-qr-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 10px !important;
          }
          .no-print {
            display: none !important;
          }
          .qr-sticker-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            margin-bottom: 12px !important;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-600/40 text-red-500 flex items-center justify-center">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {singleExt 
                  ? `ป้าย QR Code: ${singleExt.id}` 
                  : `พิมพ์ป้าย QR Code อุปกรณ์ (${selectedIds.length} รายการ)`}
              </h3>
              <p className="text-xs text-slate-400">
                สแกนเพื่อเข้าถึงหน้าตรวจสอบสภาพอุปกรณ์และบันทึกผลการตรวจเช็ค
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={selectedIds.length === 0 || isGenerating}
              className="py-1.5 px-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-red-600/20"
            >
              <Printer size={14} />
              <span>พิมพ์ป้าย (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Controls for Batch mode */}
          {!singleExt && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 bg-red-950/40 border border-red-900/50 py-1 px-2.5 rounded-lg cursor-pointer"
                >
                  {selectedIds.length === extinguishers.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  <span>{selectedIds.length === extinguishers.length ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกอุปกรณ์ทั้งหมด'}</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">
                  เลือกแล้ว <strong className="text-white">{selectedIds.length}</strong> จาก {extinguishers.length} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-500 italic">
                * สามารถสั่งพิมพ์ออกเครื่องพิมพ์ป้ายกำกับ หรือพิมพ์ใส่กระดาษสติ๊กเกอร์ A4 เพื่อนำไปติดที่อุปกรณ์ได้ทันที
              </p>
            </div>
          )}

          {isGenerating ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-red-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-medium">กำลังสร้างรหัส QR Code ความละเอียดสูง...</p>
            </div>
          ) : selectedExtinguishers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <QrCode size={36} className="mx-auto text-slate-700" />
              <p className="text-sm font-bold text-slate-400">ยังไม่ได้เลือกอุปกรณ์</p>
              <p className="text-xs text-slate-500">กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการเพื่อพิมพ์ป้าย QR Code</p>
            </div>
          ) : (
            /* Printable Container */
            <div id="printable-qr-area" ref={printRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {selectedExtinguishers.map((ext) => {
                const qrUrl = qrDataUrls[ext.id];
                const isFCP = ext.assetType === 'ตู้แจ้งเหตุเพลิงไหม้' || ext.id.startsWith('FCP-') || ext.id.startsWith('FA-') || ext.type.includes('ตู้ควบคุม') || ext.type.includes('FCP');
                const isFHC = ext.assetType === 'ตู้ดับเพลิง' || ext.id.startsWith('FHC-') || ext.type.includes('ตู้ดับเพลิง');
                const isFD = ext.assetType === 'ประตูกันไฟ' || ext.id.startsWith('FD-') || ext.type.includes('ประตู');

                return (
                  <div
                    key={ext.id}
                    className="qr-sticker-card bg-white text-slate-900 rounded-2xl border-2 border-slate-200 p-4 shadow-lg flex flex-col justify-between space-y-3 relative overflow-hidden"
                  >
                    {/* Checkbox selector in Modal preview (hidden when printed) */}
                    {!singleExt && (
                      <button
                        onClick={() => toggleSelect(ext.id)}
                        className="no-print absolute top-3 right-3 p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        title="เลือก/ยกเลิกรายการนี้"
                      >
                        {selectedIds.includes(ext.id) ? (
                          <CheckSquare size={18} className="text-red-600" />
                        ) : (
                          <Square size={18} className="text-slate-400" />
                        )}
                      </button>
                    )}

                    {/* Sticker Header with Logos */}
                    <div className="border-b-2 border-red-600 pb-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img 
                          src={HOSPITAL_LOGO_SRC} 
                          alt="Overbrook Hospital Logo" 
                          className="h-8 w-auto object-contain"
                        />
                        <div>
                          <p className="text-[11px] font-extrabold text-slate-900 leading-tight">โรงพยาบาลโอเวอร์บรุ๊ค เชียงราย</p>
                          <p className="text-[9px] font-bold text-red-600 leading-none">OVERBROOK HOSPITAL</p>
                        </div>
                      </div>
                      <img 
                        src={TECH_DEPT_LOGO_SRC} 
                        alt="Tech Dept Logo" 
                        className="h-7 w-auto object-contain shrink-0"
                      />
                    </div>

                    {/* QR Code and Key Details */}
                    <div className="flex items-center gap-3">
                      {/* QR Image */}
                      <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0 text-center">
                        {qrUrl ? (
                          <img src={qrUrl} alt={`QR ${ext.id}`} className="w-28 h-28 object-contain" />
                        ) : (
                          <div className="w-28 h-28 bg-slate-200 flex items-center justify-center text-xs text-slate-500">
                            Loading...
                          </div>
                        )}
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">SCAN ME</span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                            {isFCP 
                              ? '🚨 รหัสตู้แจ้งเหตุเพลิงไหม้ (FCP)' 
                              : isFHC 
                              ? '🗄️ รหัสตู้ดับเพลิง' 
                              : isFD 
                              ? '🚪 รหัสประตูกันไฟ' 
                              : '🧯 รหัสถังดับเพลิง'}
                          </span>
                          <p className="text-lg font-black font-mono text-slate-900 leading-none">{ext.id}</p>
                        </div>

                        <div className="text-[11px] text-slate-700 font-medium space-y-0.5">
                          {isFCP ? (
                            <>
                              <p><strong>ยี่ห้อ / รุ่น:</strong> {ext.brand || '-'} ({ext.model || '-'})</p>
                              <p className="truncate text-slate-600"><strong>ประเภท:</strong> {ext.type}</p>
                            </>
                          ) : isFHC ? (
                            <p><strong>ชนิดตู้:</strong> {ext.type} {ext.size ? `(${ext.size})` : ''}</p>
                          ) : isFD ? (
                            <p><strong>ชนิดประตู:</strong> {ext.type} {ext.size ? `(${ext.size})` : ''}</p>
                          ) : (
                            <>
                              {ext.serialNumber && ext.serialNumber !== '-' && (
                                <p className="font-mono text-slate-600 truncate"><strong>S/N:</strong> {ext.serialNumber}</p>
                              )}
                              <p><strong>สาร:</strong> {ext.type} {ext.size ? `(${ext.size})` : ''}</p>
                            </>
                          )}
                          <p className="text-slate-900 font-semibold leading-tight mt-1">
                            <strong>ตำแหน่ง:</strong> {ext.building} {ext.floor}
                          </p>
                          {ext.locationDetails && (
                            <p className="text-[10px] text-slate-500 truncate">({ext.locationDetails})</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Warning & Scan Instruction */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center space-y-0.5">
                      <p className="text-[10px] font-bold text-red-700 flex items-center justify-center gap-1">
                        <Flame size={12} className="text-red-600 shrink-0" />
                        <span>
                          {isFCP
                            ? 'สแกนเพื่อบันทึกการตรวจเช็คตู้แจ้งเหตุเพลิงไหม้ (FCP) ประจำวัน'
                            : isFHC
                            ? 'สแกนเพื่อบันทึกการตรวจเช็คตู้ดับเพลิงประจำเดือน' 
                            : isFD
                            ? 'สแกนเพื่อบันทึกการตรวจเช็คประตูกันไฟประจำเดือน'
                            : 'สแกนเพื่อบันทึกการตรวจเช็คถังดับเพลิงประจำเดือน'}
                        </span>
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">FIRE SAFE MANAGEMENT SYSTEM • OVERBROOK HOSPITAL</p>
                    </div>

                    {/* Single download button for each sticker in UI view */}
                    <div className="no-print pt-1 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => downloadSingleQR(ext)}
                        className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="ดาวน์โหลดรูปภาพ QR Code นี้เป็น PNG"
                      >
                        <Download size={12} />
                        <span>โหลดรูป PNG</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between no-print shrink-0">
          <p className="text-xs text-slate-400">
            💡 คำแนะนำ: กดปุ่ม <strong className="text-slate-200">พิมพ์ป้าย (Print)</strong> เพื่อพิมพ์ป้ายสติ๊กเกอร์ติดอุปกรณ์ หรือเลือกเครื่องพิมพ์เป็น PDF
          </p>
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </motion.div>
    </div>
  );
}
