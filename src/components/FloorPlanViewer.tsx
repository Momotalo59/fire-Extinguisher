import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Building2, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Eye, 
  Navigation, 
  Filter, 
  ShieldCheck, 
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { FireExtinguisher, AssetType, ExtinguisherStatus } from '../types';
import { 
  HOSPITAL_BUILDINGS, 
  ASSET_CATEGORIES, 
  getAssetCategory, 
  getAssetIcon,
  isAssetInspectedInCurrentCycle,
  buildingSupportsFireDoor 
} from '../lib/assetHelpers';

interface FloorPlanViewerProps {
  extinguishers: FireExtinguisher[];
  selectedBuilding: string;
  selectedAssetCategory?: string;
  selectedId?: string | null;
  onSelectExtinguisher: (id: string) => void;
  onInspect?: (ext: FireExtinguisher) => void;
  onSelectBuilding?: (building: string) => void;
  onSelectCategory?: (category: string) => void;
}

// Preset Floor layouts per building with interactive zone boundaries
interface FloorLayout {
  floorId: string;
  floorName: string;
  rooms: {
    id: string;
    name: string;
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
    width: number; // percentage
    height: number; // percentage
    type: 'room' | 'hallway' | 'stair' | 'elevator' | 'exit' | 'restroom';
    label: string;
  }[];
}

