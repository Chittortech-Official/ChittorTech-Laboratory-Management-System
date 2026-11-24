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
 * Calculates sum of the 9 chemical oxides for a record
 */
export function calculateOxideSum(record: Partial<LaboratoryRecord>): number {
  const values = [
    record.loi,
    record.ir,
    record.so3,
    record.lime,
    record.silica,
    record.alumina,
    record.iron,
    record.magnesia,
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

  // 3. Structured Data Table
  const tableHeaders = [
    'Date',
    'Category',
    'Sample',
    'Shift',
    'LOI %',
    'IR %',
    'SO₃ %',
    'CaO %',
    'SiO₂ %',
    'Al₂O₃ %',
    'Fe₂O₃ %',
    'MgO %',
    'Cl⁻ %',
    'Total %',
  ];

  const tableRows = records.map((r) => {
    const total = calculateOxideSum(r);
    return [
      r.test_date,
      r.category,
      r.sample_id || '-',
      r.shift || '-',
      r.loi !== null ? Number(r.loi).toFixed(2) : '-',
      r.ir !== null ? Number(r.ir).toFixed(2) : '-',
      r.so3 !== null ? Number(r.so3).toFixed(2) : '-',
      r.lime !== null ? Number(r.lime).toFixed(2) : '-',
      r.silica !== null ? Number(r.silica).toFixed(2) : '-',
      r.alumina !== null ? Number(r.alumina).toFixed(2) : '-',
      r.iron !== null ? Number(r.iron).toFixed(2) : '-',
      r.magnesia !== null ? Number(r.magnesia).toFixed(2) : '-',
      r.chloride !== null ? Number(r.chloride).toFixed(3) : '-',
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
    periodLabel: `Single Batch (${record.test_date})`,
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
  const headers = [
    'Date',
    'Category',
    'Sample ID',
    'Shift',
    'LOI (%)',
    'Insoluble Residue IR (%)',
    'Sulphur Trioxide SO3 (%)',
    'Calcium Oxide Lime CaO (%)',
    'Silica SiO2 (%)',
    'Alumina Al2O3 (%)',
    'Iron Oxide Fe2O3 (%)',
    'Magnesia MgO (%)',
    'Chloride Cl (%)',
    'Total Oxides (%)',
    'Notes',
  ];

  const rows = records.map((r) => [
    r.test_date,
    `"${r.category}"`,
    `"${r.sample_id || ''}"`,
    `"${r.shift || ''}"`,
    r.loi !== null && r.loi !== undefined ? r.loi : '',
    r.ir !== null && r.ir !== undefined ? r.ir : '',
    r.so3 !== null && r.so3 !== undefined ? r.so3 : '',
    r.lime !== null && r.lime !== undefined ? r.lime : '',
    r.silica !== null && r.silica !== undefined ? r.silica : '',
    r.alumina !== null && r.alumina !== undefined ? r.alumina : '',
    r.iron !== null && r.iron !== undefined ? r.iron : '',
    r.magnesia !== null && r.magnesia !== undefined ? r.magnesia : '',
    r.chloride !== null && r.chloride !== undefined ? r.chloride : '',
    calculateOxideSum(r),
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ]);

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

export function exportToExcel(records: LaboratoryRecord[], filename: string = 'ChittorTech_Lab_Records') {
  const data = records.map((r) => {
    const bogue = calculateBoguePhases({
      lime: r.lime,
      silica: r.silica,
      alumina: r.alumina,
      iron: r.iron,
      so3: r.so3,
    });

    return {
      'Test Date': r.test_date,
      Category: r.category,
      'Sample ID': r.sample_id || '',
      Shift: r.shift || '',
      'LOI (%)': r.loi,
      'IR (%)': r.ir,
      'SO3 (%)': r.so3,
      'CaO / Lime (%)': r.lime,
      'SiO2 / Silica (%)': r.silica,
      'Al2O3 / Alumina (%)': r.alumina,
      'Fe2O3 / Iron (%)': r.iron,
      'MgO / Magnesia (%)': r.magnesia,
      'Cl / Chloride (%)': r.chloride,
      'Total Oxides (%)': calculateOxideSum(r),
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
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QA Chemical Tests');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Trigger browser download of CSV
 */
export function downloadCsvReport(records: LaboratoryRecord[], meta: ReportMeta = {}) {
  const headers = [
    'Date',
    'Category',
    'Sample ID',
    'Shift',
    'LOI (%)',
    'Insoluble Residue IR (%)',
    'Sulphur Trioxide SO3 (%)',
    'Calcium Oxide Lime CaO (%)',
    'Silica SiO2 (%)',
    'Alumina Al2O3 (%)',
    'Iron Oxide Fe2O3 (%)',
    'Magnesia MgO (%)',
    'Chloride Cl (%)',
    'Total Oxides (%)',
    'Notes',
  ];

  const rows = records.map((r) => [
    r.test_date,
    `"${r.category}"`,
    `"${r.sample_id || ''}"`,
    `"${r.shift || ''}"`,
    r.loi !== null ? r.loi : '',
    r.ir !== null ? r.ir : '',
    r.so3 !== null ? r.so3 : '',
    r.lime !== null ? r.lime : '',
    r.silica !== null ? r.silica : '',
    r.alumina !== null ? r.alumina : '',
    r.iron !== null ? r.iron : '',
    r.magnesia !== null ? r.magnesia : '',
    r.chloride !== null ? r.chloride : '',
    calculateOxideSum(r),
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ]);

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
  const data = records.map((r) => ({
    'Test Date': r.test_date,
    Category: r.category,
    'Sample ID': r.sample_id || '',
    Shift: r.shift || '',
    'LOI (%)': r.loi,
    'IR (%)': r.ir,
    'SO3 (%)': r.so3,
    'CaO / Lime (%)': r.lime,
    'SiO2 / Silica (%)': r.silica,
    'Al2O3 / Alumina (%)': r.alumina,
    'Fe2O3 / Iron (%)': r.iron,
    'MgO / Magnesia (%)': r.magnesia,
    'Cl / Chloride (%)': r.chloride,
    'Total Oxides (%)': calculateOxideSum(r),
    Notes: r.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QA Chemical Tests');

  XLSX.writeFile(workbook, `ChittorTech_QA_Data_${Date.now()}.xlsx`);
}

