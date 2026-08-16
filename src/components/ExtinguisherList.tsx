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
  FileText,
  Compass,
  Map,
  Badge,
  Download,
  CheckCircle2,
  Clock,
  QrCode,
  Building2,
  Wrench,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FireExtinguisher, ExtinguisherType, ExtinguisherStatus, AssetType } from '../types';
import PhotoUploader from './PhotoUploader';
import { exportExtinguishersToExcel, exportExtinguishersToPDF } from '../lib/exportUtils';
import { isInspectedInCurrentMonth } from '../lib/dbHelpers';
import { HOSPITAL_BUILDINGS, buildingSupportsFireDoor, getBuildingEquipmentStats } from '../lib/assetHelpers';
import QRCodeModal from './QRCodeModal';

interface ExtinguisherListProps {
  extinguishers: FireExtinguisher[];
  selectedId: string | null;
  selectedStatusFilter: string | null;
  selectedAssetCategory?: string;
  selectedBuilding?: string;
  onSelectAssetCategory?: (category: string) => void;
  onSelectBuilding?: (building: string) => void;
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
  selectedAssetCategory: selectedAssetCategoryProp,
  selectedBuilding: selectedBuildingProp,
  onSelectAssetCategory,
  onSelectBuilding,
  onSelectExtinguisher,
  onInspect,
  onAddExtinguisher,
  onEditExtinguisher,
  onDeleteExtinguisher,
  isAdmin = false
}: ExtinguisherListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [internalCategory, setInternalCategory] = useState<string>('All');
  const [internalBuilding, setInternalBuilding] = useState<string>('All');
  
  const selectedAssetCategory = selectedAssetCategoryProp !== undefined ? selectedAssetCategoryProp : internalCategory;
  const selectedBuilding = selectedBuildingProp !== undefined ? selectedBuildingProp : internalBuilding;

  const handleSelectAssetCategory = (cat: string) => {
    setInternalCategory(cat);
    if (onSelectAssetCategory) {
      onSelectAssetCategory(cat);
    }
  };

  const handleSelectBuilding = (b: string) => {
    setInternalBuilding(b);
    if (onSelectBuilding) {
      onSelectBuilding(b);
    }
  };

  const [isBuildingStatsOpen, setIsBuildingStatsOpen] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alreadyInspectedExt, setAlreadyInspectedExt] = useState<FireExtinguisher | null>(null);
  const [qrModalExtId, setQrModalExtId] = useState<string | null>(null);
  const [isBatchQrOpen, setIsBatchQrOpen] = useState(false);
  
  // Form fields for Add/Edit
  const [formId, setFormId] = useState('');
  const [formAssetType, setFormAssetType] = useState<AssetType>('ถังดับเพลิง');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
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
  const [formDetails, setFormDetails] = useState('');
  const [formStatus, setFormStatus] = useState<ExtinguisherStatus>('ปกติ');

  const handleAssetTypeChange = (newType: AssetType) => {
    setFormAssetType(newType);
    if (newType === 'ตู้ดับเพลิง') {
      setFormType('ตู้วงล้อสายดับเพลิง Fire Hose Reel Cabinet (แบบฝัง)');
      setFormSize('1 นิ้ว x 100 ฟุต (แบบฝังผนัง)');
    } else if (newType === 'ประตูกันไฟ') {
      setFormType('ประตูกันไฟเหล็ก');
      setFormSize('มาตรฐาน 1.0 x 2.1 เมตร (ทนไฟ 2 ชม.)');
    } else if (newType === 'ตู้แจ้งเหตุเพลิงไหม้') {
      setFormType('ตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)');
      setFormSize('-');
      if (!formBrand) setFormBrand('Notifier');
      if (!formModel) setFormModel('NFS-320');
    } else if (newType === 'ไฟฉุกเฉิน') {
      setFormType('โคมไฟฉุกเฉิน LED อัตโนมัติ (Emergency Light)');
      setFormSize('-');
      if (!formBrand) setFormBrand('Max Bright');
      if (!formModel) setFormModel('CU2-12-3W');
    } else if (newType === 'ป้ายบอกทางหนีไฟ') {
      setFormType('ป้ายไฟทางออกฉุกเฉิน LED (Exit Sign Box)');
      setFormSize('-');
      if (!formBrand) setFormBrand('Max Bright');
      if (!formModel) setFormModel('EX-LED-2S');
    } else {
      setFormType('Dry Chemical');
      setFormSize('15 lbs');
    }
  };
  
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
        console.warn("GPS Notice:", error.message || "Position unavailable");
        alert("ไม่สามารถดึงพิกัดอัตโนมัติได้ (สามารถพิมพ์พิกัดละติจูด/ลองจิจูดได้โดยตรงในช่อง)");
        setGpsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };

  // Handle Add Form Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formId.trim()) {
      setFormError('กรุณากรอกรหัสอุปกรณ์');
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
        assetType: formAssetType,
        qrCode: formId.trim().toUpperCase(),
        serialNumber: '-',
        brand: (formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' || formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ') ? (formBrand.trim() || '-') : (formBrand.trim() || null),
        model: (formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' || formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ') ? (formModel.trim() || '-') : (formModel.trim() || null),
        type: formType,
        size: (formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' || formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ') ? '-' : (formSize.trim() || '-'),
        building: formBuilding.trim(),
        floor: formFloor.trim(),
        locationDetails: formLocationDetails.trim(),
        details: formDetails.trim() || null,
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
      setFormBrand('');
      setFormModel('');
      setFormLocationDetails('');
      setFormDetails('');
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
    const cat = ext.assetType || (
      ext.id.startsWith('EM-') || ext.id.startsWith('EL-') || ext.type?.includes('ไฟฉุกเฉิน') || ext.type?.includes('Emergency Light')
        ? 'ไฟฉุกเฉิน'
        : ext.id.startsWith('EX-') || ext.id.startsWith('EXIT-') || ext.id.startsWith('ES-') || ext.type?.includes('ป้ายบอกทางหนีไฟ') || ext.type?.includes('Exit Sign')
        ? 'ป้ายบอกทางหนีไฟ'
        : ext.id.startsWith('FCP-') || ext.id.startsWith('FA-') || ext.type.includes('แจ้งเหตุ') || ext.type.includes('FCP')
        ? 'ตู้แจ้งเหตุเพลิงไหม้'
        : ext.id.startsWith('FHC-') || ext.type.includes('ตู้')
        ? 'ตู้ดับเพลิง'
        : ext.id.startsWith('FD-') || ext.type.includes('ประตู')
        ? 'ประตูกันไฟ'
        : 'ถังดับเพลิง'
    );
    setFormAssetType(cat);
    setFormSerialNumber(ext.serialNumber || '-');
    setFormBrand(ext.brand || '');
    setFormModel(ext.model || '');
    setFormType(ext.type);
    setFormSize(ext.size);
    setFormBuilding(ext.building);
    setFormFloor(ext.floor);
    setFormLocationDetails(ext.locationDetails);
    setFormDetails(ext.details || ext.notes || '');
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
        assetType: formAssetType,
        serialNumber: original.serialNumber || '-',
        brand: (formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' || formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ') ? (formBrand.trim() || '-') : (formBrand.trim() || null),
        model: (formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' || formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ') ? (formModel.trim() || '-') : (formModel.trim() || null),
        type: formType,
        size: (formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' || formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ') ? '-' : (formSize.trim() || '-'),
        building: formBuilding.trim(),
        floor: formFloor.trim(),
        locationDetails: formLocationDetails.trim(),
        details: formDetails.trim() || null,
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

  // Helper to determine asset category
  const getAssetCategory = (ext: FireExtinguisher): AssetType => {
    if (ext.assetType) return ext.assetType;
    if (ext.id.startsWith('EM-') || ext.id.startsWith('EL-') || ext.type?.includes('ไฟฉุกเฉิน') || ext.type?.includes('Emergency Light')) return 'ไฟฉุกเฉิน';
    if (ext.id.startsWith('EX-') || ext.id.startsWith('EXIT-') || ext.id.startsWith('ES-') || ext.type?.includes('ป้ายบอกทางหนีไฟ') || ext.type?.includes('Exit Sign')) return 'ป้ายบอกทางหนีไฟ';
    if (ext.id.startsWith('FCP-') || ext.id.startsWith('FA-') || ext.type.includes('แจ้งเหตุ') || ext.type.includes('FCP')) return 'ตู้แจ้งเหตุเพลิงไหม้';
    if (ext.id.startsWith('FHC-') || ext.type.includes('ตู้')) return 'ตู้ดับเพลิง';
    if (ext.id.startsWith('FD-') || ext.type.includes('ประตู')) return 'ประตูกันไฟ';
    return 'ถังดับเพลิง';
  };

  // Filters logic
  const filteredExtinguishers = extinguishers.filter((ext) => {
    const fullLocText = `${ext.building} ${ext.floor} ${ext.locationDetails}`.toLowerCase();
    const matchesSearch = 
      ext.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullLocText.includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'All' || ext.type === selectedType;

    const matchesCategory = selectedAssetCategory === 'All' || getAssetCategory(ext) === selectedAssetCategory;

    const matchesBuilding = !selectedBuilding || selectedBuilding === 'All' || (ext.building || '').trim() === selectedBuilding.trim();

    let matchesStatus = true;
    if (selectedStatusFilter) {
      if (selectedStatusFilter === 'ใกล้หมดอายุ') {
        matchesStatus = ext.status === 'ใกล้หมดอายุ' || ext.status === 'หมดอายุ';
      } else {
        matchesStatus = ext.status === selectedStatusFilter;
      }
    }

    return matchesSearch && matchesType && matchesCategory && matchesBuilding && matchesStatus;
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
            <span>
              {selectedAssetCategory === 'ถังดับเพลิง'
                ? 'รายการถังดับเพลิง'
                : selectedAssetCategory === 'ตู้ดับเพลิง'
                ? 'รายการตู้ดับเพลิง'
                : selectedAssetCategory === 'ประตูกันไฟ'
                ? 'รายการประตูกันไฟอัตโนมัติ'
                : selectedAssetCategory === 'ตู้แจ้งเหตุเพลิงไหม้'
                ? 'รายการตู้แจ้งเหตุเพลิงไหม้ (FCP)'
                : selectedAssetCategory === 'ไฟฉุกเฉิน'
                ? 'รายการโคมไฟฉุกเฉิน (Emergency Light)'
                : selectedAssetCategory === 'ป้ายบอกทางหนีไฟ'
                ? 'รายการป้ายบอกทางหนีไฟ (Exit Sign)'
                : 'รายการอุปกรณ์ทั้งหมด'}
              {selectedBuilding && selectedBuilding !== 'All' ? ` • ${selectedBuilding}` : ''} ({filteredExtinguishers.length})
            </span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportExtinguishersToExcel(filteredExtinguishers)}
              title="ส่งออกรายการอุปกรณ์เป็นไฟล์ Excel (.xlsx)"
              className="py-1.5 px-3 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet size={13} className="text-emerald-400" />
              <span>ส่งออก Excel</span>
            </button>
            <button
              onClick={() => exportExtinguishersToPDF(filteredExtinguishers)}
              title="ส่งออกรายการอุปกรณ์เป็นไฟล์ PDF (.pdf)"
              className="py-1.5 px-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 hover:bg-rose-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileText size={13} className="text-rose-400" />
              <span>ส่งออก PDF</span>
            </button>
            <button
              onClick={() => {
                setQrModalExtId(null);
                setIsBatchQrOpen(true);
              }}
              title="สร้างป้าย QR Code สติ๊กเกอร์ติดอุปกรณ์ทั้งหมด"
              className="py-1.5 px-3 bg-amber-950/80 border border-amber-800/80 text-amber-300 hover:bg-amber-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <QrCode size={13} className="text-amber-400" />
              <span>พิมพ์ป้าย QR Code</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setFormId('');
                  const cat = selectedAssetCategory === 'All' ? 'ถังดับเพลิง' : (selectedAssetCategory as AssetType);
                  setFormAssetType(cat);
                  setFormSerialNumber('');
                  setFormBrand(cat === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'Notifier' : (cat === 'ไฟฉุกเฉิน' || cat === 'ป้ายบอกทางหนีไฟ') ? 'Max Bright' : '');
                  setFormModel(cat === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'NFS-320' : cat === 'ไฟฉุกเฉิน' ? 'CU2-12-3W' : cat === 'ป้ายบอกทางหนีไฟ' ? 'EX-LED-2S' : '');
                  setFormLocationDetails('');
                  setFormDetails('');
                  setFormType(
                    cat === 'ตู้ดับเพลิง' 
                      ? 'ตู้วงล้อสายดับเพลิง Fire Hose Reel Cabinet (แบบฝัง)' 
                      : cat === 'ประตูกันไฟ' 
                      ? 'ประตูกันไฟเหล็ก' 
                      : cat === 'ตู้แจ้งเหตุเพลิงไหม้'
                      ? 'ตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)'
                      : cat === 'ไฟฉุกเฉิน'
                      ? 'โคมไฟฉุกเฉิน LED อัตโนมัติ (Emergency Light)'
                      : cat === 'ป้ายบอกทางหนีไฟ'
                      ? 'ป้ายไฟทางออกฉุกเฉิน LED (Exit Sign Box)'
                      : 'Dry Chemical'
                  );
                  setFormSize(
                    cat === 'ตู้ดับเพลิง' 
                      ? '1 นิ้ว x 100 ฟุต (แบบฝังผนัง)' 
                      : cat === 'ประตูกันไฟ' 
                      ? 'มาตรฐาน 1.0 x 2.1 เมตร' 
                      : (cat === 'ตู้แจ้งเหตุเพลิงไหม้' || cat === 'ไฟฉุกเฉิน' || cat === 'ป้ายบอกทางหนีไฟ')
                      ? '-'
                      : '15 lbs'
                  );
                  setFormBuilding(selectedBuilding && selectedBuilding !== 'All' ? selectedBuilding : 'อาคารหมอบริกส์');
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
                <span>เพิ่มอุปกรณ์</span>
              </button>
            )}
          </div>
        </div>

        {/* Asset Category Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: 'ถังดับเพลิง', label: '🧯 ถังดับเพลิง', count: extinguishers.filter(e => getAssetCategory(e) === 'ถังดับเพลิง' && (selectedBuilding === 'All' || !selectedBuilding || e.building === selectedBuilding)).length },
            { id: 'ตู้ดับเพลิง', label: '🗄️ ตู้ดับเพลิง', count: extinguishers.filter(e => getAssetCategory(e) === 'ตู้ดับเพลิง' && (selectedBuilding === 'All' || !selectedBuilding || e.building === selectedBuilding)).length },
            // แสดงแท็บประตูกันไฟเฉพาะเมื่อเลือกดูทุกอาคาร หรือเลือกอาคารหมอกัมพล/หมอบริกส์
            ...((!selectedBuilding || selectedBuilding === 'All' || buildingSupportsFireDoor(selectedBuilding)) ? [{
              id: 'ประตูกันไฟ',
              label: '🚪 ประตูกันไฟ',
              count: extinguishers.filter(e => getAssetCategory(e) === 'ประตูกันไฟ' && (selectedBuilding === 'All' || !selectedBuilding || e.building === selectedBuilding)).length
            }] : []),
            { id: 'ตู้แจ้งเหตุเพลิงไหม้', label: '🚨 ตู้แจ้งเหตุเพลิงไหม้ (FCP)', count: extinguishers.filter(e => getAssetCategory(e) === 'ตู้แจ้งเหตุเพลิงไหม้' && (selectedBuilding === 'All' || !selectedBuilding || e.building === selectedBuilding)).length },
            { id: 'ไฟฉุกเฉิน', label: '💡 ไฟฉุกเฉิน', count: extinguishers.filter(e => getAssetCategory(e) === 'ไฟฉุกเฉิน' && (selectedBuilding === 'All' || !selectedBuilding || e.building === selectedBuilding)).length },
            { id: 'ป้ายบอกทางหนีไฟ', label: '🏃 ป้ายบอกทางหนีไฟ', count: extinguishers.filter(e => getAssetCategory(e) === 'ป้ายบอกทางหนีไฟ' && (selectedBuilding === 'All' || !selectedBuilding || e.building === selectedBuilding)).length },
            { id: 'All', label: 'รวมทั้งหมด', count: extinguishers.filter(e => selectedBuilding === 'All' || !selectedBuilding || e.building === selectedBuilding).length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleSelectAssetCategory(tab.id)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedAssetCategory === tab.id
                  ? 'bg-red-600 text-white shadow-xs font-extrabold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          {/* Search box */}
          <div className="relative sm:col-span-6">
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

          {/* Building filter */}
          <div className="relative sm:col-span-3">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-blue-400">
              <Building2 size={12} />
            </div>
            <select
              value={selectedBuilding}
              onChange={(e) => handleSelectBuilding(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-slate-200 bg-slate-900 appearance-none cursor-pointer font-medium"
            >
              <option value="All">ทุกอาคารรวม</option>
              {HOSPITAL_BUILDINGS.map(b => (
                <option key={b.id} value={b.name}>{b.icon} {b.name}</option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div className="relative sm:col-span-3">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
              <Filter size={12} />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none text-slate-200 bg-slate-900 appearance-none cursor-pointer font-medium"
            >
              <option value="All">ทุกประเภทอุปกรณ์</option>
              <option value="Dry Chemical">Dry Chemical (เคมีแห้ง)</option>
              <option value="CO2">CO2 (คาร์บอนไดออกไซด์)</option>
              <option value="Foam">Foam (โฟม)</option>
              <option value="Clean Agent">Clean Agent (สารสะอาด)</option>
              <option value="Water">Water (น้ำสะสมแรงดัน)</option>
            </select>
          </div>
        </div>

        {/* Selected filter active indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedBuilding && selectedBuilding !== 'All' && (
            <div className="flex items-center gap-1.5 bg-blue-950/50 border border-blue-800/60 rounded-lg py-1 px-2.5 text-[11px] text-blue-300">
              <Building2 size={12} className="text-blue-400" />
              <span>อาคาร: <strong className="text-white font-bold">{selectedBuilding}</strong></span>
              <button
                onClick={() => handleSelectBuilding('All')}
                className="ml-1 text-blue-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="ล้างตัวกรองอาคาร"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {selectedStatusFilter && (
            <div className="flex items-center gap-1.5 bg-red-950/50 border border-red-900/60 rounded-lg py-1 px-2.5 text-[11px] text-red-300">
              <span>สถานะ: <strong className="text-red-400 font-bold">{selectedStatusFilter}</strong></span>
              <button
                onClick={() => onSelectExtinguisher('')}
                className="ml-1 text-red-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="ล้างตัวกรองสถานะ"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Scrollable Workspace (Summary + Equipment Items) */}
      <div id="ext-list-container" className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {/* Building Summary & Breakdown Panel (when a specific building is selected) */}
        {selectedBuilding && selectedBuilding !== 'All' && (() => {
          const bldgInfo = HOSPITAL_BUILDINGS.find(b => b.name === selectedBuilding);
          const buildingStats = getBuildingEquipmentStats(extinguishers, selectedBuilding);

          return (
            <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 space-y-3.5">
              {/* Building Title & Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/80 flex items-center justify-center text-xl shadow-inner shrink-0">
                    {bldgInfo?.icon || '🏢'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-sm md:text-base">{selectedBuilding}</h4>
                      <span className="bg-blue-900/60 text-blue-300 text-[11px] px-2 py-0.5 rounded-full font-bold border border-blue-800/50">
                        รวม {buildingStats.total} รายการ
                      </span>
                    </div>
                    {bldgInfo?.desc && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{bldgInfo.desc}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsBuildingStatsOpen(!isBuildingStatsOpen)}
                    className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer flex items-center gap-1 font-medium"
                    title={isBuildingStatsOpen ? 'ย่อสรุปสถิติ' : 'ขยายสรุปสถิติ'}
                  >
                    <span>{isBuildingStatsOpen ? 'ย่อสรุป' : 'ดูสถิติ'}</span>
                    {isBuildingStatsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <button
                    onClick={() => handleSelectBuilding('All')}
                    className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                    title="กลับไปดูรายการรวมทุกอาคาร"
                  >
                    <span>ดูทุกอาคาร</span>
                    <X size={12} />
                  </button>
                </div>
              </div>

              {isBuildingStatsOpen && (
                <div className="space-y-3 pt-0.5">
                  {/* Building 5-Stat KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Layers size={11} className="text-slate-400" /> จำนวนทั้งหมด
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-extrabold text-white">{buildingStats.total}</span>
                        <span className="text-[10px] text-slate-400">รายการ</span>
                      </div>
                    </div>

                    <div className="bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/50 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 size={11} /> ตรวจเช็คแล้ว
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-extrabold text-emerald-400">{buildingStats.inspected}</span>
                        <span className="text-[10px] text-emerald-400/70 font-semibold">
                          ({buildingStats.total > 0 ? Math.round((buildingStats.inspected / buildingStats.total) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    <div className="bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/50 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                        <Clock size={11} /> คงค้างตรวจ
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-extrabold text-amber-400">{buildingStats.pending}</span>
                        <span className="text-[10px] text-amber-400/70">รายการ</span>
                      </div>
                    </div>

                    <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-800/50 flex flex-col justify-between shadow-xs">
                      <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                        <AlertTriangle size={11} /> ชำรุด/ผิดปกติ
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-extrabold text-rose-400">{buildingStats.damaged}</span>
                        <span className="text-[10px] text-rose-400/70">รายการ</span>
                      </div>
                    </div>

                    <div className="bg-purple-950/30 p-2.5 rounded-xl border border-purple-800/50 flex flex-col justify-between shadow-xs col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-purple-400 font-medium flex items-center gap-1">
                        <Wrench size={11} /> ส่งซ่อม
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-extrabold text-purple-400">{buildingStats.repair}</span>
                        <span className="text-[10px] text-purple-400/70">รายการ</span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown per Asset Type Table / Cards */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                        <span>📊 รายละเอียดแยกตามประเภทอุปกรณ์ ({selectedBuilding})</span>
                      </span>
                      <span className="text-[9px] text-slate-400">คลิกที่การ์ดเพื่อกรองรายการด้านล่าง</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {buildingStats.categories.map((cat) => {
                        const isCatSelected = selectedAssetCategory === cat.category;

                        return (
                          <div
                            key={cat.category}
                            onClick={() => handleSelectAssetCategory(isCatSelected ? 'All' : cat.category)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isCatSelected
                                ? 'bg-red-950/70 border-red-500 text-white ring-1 ring-red-500/50 shadow-md'
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{cat.icon}</span>
                                <div>
                                  <h5 className="font-bold text-xs text-white flex items-center gap-1">
                                    <span>{cat.name}</span>
                                    {isCatSelected && (
                                      <span className="text-[8px] bg-red-600 text-white px-1 py-0.2 rounded font-bold">เลือก</span>
                                    )}
                                  </h5>
                                  <span className="text-[9px] text-slate-400">รอบตรวจ: {cat.cycle}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-extrabold font-mono text-white">{cat.total}</span>
                                <span className="text-[9px] text-slate-400 block">ชิ้น</span>
                              </div>
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-slate-800/80 grid grid-cols-4 gap-1 text-[10px] text-center">
                              <div className="bg-slate-900/90 rounded py-0.5 px-0.5 border border-slate-800/60">
                                <span className="text-[8px] text-emerald-400 block font-semibold">ตรวจแล้ว</span>
                                <span className="font-bold font-mono text-emerald-400">{cat.inspected}</span>
                              </div>
                              <div className="bg-slate-900/90 rounded py-0.5 px-0.5 border border-slate-800/60">
                                <span className="text-[8px] text-amber-400 block font-semibold">คงค้าง</span>
                                <span className="font-bold font-mono text-amber-400">{cat.pending}</span>
                              </div>
                              <div className="bg-slate-900/90 rounded py-0.5 px-0.5 border border-slate-800/60">
                                <span className="text-[8px] text-rose-400 block font-semibold">ชำรุด</span>
                                <span className="font-bold font-mono text-rose-400">{cat.damaged}</span>
                              </div>
                              <div className="bg-slate-900/90 rounded py-0.5 px-0.5 border border-slate-800/60">
                                <span className="text-[8px] text-purple-400 block font-semibold">ส่งซ่อม</span>
                                <span className="font-bold font-mono text-purple-400">{cat.repair}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Section Sticky Header for Equipment Items */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Clipboard size={14} className="text-red-500" />
            <span>รายการอุปกรณ์{selectedBuilding && selectedBuilding !== 'All' ? ` (${selectedBuilding})` : ''}</span>
          </span>
          <span className="text-[11px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
            {filteredExtinguishers.length} รายการ
          </span>
        </div>

        {filteredExtinguishers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p className="text-sm font-bold text-slate-500">ไม่พบรายการอุปกรณ์ตามเงื่อนไขที่ค้นหา</p>
            <p className="text-xs mt-1.5 text-slate-500">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มอุปกรณ์" ด้านบนเพื่อลงทะเบียนใหม่</p>
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
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold border border-slate-700">
                        {getAssetCategory(ext) === 'ตู้แจ้งเหตุเพลิงไหม้'
                          ? '🚨 ตู้แจ้งเหตุเพลิงไหม้ (FCP)'
                          : getAssetCategory(ext) === 'ตู้ดับเพลิง'
                          ? '🗄️ ตู้ดับเพลิง'
                          : getAssetCategory(ext) === 'ประตูกันไฟ'
                          ? '🚪 ประตูกันไฟ'
                          : getAssetCategory(ext) === 'ไฟฉุกเฉิน'
                          ? '💡 ไฟฉุกเฉิน'
                          : getAssetCategory(ext) === 'ป้ายบอกทางหนีไฟ'
                          ? '🏃 ป้ายบอกทางหนีไฟ'
                          : `🧯 ${ext.type}`}
                      </span>
                      {(getAssetCategory(ext) === 'ตู้แจ้งเหตุเพลิงไหม้' || getAssetCategory(ext) === 'ไฟฉุกเฉิน' || getAssetCategory(ext) === 'ป้ายบอกทางหนีไฟ') && (ext.brand || ext.model) && (
                        <span className="text-[10px] text-amber-300 font-semibold bg-amber-950/50 border border-amber-800/50 px-1.5 py-0.5 rounded">
                          {ext.brand ? `ยี่ห้อ: ${ext.brand}` : ''} {ext.model ? `รุ่น: ${ext.model}` : ''}
                        </span>
                      )}
                      {getAssetCategory(ext) === 'ถังดับเพลิง' && ext.serialNumber && ext.serialNumber !== '-' && (
                        <span className="text-[10px] text-slate-400 font-mono">S/N: {ext.serialNumber}</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${statusColors[ext.status]}`}>
                        {ext.status}
                      </span>
                      {isInspectedInCurrentMonth(ext.lastInspectedAt, getAssetCategory(ext)) ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold border border-emerald-900/60 bg-emerald-950/60 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={11} /> {getAssetCategory(ext) === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'ตรวจแล้ววันนี้' : 'ตรวจแล้วเดือนนี้'}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold border border-amber-900/60 bg-amber-950/60 text-amber-400 flex items-center gap-1">
                          <Clock size={11} /> {getAssetCategory(ext) === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'รอตรวจประจำวัน' : 'รอตรวจประจำเดือน'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <MapPin size={13} className="text-slate-500 shrink-0" />
                      <span className="truncate font-semibold text-slate-200">
                        {ext.building ? `${ext.building} • ` : ''}{ext.floor} {ext.locationDetails ? `(${ext.locationDetails})` : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-medium">
                      <span><strong>ประเภท:</strong> {ext.type} {getAssetCategory(ext) !== 'ตู้แจ้งเหตุเพลิงไหม้' && ext.size && ext.size !== '-' ? `(${ext.size})` : ''}</span>
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

                    {(ext.details || ext.notes) && (
                      <div className="mt-1.5 text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-850 flex items-start gap-1.5">
                        <FileText size={12} className="text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed"><strong className="text-amber-300">รายละเอียด:</strong> {ext.details || ext.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      title={
                        isInspectedInCurrentMonth(ext.lastInspectedAt, getAssetCategory(ext))
                          ? (getAssetCategory(ext) === 'ตู้แจ้งเหตุเพลิงไหม้' ? "ตู้ FCP นี้ได้รับการตรวจเช็คประจำวันนี้แล้ว" : "อุปกรณ์นี้ได้รับการตรวจเช็คประจำเดือนนี้แล้ว")
                          : (getAssetCategory(ext) === 'ตู้แจ้งเหตุเพลิงไหม้' ? "เริ่มการตรวจเช็คตู้ FCP ประจำวัน" : "เริ่มการตรวจสอบสภาพอุปกรณ์")
                      }
                      onClick={() => {
                        if (isInspectedInCurrentMonth(ext.lastInspectedAt, getAssetCategory(ext))) {
                          setAlreadyInspectedExt(ext);
                        } else {
                          onInspect(ext);
                        }
                      }}
                      className={`p-1.5 rounded transition-all duration-150 cursor-pointer shadow-sm border ${
                        isInspectedInCurrentMonth(ext.lastInspectedAt, getAssetCategory(ext))
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/60'
                          : 'bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-600 hover:text-white'
                      }`}
                    >
                      <Clipboard size={14} />
                    </button>
                    <button
                      title="พิมพ์ป้าย / ดู QR Code ของถังนี้"
                      onClick={() => {
                        setQrModalExtId(ext.id);
                        setIsBatchQrOpen(false);
                      }}
                      className="p-1.5 rounded bg-slate-800 text-amber-400 border border-slate-700 hover:bg-amber-950 hover:border-amber-800 transition-colors cursor-pointer"
                    >
                      <QrCode size={14} />
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
                          onClick={() => setDeleteTargetId(ext.id)}
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-900 rounded-2xl max-w-md w-full border border-slate-800 shadow-2xl text-slate-200 max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                <h4 className="font-bold text-white text-sm">
                  {formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                    ? 'ลงทะเบียนตู้แจ้งเหตุเพลิงไหม้ (FCP) ใหม่'
                    : formAssetType === 'ตู้ดับเพลิง'
                    ? 'ลงทะเบียนตู้ดับเพลิงใหม่'
                    : formAssetType === 'ประตูกันไฟ'
                    ? 'ลงทะเบียนประตูกันไฟใหม่'
                    : formAssetType === 'ไฟฉุกเฉิน'
                    ? 'ลงทะเบียนไฟฉุกเฉิน (Emergency Light) ใหม่'
                    : formAssetType === 'ป้ายบอกทางหนีไฟ'
                    ? 'ลงทะเบียนป้ายบอกทางหนีไฟ (Exit Sign) ใหม่'
                    : 'ลงทะเบียนถังดับเพลิงใหม่'}
                </h4>
                <button onClick={() => setIsAddOpen(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                  {formError && (
                    <div className="p-2.5 bg-rose-950/50 text-rose-200 border border-rose-900/40 rounded-lg text-xs flex items-center gap-1.5 animate-shake">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ประเภทอุปกรณ์ *</label>
                    <select
                      value={formAssetType}
                      onChange={(e) => {
                        const newType = e.target.value as AssetType;
                        handleAssetTypeChange(newType);
                        if (newType === 'ประตูกันไฟ' && !buildingSupportsFireDoor(formBuilding)) {
                          setFormBuilding('อาคารหมอกัมพล');
                        }
                      }}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-bold cursor-pointer"
                    >
                      <option value="ถังดับเพลิง">🧯 ถังดับเพลิง (Fire Extinguisher)</option>
                      <option value="ตู้ดับเพลิง">🗄️ ตู้ดับเพลิง (Fire Hose Cabinet)</option>
                      <option value="ประตูกันไฟ">🚪 ประตูกันไฟอัตโนมัติ (Fire Door - มีเฉพาะอาคารหมอกัมพล/หมอบริกส์)</option>
                      <option value="ตู้แจ้งเหตุเพลิงไหม้">🚨 ตู้แจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)</option>
                      <option value="ไฟฉุกเฉิน">💡 ไฟฉุกเฉิน (Emergency Light)</option>
                      <option value="ป้ายบอกทางหนีไฟ">🏃 ป้ายบอกทางหนีไฟ (Exit Sign)</option>
                    </select>
                  </div>

                  {formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' || formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                            ? '1. รหัสตู้แจ้งเหตุเพลิงไหม้ (FCP ID) *'
                            : formAssetType === 'ไฟฉุกเฉิน'
                            ? '1. หมายเลขเครื่อง / รหัสไฟฉุกเฉิน (ID) *'
                            : '1. หมายเลขเครื่อง / รหัสป้ายบอกทางหนีไฟ (ID) *'}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                              ? 'เช่น FCP-001 หรือ FA-001'
                              : formAssetType === 'ไฟฉุกเฉิน'
                              ? 'เช่น EM-001 หรือ EL-001'
                              : 'เช่น EX-001 หรือ EXIT-001'
                          }
                          required
                          value={formId}
                          onChange={(e) => setFormId(e.target.value)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs uppercase focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-semibold text-slate-200 bg-slate-950 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            2. ยี่ห้อ (Brand) *
                          </label>
                          <input
                            type="text"
                            placeholder={
                              formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                                ? 'เช่น Notifier, Edwards, Bosch'
                                : 'เช่น Max Bright, Sunny, Dyno, C.E.E.'
                            }
                            required
                            value={formBrand}
                            onChange={(e) => setFormBrand(e.target.value)}
                            className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            3. รุ่น (Model) *
                          </label>
                          <input
                            type="text"
                            placeholder={
                              formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                                ? 'เช่น NFS-320, EST3'
                                : formAssetType === 'ไฟฉุกเฉิน'
                                ? 'เช่น CU2-12-3W, MB09'
                                : 'เช่น EX-LED-2S, SL-01'
                            }
                            required
                            value={formModel}
                            onChange={(e) => setFormModel(e.target.value)}
                            className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {formAssetType === 'ถังดับเพลิง'
                          ? 'รหัสถังดับเพลิง (ID) *'
                          : formAssetType === 'ตู้ดับเพลิง'
                          ? 'รหัสตู้ดับเพลิง (ID) *'
                          : 'รหัสประตูกันไฟ (ID) *'}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          formAssetType === 'ถังดับเพลิง'
                            ? 'เช่น FE-006'
                            : formAssetType === 'ตู้ดับเพลิง'
                            ? 'เช่น FHC-001'
                            : 'เช่น FD-001'
                        }
                        required
                        value={formId}
                        onChange={(e) => setFormId(e.target.value)}
                        className="w-full p-2 border border-slate-800 rounded-lg text-xs uppercase focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-semibold text-slate-200 bg-slate-950 font-mono"
                      />
                    </div>
                  )}

                  {formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        4. ลักษณะระบบตู้ FCP *
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as ExtinguisherType)}
                        className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                      >
                        <option value="ตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)">
                          ตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)
                        </option>
                      </select>
                    </div>
                  ) : formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        4. ลักษณะอุปกรณ์ *
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as ExtinguisherType)}
                        className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                      >
                        {formAssetType === 'ไฟฉุกเฉิน' ? (
                          <option value="โคมไฟฉุกเฉิน LED อัตโนมัติ (Emergency Light)">
                            โคมไฟฉุกเฉิน LED อัตโนมัติ (Emergency Light)
                          </option>
                        ) : (
                          <option value="ป้ายไฟทางออกฉุกเฉิน LED (Exit Sign Box)">
                            ป้ายไฟทางออกฉุกเฉิน LED (Exit Sign Box)
                          </option>
                        )}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {formAssetType === 'ตู้ดับเพลิง'
                            ? 'ชนิดตู้ดับเพลิง'
                            : formAssetType === 'ประตูกันไฟ'
                            ? 'ประเภทประตู'
                            : 'ประเภทสารดับเพลิง'}
                        </label>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value as ExtinguisherType)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                        >
                          {formAssetType === 'ตู้ดับเพลิง' ? (
                            <option value="ตู้วงล้อสายดับเพลิง Fire Hose Reel Cabinet (แบบฝัง)">ตู้วงล้อสายดับเพลิง Fire Hose Reel Cabinet (แบบฝัง)</option>
                          ) : formAssetType === 'ประตูกันไฟ' ? (
                            <>
                              <option value="ประตูกันไฟเหล็ก">ประตูกันไฟเหล็ก</option>
                              <option value="ประตูกันไฟกระจก">ประตูกันไฟกระจก</option>
                            </>
                          ) : (
                            <>
                              <option value="Dry Chemical">Dry Chemical (เคมีแห้ง)</option>
                              <option value="CO2">CO2 (คาร์บอนไดออกไซด์)</option>
                              <option value="Foam">Foam (โฟม)</option>
                              <option value="Clean Agent">Clean Agent (สารสะอาด)</option>
                              <option value="Water">Water (น้ำสะสมแรงดัน)</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {formAssetType === 'ตู้ดับเพลิง'
                            ? 'ขนาดตู้ / สายฉีด'
                            : formAssetType === 'ประตูกันไฟ'
                            ? 'ขนาดประตู'
                            : 'ขนาดถัง (Size)'}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            formAssetType === 'ตู้ดับเพลิง'
                              ? 'เช่น 1 นิ้ว x 100 ฟุต (แบบฝังผนัง)'
                              : formAssetType === 'ประตูกันไฟ'
                              ? 'เช่น 1.0 x 2.1 เมตร (ทนไฟ 2 ชม.)'
                              : 'เช่น 10 lbs หรือ 15 lbs'
                          }
                          value={formSize}
                          onChange={(e) => setFormSize(e.target.value)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                        />
                      </div>
                    </div>
                  )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      อาคาร * {formAssetType === 'ประตูกันไฟ' && <span className="text-[10px] text-blue-400 font-normal">(เฉพาะ 2 อาคาร)</span>}
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={HOSPITAL_BUILDINGS.some(b => b.name === formBuilding) ? formBuilding : 'OTHER'}
                        onChange={(e) => {
                          if (e.target.value !== 'OTHER') {
                            setFormBuilding(e.target.value);
                          } else {
                            setFormBuilding('');
                          }
                        }}
                        className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 cursor-pointer"
                      >
                        {(formAssetType === 'ประตูกันไฟ' 
                          ? HOSPITAL_BUILDINGS.filter(b => buildingSupportsFireDoor(b.name))
                          : HOSPITAL_BUILDINGS
                        ).map(b => (
                          <option key={b.id} value={b.name}>{b.icon} {b.name}</option>
                        ))}
                        {formAssetType !== 'ประตูกันไฟ' && <option value="OTHER">✏️ ระบุอาคารอื่นๆ...</option>}
                      </select>
                      {formAssetType !== 'ประตูกันไฟ' && !HOSPITAL_BUILDINGS.some(b => b.name === formBuilding) && (
                        <input
                          type="text"
                          placeholder="ระบุชื่ออาคาร..."
                          required
                          value={formBuilding}
                          onChange={(e) => setFormBuilding(e.target.value)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                        />
                      )}
                    </div>
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
                    placeholder={formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'เช่น ห้องควบคุมระบบ รปภ. / ห้องช่างชั้น 1' : 'เช่น หน้าห้องคลังยา'}
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
                      className="text-[10px] font-extrabold px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                  <p className="text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800/60 leading-relaxed">
                    💡 <strong className="text-slate-300">กรณี{formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'ตู้แจ้งเหตุเพลิงไหม้' : formAssetType === 'ตู้ดับเพลิง' ? 'ตู้' : formAssetType === 'ประตูกันไฟ' ? 'ประตู' : 'ถัง'}อยู่ชั้นใต้ดิน/อับสัญญาณ GPS:</strong> แนะนำให้ดึงพิกัดบริเวณทางเข้าอาคาร หรือคัดลอกพิกัดอาคารมาพิมพ์ใส่ในช่อง แล้วระบุ <span className="text-red-400 font-bold">"ชั้น B1 / B2 / ใต้ดิน"</span> ในช่องข้อมูลชั้น
                  </p>
                </div>

                {formAssetType === 'ถังดับเพลิง' ? (
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
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                        ? 'วันที่ติดตั้งตู้ FCP / วันตรวจรับระบบ'
                        : formAssetType === 'ตู้ดับเพลิง'
                        ? 'วันที่ติดตั้งตู้ / วันตรวจรับอาคาร'
                        : 'วันที่ติดตั้งประตู / วันตรวจรับอาคาร'}
                    </label>
                    <input
                      type="date"
                      value={formInstallationDate}
                      onChange={(e) => setFormInstallationDate(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">สถานะเริ่มต้น</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ExtinguisherStatus)}
                    className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ชำรุด">ชำรุด</option>
                    {formAssetType === 'ถังดับเพลิง' && (
                      <>
                        <option value="แรงดันต่ำ">แรงดันต่ำ</option>
                        <option value="ใกล้หมดอายุ">ใกล้หมดอายุ</option>
                        <option value="หมดอายุ">หมดอายุ</option>
                      </>
                    )}
                    <option value="ส่งซ่อม">ส่งซ่อม</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    รายละเอียดเพิ่มเติม / หมายเหตุอุปกรณ์ (ตัวเลือก)
                  </label>
                  <textarea
                    rows={2}
                    value={formDetails}
                    onChange={(e) => setFormDetails(e.target.value)}
                    placeholder={
                      formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                        ? "เช่น ตู้ Main ชั้น 1 เชื่อมต่อ Loop ตึก A-B, มี Battery Backup 24 ชม., รองรับ 10 Zone"
                        : formAssetType === 'ตู้ดับเพลิง'
                        ? "เช่น ตู้แบบฝังผนังสแตนเลส/เหล็ก, สายยาว 100 ฟุต, หัวฉีดปรับฝอย, มีขวานดับเพลิง"
                        : formAssetType === 'ประตูกันไฟ'
                        ? "เช่น ยี่ห้อโช้คอัพ Dorma, สวิตช์ปุ่มกดฉุกเฉิน, ระบบแม่เหล็กไฟฟ้าเชื่อม Fire Alarm"
                        : "เช่น ยี่ห้อ Yamato, ผู้รับผิดชอบ ช่างสมชาย, สายฉีดใหม่"
                    }
                    className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 resize-none placeholder:text-slate-600"
                  />
                </div>

                <PhotoUploader
                  label={
                    formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                      ? 'รูปภาพตู้แจ้งเหตุเพลิงไหม้ FCP (ตัวเลือก)'
                      : formAssetType === 'ตู้ดับเพลิง'
                      ? 'รูปภาพตู้ดับเพลิง (ตัวเลือก)'
                      : formAssetType === 'ประตูกันไฟ'
                      ? 'รูปภาพประตูกันไฟ (ตัวเลือก)'
                      : 'รูปภาพตัวถังดับเพลิง (ตัวเลือก)'
                  }
                  value={formPhotoUrl}
                  onChange={(val) => setFormPhotoUrl(val)}
                  allowUrlInput={true}
                />

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0 bg-slate-900 sticky bottom-0">
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
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Edit Extinguisher Dialog Backdrop */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-900 rounded-2xl max-w-md w-full border border-slate-800 shadow-2xl text-slate-200 max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
                <h4 className="font-bold text-white text-sm">
                  {formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                    ? 'แก้ไขข้อมูลตู้แจ้งเหตุเพลิงไหม้ (FCP):'
                    : formAssetType === 'ตู้ดับเพลิง'
                    ? 'แก้ไขข้อมูลตู้ดับเพลิง:'
                    : formAssetType === 'ประตูกันไฟ'
                    ? 'แก้ไขข้อมูลประตูกันไฟ:'
                    : formAssetType === 'ไฟฉุกเฉิน'
                    ? 'แก้ไขข้อมูลไฟฉุกเฉิน (Emergency Light):'
                    : formAssetType === 'ป้ายบอกทางหนีไฟ'
                    ? 'แก้ไขข้อมูลป้ายบอกทางหนีไฟ (Exit Sign):'
                    : 'แก้ไขข้อมูลถังดับเพลิง:'} <span className="font-mono text-red-500">{formId}</span>
                </h4>
                <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                  {formError && (
                    <div className="p-2.5 bg-rose-950/50 text-rose-200 border border-rose-900/40 rounded-lg text-xs flex items-center gap-1.5 animate-shake">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ประเภทอุปกรณ์ *</label>
                    <select
                      value={formAssetType}
                      onChange={(e) => handleAssetTypeChange(e.target.value as AssetType)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-bold cursor-pointer"
                    >
                      <option value="ถังดับเพลิง">🧯 ถังดับเพลิง (Fire Extinguisher)</option>
                      <option value="ตู้ดับเพลิง">🗄️ ตู้ดับเพลิง (Fire Hose Cabinet)</option>
                      <option value="ประตูกันไฟ">🚪 ประตูกันไฟอัตโนมัติ (Fire Door)</option>
                      <option value="ตู้แจ้งเหตุเพลิงไหม้">🚨 ตู้แจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)</option>
                      <option value="ไฟฉุกเฉิน">💡 ไฟฉุกเฉิน (Emergency Light)</option>
                      <option value="ป้ายบอกทางหนีไฟ">🏃 ป้ายบอกทางหนีไฟ (Exit Sign)</option>
                    </select>
                  </div>

                  {(formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' || formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">ยี่ห้อ (Brand) *</label>
                        <input
                          type="text"
                          placeholder={
                            formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                              ? 'เช่น Notifier, Edwards, Bosch'
                              : 'เช่น Max Bright, Sunny, Dyno'
                          }
                          required
                          value={formBrand}
                          onChange={(e) => setFormBrand(e.target.value)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">รุ่น (Model) *</label>
                        <input
                          type="text"
                          placeholder={
                            formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                              ? 'เช่น NFS-320, EST3'
                              : formAssetType === 'ไฟฉุกเฉิน'
                              ? 'เช่น CU2-12-3W, MB09'
                              : 'เช่น EX-LED-2S, SL-01'
                          }
                          required
                          value={formModel}
                          onChange={(e) => setFormModel(e.target.value)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                        />
                      </div>
                    </div>
                  )}

                  {formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ลักษณะระบบตู้ FCP *
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as ExtinguisherType)}
                        className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                      >
                        <option value="ตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)">
                          ตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm Control Panel - FCP)
                        </option>
                      </select>
                    </div>
                  ) : formAssetType === 'ไฟฉุกเฉิน' || formAssetType === 'ป้ายบอกทางหนีไฟ' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ลักษณะอุปกรณ์ *
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as ExtinguisherType)}
                        className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                      >
                        {formAssetType === 'ไฟฉุกเฉิน' ? (
                          <option value="โคมไฟฉุกเฉิน LED อัตโนมัติ (Emergency Light)">
                            โคมไฟฉุกเฉิน LED อัตโนมัติ (Emergency Light)
                          </option>
                        ) : (
                          <option value="ป้ายไฟทางออกฉุกเฉิน LED (Exit Sign Box)">
                            ป้ายไฟทางออกฉุกเฉิน LED (Exit Sign Box)
                          </option>
                        )}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {formAssetType === 'ตู้ดับเพลิง'
                            ? 'ชนิดตู้ดับเพลิง'
                            : formAssetType === 'ประตูกันไฟ'
                            ? 'ประเภทประตู'
                            : 'ประเภทสารดับเพลิง'}
                        </label>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value as ExtinguisherType)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none bg-slate-950 text-slate-200 font-medium cursor-pointer"
                        >
                          {formAssetType === 'ตู้ดับเพลิง' ? (
                            <option value="ตู้วงล้อสายดับเพลิง Fire Hose Reel Cabinet (แบบฝัง)">ตู้วงล้อสายดับเพลิง Fire Hose Reel Cabinet (แบบฝัง)</option>
                          ) : formAssetType === 'ประตูกันไฟ' ? (
                            <>
                              <option value="ประตูกันไฟเหล็ก">ประตูกันไฟเหล็ก</option>
                              <option value="ประตูกันไฟกระจก">ประตูกันไฟกระจก</option>
                            </>
                          ) : (
                            <>
                              <option value="Dry Chemical">Dry Chemical (เคมีแห้ง)</option>
                              <option value="CO2">CO2 (คาร์บอนไดออกไซด์)</option>
                              <option value="Foam">Foam (โฟม)</option>
                              <option value="Clean Agent">Clean Agent (สารสะอาด)</option>
                              <option value="Water">Water (น้ำสะสมแรงดัน)</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {formAssetType === 'ตู้ดับเพลิง'
                            ? 'ขนาดตู้ / สายฉีด'
                            : formAssetType === 'ประตูกันไฟ'
                            ? 'ขนาดประตู'
                            : 'ขนาดถัง (Size)'}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            formAssetType === 'ตู้ดับเพลิง'
                              ? 'เช่น 1 นิ้ว x 100 ฟุต (แบบฝังผนัง)'
                              : formAssetType === 'ประตูกันไฟ'
                              ? 'เช่น 1.0 x 2.1 เมตร'
                              : 'เช่น 10 lbs หรือ 15 lbs'
                          }
                          value={formSize}
                          onChange={(e) => setFormSize(e.target.value)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                        />
                      </div>
                    </div>
                  )}

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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      อาคาร * {formAssetType === 'ประตูกันไฟ' && <span className="text-[10px] text-blue-400 font-normal">(เฉพาะ 2 อาคาร)</span>}
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={HOSPITAL_BUILDINGS.some(b => b.name === formBuilding) ? formBuilding : 'OTHER'}
                        onChange={(e) => {
                          if (e.target.value !== 'OTHER') {
                            setFormBuilding(e.target.value);
                          } else {
                            setFormBuilding('');
                          }
                        }}
                        className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 cursor-pointer"
                      >
                        {(formAssetType === 'ประตูกันไฟ' 
                          ? HOSPITAL_BUILDINGS.filter(b => buildingSupportsFireDoor(b.name))
                          : HOSPITAL_BUILDINGS
                        ).map(b => (
                          <option key={b.id} value={b.name}>{b.icon} {b.name}</option>
                        ))}
                        {formAssetType !== 'ประตูกันไฟ' && <option value="OTHER">✏️ ระบุอาคารอื่นๆ...</option>}
                      </select>
                      {formAssetType !== 'ประตูกันไฟ' && !HOSPITAL_BUILDINGS.some(b => b.name === formBuilding) && (
                        <input
                          type="text"
                          placeholder="ระบุชื่ออาคาร..."
                          required
                          value={formBuilding}
                          onChange={(e) => setFormBuilding(e.target.value)}
                          className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950"
                        />
                      )}
                    </div>
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
                      className="text-[10px] font-extrabold px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                  <p className="text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800/60 leading-relaxed">
                    💡 <strong className="text-slate-300">กรณี{formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'ตู้แจ้งเหตุเพลิงไหม้' : formAssetType === 'ตู้ดับเพลิง' ? 'ตู้' : formAssetType === 'ประตูกันไฟ' ? 'ประตู' : 'ถัง'}อยู่ชั้นใต้ดิน/อับสัญญาณ GPS:</strong> แนะนำให้ดึงพิกัดบริเวณทางเข้าอาคาร หรือคัดลอกพิกัดอาคารมาพิมพ์ใส่ในช่อง แล้วระบุ <span className="text-red-400 font-bold">"ชั้น B1 / B2 / ใต้ดิน"</span> ในช่องข้อมูลชั้น
                  </p>
                </div>

                {formAssetType === 'ถังดับเพลิง' ? (
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
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                        ? 'วันที่ติดตั้งตู้ FCP / วันตรวจรับระบบ'
                        : formAssetType === 'ตู้ดับเพลิง'
                        ? 'วันที่ติดตั้งตู้ / วันตรวจรับอาคาร'
                        : 'วันที่ติดตั้งประตู / วันตรวจรับอาคาร'}
                    </label>
                    <input
                      type="date"
                      value={formInstallationDate}
                      onChange={(e) => setFormInstallationDate(e.target.value)}
                      className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    รายละเอียดเพิ่มเติม / หมายเหตุอุปกรณ์ (ตัวเลือก)
                  </label>
                  <textarea
                    rows={2}
                    value={formDetails}
                    onChange={(e) => setFormDetails(e.target.value)}
                    placeholder={
                      formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                        ? "เช่น ตู้ Main ชั้น 1 เชื่อมต่อ Loop ตึก A-B, มี Battery Backup 24 ชม., รองรับ 10 Zone"
                        : formAssetType === 'ตู้ดับเพลิง'
                        ? "เช่น ตู้แบบฝังผนังสแตนเลส/เหล็ก, สายยาว 100 ฟุต, หัวฉีดปรับฝอย, มีขวานดับเพลิง"
                        : formAssetType === 'ประตูกันไฟ'
                        ? "เช่น ยี่ห้อโช้คอัพ Dorma, สวิตช์ปุ่มกดฉุกเฉิน, ระบบแม่เหล็กไฟฟ้า"
                        : "เช่น ยี่ห้อ Yamato, ผู้รับผิดชอบ ช่างสมชาย"
                    }
                    className="w-full p-2 border border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none font-medium text-slate-200 bg-slate-950 resize-none placeholder:text-slate-600"
                  />
                </div>

                <PhotoUploader
                  label={
                    formAssetType === 'ตู้แจ้งเหตุเพลิงไหม้'
                      ? 'รูปภาพตู้แจ้งเหตุเพลิงไหม้ FCP (ตัวเลือก)'
                      : formAssetType === 'ตู้ดับเพลิง'
                      ? 'รูปภาพตู้ดับเพลิง (ตัวเลือก)'
                      : formAssetType === 'ประตูกันไฟ'
                      ? 'รูปภาพประตูกันไฟ (ตัวเลือก)'
                      : 'รูปภาพตัวถังดับเพลิง (ตัวเลือก)'
                  }
                  value={formPhotoUrl}
                  onChange={(val) => setFormPhotoUrl(val)}
                  allowUrlInput={true}
                />

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0 bg-slate-900 sticky bottom-0">
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
              </div>
            </form>
          </motion.div>
        </div>
      )}
        {/* Modal Confirm Delete */}
        {deleteTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-hidden relative text-slate-100"
            >
              <div className="flex items-center gap-3 text-rose-500 mb-4">
                <div className="p-3 bg-rose-950/60 border border-rose-900/50 rounded-xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">ยืนยันการลบอุปกรณ์</h3>
                  <p className="text-xs text-rose-400 font-semibold font-mono">รหัสอุปกรณ์: {deleteTargetId}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์รหัส <span className="font-bold text-white font-mono">{deleteTargetId}</span> และประวัติการบันทึกตรวจเช็คทั้งหมดที่เกี่ยวข้อง? การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTargetId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (!deleteTargetId) return;
                    setIsDeleting(true);
                    try {
                      await onDeleteExtinguisher(deleteTargetId);
                      setDeleteTargetId(null);
                    } catch (err) {
                      console.error("Delete failed:", err);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-900/30"
                >
                  {isDeleting ? (
                    <span>กำลังลบ...</span>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>ยืนยันลบรายการนี้</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Alert: Already Inspected */}
        {alreadyInspectedExt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100"
            >
              <div className="flex items-center gap-3 text-emerald-400 mb-4">
                <div className="p-3 bg-emerald-950/60 border border-emerald-900/50 rounded-xl">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {getAssetCategory(alreadyInspectedExt) === 'ตู้แจ้งเหตุเพลิงไหม้'
                      ? 'ได้รับการตรวจเช็คประจำวันนี้แล้ว'
                      : 'ได้รับการตรวจเช็คประจำเดือนนี้แล้ว'}
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold font-mono">รหัส: {alreadyInspectedExt.id}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-6">
                <p>
                  {getAssetCategory(alreadyInspectedExt) === 'ตู้แจ้งเหตุเพลิงไหม้'
                    ? 'ตู้แจ้งเหตุเพลิงไหม้ (FCP)'
                    : getAssetCategory(alreadyInspectedExt) === 'ตู้ดับเพลิง'
                    ? 'ตู้ดับเพลิง'
                    : getAssetCategory(alreadyInspectedExt) === 'ประตูกันไฟ'
                    ? 'ประตูกันไฟ'
                    : 'ถังดับเพลิง'} รหัส <span className="font-bold text-white font-mono">{alreadyInspectedExt.id}</span> ({alreadyInspectedExt.building} • {alreadyInspectedExt.floor}) ได้รับการตรวจเช็คสภาพเรียบร้อยแล้วเมื่อ:
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-emerald-300 text-xs font-bold text-center">
                  {alreadyInspectedExt.lastInspectedAt 
                    ? new Date(alreadyInspectedExt.lastInspectedAt).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) 
                    : '-'}
                </div>
                <p className="text-slate-400 text-[11px]">
                  {getAssetCategory(alreadyInspectedExt) === 'ตู้แจ้งเหตุเพลิงไหม้'
                    ? '* ตามมาตรฐานความปลอดภัย ระบบกำหนดให้ตรวจเช็คตู้แจ้งเหตุเพลิงไหม้ (FCP) วันละ 1 ครั้ง ตู้นี้จะสามารถทำการตรวจเช็คได้อีกครั้งในวันถัดไป'
                    : '* ตามมาตรฐานความปลอดภัย ระบบกำหนดให้ทำการตรวจเช็คได้ 1 ครั้งต่อเดือน อุปกรณ์นี้จะสามารถทำการตรวจเช็คได้อีกครั้งเมื่อเปลี่ยนเข้าสู่เดือนถัดไป'}
                </p>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAlreadyInspectedExt(null)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  รับทราบ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Printable Modal */}
      <AnimatePresence>
        {(qrModalExtId || isBatchQrOpen) && (
          <QRCodeModal
            extinguishers={filteredExtinguishers.length > 0 ? filteredExtinguishers : extinguishers}
            initialSelectedId={qrModalExtId}
            onClose={() => {
              setQrModalExtId(null);
              setIsBatchQrOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
