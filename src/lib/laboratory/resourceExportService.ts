import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ResourceEquipmentRecord {
  equipment_code: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  location?: string | null;
  last_calibration_date?: string | null;
  next_calibration_date?: string | null;
  calibration_agency?: string | null;
  certificate_no?: string | null;
  maintenance_notes?: string | null;
  status: string;
}

export interface ResourceDocumentRecord {
  doc_code: string;
  title: string;
  category: string;
  version: string;
  revision_number?: string | null;
  effective_date?: string | null;
  review_due_date?: string | null;
  prepared_by?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  standard_ref?: string | null;
  summary?: string | null;
  remarks?: string | null;
  status: string;
}

export interface ResourceStaffRecord {
  staff_name: string;
  employee_id?: string | null;
  designation: string;
  qualified_tests: string;
  training_topic: string;
  training_date?: string | null;
  assessment_score?: string | null;
  competency_status: string;
  valid_until?: string | null;
  trainer_name?: string | null;
  certificate_ref?: string | null;
  approved_by?: string | null;
  notes?: string | null;
}

function splitNotePairs(raw?: string | null): Array<{ label: string; value: string }> {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/\s*\|\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const idx = segment.indexOf(':');
      if (idx > 0 && idx < 60) {
        return {
          label: segment.slice(0, idx).trim(),
          value: segment.slice(idx + 1).trim(),
        };
      }
      return { label: 'Remarks', value: segment };
    })
    .filter((entry) => entry.value.length > 0);
}

