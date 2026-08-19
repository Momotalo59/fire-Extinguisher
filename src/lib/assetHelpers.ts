import { FireExtinguisher, AssetType, ExtinguisherStatus, BuildingInfo } from '../types';

export type { BuildingInfo };

export const ASSET_CATEGORIES: { id: AssetType; name: string; icon: string; cycle: string; desc: string; color: string; badgeColor: string }[] = [
  {
    id: 'ถังดับเพลิง',
    name: 'ถังดับเพลิง (Fire Extinguisher)',
    icon: '🧯',
    cycle: 'ตรวจรายเดือน',
    desc: 'ถังดับเพลิงชนิดมือถือและรถเข็น',
    color: 'from-red-500/20 to-orange-500/10 border-red-500/30 text-red-400',
    badgeColor: 'bg-red-950/60 text-red-400 border-red-900/50'
  },
  {
    id: 'ตู้ดับเพลิง',
    name: 'ตู้ดับเพลิง (Fire Hose Cabinet)',
    icon: '🗄️',
    cycle: 'ตรวจรายเดือน',
    desc: 'ตู้วงล้อสายส่งน้ำดับเพลิง FHC / Hose Reel',
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
    badgeColor: 'bg-blue-950/60 text-blue-400 border-blue-900/50'
  },
  {
    id: 'ประตูกันไฟ',
    name: 'ประตูกันไฟ (Fire Door)',
    icon: '🚪',
    cycle: 'ตรวจรายเดือน',
    desc: 'ประตูกันไฟหนีไฟเหล็ก / กระจกทนไฟ',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    badgeColor: 'bg-amber-950/60 text-amber-400 border-amber-900/50'
  },
  {
    id: 'ตู้แจ้งเหตุเพลิงไหม้',
    name: 'ตู้แจ้งเหตุเพลิงไหม้ (FCP)',
    icon: '🚨',
    cycle: 'ตรวจประจำวัน',
    desc: 'ตู้ควบคุมหลัก Fire Alarm Control Panel',
    color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400',
    badgeColor: 'bg-purple-950/60 text-purple-400 border-purple-900/50'
  },
  {
    id: 'ไฟฉุกเฉิน',
    name: 'ไฟฉุกเฉิน (Emergency Light)',
    icon: '💡',
    cycle: 'ตรวจรายเดือน',
    desc: 'โคมไฟฟ้าฉุกเฉินและระบบส่องสว่างสำรอง',
    color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-400',
    badgeColor: 'bg-yellow-950/60 text-yellow-400 border-yellow-900/50'
  },
  {
    id: 'ป้ายบอกทางหนีไฟ',
    name: 'ป้ายบอกทางหนีไฟ (Exit Sign)',
    icon: '🏃',
    cycle: 'ตรวจรายเดือน',
    desc: 'ป้ายทางหนีไฟเรืองแสง/ไฟส่องสว่างทางออกฉุกเฉิน',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    badgeColor: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50'
  }
];

