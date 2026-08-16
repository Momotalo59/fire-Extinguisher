import React from 'react';
import { 
  HelpCircle, 
  Flame, 
  Box, 
  DoorClosed, 
  BellRing, 
  Lightbulb, 
  Footprints, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { AssetType, FireExtinguisher } from '../types';

interface SafetyGuidelineCardProps {
  extinguisher: FireExtinguisher | null;
  selectedAssetCategory?: string;
}

interface GuidelineData {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  cycle: string;
  items: { number: number; label: string; detail: string }[];
  importantNote?: string;
}

export default function SafetyGuidelineCard({ extinguisher, selectedAssetCategory }: SafetyGuidelineCardProps) {
  // Determine asset category
  const detectCategory = (): AssetType => {
    if (extinguisher) {
      if (extinguisher.assetType) return extinguisher.assetType;
      if (extinguisher.category) return extinguisher.category;
      if (extinguisher.id) {
        if (extinguisher.id.startsWith('EM-') || extinguisher.id.startsWith('EL-') || extinguisher.type?.includes('ไฟฉุกเฉิน')) return 'ไฟฉุกเฉิน';
        if (extinguisher.id.startsWith('EX-') || extinguisher.id.startsWith('EXIT-') || extinguisher.id.startsWith('ES-') || extinguisher.type?.includes('ทางหนีไฟ') || extinguisher.type?.includes('Exit')) return 'ป้ายบอกทางหนีไฟ';
        if (extinguisher.id.startsWith('FCP-') || extinguisher.id.startsWith('FA-') || extinguisher.type?.includes('แจ้งเหตุ')) return 'ตู้แจ้งเหตุเพลิงไหม้';
        if (extinguisher.id.startsWith('FHC-') || extinguisher.type?.includes('ตู้ดับเพลิง') || extinguisher.type?.includes('สายน้ำ')) return 'ตู้ดับเพลิง';
        if (extinguisher.id.startsWith('FD-') || extinguisher.type?.includes('ประตู')) return 'ประตูกันไฟ';
      }
    }
    if (selectedAssetCategory && selectedAssetCategory !== 'All' && selectedAssetCategory !== 'all') {
      return selectedAssetCategory as AssetType;
    }
    return 'ถังดับเพลิง';
  };

  const currentCategory = detectCategory();

  const guidelines: Record<AssetType, GuidelineData> = {
    'ถังดับเพลิง': {
      title: 'แนวทางการตรวจเช็คถังดับเพลิง (Fire Extinguisher)',
      subtitle: 'เกณฑ์มาตรฐานการตรวจสอบความพร้อมใช้งานตามรอบประจำเดือน',
      icon: <Flame size={18} className="text-red-500" />,
      accentColor: 'border-red-500/30 bg-red-950/20 text-red-400',
      cycle: 'รอบตรวจ: ทุก 1 เดือน',
      items: [
        { number: 1, label: 'เกจวัดแรงดัน (Pressure Gauge)', detail: 'เข็มวัดแรงดันต้องชี้อยู่ในแถบสีเขียว (Green Zone) แสดงถึงแรงดันปกติพร้อมใช้งาน' },
        { number: 2, label: 'สลักและซีลนิรภัย (Safety Pin & Seal)', detail: 'สลักล็อคคันบีบต้องเสียบแน่น และมีซีลพลาสติก/ลวดร้อยผนึกสมบูรณ์ไม่ขาด' },
        { number: 3, label: 'สายฉีดและหัวฉีด (Hose & Nozzle)', detail: 'สายยางไม่แตกลายงา ไม่หักพับงอ และปากหัวฉีดไม่มีแมลงหรือสิ่งแปลกปลอมอุดตัน' },
        { number: 4, label: 'สภาพตัวถังภายนอก (Body Condition)', detail: 'ตัวถังไม่ผุกร่อน ไม่เป็นสนิม ไม่มีรอยบุบ รอยเชื่อม หรือรอยแตกร้าว' },
        { number: 5, label: 'การเข้าถึงสะดวก (Accessibility)', detail: 'แขวนหรือวางในจุดที่กำหนด มองเห็นชัดเจน และไม่มีสิ่งของกีดขวางทางเข้าถึง' }
      ],
      importantNote: 'หากพบเกจตกแถบแดง (Recharge) หรือน้ำหนักถัง CO2 พร่องเกิน 10% ให้ติดป้ายชำรุดและส่งซ่อม/บรรจุใหม่ทันที'
    },
    'ตู้ดับเพลิง': {
      title: 'แนวทางการตรวจเช็คตู้ดับเพลิง (Fire Hose Cabinet)',
      subtitle: 'เกณฑ์มาตรฐานการตรวจสอบตู้สายส่งน้ำดับเพลิงประจำเดือน',
      icon: <Box size={18} className="text-purple-400" />,
      accentColor: 'border-purple-500/30 bg-purple-950/20 text-purple-400',
      cycle: 'รอบตรวจ: ทุก 1 เดือน',
      items: [
        { number: 1, label: 'สภาพตู้และกระจก (Cabinet & Glass)', detail: 'บานตู้เปิด-ปิดได้สะดวก กุญแจและกระจกหน้าตู้ไม่แตกหัก ป้ายหน้าตู้ชัดเจน' },
        { number: 2, label: 'วาล์วน้ำดับเพลิง (Fire Valve)', detail: 'พวงมาลัยวาล์วหมุนคล่อง ปิดสนิท ไม่มีการรั่วซึม สนิม หรือคราบตะกรันเกาะ' },
        { number: 3, label: 'สายส่งน้ำ/โฮสรีล (Fire Hose Reel)', detail: 'สายส่งน้ำม้วน/พับเรียบร้อย เนื้อสายไม่เปื่อยฉีกขาดหรือแข็งกระด้าง' },
        { number: 4, label: 'อุปกรณ์ภายในตู้ครบถ้วน (Equipment)', detail: 'หัวฉีดน้ำสวมต่อแน่น ประแจขันข้อต่อ และถังดับเพลิงภายในตู้ครบสมบูรณ์' },
        { number: 5, label: 'พื้นที่หน้าตู้ (Accessibility)', detail: 'พื้นที่หน้าตู้ดับเพลิงรัศมี 1 เมตร ต้องโล่ง ไม่มีสิ่งของวางบดบังหรือขวางทาง' }
      ],
      importantNote: 'ตรวจสอบให้แน่ใจว่าวาล์วน้ำหลักถูกปิดสนิทและไม่มีน้ำขังค้างในสายส่งน้ำเพื่อป้องกันเชื้อราและการผุกร่อน'
    },
    'ประตูกันไฟ': {
      title: 'แนวทางการตรวจเช็คประตูกันไฟ (Fire Door)',
      subtitle: 'เกณฑ์การตรวจสอบบานประตูกั้นไฟและควันลามประจำเดือน',
      icon: <DoorClosed size={18} className="text-amber-400" />,
      accentColor: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
      cycle: 'รอบตรวจ: ทุก 1 เดือน',
      items: [
        { number: 1, label: 'สภาพบานและวงกบ (Door & Frame)', detail: 'บานประตูและวงกบไม่บิดงอ แนบสนิท บานพับยึดแน่น และลูกบิดคานผลักทำงานปกติ' },
        { number: 2, label: 'สวิตช์ปุ่มกด-แม่เหล็ก (Hold-Open Magnet)', detail: 'ระบบแม่เหล็กไฟฟ้าดูดยึดแน่น และเมื่อกดสวิตช์ปล่อยหรือมีสัญญาณ Alarm ต้องปลดล็อคทันที' },
        { number: 3, label: 'ความเร็วการปิด (Auto-Close Speed)', detail: 'โช้คอัพ (Door Closer) ดึงประตูปิดสนิทภายในเวลามาตรฐาน 10–15 วินาที' },
        { number: 4, label: 'คานผลักหนีไฟ (Panic Bar)', detail: 'คานผลักทำงานนิ่มนวล ผลักเปิดได้ทันทีจากด้านในโดยไม่ต้องใช้กุญแจ' },
        { number: 5, label: 'ซีลยางกันควัน (Intumescent Smoke Seal)', detail: 'ซีลกันควันรอบขอบประตูอยู่ในสภาพดี ไม่หลุดลอก และไม่มีสิ่งกีดขวางแนวปิดประตู' }
      ],
      importantNote: 'ห้ามนำสิ่งของ ไม้ หรือลิ่มไปขัดประตูกันไฟไว้เด็ดขาด ประตูต้องพร้อมปิดสนิทเพื่อสกัดกั้นไฟและควัน'
    },
    'ตู้แจ้งเหตุเพลิงไหม้': {
      title: 'แนวทางการตรวจเช็คตู้แจ้งเหตุเพลิงไหม้ (FCP Panel)',
      subtitle: 'เกณฑ์การตรวจสอบตู้ควบคุมระบบแจ้งเตือนอัคคีภัยหลักประจำวัน',
      icon: <BellRing size={18} className="text-rose-400" />,
      accentColor: 'border-rose-500/30 bg-rose-950/20 text-rose-400',
      cycle: 'รอบตรวจ: ทุกวัน',
      items: [
        { number: 1, label: 'ไฟแสดงสถานะ AC Power', detail: 'ไฟเขียว Power On ติดสว่างปกติ แสดงว่าระบบรับไฟหลัก 220VAC อย่างเสถียร' },
        { number: 2, label: 'ทดสอบไฟหน้าตู้ (Lamp Test)', detail: 'กดปุ่ม Lamp Test หลอดไฟ LED และจอแสดงผลหน้าตู้ต้องติดสว่างทุกดวง' },
        { number: 3, label: 'สถานะการทำงานปกติ (Normal Standby)', detail: 'ไม่มีสัญญาณ Alarm ค้าง ระบบอยู่ในสถานะเฝ้าระวังความปลอดภัยปกติ' },
        { number: 4, label: 'ไม่มีสถานะ Trouble / Fault', detail: 'ไม่มีไฟเหลืองแจ้งเตือนความผิดปกติของลูป สายสัญญาณ หรือแบตเตอรี่สำรอง' },
        { number: 5, label: 'ไม่มีโซนถูก Disable', detail: 'ไม่มีการ Bypass หรือปิดการทำงานของอุปกรณ์ตรวจจับ (Detector) ในพื้นที่สำคัญ' }
      ],
      importantNote: 'หากพบสถานะ Trouble หรือ Fault ให้จดบันทึกรหัสโซนและแจ้งทีมวิศวกรรมอาคารตรวจสอบทันที'
    },
    'ไฟฉุกเฉิน': {
      title: 'แนวทางการตรวจเช็คไฟฉุกเฉิน (Emergency Light)',
      subtitle: 'เกณฑ์การตรวจสอบระบบไฟส่องสว่างฉุกเฉินเมื่อกระแสไฟดับ',
      icon: <Lightbulb size={18} className="text-yellow-400" />,
      accentColor: 'border-yellow-500/30 bg-yellow-950/20 text-yellow-400',
      cycle: 'รอบตรวจ: ทุก 1 เดือน',
      items: [
        { number: 1, label: 'ทดสอบไฟสำรอง (Test Button)', detail: 'กดปุ่ม Test อย่างน้อย 5-10 วินาที หลอดไฟ LED ทั้งสองดวงต้องติดสว่างสมบูรณ์' },
        { number: 2, label: 'ไฟแสดงสถานะชาร์จ (Charging Indicator)', detail: 'ไฟ LED สีส้ม/แดงแสดงสถานะประจุไฟเข้าแบตเตอรี่ และไฟ AC เขียวติดปกติ' },
        { number: 3, label: 'สภาพตัวเครื่องและแบตเตอรี่', detail: 'ตัวถังไม่แตกหัก สายไฟเสียบปลั๊กแน่นหนา และแบตเตอรี่ไม่มีคราบน้ำกรดหรือบวม' },
        { number: 4, label: 'ทัศนวิสัยการติดตั้งในที่สูง (Clear Visibility)', detail: 'โคมไฟติดตั้งในที่สูงมั่นคง หันหน้ากระจายแสงไปยังเส้นทางหนีไฟ ไม่มีสิ่งของบดบัง' }
      ],
      importantNote: 'ควรทำการทดสอบคายประจุแบตเตอรี่เต็มระบบ (Discharge Test 60-90 นาที) ทุกๆ 6 เดือน เพื่อตรวจสอบอายุแบตเตอรี่'
    },
    'ป้ายบอกทางหนีไฟ': {
      title: 'แนวทางการตรวจเช็คป้ายบอกทางหนีไฟ (Exit Sign)',
      subtitle: 'เกณฑ์การตรวจสอบป้ายไฟทางออกฉุกเฉินตลอด 24 ชั่วโมง',
      icon: <Footprints size={18} className="text-emerald-400" />,
      accentColor: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
      cycle: 'รอบตรวจ: ทุก 1 เดือน',
      items: [
        { number: 1, label: 'ความสว่างของป้ายไฟ (Illumination)', detail: 'แผ่นป้ายไฟ LED ต้องติดสว่างชัดเจนสม่ำเสมอทั่วทั้งแผ่นตลอด 24 ชั่วโมง' },
        { number: 2, label: 'ความชัดเจนของสัญลักษณ์ (Sign Clarity)', detail: 'สัญลักษณ์คนวิ่ง ลูกศรชี้ทิศทาง และข้อความ "ทางออก / EXIT" มองเห็นเด่นชัดในระยะไกล' },
        { number: 3, label: 'ระบบสำรองไฟ (Backup Battery)', detail: 'เมื่อทดสอบตัดระบบไฟ ป้ายต้องสลับใช้ไฟสำรองจากแบตเตอรี่และติดสว่างต่อเนื่อง' },
        { number: 4, label: 'ทัศนวิสัยการมองเห็นในที่สูง (Clear Line of Sight)', detail: 'ติดตั้งในตำแหน่งที่สูงตามมาตรฐาน ไม่มีป้ายโฆษณา สิ่งตกแต่ง หรือสิ่งก่อสร้างบดบัง' }
      ],
      importantNote: 'ป้ายบอกทางหนีไฟต้องส่องสว่างตลอดเวลา ห้ามปิดสวิตช์ไฟป้ายเด็ดขาดแม้ในช่วงเวลากลางคืนหรือวันหยุด'
    }
  };

  const currentGuideline = guidelines[currentCategory] || guidelines['ถังดับเพลิง'];

  return (
    <div id="safety-checklist-guide-card" className="bg-slate-900 text-slate-100 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
            {currentGuideline.icon}
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
              {currentGuideline.title}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentGuideline.subtitle}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${currentGuideline.accentColor}`}>
          {currentGuideline.cycle}
        </span>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {currentGuideline.items.map((item) => (
          <div key={item.number} className="flex items-start gap-2 text-[11px] bg-slate-950/50 p-2 rounded-lg border border-slate-850">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              {item.number}
            </span>
            <div className="leading-tight">
              <span className="font-bold text-slate-200">{item.label}: </span>
              <span className="text-slate-400">{item.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Note */}
      {currentGuideline.importantNote && (
        <div className="pt-1">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300/90 text-[11px]">
            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">
              <strong className="font-bold text-amber-300">ข้อควรระวัง: </strong>
              {currentGuideline.importantNote}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
