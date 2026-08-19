import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, X, Save, CheckCircle2, AlertTriangle, Layers, Shield, Phone, Info, Plus } from 'lucide-react';
import { BuildingInfo } from '../types';

interface BuildingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: BuildingInfo | null;
  allBuildings: BuildingInfo[];
  onSave: (updatedBuilding: BuildingInfo, oldName?: string) => Promise<void>;
  isAdmin?: boolean;
}

const COMMON_EMOJIS = ['🏢', '🏥', '🏨', '🏠', '🚐', '🚑', '🧺', '💊', '🌳', '🔬', '🚒', '🚨', '⚡', '📦', '🍽️', '🏛️', '🏗️', '🛠️', '🚻', '🚗', '🩺'];

export const BuildingEditModal: React.FC<BuildingEditModalProps> = ({
  isOpen,
  onClose,
  building,
  allBuildings,
  onSave,
  isAdmin = true
}) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<string>('🏢');
  const [desc, setDesc] = useState<string>('');
  const [totalFloors, setTotalFloors] = useState<number>(3);
  const [department, setDepartment] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [hasFireDoor, setHasFireDoor] = useState<boolean>(false);
  const [onlyFireExtinguisher, setOnlyFireExtinguisher] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewBuilding, setIsNewBuilding] = useState<boolean>(false);

  // Initialize form when opened or building prop changes
  useEffect(() => {
    if (!isOpen) return;

    if (building) {
      setIsNewBuilding(false);
      setSelectedBuildingId(building.id);
      setName(building.name || '');
      setIcon(building.icon || '🏢');
      setDesc(building.desc || '');
      setTotalFloors(building.totalFloors || 3);
      setDepartment(building.department || '');
      setContactPerson(building.contactPerson || '');
      setNotes(building.notes || '');
      setHasFireDoor(Boolean(building.hasFireDoor));
      setOnlyFireExtinguisher(Boolean(building.onlyFireExtinguisher));
      setError(null);
    } else if (allBuildings.length > 0) {
      const first = allBuildings[0];
      setIsNewBuilding(false);
      setSelectedBuildingId(first.id);
      setName(first.name || '');
      setIcon(first.icon || '🏢');
      setDesc(first.desc || '');
      setTotalFloors(first.totalFloors || 3);
      setDepartment(first.department || '');
      setContactPerson(first.contactPerson || '');
      setNotes(first.notes || '');
      setHasFireDoor(Boolean(first.hasFireDoor));
      setOnlyFireExtinguisher(Boolean(first.onlyFireExtinguisher));
      setError(null);
    }
  }, [isOpen, building, allBuildings]);

  const handleSelectBuildingToEdit = (bldgId: string) => {
    if (bldgId === '__NEW__') {
      setIsNewBuilding(true);
      setSelectedBuildingId(`BLD-${Date.now().toString().slice(-4)}`);
      setName('');
      setIcon('🏢');
      setDesc('');
      setTotalFloors(1);
      setDepartment('');
      setContactPerson('');
      setNotes('');
      setHasFireDoor(false);
      setOnlyFireExtinguisher(false);
      setError(null);
      return;
    }

    const found = allBuildings.find(b => b.id === bldgId || b.name === bldgId);
    if (found) {
      setIsNewBuilding(false);
      setSelectedBuildingId(found.id);
      setName(found.name || '');
      setIcon(found.icon || '🏢');
      setDesc(found.desc || '');
      setTotalFloors(found.totalFloors || 3);
      setDepartment(found.department || '');
      setContactPerson(found.contactPerson || '');
      setNotes(found.notes || '');
      setHasFireDoor(Boolean(found.hasFireDoor));
      setOnlyFireExtinguisher(Boolean(found.onlyFireExtinguisher));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรุณาระบุชื่ออาคาร');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const targetId = isNewBuilding 
        ? (selectedBuildingId || `BLD-${Date.now().toString().slice(-4)}`)
        : selectedBuildingId;

      const currentOriginal = allBuildings.find(b => b.id === targetId);
      const oldName = currentOriginal ? currentOriginal.name : undefined;

      const updatedData: BuildingInfo = {
        id: targetId,
        name: name.trim(),
        icon: icon.trim() || '🏢',
        desc: desc.trim(),
        totalFloors: Math.max(1, Math.min(30, Number(totalFloors) || 1)),
        department: department.trim(),
        contactPerson: contactPerson.trim(),
        notes: notes.trim(),
        hasFireDoor: hasFireDoor,
        onlyFireExtinguisher: onlyFireExtinguisher,
        updatedAt: new Date().toISOString()
      };

      await onSave(updatedData, oldName);
      onClose();
    } catch (err: any) {
      console.error("Error saving building:", err);
      setError(err?.message || 'ไม่สามารถบันทึกข้อมูลอาคารได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-xl shadow-inner shrink-0">
                {icon || '🏢'}
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
                  <span>{isNewBuilding ? 'เพิ่มข้อมูลอาคารใหม่' : 'แก้ไขรายละเอียดอาคาร'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {name ? `${name} (รหัส: ${selectedBuildingId})` : 'ปรับแต่งข้อมูลอาคาร แผนก และจำนวนชั้น'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Building Selection Bar (if multiple buildings exist) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-blue-400" />
                  <span>เลือกอาคารที่ต้องการแก้ไข</span>
                </span>
                {isAdmin && !isNewBuilding && (
                  <button
                    type="button"
                    onClick={() => handleSelectBuildingToEdit('__NEW__')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>เพิ่มอาคารใหม่</span>
                  </button>
                )}
              </label>
              
              {!isNewBuilding ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                  {allBuildings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBuildingToEdit(b.id)}
                      className={`p-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all text-left truncate cursor-pointer ${
                        selectedBuildingId === b.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span className="text-base">{b.icon}</span>
                      <span className="truncate">{b.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-800 text-xs text-blue-300">
                  <span>กำลังสร้างอาคารใหม่</span>
                  <button
                    type="button"
                    onClick={() => handleSelectBuildingToEdit(allBuildings[0]?.id || '')}
                    className="text-xs text-blue-400 hover:underline font-bold"
                  >
                    ยกเลิก / เลือกอาคารเดิม
                  </button>
                </div>
              )}
            </div>

            {/* Building Name & Icon */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1 space-y-1">
                <label className="text-xs font-bold text-slate-300">ไอคอนอาคาร</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    maxLength={4}
                    className="w-full text-center text-xl py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="🏢"
                  />
                </div>
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  ชื่ออาคาร <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น อาคารอำนวยการ, อาคารหมอบริกส์"
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Emoji Picker */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">เลือกไอคอนด่วน:</span>
              <div className="flex flex-wrap gap-1">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                      icon === emoji
                        ? 'bg-blue-600 scale-110 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Description / Zones / Departments */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                รายละเอียดการใช้งาน / แผนกในอาคาร
              </label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="เช่น งานบริหาร, ตรวจสุขภาพ, เวชระเบียน, OPD"
                className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block">
                ข้อความนี้จะแสดงใต้ชื่ออาคารในแดชบอร์ดและหน้ารายการอุปกรณ์
              </span>
            </div>

            {/* Total Floors & Department Responsibilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-400" />
                  <span>จำนวนชั้นทั้งหมด (ชั้น)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(parseInt(e.target.value) || 1)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Shield size={13} className="text-emerald-400" />
                  <span>ฝ่าย/หน่วยงานที่รับผิดชอบ</span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="เช่น ฝ่ายบริหาร, แผนกช่างเทคนิค"
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Contact Person / Phone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Phone size={13} className="text-blue-400" />
                <span>ผู้ประสานงาน / เบอร์โทรศัพท์ภายใน</span>
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="เช่น ช่างสมชาย โทร. 1234, พยาบาลหัวหน้าเวร โทร. 1102"
                className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Fire Door Installation Checkbox */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="hasFireDoor"
                checked={hasFireDoor}
                onChange={(e) => {
                  setHasFireDoor(e.target.checked);
                  if (e.target.checked) setOnlyFireExtinguisher(false);
                }}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <label htmlFor="hasFireDoor" className="text-xs text-slate-300 cursor-pointer select-none">
                <span className="font-bold text-white block">🚪 มีระบบประตูกันไฟ (Fire Door) ในอาคารนี้</span>
                <span className="text-[11px] text-slate-400">
                  เมื่อเปิดใช้งาน ระบบจะแสดงแท็บประตูกันไฟและแบบฟอร์มตรวจสอบประตูกันไฟสำหรับอาคารนี้ (เช่น อาคารหมอกัมพล, อาคารหมอบริกส์)
                </span>
              </label>
            </div>

            {/* Only Fire Extinguisher Restriction Checkbox */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="onlyFireExtinguisher"
                checked={onlyFireExtinguisher}
                onChange={(e) => {
                  setOnlyFireExtinguisher(e.target.checked);
                  if (e.target.checked) setHasFireDoor(false);
                }}
                className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <label htmlFor="onlyFireExtinguisher" className="text-xs text-slate-300 cursor-pointer select-none">
                <span className="font-bold text-white block">🧯 มีเฉพาะถังดับเพลิงเท่านั้น (Fire Extinguishers Only)</span>
                <span className="text-[11px] text-slate-400">
                  สำหรับสถานที่หรือยานพาหนะที่มีเฉพาะถังดับเพลิงเท่านั้น เช่น ฝั่งหอพักพยาบาล, รถตู้และรถพยาบาลฉุกเฉิน (จะแสดงเฉพาะหมวดถังดับเพลิงในแบบฟอร์มและแดชบอร์ด)
                </span>
              </label>
            </div>

            {/* Notes / Special Access Instructions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Info size={13} className="text-slate-400" />
                <span>หมายเหตุ / เงื่อนไขการเข้าตรวจเช็ค</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ตรวจเช็คเฉพาะช่วง 08.30 - 16.30 น., ต้องแลกบัตรเข้าห้องผ่าตัดชั้น 3"
                className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Helpful Notice about equipment auto-update */}
            <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
              <span>
                หากคุณเปลี่ยนชื่ออาคาร ระบบจะอัปเดตชื่ออาคารในรายการอุปกรณ์ที่ติดตั้งอยู่ในอาคารนี้ให้โดยอัตโนมัติ
              </span>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลอาคาร'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