export default function FloorPlanViewer({
  extinguishers,
  selectedBuilding: initialBuilding,
  selectedAssetCategory = 'All',
  selectedId,
  onSelectExtinguisher,
  onInspect,
  onSelectBuilding,
  onSelectCategory
}: FloorPlanViewerProps) {
  // Current active building state (default to initial prop or first hospital building)
  const [activeBuilding, setActiveBuilding] = useState<string>(
    initialBuilding && initialBuilding !== 'All' ? initialBuilding : HOSPITAL_BUILDINGS[0].name
  );

  // Sync if prop changes to a specific building
  React.useEffect(() => {
    if (initialBuilding && initialBuilding !== 'All') {
      setActiveBuilding(initialBuilding);
    }
  }, [initialBuilding]);

  // Selected floor within building
  const [activeFloor, setActiveFloor] = useState<string>('ชั้น 1');
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>(selectedAssetCategory);
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>('All');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(true);
  const [hoveredExt, setHoveredExt] = useState<FireExtinguisher | null>(null);
  const [showOnlyUninspected, setShowOnlyUninspected] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Get all unique floors for current building
  const availableFloors = useMemo(() => {
    const bldgExts = extinguishers.filter(e => e.building === activeBuilding);
    const floorsSet = new Set<string>();
    bldgExts.forEach(e => {
      if (e.floor) floorsSet.add(e.floor.trim());
    });
    
    // Standard floors list if none found
    if (floorsSet.size === 0) {
      return ['ชั้น 1', 'ชั้น 2', 'ชั้น 3', 'ชั้น 4'];
    }

    // Sort naturally: ชั้น 1, ชั้น 2, ชั้น 3, ชั้น 4, ชั้น B
    return Array.from(floorsSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [extinguishers, activeBuilding]);

  // If active floor not in available floors, set to first
  React.useEffect(() => {
    if (availableFloors.length > 0 && !availableFloors.includes(activeFloor)) {
      setActiveFloor(availableFloors[0]);
    }
  }, [availableFloors, activeFloor]);

  // Filter extinguishers for this building and floor
  const currentFloorExtinguishers = useMemo(() => {
    return extinguishers.filter(e => {
      const matchBuilding = e.building === activeBuilding;
      const matchFloor = e.floor ? e.floor.trim() === activeFloor.trim() : true;
      const cat = getAssetCategory(e);
      const matchCat = activeFilterCategory === 'All' || cat === activeFilterCategory;
      const matchStatus = activeFilterStatus === 'All' || e.status === activeFilterStatus;
      const isInspected = isAssetInspectedInCurrentCycle(e);
      const matchInspectionFilter = !showOnlyUninspected || !isInspected;

      return matchBuilding && matchFloor && matchCat && matchStatus && matchInspectionFilter;
    });
  }, [extinguishers, activeBuilding, activeFloor, activeFilterCategory, activeFilterStatus, showOnlyUninspected]);

  // Compute deterministic coordinates for equipment markers on 2D map based on ID / locationDetails
  const mappedMarkers = useMemo(() => {
    return currentFloorExtinguishers.map((ext, idx) => {
      // Use GPS or hash ID to calculate stable X, Y percentages (15% to 85% to stay nicely on floor plan)
      let x = 50;
      let y = 50;

      if (ext.locationGPS && ext.locationGPS.latitude && ext.locationGPS.longitude) {
        // Pseudo-project GPS inside normalized container
        const lat = ext.locationGPS.latitude;
        const lng = ext.locationGPS.longitude;
        // Normalize slight GPS deviations to 20%..80% grid
        const seedLat = Math.abs(Math.sin(lat * 10000));
        const seedLng = Math.abs(Math.cos(lng * 10000));
        x = 18 + (seedLng * 64);
        y = 18 + (seedLat * 64);
      } else {
        // Hash based on ID and details
        let hash = 0;
        const str = `${ext.id}-${ext.locationDetails || ''}-${ext.type || ''}-${idx}`;
        for (let i = 0; i < str.length; i++) {
          hash = (hash << 5) - hash + str.charCodeAt(i);
          hash |= 0;
        }
        const absHash = Math.abs(hash);
        // Distribute nicely across rooms & corridors
        const col = idx % 5;
        const row = Math.floor(idx / 5) % 4;
        
        x = 16 + (col * 16) + ((absHash % 10) - 5);
        y = 18 + (row * 18) + (((absHash >> 3) % 10) - 5);
      }

      // Bound within 10% - 90%
      x = Math.max(10, Math.min(90, x));
      y = Math.max(12, Math.min(88, y));

      const isInspected = isAssetInspectedInCurrentCycle(ext);
      const cat = getAssetCategory(ext);

      return {
        ext,
        x,
        y,
        isInspected,
        category: cat,
        isSelected: selectedId === ext.id
      };
    });
  }, [currentFloorExtinguishers, selectedId]);

  // Overall building statistics
  const buildingSummary = useMemo(() => {
    const bldgExts = extinguishers.filter(e => e.building === activeBuilding);
    const total = bldgExts.length;
    let inspected = 0;
    let normal = 0;
    let warning = 0;
    let danger = 0;

    bldgExts.forEach(e => {
      if (isAssetInspectedInCurrentCycle(e)) inspected++;
      if (e.status === 'ปกติ') normal++;
      else if (e.status === 'แรงดันต่ำ' || e.status === 'ใกล้หมดอายุ') warning++;
      else danger++;
    });

    return {
      total,
      inspected,
      pending: total - inspected,
      normal,
      warning,
      danger,
      percent: total > 0 ? Math.round((inspected / total) * 100) : 0
    };
  }, [extinguishers, activeBuilding]);

  // Currently selected equipment details for drawer/popup
  const selectedExt = useMemo(() => {
    if (!selectedId) return null;
    return extinguishers.find(e => e.id === selectedId) || null;
  }, [extinguishers, selectedId]);

  // Dynamic schematic architectural blueprint rooms based on floor
  const floorLayout: FloorLayout = useMemo(() => {
    return {
      floorId: activeFloor,
      floorName: `${activeBuilding} - ${activeFloor}`,
      rooms: [
        { id: 'r1', name: 'โถงทางเดินหลัก (Main Corridor)', x: 10, y: 44, width: 80, height: 14, type: 'hallway', label: '🚶 โถงทางเดินกลางเชื่อมต่อ' },
        { id: 'r2', name: 'ห้องตรวจ / สำนักงาน A', x: 10, y: 12, width: 24, height: 28, type: 'room', label: 'โซน A: ห้องตรวจ/สำนักงาน' },
        { id: 'r3', name: 'ห้องปฏิบัติการ / จุดบริการ B', x: 38, y: 12, width: 24, height: 28, type: 'room', label: 'โซน B: หัตถการ/จุดบริการ' },
        { id: 'r4', name: 'ห้องจ่ายยา / คลังเวชภัณฑ์ C', x: 66, y: 12, width: 24, height: 28, type: 'room', label: 'โซน C: คลังยา/เวชภัณฑ์' },
        { id: 'r5', name: 'ห้องพักเจ้าหน้าที่ / บันทึกเวชระเบียน', x: 10, y: 62, width: 24, height: 26, type: 'room', label: 'โซน D: สำนักงานเจ้าหน้าที่' },
        { id: 'r6', name: 'ห้องควบคุมไฟฟ้า / ระบบอาคาร MDB', x: 38, y: 62, width: 24, height: 26, type: 'room', label: '⚡ โซน E: ห้อง MDB / ไฟฟ้า' },
        { id: 'r7', name: 'ห้องเอนกประสงค์ / จุดพักคอย', x: 66, y: 62, width: 24, height: 26, type: 'room', label: 'โซน F: จุดพักคอย/รอตรวจ' },
        { id: 'stair-left', name: 'บันไดหนีไฟ 1', x: 3, y: 38, width: 6, height: 26, type: 'stair', label: '🪜 บันไดหนีไฟ 1' },
        { id: 'stair-right', name: 'บันไดหนีไฟ 2', x: 91, y: 38, width: 6, height: 26, type: 'stair', label: '🪜 บันไดหนีไฟ 2' },
        { id: 'exit-left', name: 'ทางออกฉุกเฉิน ทิศตะวันตก', x: 3, y: 68, width: 6, height: 16, type: 'exit', label: '🚪 ทางออกฉุกเฉิน (W)' },
        { id: 'exit-right', name: 'ทางออกฉุกเฉิน ทิศตะวันออก', x: 91, y: 16, width: 6, height: 16, type: 'exit', label: '🚪 ทางออกฉุกเฉิน (E)' },
        { id: 'elev', name: 'โถงลิฟต์โดยสาร', x: 44, y: 44, width: 12, height: 14, type: 'elevator', label: '🛗 ลิฟต์' }
      ]
    };
  }, [activeBuilding, activeFloor]);

  return (
    <div className={`flex flex-col gap-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : 'w-full'}`}>
      
      {/* Header Bar: Building Selection & Floor Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Building & Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-950/60 border border-red-900/60 rounded-xl text-red-400 shrink-0 shadow-xs">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-950/40 border border-red-900/50 py-0.5 px-2.5 rounded-full">
                Interactive Floor Plan
              </span>
              <span className="text-xs text-slate-400 font-medium">
                แผนผังจุดติดตั้งอุปกรณ์ระงับอัคคีภัย
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1 flex items-center gap-2">
              <span>{activeBuilding}</span>
              <span className="text-sm font-semibold text-slate-400">({activeFloor})</span>
            </h2>
          </div>
        </div>

        {/* Right: Quick Building Switcher & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Building Selector Dropdown */}
          <div className="relative">
            <select
              value={activeBuilding}
              onChange={(e) => {
                const bldg = e.target.value;
                setActiveBuilding(bldg);
                if (onSelectBuilding) onSelectBuilding(bldg);
              }}
              className="bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-xs"
            >
              {HOSPITAL_BUILDINGS.map(b => (
                <option key={b.id} value={b.name}>{b.icon} {b.name}</option>
              ))}
            </select>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            title={isFullscreen ? "ย่อหน้าจอปกติ" : "ขยายเต็มหน้าจอ"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Floor Plan Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Side: Interactive Canvas (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          
          {/* Floor Tabs & Filter Pills */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md space-y-3">
            
            {/* 1. Floor Selector Pills */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                  <Layers size={14} className="text-red-400" />
                  <span>ชั้น:</span>
                </span>
                {availableFloors.map(floor => (
                  <button
                    key={floor}
                    onClick={() => setActiveFloor(floor)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                      activeFloor === floor
                        ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                        : 'bg-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {floor}
                  </button>
                ))}
              </div>

              {/* Zoom and Reset Controls */}
              <div className="flex items-center gap-1 bg-slate-850 border border-slate-800 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.15))}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="ซูมออก"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-300 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.15))}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="ซูมเข้า"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-0.5 border-l border-slate-800 pl-1.5"
                  title="รีเซ็ตขนาด"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* 2. Category & Quick Status Filter Pills */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                  <Filter size={12} className="text-blue-400" />
                  <span>ประเภท:</span>
                </span>
                {[
                  { id: 'All', label: 'ทั้งหมด' },
                  ...ASSET_CATEGORIES.filter(c => {
                    if (c.id === 'ประตูกันไฟ') return buildingSupportsFireDoor(activeBuilding);
                    return true;
                  }).map(c => ({ id: c.id, label: `${c.icon} ${c.id}` }))
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveFilterCategory(cat.id);
                      if (onSelectCategory) onSelectCategory(cat.id);
                    }}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilterCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                        : 'bg-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Toggle Uninspected Only */}
              <button
                onClick={() => setShowOnlyUninspected(!showOnlyUninspected)}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  showOnlyUninspected
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold'
                    : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Clock size={12} className={showOnlyUninspected ? 'text-amber-400 animate-pulse' : 'text-slate-400'} />
                <span>เฉพาะที่ยังไม่ตรวจ ({buildingSummary.pending})</span>
              </button>
            </div>
          </div>

          {/* Interactive Schematic Floor Plan Canvas */}
          <div 
            ref={containerRef}
            className="relative w-full aspect-[16/10] min-h-[380px] sm:min-h-[460px] bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center select-none"
            style={{
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0),
                linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px, 48px 48px, 48px 48px'
            }}
          >
            {/* Compass Rose Indicator */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-center bg-slate-900/80 backdrop-blur-md border border-slate-800 py-1.5 px-2.5 rounded-xl shadow-md pointer-events-none">
              <span className="text-[10px] font-mono font-extrabold text-red-400">N ▲</span>
              <span className="text-[9px] font-mono text-slate-400">ทิศเหนือ</span>
            </div>

            {/* Scale watermark info */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 py-1 px-2.5 rounded-xl text-[10px] text-slate-400 font-mono pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE CAD SCHEMATIC • {activeBuilding} ({activeFloor})</span>
            </div>

            {/* Transformable Canvas Root */}
            <div 
              className="relative w-full h-full p-4 transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center'
              }}
            >
              {/* Outer Building Wall Outline */}
              <div className="absolute inset-4 sm:inset-6 rounded-2xl border-2 border-slate-700/80 bg-slate-900/40 pointer-events-none shadow-inner" />

              {/* Render Architectural Rooms & Corridors */}
              {floorLayout.rooms.map((room) => {
                const isHallway = room.type === 'hallway';
                const isExit = room.type === 'exit';
                const isStair = room.type === 'stair';
                const isElevator = room.type === 'elevator';

                return (
                  <div
                    key={room.id}
                    className={`absolute rounded-xl border transition-all pointer-events-none flex flex-col items-center justify-center p-1.5 text-center ${
                      isHallway 
                        ? 'border-dashed border-slate-700/60 bg-slate-900/30' 
                        : isExit 
                        ? 'border-emerald-500/40 bg-emerald-950/20' 
                        : isStair 
                        ? 'border-amber-500/40 bg-amber-950/20' 
                        : isElevator 
                        ? 'border-purple-500/40 bg-purple-950/20' 
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                    style={{
                      left: `${room.x}%`,
                      top: `${room.y}%`,
                      width: `${room.width}%`,
                      height: `${room.height}%`
                    }}
                  >
                    <span className={`text-[10px] sm:text-xs font-bold line-clamp-2 select-none ${
                      isExit ? 'text-emerald-400 font-extrabold' :
                      isStair ? 'text-amber-400' :
                      isElevator ? 'text-purple-400' :
                      isHallway ? 'text-slate-400 font-mono text-[9px]' :
                      'text-slate-300'
                    }`}>
                      {room.label}
                    </span>
                  </div>
                );
              })}

              {/* Render Interactive Equipment Markers */}
              <AnimatePresence>
                {mappedMarkers.map(({ ext, x, y, isInspected, category, isSelected }) => {
                  const icon = getAssetIcon(ext);
                  const isHovered = hoveredExt?.id === ext.id;

                  // Status badge color
                  const statusBg = 
                    ext.status === 'ปกติ' ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
                    ext.status === 'แรงดันต่ำ' || ext.status === 'ใกล้หมดอายุ' ? 'bg-amber-500 text-slate-950 shadow-amber-500/30' :
                    ext.status === 'ส่งซ่อม' ? 'bg-blue-500 text-white shadow-blue-500/30' :
                    'bg-rose-500 text-white shadow-rose-500/30';

                  return (
                    <motion.div
                      key={ext.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: isSelected ? 1.25 : isHovered ? 1.15 : 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      whileHover={{ scale: 1.25, zIndex: 40 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSelectExtinguisher(ext.id)}
                      onMouseEnter={() => setHoveredExt(ext)}
                      onMouseLeave={() => setHoveredExt(null)}
                      className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer group focus:outline-none"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      {/* Pulse ring for selected / uninspected items */}
                      {(isSelected || !isInspected) && (
                        <span 
                          className={`absolute -inset-2 rounded-full animate-ping opacity-60 pointer-events-none ${
                            isSelected ? 'bg-red-500' : 'bg-amber-400'
                          }`} 
                        />
                      )}

                      {/* Main Equipment Pin Button */}
                      <div className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-2xl border-2 transition-all shadow-lg ${
                        isSelected 
                          ? 'border-white bg-red-600 text-white ring-4 ring-red-500/40 shadow-red-600/50' 
                          : isInspected 
                          ? 'border-emerald-500/80 bg-slate-900 text-emerald-400 hover:border-white' 
                          : 'border-amber-400/90 bg-slate-900 text-amber-400 hover:border-white animate-bounce-subtle'
                      }`}>
                        <span className="text-sm sm:text-base leading-none select-none">{icon}</span>

                        {/* Status Mini Dot on Corner */}
                        <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 flex items-center justify-center text-[7px] font-bold ${statusBg}`}>
                          {isInspected ? '✓' : '!'}
                        </span>
                      </div>

                      {/* Pin Label Tag */}
                      <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-extrabold whitespace-nowrap shadow-md pointer-events-none transition-all ${
                        isSelected
                          ? 'bg-red-600 text-white font-black scale-110'
                          : 'bg-slate-900/90 border border-slate-800 text-slate-300 group-hover:bg-slate-800 group-hover:text-white'
                      }`}>
                        {ext.id}
                      </div>

                      {/* Tooltip on Hover */}
                      {isHovered && !isSelected && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 pointer-events-none text-left">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-extrabold text-red-400">{ext.id}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                              isInspected ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                            }`}>
                              {isInspected ? 'ตรวจแล้ว' : 'รอตรวจ'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white mt-0.5 truncate">{ext.type}</p>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{ext.locationDetails}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Empty state if no equipment found */}
              {mappedMarkers.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 pointer-events-none">
                  <Flame size={36} className="text-slate-600 mb-2 animate-pulse" />
                  <p className="text-sm font-bold text-slate-300">ไม่พบรายการอุปกรณ์ในเงื่อนไขที่เลือก</p>
                  <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนชั้น หรือปรับตัวกรองประเภทอุปกรณ์ด้านบน</p>
                </div>
              )}
            </div>
          </div>

          {/* Floor Plan Legend Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <Info size={13} className="text-blue-400" />
                <span>คำอธิบายสัญลักษณ์:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>ตรวจแล้วพร้อมใช้</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span>รอตรวจรอบปัจจุบัน</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>ชำรุด / มีปัญหา</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>ส่งซ่อม</span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              แสดงบนแผนผัง: <strong className="text-white">{mappedMarkers.length}</strong> / {buildingSummary.total} รายการ
            </span>
          </div>
        </div>

        {/* Right Side: Building Overview & Selected Equipment Inspector Card (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* 1. Building Compliance Stat Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  สถิติความปลอดภัย
                </span>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  ความพร้อมประจำอาคาร
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
                {activeBuilding}
              </span>
            </div>

            {/* Progress Circle & Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400">ตรวจแล้วแล้วเสร็จ</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-emerald-400 font-sans">{buildingSummary.inspected}</span>
                  <span className="text-xs text-slate-400 font-mono">/ {buildingSummary.total}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${buildingSummary.percent}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400">รอตรวจเช็ค</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-amber-400 font-sans">{buildingSummary.pending}</span>
                  <span className="text-xs text-slate-400">จุด</span>
                </div>
                <p className="text-[9px] text-amber-400/80 font-semibold mt-2">
                  {buildingSummary.pending === 0 ? '✓ ตรวจครบถ้วน 100%' : 'รอบการตรวจประจำเดือน/วัน'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Selected Equipment Inspector Drawer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1">
            {selectedExt ? (
              <motion.div 
                key={selectedExt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold tracking-wide ${
                      selectedExt.status === 'ปกติ' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' :
                      selectedExt.status === 'แรงดันต่ำ' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' :
                      'bg-rose-950/60 text-rose-400 border border-rose-900/50'
                    }`}>
                      {selectedExt.status}
                    </span>
                    <h4 className="text-base font-extrabold text-white mt-1.5 font-mono">
                      {selectedExt.id}
                    </h4>
                  </div>
                  <span className="text-2xl">{getAssetIcon(selectedExt)}</span>
                </div>

                {/* Photo Preview if any */}
                {selectedExt.photoUrl ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                    <img 
                      src={selectedExt.photoUrl} 
                      alt={selectedExt.id} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="py-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-slate-500">
                    <MapPin size={20} className="text-slate-600 mb-1" />
                    <span className="text-[11px] font-bold">พิกัดจุดติดตั้งบนแผนผัง</span>
                  </div>
                )}

                {/* Details list */}
                <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ประเภท:</span>
                    <span className="font-bold text-slate-200 text-right">{selectedExt.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ตําแหน่ง:</span>
                    <span className="font-bold text-white text-right">{selectedExt.floor} - {selectedExt.locationDetails}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">สถานะการตรวจ:</span>
                    <span className={`font-bold ${isAssetInspectedInCurrentCycle(selectedExt) ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isAssetInspectedInCurrentCycle(selectedExt) ? '✓ ตรวจแล้วรอบนี้' : '⏳ รอตรวจเช็ค'}
                    </span>
                  </div>
                  {selectedExt.lastInspectedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">ตรวจล่าสุดเมื่อ:</span>
                      <span className="font-mono text-slate-300">
                        {new Date(selectedExt.lastInspectedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action button: Inspect Now */}
                {onInspect && (
                  <button
                    onClick={() => onInspect(selectedExt)}
                    className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer mt-3"
                  >
                    <span>เปิดแบบฟอร์มตรวจเช็คจุดนี้</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Navigation size={28} className="text-slate-600 mb-2 animate-bounce-subtle" />
                <p className="text-xs font-bold text-slate-300">คลิกที่หมุดบนแผนผัง</p>
                <p className="text-[11px] text-slate-500 mt-1">เลือกจุดติดตั้งบนผังอาคารเพื่อดูข้อมูลจำเพาะและบันทึกผลการตรวจสอบ</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