export const DEFAULT_HOSPITAL_BUILDINGS: BuildingInfo[] = [
  { id: 'BLD-01', name: 'อาคารอำนวยการ', icon: '🏢', desc: 'งานบริหาร, ตรวจสุขภาพ, เวชระเบียน', totalFloors: 3, department: 'ฝ่ายบริหาร / สำนักงานผู้อำนวยการ', hasFireDoor: false, onlyFireExtinguisher: false },
  { id: 'BLD-02', name: 'อาคารหมอบริกส์', icon: '🏥', desc: 'OPD, คลังยา, ศูนย์คอมพิวเตอร์ IT', totalFloors: 4, department: 'แผนกผู้ป่วยนอก (OPD) & เภสัชกรรม', hasFireDoor: true, onlyFireExtinguisher: false },
  { id: 'BLD-03', name: 'อาคารหมอกัมพล', icon: '🏨', desc: 'IPD หอผู้ป่วย, ห้องผ่าตัด, ICU', totalFloors: 5, department: 'หอผู้ป่วยใน (IPD) & ศัลยกรรม/ICU', hasFireDoor: true, onlyFireExtinguisher: false },
  { id: 'BLD-04', name: 'อาคารซักรีด-โภชนาการ', icon: '🧺', desc: 'ฝ่ายโภชนาการ, ซักฟอก, สโตร์กลาง', totalFloors: 2, department: 'ฝ่ายสนับสนุนบริการและโภชนาการ', hasFireDoor: false, onlyFireExtinguisher: false },
  { id: 'BLD-05', name: 'อาคารกายภาพ-คลังยา', icon: '💊', desc: 'เวชศาสตร์ฟื้นฟู, กายภาพบำบัด, คลังยาหลัก', totalFloors: 3, department: 'เวชศาสตร์ฟื้นฟูและคลังพัสดุ', hasFireDoor: false, onlyFireExtinguisher: false },
  { id: 'BLD-06', name: 'อาคารต้นแก้ว', icon: '🌳', desc: 'ศูนย์การแพทย์พิเศษ, อาคารพักฟื้น', totalFloors: 3, department: 'ศูนย์ความเป็นเลิศทางการแพทย์', hasFireDoor: false, onlyFireExtinguisher: false },
  { id: 'BLD-07', name: 'ฝั่งหอพักพยาบาล', icon: '🏠', desc: 'หอพักพยาบาล, อาคารที่พักบุคลากรทางการแพทย์', totalFloors: 4, department: 'ฝ่ายบริหารงานที่พักและหอพักพยาบาล', hasFireDoor: false, onlyFireExtinguisher: true },
  { id: 'BLD-08', name: 'รถตู้+รถตู้พยาบาล', icon: '🚐', desc: 'ยานพาหนะ, รถตู้ส่งต่อ, รถพยาบาลฉุกเฉิน EMS / Ambulance', totalFloors: 1, department: 'หน่วยยานพาหนะและบริการการแพทย์ฉุกเฉิน (EMS)', hasFireDoor: false, onlyFireExtinguisher: true },
];

export const HOSPITAL_BUILDINGS: BuildingInfo[] = DEFAULT_HOSPITAL_BUILDINGS;

/** อาคารที่มีการติดตั้งประตูกันไฟ (มีเฉพาะอาคารหมอกัมพล และ อาคารหมอบริกส์ หรืออาคารที่ระบุ hasFireDoor) */
export const BUILDINGS_WITH_FIRE_DOORS = ['อาคารหมอกัมพล', 'อาคารหมอบริกส์'];

/** สถานที่/อาคารที่มีเฉพาะถังดับเพลิงเท่านั้น (เช่น หอพักพยาบาล, รถตู้และรถพยาบาล) */
export const BUILDINGS_WITH_ONLY_FIRE_EXTINGUISHERS = [
  'ฝั่งหอพักพยาบาล',
  'รถตู้+รถตู้พยาบาล'
];

export function isBuildingOnlyFireExtinguisher(buildingName: string, customBuildings?: BuildingInfo[]): boolean {
  const b = (buildingName || '').trim();
  if (!b || b === 'All') return false;
  if (customBuildings && customBuildings.length > 0) {
    const found = customBuildings.find(item => item.name === b || item.id === b);
    if (found && found.onlyFireExtinguisher !== undefined) {
      return Boolean(found.onlyFireExtinguisher);
    }
  }
  return BUILDINGS_WITH_ONLY_FIRE_EXTINGUISHERS.some(onlyB => b.includes(onlyB) || onlyB.includes(b));
}

export function getAllowedAssetCategoriesForBuilding(buildingName: string, customBuildings?: BuildingInfo[]): AssetType[] {
  if (isBuildingOnlyFireExtinguisher(buildingName, customBuildings)) {
    return ['ถังดับเพลิง'];
  }
  if (buildingSupportsFireDoor(buildingName, customBuildings)) {
    return ['ถังดับเพลิง', 'ตู้ดับเพลิง', 'ประตูกันไฟ', 'ตู้แจ้งเหตุเพลิงไหม้', 'ไฟฉุกเฉิน', 'ป้ายบอกทางหนีไฟ'];
  }
  return ['ถังดับเพลิง', 'ตู้ดับเพลิง', 'ตู้แจ้งเหตุเพลิงไหม้', 'ไฟฉุกเฉิน', 'ป้ายบอกทางหนีไฟ'];
}

