import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  Plus, 
  Clipboard, 
  Trash2, 
  Edit3, 
  X,
  FileSpreadsheet,
  Compass,
  Map,
  Badge
} from 'lucide-react';
import { FireExtinguisher, ExtinguisherType, ExtinguisherStatus } from '../types';

interface ExtinguisherListProps {
  extinguishers: FireExtinguisher[];
  selectedId: string | null;
  selectedStatusFilter: string | null;
  onSelectExtinguisher: (id: string) => void;
  onInspect: (extinguisher: FireExtinguisher) => void;
  onAddExtinguisher: (extinguisher: Omit<FireExtinguisher, 'createdAt'>) => Promise<void>;
  onEditExtinguisher: (extinguisher: FireExtinguisher) => Promise<void>;
  onDeleteExtinguisher: (id: string) => Promise<void>;
  isAdmin?: boolean;
}

export default function ExtinguisherList({
  extinguishers,
  selectedId,
  selectedStatusFilter,
  onSelectExtinguisher,
  onInspect,
  onAddExtinguisher,
  onEditExtinguisher,
  onDeleteExtinguisher,
  isAdmin = false
}: ExtinguisherListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Form fields for Add/Edit
  const [formId, setFormId] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formType, setFormType] = useState<ExtinguisherType>('Dry Chemical');
  const [formSize, setFormSize] = useState('15 lbs');
  const [formBuilding, setFormBuilding] = useState('อาคารหมอบริกส์');
  const [formFloor, setFormFloor] = useState('ชั้น 1');
  const [formLocationDetails, setFormLocationDetails] = useState('');
  const [formLat, setFormLat] = useState('19.9075');
  const [formLng, setFormLng] = useState('99.8294');
  const [formInstallationDate, setFormInstallationDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formStatus, setFormStatus] = useState<ExtinguisherStatus>('ปกติ');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Expiry auto-calculation: set to 5 years after installation date
  React.useEffect(() => {
    if (formInstallationDate) {
      const parts = formInstallationDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]) + 5;
        setFormExpiryDate(`${year}-${parts[1]}-${parts[2]}`);
      }
    }
  }, [formInstallationDate]);

  // Retrieve current GPS location using Geolocation API
  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์นี้ไม่รองรับระบบแผนที่และพิกัด GPS");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormLat(position.coords.latitude.toFixed(6));
        setFormLng(position.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (error) => {
        console.error("GPS Error: ", error);
        alert("ไม่สามารถดึงพิกัดได้เนื่องจากผู้ใช้อาจปฏิเสธการเข้าถึงสิทธิ์ตำแหน่ง");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle Add Form Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formId.trim()) {
      setFormError('กรุณากรอกรหัสถังดับเพลิง');
      return;
    }
    if (!formBuilding.trim() || !formFloor.trim() || !formLocationDetails.trim()) {
      setFormError('กรุณากรอกข้อมูลสถานที่และตำแหน่งที่ตั้งให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      const latVal = parseFloat(formLat);
      const lngVal = parseFloat(formLng);
      const locationGPS = (!isNaN(latVal) && !isNaN(lngVal)) ? { latitude: latVal, longitude: lngVal } : null;

      await onAddExtinguisher({
        id: formId.trim().toUpperCase(),
        qrCode: formId.trim().toUpperCase(),
        serialNumber: formSerialNumber.trim() || `SN-${Date.now()}`,
        type: formType,
        size: formSize.trim(),
        building: formBuilding.trim(),
        floor: formFloor.trim(),
        locationDetails: formLocationDetails.trim(),
        locationGPS,
        installationDate: new Date(formInstallationDate).toISOString(),
        expiryDate: new Date(formExpiryDate).toISOString(),
        status: formStatus,
        photoUrl: formPhotoUrl.trim() || null,
        lastInspectedAt: null
      });

      // Clear & Close
      setFormId('');
      setFormSerialNumber('');
      setFormLocationDetails('');
      setFormPhotoUrl('');
      setFormStatus('ปกติ');
      setIsAddOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal with current values
  const handleOpenEdit = (ext: FireExtinguisher) => {
    setFormId(ext.id);
    setFormSerialNumber(ext.serialNumber);
    setFormType(ext.type);
    setFormSize(ext.size);
    setFormBuilding(ext.building);
    setFormFloor(ext.floor);
    setFormLocationDetails(ext.locationDetails);
    setFormLat(ext.locationGPS ? String(ext.locationGPS.latitude) : '19.9075');
    setFormLng(ext.locationGPS ? String(ext.locationGPS.longitude) : '99.8294');
    setFormInstallationDate(ext.installationDate ? ext.installationDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormExpiryDate(ext.expiryDate ? ext.expiryDate.split('T')[0] : '');
    setFormPhotoUrl(ext.photoUrl || '');
    setFormStatus(ext.status);
    setFormError(null);
    setIsEditOpen(true);
  };

  // Handle Edit Form Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formBuilding.trim() || !formFloor.trim() || !formLocationDetails.trim()) {
      setFormError('กรุณากรอกข้อมูลสถานที่และตำแหน่งที่ตั้งให้ครบถ้วน');
      return;
    }

    const original = extinguishers.find(ex => ex.id === formId);
    if (!original) return;

    setIsSubmitting(true);
    try {
      const latVal = parseFloat(formLat);
      const lngVal = parseFloat(formLng);
      const locationGPS = (!isNaN(latVal) && !isNaN(lngVal)) ? { latitude: latVal, longitude: lngVal } : null;

      await onEditExtinguisher({
        ...original,
        serialNumber: formSerialNumber.trim() || original.serialNumber,
        type: formType,
        size: formSize.trim(),
        building: formBuilding.trim(),
        floor: formFloor.trim(),
        locationDetails: formLocationDetails.trim(),
        locationGPS,
        installationDate: new Date(formInstallationDate).toISOString(),
        expiryDate: new Date(formExpiryDate).toISOString(),
        status: formStatus,
        photoUrl: formPhotoUrl.trim() || null
      });
      setIsEditOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters logic
  const filteredExtinguishers = extinguishers.filter((ext) => {
    const fullLocText = `${ext.building} ${ext.floor} ${ext.locationDetails}`.toLowerCase();
    const matchesSearch = 
      ext.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullLocText.includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'All' || ext.type === selectedType;

    let matchesStatus = true;
    if (selectedStatusFilter) {
      if (selectedStatusFilter === 'ใกล้หมดอายุ') {
        matchesStatus = ext.status === 'ใกล้หมดอายุ' || ext.status === 'หมดอายุ';
      } else {
        matchesStatus = ext.status === selectedStatusFilter;
      }
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const statusColors: Record<ExtinguisherStatus, string> = {
    'ปกติ': 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
    'แรงดันต่ำ': 'bg-amber-950/40 text-amber-400 border-amber-900/50',
    'ชำรุด': 'bg-rose-950/40 text-rose-400 border-rose-900/50',
    'ใกล้หมดอายุ': 'bg-blue-950/40 text-blue-400 border-blue-900/50',
    'หมดอายุ': 'bg-red-950/40 text-red-400 border-red-900/50',
    'ส่งซ่อม': 'bg-purple-950/40 text-purple-400 border-purple-900/50'
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'ไม่มีประวัติ';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["รหัสถังดับเพลิง", "Serial Number", "ประเภท", "ขนาด", "อาคาร", "ชั้น", "จุดติดตั้งอย่างละเอียด", "พิกัดละติจูด", "พิกัดลองจิจูด", "วันที่ติดตั้ง", "วันหมดอายุ", "ตรวจล่าสุด", "สถานะ"];
    const rows = filteredExtinguishers.map(e => [
      e.id,
      e.serialNumber,
      e.type,
      e.size,
      `"${e.building.replace(/"/g, '""')}"`,
      `"${e.floor.replace(/"/g, '""')}"`,
      `"${e.locationDetails.replace(/"/g, '""')}"`,
      e.locationGPS ? e.locationGPS.latitude : '',
      e.locationGPS ? e.locationGPS.longitude : '',
      e.installationDate.split('T')[0],
      e.expiryDate.split('T')[0],
      e.lastInspectedAt ? e.lastInspectedAt.split('T')[0] : "ไม่มีประวัติ",
      e.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานถังดับเพลิง_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-full">
      {/* Header with Search and Actions */}
      <div id="ext-list-header" className="p-5 bg-slate-950 border-b border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
            <Clipboard size={18} className="text-red-500" />
            รายการถังดับเพลิง ({filteredExtinguishers.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet size={13} className="text-emerald-400" />
              <span>ส่งออก CSV</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setFormId('');
                  setFormSerialNumber('');
                  setFormLocationDetails('');
                  setFormType('Dry Chemical');
                  setFormSize('15 lbs');
                  setFormBuilding('อาคารหมอบริกส์');
                  setFormFloor('ชั้น 1');
                  setFormLat('19.9075');
                  setFormLng('99.8294');
                  setFormPhotoUrl('');
                  setFormStatus('ปกติ');
                  setFormError(null);
                  setIsAddOpen(true);
                }}
                className="py-1.5 px-3.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm shadow-red-600/10"
              >
                <Plus size={14} />
                <span>เพิ่มถังดับเพลิง</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Search box */}
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={13} />
            </div>
            <input
              type="text"
              placeholder="ค้นหารหัสถัง, S/N, อาคาร, ชั้น, จุดติดตั้ง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none placeholder-slate-500 text-slate-200 bg-slate-900"
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
              <Filter size={12} />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none text-slate-200 bg-slate-900 appearance-none cursor-pointer font-medium"
            >
              <option value="All">ทุกประเภทถัง</option>
              <option value="Dry Chemical">Dry Chemical (เคมีแห้ง)</option>
              <option value="CO2">CO2 (คาร์บอนไดออกไซด์)</option>
              <option value="Foam">Foam (โฟม)</option>
              <option value="Clean Agent">Clean Agent (สารสะอาด)</option>
              <option value="Water">Water (น้ำสะสมแรงดัน)</option>
            </select>
          </div>
        </div>

        {/* Selected filter active indicator */}
        {selectedStatusFilter && (
          <div className="flex items-center justify-between bg-red-950/40 border border-red-900/40 rounded-lg py-1.5 px-3">
            <span className="text-[11px] text-red-300 font-medium">
              กำลังกรองเฉพาะสถานะ: <strong className="text-red-400 font-semibold">{selectedStatusFilter}</strong>
            </span>
            <button
              onClick={() => onSelectExtinguisher('')}
              className="text-red-400 hover:text-red-300 text-xs font-bold underline hover:no-underline cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}
      </div>

      {/* Main List */}
      <div id="ext-list-container" className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {filteredExtinguishers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p className="text-sm font-bold text-slate-600">ไม่พบถังดับเพลิงตามเงื่อนไขที่ค้นหา</p>
            <p className="text-xs mt-1.5 text-slate-450">ลองเปลี่ยนคำค้นหา หรือกดปุ่มเพิ่มถังดับเพลิงด้านบนเพื่อสร้างใหม่</p>
          </div>
        ) : (
          filteredExtinguishers.map((ext) => {
            const isSelected = selectedId === ext.id;
            return (
              <div
                key={ext.id}
                onClick={() => onSelectExtinguisher(ext.id)}
                className={`p-4 transition-all hover:bg-slate-850/55 cursor-pointer border-l-4 ${
                  isSelected ? 'bg-slate-800/90 border-red-600' : 'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-white font-mono tracking-tight">{ext.id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">S/N: {ext.serialNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${statusColors[ext.status]}`}>
                        {ext.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <MapPin size={13} className="text-slate-500 shrink-0" />
                      <span className="truncate font-semibold text-slate-200">
                        {ext.building} • {ext.floor} ({ext.locationDetails})
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
                      <span><strong>ประเภท:</strong> {ext.type} ({ext.size})</span>
                      <span className="flex items-center gap-1 text-slate-500 font-mono">
                        <Calendar size={11} />
                        ตรวจล่าสุด: {formatDate(ext.lastInspectedAt)}
                      </span>
                      {ext.locationGPS && (
                        <span className="flex items-center gap-1 text-sky-400 font-mono">
                          <Compass size={11} />
                          GPS: {ext.locationGPS.latitude.toFixed(4)}, {ext.locationGPS.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      title="เริ่มการตรวจสอบสภาพถัง"
                      onClick={() => onInspect(ext)}
                      className="p-1.5 rounded bg-red-950/40 text-red-400 hover:bg-red-600 hover:text-white transition-all duration-150 cursor-pointer shadow-sm border border-red-900/50"
                    >
                      <Clipboard size={14} />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          title="แก้ไขข้อมูลถังดับเพลิง"
                          onClick={() => handleOpenEdit(ext)}
                          className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          title="ลบถังดับเพลิงนี้ออก"
                          onClick={async () => {
                            if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบถังดับเพลิง ${ext.id} และประวัติการเช็คทั้งหมด?`)) {
                              await onDeleteExtinguisher(ext.id);
                            }
                          }}
                          className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {ext.photoUrl && (
                  <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                    <span className="underline hover:no-underline">ดูรูปภาพประกอบแนบ</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Extinguisher Dialog Backdrop */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-900 rounded-2xl max-w-md w-full border border-slate-800 overflow-hidden shadow-2xl my-8 text-slate-200"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-white text-sm">ลงทะเบียนถังดับเพลิงใหม่</h4>
                <button onClick={() => setIsAddOpen(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-2.5 bg-rose-950/50 text-rose-200 border border-rose-900/40 rounded-lg text-xs flex items-center gap-1.5 animate-shake">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">รหัสถังดับเพลิง (ID) *</label>
                    <input
                      type="text"
                      placeholder="เช่น FE-006"
                      required
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs uppercase focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-semibold text-slate-200 bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Serial Number *</label>
                    <input
                      type="text"
                      placeholder="เช่น SN-98725"
                      required
                      value={formSerialNumber}
                      onChange={(e) => setFormSerialNumber(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-semibold text-slate-200 bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ประเภทสารดับเพลิง</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as ExtinguisherType)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                    >
                      <option value="Dry Chemical">Dry Chemical (เคมีแห้ง)</option>
                      <option value="CO2">CO2 (คาร์บอนไดออกไซด์)</option>
                      <option value="Foam">Foam (โฟม)</option>
                      <option value="Clean Agent">Clean Agent (สารสะอาด)</option>
                      <option value="Water">Water (น้ำสะสมแรงดัน)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ขนาดถัง (Size)</label>
                    <input
                      type="text"
                      placeholder="เช่น 10 lbs หรือ 15 lbs"
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">อาคาร *</label>
                    <input
                      type="text"
                      placeholder="เช่น อาคารหมอบริกส์"
                      required
                      value={formBuilding}
                      onChange={(e) => setFormBuilding(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ชั้น *</label>
                    <input
                      type="text"
                      placeholder="เช่น ชั้น 1 หรือ ชั้น GF"
                      required
                      value={formFloor}
                      onChange={(e) => setFormFloor(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">จุดติดตั้งอย่างละเอียด *</label>
                  <input
                    type="text"
                    placeholder="เช่น หน้าห้องคลังยา"
                    required
                    value={formLocationDetails}
                    onChange={(e) => setFormLocationDetails(e.target.value)}
                    className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                  />
                </div>

                {/* GPS Section */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Map size={13} className="text-red-500" />
                      พิกัด GPS ติดตั้ง
                    </span>
                    <button
                      type="button"
                      onClick={handleGetCurrentGps}
                      disabled={gpsLoading}
                      className="text-[10px] font-extrabold px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {gpsLoading ? 'กำลังดึงพิกัด...' : 'ดึงพิกัดปัจจุบัน'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ละติจูด (Latitude)</label>
                      <input
                        type="text"
                        placeholder="เช่น 19.9075"
                        value={formLat}
                        onChange={(e) => setFormLat(e.target.value)}
                        className="w-full p-1.5 border border-slate-800 rounded text-xs text-slate-200 bg-slate-950 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ลองจิจูด (Longitude)</label>
                      <input
                        type="text"
                        placeholder="เช่น 99.8294"
                        value={formLng}
                        onChange={(e) => setFormLng(e.target.value)}
                        className="w-full p-1.5 border border-slate-800 rounded text-xs text-slate-200 bg-slate-950 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">วันที่ติดตั้ง</label>
                    <input
                      type="date"
                      value={formInstallationDate}
                      onChange={(e) => setFormInstallationDate(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">วันหมดอายุ (แนะนำ 5 ปี)</label>
                    <input
                      type="date"
                      value={formExpiryDate}
                      onChange={(e) => setFormExpiryDate(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ลิ้งก์รูปภาพตัวถัง (ตัวเลือก)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formPhotoUrl}
                      onChange={(e) => setFormPhotoUrl(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">สถานะเริ่มต้น</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ExtinguisherStatus)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                    >
                      <option value="ปกติ">ปกติ</option>
                      <option value="ชำรุด">ชำรุด</option>
                      <option value="แรงดันต่ำ">แรงดันต่ำ</option>
                      <option value="ใกล้หมดอายุ">ใกล้หมดอายุ</option>
                      <option value="หมดอายุ">หมดอายุ</option>
                      <option value="ส่งซ่อม">ส่งซ่อม</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="py-1.5 px-3 border border-slate-800 bg-slate-950 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-1.5 px-4 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-red-600/15"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'ลงทะเบียนสำเร็จ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Extinguisher Dialog Backdrop */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-900 rounded-2xl max-w-md w-full border border-slate-800 overflow-hidden shadow-2xl my-8 text-slate-200"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-white text-sm">แก้ไขข้อมูลถังดับเพลิง: <span className="font-mono text-red-500">{formId}</span></h4>
                <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-2.5 bg-rose-950/50 text-rose-200 border border-rose-900/40 rounded-lg text-xs flex items-center gap-1.5 animate-shake">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ประเภทสารดับเพลิง</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as ExtinguisherType)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                    >
                      <option value="Dry Chemical">Dry Chemical (เคมีแห้ง)</option>
                      <option value="CO2">CO2 (คาร์บอนไดออกไซด์)</option>
                      <option value="Foam">Foam (โฟม)</option>
                      <option value="Clean Agent">Clean Agent (สารสะอาด)</option>
                      <option value="Water">Water (น้ำสะสมแรงดัน)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ขนาดถัง (Size)</label>
                    <input
                      type="text"
                      placeholder="เช่น 10 lbs หรือ 15 lbs"
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Serial Number</label>
                    <input
                      type="text"
                      placeholder="Serial Number"
                      value={formSerialNumber}
                      onChange={(e) => setFormSerialNumber(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-semibold text-slate-200 bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">สถานะ</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ExtinguisherStatus)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                    >
                      <option value="ปกติ">ปกติ</option>
                      <option value="ชำรุด">ชำรุด</option>
                      <option value="แรงดันต่ำ">แรงดันต่ำ</option>
                      <option value="ใกล้หมดอายุ">ใกล้หมดอายุ</option>
                      <option value="หมดอายุ">หมดอายุ</option>
                      <option value="ส่งซ่อม">ส่งซ่อม</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">อาคาร *</label>
                    <input
                      type="text"
                      placeholder="อาคาร"
                      required
                      value={formBuilding}
                      onChange={(e) => setFormBuilding(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ชั้น *</label>
                    <input
                      type="text"
                      placeholder="ชั้น"
                      required
                      value={formFloor}
                      onChange={(e) => setFormFloor(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">จุดติดตั้งอย่างละเอียด *</label>
                  <input
                    type="text"
                    placeholder="จุดติดตั้งอย่างละเอียด"
                    required
                    value={formLocationDetails}
                    onChange={(e) => setFormLocationDetails(e.target.value)}
                    className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                  />
                </div>

                {/* GPS Section */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Map size={13} className="text-red-500" />
                      พิกัด GPS ติดตั้ง
                    </span>
                    <button
                      type="button"
                      onClick={handleGetCurrentGps}
                      disabled={gpsLoading}
                      className="text-[10px] font-extrabold px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {gpsLoading ? 'กำลังดึงพิกัด...' : 'ดึงพิกัดปัจจุบัน'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ละติจูด (Latitude)</label>
                      <input
                        type="text"
                        placeholder="เช่น 19.9075"
                        value={formLat}
                        onChange={(e) => setFormLat(e.target.value)}
                        className="w-full p-1.5 border border-slate-800 rounded text-xs text-slate-200 bg-slate-950 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ลองจิจูด (Longitude)</label>
                      <input
                        type="text"
                        placeholder="เช่น 99.8294"
                        value={formLng}
                        onChange={(e) => setFormLng(e.target.value)}
                        className="w-full p-1.5 border border-slate-800 rounded text-xs text-slate-200 bg-slate-950 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">วันที่ติดตั้ง</label>
                    <input
                      type="date"
                      value={formInstallationDate}
                      onChange={(e) => setFormInstallationDate(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">วันหมดอายุ</label>
                    <input
                      type="date"
                      value={formExpiryDate}
                      onChange={(e) => setFormExpiryDate(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ลิ้งก์รูปภาพตัวถัง (ตัวเลือก)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="py-1.5 px-3 border border-slate-800 bg-slate-950 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-1.5 px-4 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-red-600/15"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
