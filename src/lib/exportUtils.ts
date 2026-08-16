import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FireExtinguisher, InspectionLog } from '../types';
import { HOSPITAL_LOGO_SRC, TECH_DEPT_LOGO_SRC } from '../assets/logoAssets';

export const cleanInspectorName = (name?: string) => {
  if (!name) return '-';
  let cleaned = name.replace(/\s*\([^)]*@[^)]*\)/g, '').trim();
  if (cleaned.includes('@')) {
    cleaned = cleaned.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '').trim();
  }
  if (!cleaned && name.includes('@')) {
    cleaned = name.split('@')[0];
  }
  return cleaned || name;
};

/**
 * Format Thai Date
 */
export const formatThaiDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' น.';
  } catch {
    return dateStr;
  }
};

/**
 * EXPORT EXTINGUISHERS TO EXCEL (.xlsx)
 */
export const exportExtinguishersToExcel = (extinguishers: FireExtinguisher[], filename = 'รายงานอุปกรณ์ป้องกันอัคคีภัยทั้งหมด.xlsx') => {
  try {
    const data = extinguishers.map((e, index) => {
      const cat = e.assetType || (
        e.id.startsWith('EM-') || e.id.startsWith('EL-') ? 'ไฟฉุกเฉิน' :
        e.id.startsWith('EX-') || e.id.startsWith('EXIT-') || e.id.startsWith('ES-') ? 'ป้ายบอกทางหนีไฟ' :
        e.id.startsWith('FCP-') || e.id.startsWith('FA-') ? 'ตู้แจ้งเหตุเพลิงไหม้' :
        e.id.startsWith('FHC-') ? 'ตู้ดับเพลิง' :
        e.id.startsWith('FD-') ? 'ประตูกันไฟ' : 'ถังดับเพลิง'
      );

      return {
        'ลำดับ': index + 1,
        'รหัสอุปกรณ์': e.id,
        'ประเภทอุปกรณ์': cat,
        'ยี่ห้อ (Brand)': e.brand || '-',
        'รุ่น (Model)': e.model || '-',
        'หมายเลขซีเรียล (S/N)': (e.serialNumber && e.serialNumber !== '-' ? e.serialNumber : '-'),
        'ประเภท/ชนิดอุปกรณ์': e.type,
        'ขนาดความจุ': e.size || '-',
        'อาคาร/สถานที่': e.building || '-',
        'ชั้น': e.floor || '-',
        'รายละเอียดตำแหน่งติดตั้ง': e.locationDetails || '-',
        'สถานะปัจจุบัน': e.status,
        'ละติจูด (Latitude)': e.locationGPS?.latitude ?? 0,
        'ลองจิจูด (Longitude)': e.locationGPS?.longitude ?? 0,
        'วันที่ตรวจเช็คล่าสุด': formatThaiDate(e.lastInspectedAt || undefined),
        'วันหมดอายุ': e.expiryDate ? new Date(e.expiryDate).toLocaleDateString('th-TH') : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto fit column widths
    const colWidths = [
      { wch: 6 },  // ลำดับ
      { wch: 16 }, // รหัสอุปกรณ์
      { wch: 20 }, // ประเภทอุปกรณ์
      { wch: 16 }, // ยี่ห้อ
      { wch: 16 }, // รุ่น
      { wch: 18 }, // S/N
      { wch: 28 }, // ชนิด
      { wch: 12 }, // ขนาด
      { wch: 22 }, // อาคาร
      { wch: 10 }, // ชั้น
      { wch: 30 }, // ตำแหน่ง
      { wch: 14 }, // สถานะ
      { wch: 16 }, // Lat
      { wch: 16 }, // Lng
      { wch: 22 }, // ตรวจล่าสุด
      { wch: 14 }  // หมดอายุ
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายการอุปกรณ์');
    XLSX.writeFile(workbook, filename);
  } catch (err) {
    console.error('Error exporting extinguishers to Excel:', err);
    alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
  }
};

/**
 * EXPORT INSPECTION LOGS TO EXCEL (.xlsx)
 */
export const exportInspectionLogsToExcel = (
  logs: InspectionLog[], 
  extinguishers: FireExtinguisher[] = [],
  filename = 'ประวัติการตรวจเช็คอุปกรณ์ป้องกันอัคคีภัย.xlsx'
) => {
  try {
    const data = logs.map((log, index) => {
      const ext = extinguishers.find(e => e.id === log.feId);
      const assetType = ext?.assetType || (
        log.feId.startsWith('EM-') || log.feId.startsWith('EL-') ? 'ไฟฉุกเฉิน' :
        log.feId.startsWith('EX-') || log.feId.startsWith('EXIT-') || log.feId.startsWith('ES-') ? 'ป้ายบอกทางหนีไฟ' :
        log.feId.startsWith('FCP-') || log.feId.startsWith('FA-') ? 'ตู้แจ้งเหตุเพลิงไหม้' :
        log.feId.startsWith('FHC-') ? 'ตู้ดับเพลิง' :
        log.feId.startsWith('FD-') ? 'ประตูกันไฟ' : 'ถังดับเพลิง'
      );
      
      let item1 = '-';
      let item2 = '-';
      let item3 = '-';
      let item4 = '-';
      let item5 = '-';

      if (assetType === 'ตู้แจ้งเหตุเพลิงไหม้') {
        item1 = `ไฟสถานะ: ${log.checklist?.fcpStatusLed || 'ปกติ'}`;
        item2 = `ทดสอบไฟ: ${log.checklist?.fcpLampTest || 'ปกติ'}`;
        item3 = `สถานะ FCP: ${log.checklist?.fcpMainStatus || 'ปกติ'}`;
        item4 = log.checklist?.fcpTrouble === 'มี Trouble' ? `Trouble (${log.checklist?.fcpTroubleZone || '-'} / ${log.checklist?.fcpTroubleCause || '-'})` : 'ไม่มี Trouble';
        item5 = log.checklist?.fcpDisable === 'มี Disable' ? `Disable (${log.checklist?.fcpDisableZone || '-'} / ${log.checklist?.fcpDisableCause || '-'})` : 'ไม่มี Disable';
      } else if (assetType === 'ไฟฉุกเฉิน') {
        item1 = `สถานะไฟฉุกเฉิน: ${log.checklist?.emergencyLightStatus || log.checklist?.generalStatus || 'ปกติ'}`;
        item2 = `การเข้าถึง/ตำแหน่ง: ${log.checklist?.accessibility || 'ปกติ'}`;
        item3 = '-';
        item4 = '-';
        item5 = '-';
      } else if (assetType === 'ป้ายบอกทางหนีไฟ') {
        item1 = `สถานะป้ายบอกทางหนีไฟ: ${log.checklist?.exitSignStatus || log.checklist?.generalStatus || 'ปกติ'}`;
        item2 = `การเข้าถึง/ตำแหน่ง: ${log.checklist?.accessibility || 'ปกติ'}`;
        item3 = '-';
        item4 = '-';
        item5 = '-';
      } else if (assetType === 'ตู้ดับเพลิง') {
        item1 = `สภาพตู้: ${log.checklist?.cabinetCondition || 'ปกติ'}`;
        item2 = `วาวล์น้ำ: ${log.checklist?.valveStatus || 'ปกติ'}`;
        item3 = `สายฉีด: ${log.checklist?.hoseCondition || 'ปกติ'}`;
        item4 = `อุปกรณ์: ${log.checklist?.cabinetEquipment || 'ครบ'}`;
        item5 = '-';
      } else if (assetType === 'ประตูกันไฟ') {
        item1 = `สภาพประตู: ${log.checklist?.doorCondition || 'ปกติ'}`;
        item2 = `สวิตช์แม่เหล็ก: ${log.checklist?.magnetSwitch || 'ปกติ'}`;
        item3 = `ปิดใน 15วิ: ${log.checklist?.autoCloseSpeed || 'ปกติ'}`;
        item4 = '-';
        item5 = '-';
      } else {
        item1 = `เกจวัดแรงดัน: ${log.checklist?.pressure || 'ปกติ'}`;
        item2 = `สลักนิรภัย: ${log.checklist?.safetyPin || 'ปกติ'}`;
        item3 = `สายฉีด: ${log.checklist?.hoseNozzle || 'ปกติ'}`;
        item4 = `สภาพตัวถัง: ${log.checklist?.bodyCondition || 'ปกติ'}`;
        item5 = `ป้ายคำแนะนำ: ${log.checklist?.instructionLabel || 'ปกติ'}`;
      }

      return {
        'ลำดับ': index + 1,
        'รหัสใบบันทึก': log.inspectionId,
        'รหัสอุปกรณ์': log.feId,
        'ประเภทอุปกรณ์': assetType,
        'ยี่ห้อ/รุ่น': ext?.brand ? `${ext.brand} ${ext.model ? `(${ext.model})` : ''}` : '-',
        'ชนิดอุปกรณ์': ext?.type || '-',
        'อาคาร/สถานที่': ext?.building || '-',
        'ชั้น': ext?.floor || '-',
        'ตำแหน่งติดตั้ง': ext?.locationDetails || '-',
        'รอบการตรวจ': log.inspectionType || (assetType === 'ตู้แจ้งเหตุเพลิงไหม้' ? 'รายวัน' : 'รายเดือน'),
        'ผู้ตรวจสอบ': cleanInspectorName(log.inspectorName),
        'วันเวลาตรวจเช็ค': formatThaiDate(log.inspectionDate),
        'ผลการตรวจสอบ': log.inspectionResult,
        'หัวข้อตรวจ 1': item1,
        'หัวข้อตรวจ 2': item2,
        'หัวข้อตรวจ 3': item3,
        'หัวข้อตรวจ 4': item4,
        'หัวข้อตรวจ 5': item5,
        'การเข้าถึง/ทางหนีไฟ': log.checklist?.accessibility || 'ปกติ',
        'พิกัด GPS ผู้ตรวจ': log.inspectorGPS ? `${log.inspectorGPS.latitude.toFixed(5)}, ${log.inspectorGPS.longitude.toFixed(5)}` : '-',
        'ระยะห่างตำแหน่ง (ม.)': log.distanceDiff ? log.distanceDiff.toFixed(1) : '0',
        'บันทึกเพิ่มเติม': log.notes || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto column width
    worksheet['!cols'] = [
      { wch: 6 },  // ลำดับ
      { wch: 22 }, // รหัสใบ
      { wch: 16 }, // รหัสอุปกรณ์
      { wch: 18 }, // ประเภทอุปกรณ์
      { wch: 20 }, // ยี่ห้อ/รุ่น
      { wch: 26 }, // ชนิด
      { wch: 20 }, // อาคาร
      { wch: 10 }, // ชั้น
      { wch: 25 }, // ตำแหน่ง
      { wch: 15 }, // รอบ
      { wch: 20 }, // ผู้ตรวจ
      { wch: 22 }, // วันเวลา
      { wch: 15 }, // ผล
      { wch: 20 }, // หัวข้อ 1
      { wch: 20 }, // หัวข้อ 2
      { wch: 20 }, // หัวข้อ 3
      { wch: 22 }, // หัวข้อ 4
      { wch: 22 }, // หัวข้อ 5
      { wch: 18 }, // เข้าถึง
      { wch: 22 }, // GPS
      { wch: 16 }, // ระยะ
      { wch: 30 }  // บันทึก
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ประวัติการตรวจเช็ค');
    XLSX.writeFile(workbook, filename);
  } catch (err) {
    console.error('Error exporting inspection logs to Excel:', err);
    alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
  }
};

/**
 * EXPORT EXTINGUISHERS TO PDF (.pdf)
 */
export const exportExtinguishersToPDF = async (extinguishers: FireExtinguisher[], title = 'รายงานสรุปรายการถังดับเพลิงทั้งหมด') => {
  try {
    // Create offscreen container
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '1050px'; // A4 landscape ratio width
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.color = '#000000';
    printContainer.style.padding = '30px';
    printContainer.style.fontFamily = 'Sarabun, Tahoma, sans-serif';

    const nowStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const totalCount = extinguishers.length;
    const normalCount = extinguishers.filter(e => e.status === 'ปกติ').length;
    const issueCount = totalCount - normalCount;

    printContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="width: 140px; text-align: left;">
          <img src="${HOSPITAL_LOGO_SRC}" style="height: 75px; max-width: 130px; object-fit: contain;" alt="Overbrook Hospital Logo" />
        </div>
        <div style="flex: 1; text-align: center; padding: 0 10px;">
          <h1 style="font-size: 20px; font-weight: bold; margin: 0; color: #991b1b; line-height: 1.2;">🔥 FIRE SAFE MANAGER - ระบบบริหารจัดการถังดับเพลิง</h1>
          <h2 style="font-size: 15px; font-weight: bold; margin: 4px 0 0 0; color: #1e293b;">${title}</h2>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">ข้อมูล ณ วันที่: ${nowStr} น.</p>
        </div>
        <div style="width: 140px; text-align: right;">
          <img src="${TECH_DEPT_LOGO_SRC}" style="height: 75px; max-width: 130px; object-fit: contain;" alt="Tech Dept Logo" />
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div><strong>จำนวนถังทั้งหมด:</strong> ${totalCount} ถัง</div>
        <div><strong style="color: #16a34a;">พร้อมใช้งาน (ปกติ):</strong> ${normalCount} ถัง</div>
        <div><strong style="color: #dc2626;">ต้องปรับปรุง/ส่งซ่อม:</strong> ${issueCount} ถัง</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 8px 6px; border: 1px solid #334155; text-align: center; width: 35px;">#</th>
            <th style="padding: 8px 6px; border: 1px solid #334155; width: 100px;">รหัสถัง</th>
            <th style="padding: 8px 6px; border: 1px solid #334155; width: 140px;">ประเภทถัง</th>
            <th style="padding: 8px 6px; border: 1px solid #334155; width: 65px;">ขนาด</th>
            <th style="padding: 8px 6px; border: 1px solid #334155;">อาคาร/สถานที่</th>
            <th style="padding: 8px 6px; border: 1px solid #334155; width: 70px;">ชั้น</th>
            <th style="padding: 8px 6px; border: 1px solid #334155;">รายละเอียดตำแหน่ง</th>
            <th style="padding: 8px 6px; border: 1px solid #334155; width: 90px; text-align: center;">สถานะ</th>
            <th style="padding: 8px 6px; border: 1px solid #334155; width: 120px;">ตรวจเช็คล่าสุด</th>
          </tr>
        </thead>
        <tbody>
          ${extinguishers.map((e, index) => {
            const statusColor = e.status === 'ปกติ' ? '#15803d' : e.status === 'ส่งซ่อม' ? '#7e22ce' : '#b91c1c';
            const bgRow = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            return `
              <tr style="background-color: ${bgRow};">
                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${index + 1}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; font-family: monospace;">${e.id}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1;">${e.type}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1;">${e.size || '-'}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1;">${e.building || '-'}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1;">${e.floor || '-'}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1;">${e.locationDetails || '-'}</td>
                <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${statusColor};">
                  ${e.status}
                </td>
                <td style="padding: 6px; border: 1px solid #cbd5e1;">${formatThaiDate(e.lastInspectedAt || undefined)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; text-align: center; color: #334155;">
        <div style="width: 250px;">
          <p>ลงชื่อ..........................................................</p>
          <p>(..........................................................)</p>
          <p>ผู้สรุปผล</p>
        </div>
        <div style="width: 250px;">
          <p>ลงชื่อ..........................................................</p>
          <p>(..........................................................)</p>
          <p>หัวหน้าแผนกช่างเทคนิคควบคุมระบบ</p>
        </div>
      </div>
    `;

    document.body.appendChild(printContainer);

    const canvas = await html2canvas(printContainer, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    document.body.removeChild(printContainer);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`รายงานถังดับเพลิง_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Error exporting PDF:', err);
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
  }
};

/**
 * EXPORT INSPECTION LOGS TO PDF (.pdf)
 */
export const exportInspectionLogsToPDF = async (
  logs: InspectionLog[], 
  extinguishers: FireExtinguisher[] = [],
  title = 'รายงานประวัติการบันทึกตรวจเช็คถังดับเพลิง'
) => {
  try {
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '1050px';
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.color = '#000000';
    printContainer.style.padding = '30px';
    printContainer.style.fontFamily = 'Sarabun, Tahoma, sans-serif';

    const nowStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const total = logs.length;
    const passCount = logs.filter(l => l.inspectionResult === 'ผ่าน').length;
    const failCount = total - passCount;

    printContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="width: 140px; text-align: left;">
          <img src="${HOSPITAL_LOGO_SRC}" style="height: 75px; max-width: 130px; object-fit: contain;" alt="Overbrook Hospital Logo" />
        </div>
        <div style="flex: 1; text-align: center; padding: 0 10px;">
          <h1 style="font-size: 20px; font-weight: bold; margin: 0; color: #991b1b; line-height: 1.2;">🔥 FIRE SAFE MANAGER - รายงานผลการตรวจสอบประจำวัน/ประจำเดือน</h1>
          <h2 style="font-size: 15px; font-weight: bold; margin: 4px 0 0 0; color: #1e293b;">${title}</h2>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">ออกรายงาน ณ วันที่: ${nowStr} น.</p>
        </div>
        <div style="width: 140px; text-align: right;">
          <img src="${TECH_DEPT_LOGO_SRC}" style="height: 75px; max-width: 130px; object-fit: contain;" alt="Tech Dept Logo" />
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div><strong>จำนวนครั้งที่ตรวจ:</strong> ${total} รายการ</div>
        <div><strong style="color: #16a34a;">ผ่านเกณฑ์มาตรฐาน (PASS):</strong> ${passCount} รายการ</div>
        <div><strong style="color: #dc2626;">พบข้อบกพร่อง (FAIL):</strong> ${failCount} รายการ</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 8px 5px; border: 1px solid #334155; text-align: center; width: 30px;">#</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; width: 90px;">รหัสถัง</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; width: 130px;">อาคาร/สถานที่</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; width: 80px;">รอบการตรวจ</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; width: 110px;">ผู้ตรวจสอบ</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; width: 110px;">วันเวลาที่ตรวจ</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; width: 75px; text-align: center;">ผลการตรวจ</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; text-align: center;">เกจแรงดัน</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; text-align: center;">สลัก/ซีล</th>
            <th style="padding: 8px 5px; border: 1px solid #334155; text-align: center;">สายฉีด</th>
            <th style="padding: 8px 5px; border: 1px solid #334155;">หมายเหตุเพิ่มเติม</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map((log, index) => {
            const ext = extinguishers.find(e => e.id === log.feId);
            const isPass = log.inspectionResult === 'ผ่าน';
            const resultColor = isPass ? '#15803d' : '#b91c1c';
            const bgRow = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            
            return `
              <tr style="background-color: ${bgRow};">
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${index + 1}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1; font-weight: bold; font-family: monospace;">${log.feId}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1;">${ext ? `${ext.building} (${ext.floor})` : '-'}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1;">${log.inspectionType || 'รายเดือน'}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1;">${cleanInspectorName(log.inspectorName)}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1;">${formatThaiDate(log.inspectionDate)}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${resultColor};">
                  ${log.inspectionResult}
                </td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">${log.checklist?.pressure || 'ปกติ'}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">${log.checklist?.safetyPin || 'ปกติ'}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">${log.checklist?.hoseNozzle || 'ปกติ'}</td>
                <td style="padding: 6px 4px; border: 1px solid #cbd5e1;">${log.notes || '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; text-align: center; color: #334155;">
        <div style="width: 250px;">
          <p>ลงชื่อ..........................................................</p>
          <p>(..........................................................)</p>
          <p>ผู้สรุปผล</p>
        </div>
        <div style="width: 250px;">
          <p>ลงชื่อ..........................................................</p>
          <p>(..........................................................)</p>
          <p>หัวหน้าแผนกช่างเทคนิคควบคุมระบบ</p>
        </div>
      </div>
    `;

    document.body.appendChild(printContainer);

    const canvas = await html2canvas(printContainer, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    document.body.removeChild(printContainer);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`ประวัติการตรวจเช็คถังดับเพลิง_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Error exporting PDF:', err);
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
  }
};

export interface MonthlyReportParams {
  periodLabel: string;
  reportMode: 'monthly' | 'custom';
  year: number;
  monthName: string;
  building: string;
  floor: string;
  category: string;
  stats: {
    totalEquipment: number;
    inspectedCount: number;
    pendingCount: number;
    totalInspectionEvents: number;
    passLogsCount: number;
    failLogsCount: number;
    completionRate: number;
    passRate: number;
    categoryStats: Record<string, { total: number; inspected: number; pass: number; fail: number }>;
  };
  logs: InspectionLog[];
  scopedExtinguishers: FireExtinguisher[];
  allExtinguishers: FireExtinguisher[];
  inspectorName: string;
  inspectorPosition: string;
  approverName: string;
  approverPosition: string;
  reportNotes?: string;
}

/**
 * EXPORT MONTHLY & PERIOD INSPECTION SUMMARY TO PDF (.pdf)
 */
export const exportMonthlyInspectionReportPDF = async (params: MonthlyReportParams) => {
  try {
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '1050px';
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.color = '#0f172a';
    printContainer.style.padding = '36px 32px';
    printContainer.style.fontFamily = 'Sarabun, Tahoma, sans-serif';

    const nowStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const buildingLabel = params.building === 'All' ? 'ทุกอาคาร (รวมทั้งโรงพยาบาล)' : params.building;
    const floorLabel = params.floor === 'All' ? 'ทุกชั้น' : params.floor;
    const categoryLabel = params.category === 'All' ? 'ทุกประเภทอุปกรณ์ความปลอดภัย' : params.category;

    // Construct Category Summary Rows
    const categoryRows = Object.entries(params.stats.categoryStats)
      .filter(([_, data]) => data.total > 0 || data.inspected > 0)
      .map(([catName, data], idx) => {
        const compRate = data.total > 0 ? Math.round((data.inspected / data.total) * 100) : 0;
        const passRate = data.inspected > 0 ? Math.round((data.pass / data.inspected) * 100) : 0;
        const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

        return `
          <tr style="background-color: ${bgRow};">
            <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center;">${idx + 1}</td>
            <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #1e293b;">${catName}</td>
            <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${data.total}</td>
            <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; color: #0284c7; font-weight: bold;">${data.inspected}</td>
            <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; color: #16a34a; font-weight: bold;">${data.pass}</td>
            <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; color: ${data.fail > 0 ? '#dc2626' : '#64748b'}; font-weight: bold;">${data.fail}</td>
            <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; background-color: ${compRate >= 100 ? '#dcfce7' : compRate > 50 ? '#e0f2fe' : '#fef3c7'}; color: ${compRate >= 100 ? '#15803d' : compRate > 50 ? '#0369a1' : '#b45309'};">
                ${compRate}%
              </span>
            </td>
          </tr>
        `;
      }).join('');

    // Detailed Inspection Audit Logs (Up to 100 items or full)
    const logRows = params.logs.map((log, idx) => {
      const ext = params.allExtinguishers.find(e => e.id === log.feId);
      const isPass = log.inspectionResult === 'ผ่าน';
      const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const resultBg = isPass ? '#dcfce7' : '#fee2e2';
      const resultColor = isPass ? '#15803d' : '#b91c1c';

      let checkSummary = '-';
      if (log.checklist) {
        if (log.checklist.pressure) {
          checkSummary = `เกจ: ${log.checklist.pressure}, สลัก: ${log.checklist.safetyPin || 'ปกติ'}, สาย: ${log.checklist.hoseNozzle || 'ปกติ'}`;
        } else if (log.checklist.cabinetCondition) {
          checkSummary = `ตู้: ${log.checklist.cabinetCondition}, วาล์ว: ${log.checklist.valveStatus || 'ปกติ'}, สาย: ${log.checklist.hoseCondition || 'ปกติ'}`;
        } else if (log.checklist.doorCondition) {
          checkSummary = `บานประตู: ${log.checklist.doorCondition}, สปีด: ${log.checklist.autoCloseSpeed || 'ปกติ'}, ปล่อยแม่เหล็ก: ${log.checklist.magnetSwitch || 'ปกติ'}`;
        } else if (log.checklist.fcpStatusLed) {
          checkSummary = `ไฟหน้าตู้: ${log.checklist.fcpStatusLed}, สถานะ: ${log.checklist.fcpMainStatus || 'ปกติ'}, Trouble: ${log.checklist.fcpTrouble || 'ไม่มี'}`;
        } else if (log.checklist.emergencyLightStatus || log.checklist.exitSignStatus) {
          checkSummary = `สถานะไฟ/ป้าย: ${log.checklist.emergencyLightStatus || log.checklist.exitSignStatus || 'ปกติ'}, ทางเข้าถึง: ${log.checklist.accessibility || 'ปกติ'}`;
        }
      }

      return `
        <tr style="background-color: ${bgRow};">
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; font-weight: bold; font-family: monospace; color: #991b1b;">${log.feId}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; font-size: 10px;">${ext ? ext.type : '-'}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; font-size: 10px;">${ext ? `${ext.building} (${ext.floor})` : '-'}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; font-size: 10px;">${formatThaiDate(log.inspectionDate)}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; background-color: ${resultBg}; color: ${resultColor};">
              ${log.inspectionResult}
            </span>
          </td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; font-size: 9.5px; color: #334155;">${checkSummary}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; font-size: 10px;">${cleanInspectorName(log.inspectorName)}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; font-size: 9.5px; color: #64748b;">${log.notes || '-'}</td>
        </tr>
      `;
    }).join('');

    printContainer.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #b91c1c; padding-bottom: 14px; margin-bottom: 16px;">
        <div style="width: 140px; text-align: left;">
          <img src="${HOSPITAL_LOGO_SRC}" style="height: 75px; max-width: 135px; object-fit: contain;" alt="Overbrook Hospital Logo" />
        </div>
        <div style="flex: 1; text-align: center; padding: 0 10px;">
          <h1 style="font-size: 18px; font-weight: 800; margin: 0; color: #991b1b; letter-spacing: 0.5px;">โรงพยาบาลโอเวอร์บรุ๊ค เชียงราย (OVERBROOK HOSPITAL)</h1>
          <h2 style="font-size: 15px; font-weight: 700; margin: 3px 0 0 0; color: #0f172a;">รายงานสรุปผลการตรวจสอบและบำรุงรักษาอุปกรณ์ความปลอดภัยและระงับอัคคีภัย</h2>
          <div style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-top: 4px; border: 1px solid #fca5a5;">
            ${params.periodLabel}
          </div>
        </div>
        <div style="width: 140px; text-align: right;">
          <img src="${TECH_DEPT_LOGO_SRC}" style="height: 75px; max-width: 135px; object-fit: contain;" alt="Tech Dept Logo" />
        </div>
      </div>

      <!-- Scope Metadata Bar -->
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; background-color: #f1f5f9; padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 14px; font-size: 11px; color: #334155;">
        <div><strong>อาคารที่สรุป:</strong> <span style="color: #0f172a; font-weight: bold;">${buildingLabel}</span></div>
        <div><strong>ชั้น:</strong> <span style="color: #0f172a; font-weight: bold;">${floorLabel}</span></div>
        <div><strong>ประเภทอุปกรณ์:</strong> <span style="color: #0f172a; font-weight: bold;">${categoryLabel}</span></div>
        <div><strong>ออกรายงานเมื่อ:</strong> <span>${nowStr} น.</span></div>
      </div>

      <!-- Executive KPI Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-top: 4px solid #475569; padding: 10px 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600;">อุปกรณ์ทั้งหมดในระบบ</div>
          <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px;">${params.stats.totalEquipment} <span style="font-size: 11px; font-weight: normal; color: #64748b;">รายการ</span></div>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-top: 4px solid #16a34a; padding: 10px 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; color: #166534; font-weight: 600;">ตรวจเช็คแล้วในงวด (${params.stats.completionRate}%)</div>
          <div style="font-size: 20px; font-weight: 800; color: #15803d; margin-top: 2px;">${params.stats.inspectedCount} <span style="font-size: 11px; font-weight: normal; color: #166534;">รายการ</span></div>
        </div>

        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-top: 4px solid #0284c7; padding: 10px 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; color: #075985; font-weight: 600;">ผ่านเกณฑ์มาตรฐาน (${params.stats.passRate}%)</div>
          <div style="font-size: 20px; font-weight: 800; color: #0369a1; margin-top: 2px;">${params.stats.passLogsCount} <span style="font-size: 11px; font-weight: normal; color: #075985;">รายการ</span></div>
        </div>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-top: 4px solid #dc2626; padding: 10px 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; color: #991b1b; font-weight: 600;">พบข้อบกพร่อง/ชำรุด</div>
          <div style="font-size: 20px; font-weight: 800; color: #b91c1c; margin-top: 2px;">${params.stats.failLogsCount} <span style="font-size: 11px; font-weight: normal; color: #991b1b;">รายการ</span></div>
        </div>
      </div>

      <!-- Section: Category Summary Table -->
      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 12px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0; display: flex; align-items: center; gap: 4px;">
          <span>📊 ตารางสรุปผลการตรวจสอบแยกตามประเภทอุปกรณ์</span>
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: left;">
          <thead>
            <tr style="background-color: #1e293b; color: #ffffff;">
              <th style="padding: 6px 8px; border: 1px solid #334155; text-align: center; width: 35px;">#</th>
              <th style="padding: 6px 8px; border: 1px solid #334155;">ประเภทอุปกรณ์</th>
              <th style="padding: 6px 8px; border: 1px solid #334155; text-align: center; width: 90px;">จำนวนทั้งหมด</th>
              <th style="padding: 6px 8px; border: 1px solid #334155; text-align: center; width: 90px;">ตรวจแล้ว</th>
              <th style="padding: 6px 8px; border: 1px solid #334155; text-align: center; width: 90px;">ผ่านเกณฑ์</th>
              <th style="padding: 6px 8px; border: 1px solid #334155; text-align: center; width: 90px;">พบปัญหา</th>
              <th style="padding: 6px 8px; border: 1px solid #334155; text-align: center; width: 90px;">% ตรวจสำเร็จ</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows || '<tr><td colspan="7" style="text-align: center; padding: 10px; color: #64748b;">ไม่มีข้อมูลอุปกรณ์</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Section: Inspection Audit Logs Table -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
          <h3 style="font-size: 12px; font-weight: 700; color: #1e293b; margin: 0;">
            📝 รายละเอียดบันทึกการตรวจสอบอุปกรณ์รายจุด (${params.logs.length} รายการ)
          </h3>
          <span style="font-size: 10px; color: #64748b;">* ข้อมูลบันทึกตามมาตรฐานการตรวจสอบความปลอดภัยอาคาร</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; text-align: left;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff;">
              <th style="padding: 6px 4px; border: 1px solid #334155; text-align: center; width: 28px;">#</th>
              <th style="padding: 6px 4px; border: 1px solid #334155; width: 85px;">รหัสอุปกรณ์</th>
              <th style="padding: 6px 4px; border: 1px solid #334155; width: 110px;">ชนิดอุปกรณ์</th>
              <th style="padding: 6px 4px; border: 1px solid #334155; width: 120px;">อาคาร/สถานที่</th>
              <th style="padding: 6px 4px; border: 1px solid #334155; width: 105px;">วันเวลาที่ตรวจ</th>
              <th style="padding: 6px 4px; border: 1px solid #334155; width: 60px; text-align: center;">ผลตรวจ</th>
              <th style="padding: 6px 4px; border: 1px solid #334155;">หัวข้อตรวจสภาพ</th>
              <th style="padding: 6px 4px; border: 1px solid #334155; width: 95px;">ผู้ตรวจสอบ</th>
              <th style="padding: 6px 4px; border: 1px solid #334155; width: 110px;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${logRows || '<tr><td colspan="9" style="text-align: center; padding: 14px; color: #64748b;">ไม่พบบันทึกการตรวจเช็คในช่วงเวลาที่เลือก</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Executive Notes / Remarks -->
      ${params.reportNotes ? `
        <div style="background-color: #f8fafc; border: 1px dashed #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; font-size: 10.5px;">
          <strong style="color: #1e293b;">📌 ข้อเสนอแนะและสรุปภาพรวมจากคณะผู้ตรวจ:</strong>
          <span style="color: #475569; margin-left: 4px;">${params.reportNotes}</span>
        </div>
      ` : ''}

      <!-- Signatures Block -->
      <div style="margin-top: 24px; display: flex; justify-content: space-around; font-size: 11px; text-align: center; color: #1e293b; page-break-inside: avoid;">
        <div style="width: 280px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #ffffff;">
          <p style="margin: 0 0 35px 0;">ลงชื่อ....................................................................</p>
          <p style="margin: 0; font-weight: bold;">( ${params.inspectorName || '..........................................................'} )</p>
          <p style="margin: 2px 0 0 0; color: #64748b; font-size: 10px;">${params.inspectorPosition || 'ผู้ตรวจสอบ / สรุปรายงาน'}</p>
          <p style="margin: 4px 0 0 0; font-size: 9.5px; color: #94a3b8;">วันที่ ........./........./............</p>
        </div>

        <div style="width: 280px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #ffffff;">
          <p style="margin: 0 0 35px 0;">ลงชื่อ....................................................................</p>
          <p style="margin: 0; font-weight: bold;">( ${params.approverName || '..........................................................'} )</p>
          <p style="margin: 2px 0 0 0; color: #64748b; font-size: 10px;">${params.approverPosition || 'หัวหน้าแผนกช่างเทคนิคควบคุมระบบ'}</p>
          <p style="margin: 4px 0 0 0; font-size: 9.5px; color: #94a3b8;">วันที่ ........./........./............</p>
        </div>
      </div>

      <!-- Footer Disclaimer -->
      <div style="margin-top: 18px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px;">
        เอกสารรายงานสรุปการบำรุงรักษาประจำงวด ออกโดยระบบ FIRE SAFE MANAGER - โรงพยาบาลโอเวอร์บรุ๊ค เชียงราย
      </div>
    `;

    document.body.appendChild(printContainer);

    const canvas = await html2canvas(printContainer, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    document.body.removeChild(printContainer);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const safeFilename = `รายงานสรุปตรวจเช็คอัคคีภัย_${params.year + 543}_${params.monthName}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(safeFilename);
  } catch (err) {
    console.error('Error exporting monthly inspection PDF:', err);
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF สรุปประจำเดือน');
  }
};

