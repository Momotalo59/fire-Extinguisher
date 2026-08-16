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
