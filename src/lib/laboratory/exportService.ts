import { LaboratoryRecord } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { calculateBoguePhases } from './bogueEngine';

export interface ReportMeta {
  title?: string;
  userName?: string;
  userEmail?: string;
  plantName?: string;
  periodLabel?: string;
  category?: string;
}

/**
 * Calculates sum of the chemical oxides for a record
 */
export function calculateOxideSum(record: Partial<LaboratoryRecord>): number {
  const values = [
    record.loi,
    record.ir,
    record.so3,
    record.silica,
    record.alumina,
    record.iron,
    record.lime,
    record.magnesia,
    record.k2o,
    record.na2o,
    record.chloride,
  ];
  const sum = values.reduce<number>((acc, v) => {
    return v !== null && v !== undefined && !isNaN(Number(v)) ? acc + Number(v) : acc;
  }, 0);
  return Number(sum.toFixed(2));
}

/**
 * Generate Professional Industrial PDF Report
 */
export function generatePdfDocument(records: LaboratoryRecord[], meta: ReportMeta = {}): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currentDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // 1. Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900 (ChittorTech Navy)
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ChittorTech QA Laboratory Management System', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Industrial Quality Assurance & Cement Chemical Analysis Report', 14, 18);

  doc.setFontSize(8);
  doc.text(`Generated: ${currentDate}`, pageWidth - 14, 18, { align: 'right' });

  // 2. Metadata Information Block
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 28, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Col 1
  doc.text('Facility / Plant:', 18, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.plantName || 'Integrated Materials QA Plant', 45, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('Reporting Period:', 18, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.periodLabel || 'All Historical Records', 45, 42);

  // Col 2
  doc.setFont('helvetica', 'bold');
  doc.text('Category Filter:', 120, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.category || 'All Categories (Ball Mill, Clinker, etc.)', 148, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Records:', 120, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`${records.length} logged testing samples`, 148, 42);

  // Col 3
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized User:', 210, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.userName || meta.userEmail || 'QA Chemist', 240, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('Compliance:', 210, 42);
  doc.setFont('helvetica', 'normal');
  doc.text('ISO / ASTM / BIS QA Protocol', 240, 42);

  // 3. Structured Data Table in exact standard parameter sequence:
  // LOI -> IR -> SO3 -> SiO2 -> Al2O3 -> Fe2O3 -> CaO -> MgO -> K2O -> Na2O -> Chloride
  const tableHeaders = [
    'Date (DD-MM-YYYY)',
    'Category',
    'Sample',
    'Shift',
    'LOI %',
    'IR %',
    'SO₃ %',
    'SiO₂ %',
    'Al₂O₃ %',
    'Fe₂O₃ %',
    'CaO %',
    'MgO %',
    'K₂O %',
    'Na₂O %',
    'Cl⁻ %',
    'Total %',
  ];

  const tableRows = records.map((r) => {
    const total = calculateOxideSum(r);
    return [
      formatDateDDMMYYYY(r.test_date),
      r.category,
      r.sample_id || '-',
      r.shift || '-',
      r.loi !== null ? Number(r.loi).toFixed(2) : '-',
      r.ir !== null ? Number(r.ir).toFixed(2) : '-',
      r.so3 !== null ? Number(r.so3).toFixed(2) : '-',
      r.silica !== null ? Number(r.silica).toFixed(2) : '-',
      r.alumina !== null ? Number(r.alumina).toFixed(2) : '-',
      r.iron !== null ? Number(r.iron).toFixed(2) : '-',
      r.lime !== null ? Number(r.lime).toFixed(2) : '-',
      r.magnesia !== null ? Number(r.magnesia).toFixed(2) : '-',
      r.k2o !== null && r.k2o !== undefined ? Number(r.k2o).toFixed(2) : '-',
      r.na2o !== null && r.na2o !== undefined ? Number(r.na2o).toFixed(2) : '-',
      r.chloride !== null ? Number(r.chloride).toFixed(4) : '-',
      total > 0 ? `${total.toFixed(2)}%` : '-',
    ];
  });

  autoTable(doc, {
    startY: 52,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 22 }, // Date
      1: { halign: 'left', cellWidth: 28 }, // Category
      2: { cellWidth: 18 },
      3: { cellWidth: 16 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Clean Footer with Page Numbers
      const pageStr = `Page ${doc.internal.pages.length - 1}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        '© ChittorTech QA Laboratory Management System • Official Industrial Record • Confidential',
        14,
        pageHeight - 6
      );
      doc.text(pageStr, pageWidth - 14, pageHeight - 6, { align: 'right' });
    },
  });

  return doc;
}

/**
 * Trigger browser download of PDF
 */
export function downloadPdfReport(records: LaboratoryRecord[], meta: ReportMeta = {}) {
  const doc = generatePdfDocument(records, meta);
  const filename = `ChittorTech_QA_Report_${meta.periodLabel?.replace(/[^a-zA-Z0-9]/g, '_') || 'Export'}.pdf`;
  doc.save(filename);
}

export interface ExportPdfOptions {
  reportingPeriod?: string;
  category?: string;
  userName?: string;
  userEmail?: string;
  plantName?: string;
}

export function generateLaboratoryPdf(records: LaboratoryRecord[], options: ExportPdfOptions = {}) {
  downloadPdfReport(records, {
    periodLabel: options.reportingPeriod,
    category: options.category,
    userName: options.userName,
    userEmail: options.userEmail,
    plantName: options.plantName,
  });
}

export function generateSingleRecordPdf(record: LaboratoryRecord, options: ExportPdfOptions = {}) {
  downloadPdfReport([record], {
    periodLabel: `Single Batch (${formatDateDDMMYYYY(record.test_date)})`,
    category: record.category,
    userName: options.userName,
    userEmail: options.userEmail,
    plantName: options.plantName,
  });
}

export function generateLaboratoryPdfBase64(records: LaboratoryRecord[], options: ExportPdfOptions = {}): string {
  const doc = generatePdfDocument(records, {
    periodLabel: options.reportingPeriod,
    category: options.category,
    userName: options.userName,
    userEmail: options.userEmail,
    plantName: options.plantName,
  });
  const dataUri = doc.output('datauristring');
  // strip out the 'data:application/pdf;filename=generated.pdf;base64,' prefix
  const base64Index = dataUri.indexOf(';base64,');
  if (base64Index !== -1) {
    return dataUri.substring(base64Index + 8);
  }
  return dataUri;
}

export function exportToCsv(records: LaboratoryRecord[], filename: string = 'ChittorTech_Lab_Records') {
  // Use a descriptive header with format indicator so Excel automatically opens Column A with sufficient width (>18 chars)
  // Sequence: 1. LOI, 2. IR, 3. SO3, 4. SiO2, 5. Al2O3, 6. Fe2O3, 7. CaO, 8. MgO, 9. K2O, 10. Na2O, 11. Chloride
  const headers = [
    'Testing Date (YYYY-MM-DD)',
    'Plant Category',
    'Sample ID',
    'Shift',
    'LOI (%)',
    'Insoluble Residue IR (%)',
    'Sulphur Trioxide SO3 (%)',
    'Silica SiO2 (%)',
    'Alumina Al2O3 (%)',
    'Iron Oxide Fe2O3 (%)',
    'Calcium Oxide Lime CaO (%)',
    'Magnesium Oxide MgO (%)',
    'Potassium Oxide K2O (%)',
    'Sodium Oxide Na2O (%)',
    'Chloride Cl (%)',
    'Total Oxides (%)',
    'Notes',
  ];

  const rows = records.map((r) => {
    // Format strictly as DD-MM-YYYY
    const cleanDate = formatDateDDMMYYYY(r.test_date);
    return [
      cleanDate,
      `"${r.category}"`,
      `"${r.sample_id || ''}"`,
      `"${r.shift || ''}"`,
      r.loi !== null && r.loi !== undefined ? Number(r.loi).toFixed(2) : '',
      r.ir !== null && r.ir !== undefined ? Number(r.ir).toFixed(2) : '',
      r.so3 !== null && r.so3 !== undefined ? Number(r.so3).toFixed(2) : '',
      r.silica !== null && r.silica !== undefined ? Number(r.silica).toFixed(2) : '',
      r.alumina !== null && r.alumina !== undefined ? Number(r.alumina).toFixed(2) : '',
      r.iron !== null && r.iron !== undefined ? Number(r.iron).toFixed(2) : '',
      r.lime !== null && r.lime !== undefined ? Number(r.lime).toFixed(2) : '',
      r.magnesia !== null && r.magnesia !== undefined ? Number(r.magnesia).toFixed(2) : '',
      r.k2o !== null && r.k2o !== undefined ? Number(r.k2o).toFixed(2) : '',
      r.na2o !== null && r.na2o !== undefined ? Number(r.na2o).toFixed(2) : '',
      r.chloride !== null && r.chloride !== undefined ? Number(r.chloride).toFixed(4) : '',
      calculateOxideSum(r).toFixed(2),
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats a valid date object or string strictly into DD-MM-YYYY format.
 * Examples: '2026-11-25' -> '25-11-2026', '2026-11-09' -> '09-11-2026'
 */
export function formatDateDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const clean = dateInput.split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }
  }
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return String(dateInput);
}

/**
 * Formats a valid date object or string into DD_MM_YYYY format.
 * Examples: '2026-11-19' -> '19_11_2026', '2026-11-25' -> '25_11_2026'
 */
export function formatReportDateDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;
  }

  if (typeof dateInput === 'string') {
    const clean = dateInput.split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}_${month.padStart(2, '0')}_${year}`;
    }
    if (parts.length === 2) {
      // YYYY-MM
      const [year, month] = parts;
      return `01_${month.padStart(2, '0')}_${year}`;
    }
  }

  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}`;
  }

  const fallback = new Date();
  return `${String(fallback.getDate()).padStart(2, '0')}_${String(fallback.getMonth() + 1).padStart(2, '0')}_${fallback.getFullYear()}`;
}

/**
 * Generates the standardized Excel filename: OperatorName_DD_MM_YYYY.xlsx
 * Requirements:
 * - Format: OperatorName_DD_MM_YYYY.xlsx
 * - Examples: Rahul_Sharma_19_11_2026.xlsx, Amit_Kumar_25_11_2026.xlsx
 * - Replaces spaces with underscores.
 * - Strips invalid filename characters.
 * - Safe fallback: Operator_DD_MM_YYYY.xlsx. Never displays undefined, null or empty.
 */
export function buildExcelFilename(operatorName?: string | null, reportDate?: string | Date | null): string {
  let rawName = (operatorName || '').trim();

  // Strip company prefixes or default placeholders if present
  if (rawName.toLowerCase().startsWith('chittortech')) {
    rawName = rawName.replace(/chittortech/i, '').trim();
  }

  let cleanName = rawName
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim();

  if (
    !cleanName ||
    cleanName.toLowerCase() === 'undefined' ||
    cleanName.toLowerCase() === 'null' ||
    cleanName.toLowerCase() === 'chittortech' ||
    cleanName.toLowerCase() === 'user'
  ) {
    cleanName = 'Operator';
  }

  const dateStr = formatReportDateDDMMYYYY(reportDate);
  return `${cleanName}_${dateStr}.xlsx`;
}

export function exportToExcel(
  records: LaboratoryRecord[],
  filenameOrOptions?: string | { operatorName?: string; reportDate?: string | Date },
  fallbackDate?: string | Date
) {
  let targetFilename: string;

  if (typeof filenameOrOptions === 'object' && filenameOrOptions !== null) {
    targetFilename = buildExcelFilename(filenameOrOptions.operatorName, filenameOrOptions.reportDate);
  } else if (typeof filenameOrOptions === 'string' && filenameOrOptions.trim().length > 0) {
    if (filenameOrOptions.endsWith('.xlsx')) {
      targetFilename = filenameOrOptions;
    } else if (filenameOrOptions.includes('_') && !filenameOrOptions.toLowerCase().includes('chittortech')) {
      targetFilename = `${filenameOrOptions}.xlsx`;
    } else {
      // Legacy or company prefix string passed: extract clean date and convert to standard format
      const dateSource = records[0]?.test_date || fallbackDate || new Date();
      targetFilename = buildExcelFilename(undefined, dateSource);
    }
  } else {
    const dateSource = records[0]?.test_date || fallbackDate || new Date();
    targetFilename = buildExcelFilename(undefined, dateSource);
  }

  const data = records.map((r) => {
    const bogue = calculateBoguePhases({
      lime: r.lime,
      silica: r.silica,
      alumina: r.alumina,
      iron: r.iron,
      so3: r.so3,
    });

    const cleanDate = formatDateDDMMYYYY(r.test_date);

    return {
      'Testing Date (DD-MM-YYYY)': cleanDate,
      Category: r.category,
      'Sample ID': r.sample_id || '',
      Shift: r.shift || '',
      'LOI (%)': r.loi !== null && r.loi !== undefined ? Number(r.loi).toFixed(2) : '',
      'IR (%)': r.ir !== null && r.ir !== undefined ? Number(r.ir).toFixed(2) : '',
      'SO3 (%)': r.so3 !== null && r.so3 !== undefined ? Number(r.so3).toFixed(2) : '',
      'SiO2 / Silica (%)': r.silica !== null && r.silica !== undefined ? Number(r.silica).toFixed(2) : '',
      'Al2O3 / Alumina (%)': r.alumina !== null && r.alumina !== undefined ? Number(r.alumina).toFixed(2) : '',
      'Fe2O3 / Iron (%)': r.iron !== null && r.iron !== undefined ? Number(r.iron).toFixed(2) : '',
      'CaO / Lime (%)': r.lime !== null && r.lime !== undefined ? Number(r.lime).toFixed(2) : '',
      'MgO / Magnesia (%)': r.magnesia !== null && r.magnesia !== undefined ? Number(r.magnesia).toFixed(2) : '',
      'K2O / Potassium (%)': r.k2o !== undefined && r.k2o !== null ? Number(r.k2o).toFixed(2) : '',
      'Na2O / Sodium (%)': r.na2o !== undefined && r.na2o !== null ? Number(r.na2o).toFixed(2) : '',
      'Cl / Chloride (%)': r.chloride !== null && r.chloride !== undefined ? Number(r.chloride).toFixed(4) : '',
      'Total Oxides (%)': calculateOxideSum(r).toFixed(2),
      'LSF (Lime Saturation)': bogue.lsf !== null ? bogue.lsf : '',
      'SM (Silica Ratio)': bogue.sm !== null ? bogue.sm : '',
      'AM (Alumina Ratio)': bogue.am !== null ? bogue.am : '',
      'C3S Alite (%)': bogue.c3s !== null ? bogue.c3s : '',
      'C2S Belite (%)': bogue.c2s !== null ? bogue.c2s : '',
      'C3A (%)': bogue.c3a !== null ? bogue.c3a : '',
      'C4AF (%)': bogue.c4af !== null ? bogue.c4af : '',
      'Strength Profile': bogue.strengthProfile,
      Notes: r.notes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set explicit column widths to prevent Excel "#######" narrow column bug
  worksheet['!cols'] = [
    { wch: 24 }, // Testing Date
    { wch: 22 }, // Category
    { wch: 14 }, // Sample ID
    { wch: 12 }, // Shift
    { wch: 12 }, // LOI
    { wch: 14 }, // IR
    { wch: 12 }, // SO3
    { wch: 16 }, // SiO2
    { wch: 16 }, // Al2O3
    { wch: 16 }, // Fe2O3
    { wch: 16 }, // CaO
    { wch: 16 }, // MgO
    { wch: 16 }, // K2O
    { wch: 16 }, // Na2O
    { wch: 14 }, // Cl
    { wch: 16 }, // Total Oxides
    { wch: 16 }, // LSF
    { wch: 12 }, // SM
    { wch: 12 }, // AM
    { wch: 14 }, // C3S
    { wch: 14 }, // C2S
    { wch: 12 }, // C3A
    { wch: 12 }, // C4AF
    { wch: 18 }, // Strength Profile
    { wch: 30 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QA Chemical Tests');

  XLSX.writeFile(workbook, targetFilename);
}

/**
 * Trigger browser download of CSV
 */
export function downloadCsvReport(records: LaboratoryRecord[], meta: ReportMeta = {}) {
  const headers = [
    'Testing Date (YYYY-MM-DD)',
    'Plant Category',
    'Sample ID',
    'Shift',
    'LOI (%)',
    'Insoluble Residue IR (%)',
    'Sulphur Trioxide SO3 (%)',
    'Silica SiO2 (%)',
    'Alumina Al2O3 (%)',
    'Iron Oxide Fe2O3 (%)',
    'Calcium Oxide Lime CaO (%)',
    'Magnesium Oxide MgO (%)',
    'Potassium Oxide K2O (%)',
    'Sodium Oxide Na2O (%)',
    'Chloride Cl (%)',
    'Total Oxides (%)',
    'Notes',
  ];

  const rows = records.map((r) => {
    const cleanDate = formatDateDDMMYYYY(r.test_date);
    return [
      cleanDate,
      `"${r.category}"`,
      `"${r.sample_id || ''}"`,
      `"${r.shift || ''}"`,
      r.loi !== null && r.loi !== undefined ? Number(r.loi).toFixed(2) : '',
      r.ir !== null && r.ir !== undefined ? Number(r.ir).toFixed(2) : '',
      r.so3 !== null && r.so3 !== undefined ? Number(r.so3).toFixed(2) : '',
      r.silica !== null && r.silica !== undefined ? Number(r.silica).toFixed(2) : '',
      r.alumina !== null && r.alumina !== undefined ? Number(r.alumina).toFixed(2) : '',
      r.iron !== null && r.iron !== undefined ? Number(r.iron).toFixed(2) : '',
      r.lime !== null && r.lime !== undefined ? Number(r.lime).toFixed(2) : '',
      r.magnesia !== null && r.magnesia !== undefined ? Number(r.magnesia).toFixed(2) : '',
      r.k2o !== null && r.k2o !== undefined ? Number(r.k2o).toFixed(2) : '',
      r.na2o !== null && r.na2o !== undefined ? Number(r.na2o).toFixed(2) : '',
      r.chloride !== null && r.chloride !== undefined ? Number(r.chloride).toFixed(4) : '',
      calculateOxideSum(r).toFixed(2),
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ChittorTech_QA_Data_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trigger browser download of Excel (XLSX)
 */
export function downloadExcelReport(records: LaboratoryRecord[], meta: ReportMeta = {}) {
  const data = records.map((r) => {
    const cleanDate = formatDateDDMMYYYY(r.test_date);
    return {
      'Testing Date (DD-MM-YYYY)': cleanDate,
      Category: r.category,
      'Sample ID': r.sample_id || '',
      Shift: r.shift || '',
      'LOI (%)': r.loi !== null && r.loi !== undefined ? Number(r.loi).toFixed(2) : '',
      'IR (%)': r.ir !== null && r.ir !== undefined ? Number(r.ir).toFixed(2) : '',
      'SO3 (%)': r.so3 !== null && r.so3 !== undefined ? Number(r.so3).toFixed(2) : '',
      'SiO2 / Silica (%)': r.silica !== null && r.silica !== undefined ? Number(r.silica).toFixed(2) : '',
      'Al2O3 / Alumina (%)': r.alumina !== null && r.alumina !== undefined ? Number(r.alumina).toFixed(2) : '',
      'Fe2O3 / Iron (%)': r.iron !== null && r.iron !== undefined ? Number(r.iron).toFixed(2) : '',
      'CaO / Lime (%)': r.lime !== null && r.lime !== undefined ? Number(r.lime).toFixed(2) : '',
      'MgO / Magnesia (%)': r.magnesia !== null && r.magnesia !== undefined ? Number(r.magnesia).toFixed(2) : '',
      'K2O / Potassium (%)': r.k2o !== undefined && r.k2o !== null ? Number(r.k2o).toFixed(2) : '',
      'Na2O / Sodium (%)': r.na2o !== undefined && r.na2o !== null ? Number(r.na2o).toFixed(2) : '',
      'Cl / Chloride (%)': r.chloride !== null && r.chloride !== undefined ? Number(r.chloride).toFixed(4) : '',
      'Total Oxides (%)': calculateOxideSum(r).toFixed(2),
      Notes: r.notes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 24 }, // Testing Date
    { wch: 22 }, // Category
    { wch: 14 }, // Sample ID
    { wch: 12 }, // Shift
    { wch: 12 }, // LOI
    { wch: 14 }, // IR
    { wch: 12 }, // SO3
    { wch: 16 }, // SiO2
    { wch: 16 }, // Al2O3
    { wch: 16 }, // Fe2O3
    { wch: 16 }, // CaO
    { wch: 16 }, // MgO
    { wch: 16 }, // K2O
    { wch: 16 }, // Na2O
    { wch: 14 }, // Cl
    { wch: 16 }, // Total Oxides
    { wch: 30 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QA Chemical Tests');

  const operatorName = meta.userName || 'Operator';
  const reportDate = records[0]?.test_date || new Date();
  const filename = buildExcelFilename(operatorName, reportDate);

  XLSX.writeFile(workbook, filename);
}