export function buildingSupportsFireDoor(buildingName: string, customBuildings?: BuildingInfo[]): boolean {
  const b = (buildingName || '').trim();
  if (customBuildings && customBuildings.length > 0) {
    const found = customBuildings.find(item => item.name === b || item.id === b);
    if (found && found.hasFireDoor !== undefined) {
      return Boolean(found.hasFireDoor);
    }
  }
  return BUILDINGS_WITH_FIRE_DOORS.some(validB => b.includes(validB) || validB.includes(b));
}

export interface CategoryStats {
  category: AssetType;
  icon: string;
  name: string;
  cycle: string;
  total: number;
  inspected: number;
  pending: number;
  normal: number;
  damaged: number;
  repair: number;
}

export function isAssetInspectedInCurrentCycle(ext: FireExtinguisher): boolean {
  if (!ext.lastInspectedAt) return false;
  const inspectedDate = new Date(ext.lastInspectedAt);
  if (isNaN(inspectedDate.getTime())) return false;
  const now = new Date();
  const cat = getAssetCategory(ext);

  if (cat === 'ตู้แจ้งเหตุเพลิงไหม้') {
    return (
      inspectedDate.getFullYear() === now.getFullYear() &&
      inspectedDate.getMonth() === now.getMonth() &&
      inspectedDate.getDate() === now.getDate()
    );
  }

  return (
    inspectedDate.getFullYear() === now.getFullYear() &&
    inspectedDate.getMonth() === now.getMonth()
  );
}

export function getBuildingEquipmentStats(extinguishers: FireExtinguisher[], buildingName: string, customBuildings?: BuildingInfo[]) {
  const targetBuilding = (buildingName || '').trim();
  const buildingExts = extinguishers.filter(e => {
    if (!targetBuilding || targetBuilding === 'All') return true;
    const b = (e.building || '').trim();
    return b === targetBuilding || b.toLowerCase() === targetBuilding.toLowerCase();
  });

  const counts: Record<AssetType, number> = {
    'ถังดับเพลิง': 0,
    'ตู้ดับเพลิง': 0,
    'ประตูกันไฟ': 0,
    'ตู้แจ้งเหตุเพลิงไหม้': 0,
    'ไฟฉุกเฉิน': 0,
    'ป้ายบอกทางหนีไฟ': 0,
  };

  let totalInspected = 0;
  let totalPending = 0;
  let totalNormal = 0;
  let totalDamaged = 0;
  let totalRepair = 0;

  const categoryBreakdownMap: Record<AssetType, CategoryStats> = {
    'ถังดับเพลิง': { category: 'ถังดับเพลิง', icon: '🧯', name: 'ถังดับเพลิง', cycle: 'รายเดือน', total: 0, inspected: 0, pending: 0, normal: 0, damaged: 0, repair: 0 },
    'ตู้ดับเพลิง': { category: 'ตู้ดับเพลิง', icon: '🗄️', name: 'ตู้ดับเพลิง', cycle: 'รายเดือน', total: 0, inspected: 0, pending: 0, normal: 0, damaged: 0, repair: 0 },
    'ประตูกันไฟ': { category: 'ประตูกันไฟ', icon: '🚪', name: 'ประตูกันไฟ', cycle: 'รายเดือน', total: 0, inspected: 0, pending: 0, normal: 0, damaged: 0, repair: 0 },
    'ตู้แจ้งเหตุเพลิงไหม้': { category: 'ตู้แจ้งเหตุเพลิงไหม้', icon: '🚨', name: 'ตู้แจ้งเหตุ (FCP)', cycle: 'ประจำวัน', total: 0, inspected: 0, pending: 0, normal: 0, damaged: 0, repair: 0 },
    'ไฟฉุกเฉิน': { category: 'ไฟฉุกเฉิน', icon: '💡', name: 'ไฟฉุกเฉิน', cycle: 'รายเดือน', total: 0, inspected: 0, pending: 0, normal: 0, damaged: 0, repair: 0 },
    'ป้ายบอกทางหนีไฟ': { category: 'ป้ายบอกทางหนีไฟ', icon: '🏃', name: 'ป้ายทางหนีไฟ', cycle: 'รายเดือน', total: 0, inspected: 0, pending: 0, normal: 0, damaged: 0, repair: 0 },
  };

  buildingExts.forEach(e => {
    const cat = getAssetCategory(e);
    counts[cat] = (counts[cat] || 0) + 1;

    const isInspected = isAssetInspectedInCurrentCycle(e);
    if (isInspected) {
      totalInspected++;
      if (categoryBreakdownMap[cat]) categoryBreakdownMap[cat].inspected++;
    } else {
      totalPending++;
      if (categoryBreakdownMap[cat]) categoryBreakdownMap[cat].pending++;
    }

    if (categoryBreakdownMap[cat]) {
      categoryBreakdownMap[cat].total++;
    }

    const st = e.status;
    if (st === 'ปกติ') {
      totalNormal++;
      if (categoryBreakdownMap[cat]) categoryBreakdownMap[cat].normal++;
    } else if (st === 'ส่งซ่อม') {
      totalRepair++;
      if (categoryBreakdownMap[cat]) categoryBreakdownMap[cat].repair++;
    } else {
      // ชำรุด, แรงดันต่ำ, ใกล้หมดอายุ, หมดอายุ
      totalDamaged++;
      if (categoryBreakdownMap[cat]) categoryBreakdownMap[cat].damaged++;
    }
  });

  // Filter allowed categories for this building
  const allowedCategories = (!targetBuilding || targetBuilding === 'All')
    ? ASSET_CATEGORIES.map(c => c.id)
    : getAllowedAssetCategoriesForBuilding(targetBuilding, customBuildings);

  const categories = allowedCategories.map(cat => categoryBreakdownMap[cat]);

  return {
    total: buildingExts.length,
    inspected: totalInspected,
    pending: totalPending,
    normal: totalNormal,
    damaged: totalDamaged,
    repair: totalRepair,
    counts,
    categories,
    exts: buildingExts
  };
}