function formatDateTag(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function exportResourcesToExcel(params: {
  module: 'equipment' | 'documents' | 'staff';
  equipment: ResourceEquipmentRecord[];
  documents: ResourceDocumentRecord[];
  staff: ResourceStaffRecord[];
}): string {
  const { module, equipment, documents, staff } = params;
  let rows: Record<string, string | number>[] = [];
  let sheetName = 'Register';
  let filename = `ChittorTech_${module}_${formatDateTag()}.xlsx`;

  if (module === 'equipment') {
    sheetName = 'Equipment & Calibration';
    filename = `ChittorTech_Equipment_Register_${formatDateTag()}.xlsx`;

    // Collect every dynamic technical spec column name across all equipment rows so nothing stays hidden
    const dynamicCols: string[] = [];
    const seenCols = new Set<string>();
    equipment.forEach((eq) => {
      splitNotePairs(eq.maintenance_notes).forEach(({ label }) => {
        if (!seenCols.has(label)) {
          seenCols.add(label);
          dynamicCols.push(label);
        }
      });
    });

    rows = equipment.map((eq, idx) => {
      const base: Record<string, string | number> = {
        'Sr. No.': idx + 1,
        'Equipment Code': eq.equipment_code,
        'Equipment / Instrument Name': eq.name,
        Manufacturer: eq.manufacturer || '—',
        Model: eq.model || '—',
        'Serial Number': eq.serial_number || '—',
        Location: eq.location || 'Main QA Lab',
        'Last Calibration Date': eq.last_calibration_date || '—',
        'Next Calibration Due': eq.next_calibration_date || '—',
        'Calibration Agency': eq.calibration_agency || '—',
        'Certificate No.': eq.certificate_no || '—',
        Status: eq.status,
      };
      const pairMap = new Map(splitNotePairs(eq.maintenance_notes).map((p) => [p.label, p.value]));
      for (const col of dynamicCols) {
        base[col] = pairMap.get(col) || '—';
      }
      return base;
    });
  } else if (module === 'documents') {
    sheetName = 'Documents & SOPs';
    filename = `ChittorTech_Documents_SOPs_${formatDateTag()}.xlsx`;
    rows = documents.map((doc, idx) => ({
      'Sr. No.': idx + 1,
      'Doc Code': doc.doc_code,
      Title: doc.title,
      Category: doc.category,
      Version: `v${doc.version}`,
      Revision: doc.revision_number || 'Rev 00',
      'Standard Reference': doc.standard_ref || '—',
      'Effective Date': doc.effective_date || '—',
      'Review Due Date': doc.review_due_date || '—',
      'Prepared By': doc.prepared_by || '—',
      'Reviewed By': doc.reviewed_by || '—',
      'Approved By': doc.approved_by || '—',
      Status: doc.status,
      Summary: doc.summary || '—',
      Remarks: doc.remarks || '—',
    }));
  } else {
    sheetName = 'Staff Competency';
    filename = `ChittorTech_Staff_Competency_${formatDateTag()}.xlsx`;
    rows = staff.map((st, idx) => ({
      'Sr. No.': idx + 1,
      'Staff Name': st.staff_name,
      'Employee ID': st.employee_id || '—',
      Designation: st.designation,
      'Qualified Test Methods': st.qualified_tests,
      'Training Topic': st.training_topic,
      'Training Date': st.training_date || '—',
      'Valid Until': st.valid_until || '—',
      'Assessment Score': st.assessment_score || '—',
      'Trainer Name': st.trainer_name || '—',
      'Certificate Ref': st.certificate_ref || '—',
      'Approved By': st.approved_by || '—',
      'Competency Status': st.competency_status,
      Notes: st.notes || '—',
    }));
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const colKeys = Object.keys(rows[0] || {});
  ws['!cols'] = colKeys.map((key) => {
    const maxLen = Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length));
    return { wch: Math.min(44, Math.max(10, maxLen + 4)) };
  });
  ws['!rows'] = [{ hpt: 24 }, ...rows.map(() => ({ hpt: 20 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
  return filename;
}

export function exportResourcesToPdf(params: {
  module: 'equipment' | 'documents' | 'staff';
  equipment: ResourceEquipmentRecord[];
  documents: ResourceDocumentRecord[];
  staff: ResourceStaffRecord[];
}): string {
  const { module, equipment, documents, staff } = params;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const titleMap = {
    equipment: 'Equipment & Calibration Master Register',
    documents: 'Controlled Documents & SOP Master Register',
    staff: 'Laboratory Staff Training & Competency Register',
  };

  // Top Navy Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ChittorTech QA Laboratory Management System', 12, 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(191, 219, 254);
  doc.text(`${titleMap[module]}  •  ISO/IEC 17025 & NABL Audit Register`, 12, 17.5);

  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Printed: ${timestamp}`, pageWidth - 12, 17.5, { align: 'right' });

  // Summary Info Strip
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(12, 28, pageWidth - 24, 13, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  let summaryText = '';
  if (module === 'equipment') {
    const dueCount = equipment.filter((e) => e.status === 'Calibration Due').length;
    const activeCount = equipment.filter((e) => e.status === 'Active').length;
    summaryText = `Total Equipment: ${equipment.length}   |   Active: ${activeCount}   |   Calibration Due: ${dueCount}   |   Standard: ISO/IEC 17025 Clause 6.4 & 6.5`;
  } else if (module === 'documents') {
    const approvedCount = documents.filter((d) => d.status === 'Approved').length;
    summaryText = `Total Controlled Documents: ${documents.length}   |   Approved & Active: ${approvedCount}   |   Standard: ISO/IEC 17025 Clause 8.2 & 8.3`;
  } else {
    const compCount = staff.filter((s) => s.competency_status === 'Competent').length;
    summaryText = `Total Personnel Records: ${staff.length}   |   Qualified / Competent: ${compCount}   |   Standard: ISO/IEC 17025 Clause 6.2`;
  }
  doc.text(summaryText, 16, 36);

  let head: string[][] = [];
  let body: string[][] = [];
  let columnStyles: Record<number, any> = {};
  let statusColIdx = 0;

  if (module === 'equipment') {
    head = [
      [
        '#',
        'Code',
        'Equipment & Make / Model',
        'Serial / Location',
        'Last Cal. / Next Due',
        'Agency / Cert No.',
        'Technical Specifications & Notes',
        'Status',
      ],
    ];
    statusColIdx = 7;
    body = equipment.map((eq, idx) => {
      const makeModel = [eq.manufacturer, eq.model].filter(Boolean).join(' • ') || '—';
      const specsLines = splitNotePairs(eq.maintenance_notes)
        .map((p) => `${p.label}: ${p.value}`)
        .join('\n');
      return [
        String(idx + 1),
        eq.equipment_code,
        `${eq.name}\n(${makeModel})`,
        `SN: ${eq.serial_number || '—'}\n${eq.location || 'Main QA Lab'}`,
        `Last: ${eq.last_calibration_date || '—'}\nDue: ${eq.next_calibration_date || '—'}`,
        `${eq.calibration_agency || '—'}${eq.certificate_no ? `\n${eq.certificate_no}` : ''}`,
        specsLines || '—',
        eq.status,
      ];
    });
    columnStyles = {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 23, fontStyle: 'bold', textColor: [37, 99, 235] },
      2: { cellWidth: 44 },
      3: { cellWidth: 32 },
      4: { cellWidth: 28 },
      5: { cellWidth: 30 },
      6: { cellWidth: 83 },
      7: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
    };
  } else if (module === 'documents') {
    head = [
      [
        '#',
        'Doc Code',
        'Document Title & Standard Ref',
        'Category',
        'Ver / Rev',
        'Effective / Review Due',
        'Approved By',
        'Status',
      ],
    ];
    statusColIdx = 7;
    body = documents.map((d, idx) => [
      String(idx + 1),
      d.doc_code,
      `${d.title}${d.standard_ref ? `\nRef: ${d.standard_ref}` : ''}`,
      d.category,
      `v${d.version}\n${d.revision_number || 'Rev 00'}`,
      `Eff: ${d.effective_date || '—'}\nDue: ${d.review_due_date || '—'}`,
      d.approved_by || '—',
      d.status,
    ]);
    columnStyles = {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold', textColor: [37, 99, 235] },
      2: { cellWidth: 85 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 34 },
      6: { cellWidth: 40 },
      7: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
    };
  } else {
    head = [
      [
        '#',
        'Staff Name & ID',
        'Designation',
        'Qualified Test Methods',
        'Training Topic',
        'Date / Valid Until',
        'Score / Trainer',
        'Status',
      ],
    ];
    statusColIdx = 7;
    body = staff.map((s, idx) => [
      String(idx + 1),
      `${s.staff_name}${s.employee_id ? `\n(${s.employee_id})` : ''}`,
      s.designation,
      s.qualified_tests,
      s.training_topic,
      `Trn: ${s.training_date || '—'}\nExp: ${s.valid_until || '—'}`,
      `${s.assessment_score || '—'}${s.trainer_name ? `\n${s.trainer_name}` : ''}`,
      s.competency_status,
    ]);
    columnStyles = {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 36, fontStyle: 'bold' },
      2: { cellWidth: 30 },
      3: { cellWidth: 62 },
      4: { cellWidth: 55 },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
      7: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
    };
  }

  autoTable(doc, {
    startY: 45,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [148, 163, 184],
      lineWidth: 0.25,
      textColor: [30, 41, 59],
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [219, 234, 254],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [100, 116, 139],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: 12, right: 12, bottom: 20 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === statusColIdx) {
        const val = String(data.cell.raw || '');
        if (/Active|Approved|Competent/i.test(val)) {
          data.cell.styles.textColor = [21, 128, 61];
        } else if (/Due|Review|Training/i.test(val)) {
          data.cell.styles.textColor = [180, 83, 9];
        } else if (/Maintenance|Out of Service|Obsolete/i.test(val)) {
          data.cell.styles.textColor = [185, 28, 28];
        }
      }
    },
    didDrawPage: () => {
      const pageCount = doc.internal.pages.length - 1;
      doc.setDrawColor(203, 213, 225);
      doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared By: ___________________', 12, pageHeight - 8);
      doc.text('Reviewed By (Technical Manager): ___________________', 92, pageHeight - 8);
      doc.text('Approved By (Quality Manager): ___________________', 185, pageHeight - 8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Page ${pageCount}`, pageWidth - 12, pageHeight - 8, { align: 'right' });
    },
  });

  const filename = `ChittorTech_${module}_Register_${formatDateTag()}.pdf`;
  doc.save(filename);
  return filename;
}