export function getAssetCategory(ext: FireExtinguisher): AssetType {
  if (ext.assetType) return ext.assetType;
  const idUpper = (ext.id || '').toUpperCase();
  const typeStr = (ext.type || '');
  if (idUpper.startsWith('EM-') || idUpper.startsWith('EL-') || typeStr.includes('ไฟฉุกเฉิน') || typeStr.includes('Emergency Light')) return 'ไฟฉุกเฉิน';
  if (idUpper.startsWith('EX-') || idUpper.startsWith('EXIT-') || idUpper.startsWith('ES-') || typeStr.includes('ป้ายบอกทางหนีไฟ') || typeStr.includes('ป้ายหนีไฟ') || typeStr.includes('Exit Sign')) return 'ป้ายบอกทางหนีไฟ';
  if (idUpper.startsWith('FCP-') || idUpper.startsWith('FA-') || typeStr.includes('FCP') || typeStr.includes('แจ้งเหตุ') || typeStr.includes('Fire Alarm')) return 'ตู้แจ้งเหตุเพลิงไหม้';
  if (idUpper.startsWith('FHC-') || typeStr.includes('ตู้') || typeStr.includes('Hose')) return 'ตู้ดับเพลิง';
  if (idUpper.startsWith('FD-') || typeStr.includes('ประตู')) return 'ประตูกันไฟ';
  return 'ถังดับเพลิง';
}

export function getAssetIcon(categoryOrExt: AssetType | FireExtinguisher): string {
  const cat = typeof categoryOrExt === 'string' ? categoryOrExt : getAssetCategory(categoryOrExt);
  switch (cat) {
    case 'ตู้ดับเพลิง': return '🗄️';
    case 'ประตูกันไฟ': return '🚪';
    case 'ตู้แจ้งเหตุเพลิงไหม้': return '🚨';
    case 'ไฟฉุกเฉิน': return '💡';
    case 'ป้ายบอกทางหนีไฟ': return '🏃';
    case 'ถังดับเพลิง':
    default: return '🧯';
  }
}

export function getAssetCycleText(categoryOrExt: AssetType | FireExtinguisher): string {
  const cat = typeof categoryOrExt === 'string' ? categoryOrExt : getAssetCategory(categoryOrExt);
  return cat === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'ประจำวัน' : 'รายเดือน';
}
