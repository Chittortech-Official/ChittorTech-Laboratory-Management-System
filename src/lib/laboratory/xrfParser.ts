/**
 * XRF / Spectrometer Instrument Raw File Auto-Parser
 * Parses instrument output files from:
 * - Thermo Fisher Scientific (ARL 9900 / Perform'X)
 * - Malvern Panalytical (Axios / Zetium / Epsilon)
 * - Bruker (S8 TIGER / S2 PUMA)
 * - Shimadzu (EDX / XRF series)
 * - Generic CSV, TSV, TXT, Excel (.xlsx/.xls)
 */

import * as XLSX from 'xlsx';
import { ChemicalParameterKey } from '@/types';

export interface ParsedSample {
  sampleId?: string;
  testDate?: string;
  category?: string;
  values: Record<ChemicalParameterKey, string>;
  rawValues: Record<ChemicalParameterKey, number | null>;
  matchedParametersCount: number;
  detectedInstrument: string;
}

export interface ParseResult {
  success: boolean;
  samples: ParsedSample[];
  selectedSample?: ParsedSample;
  error?: string;
  fileName: string;
}

// Canonical mapping dictionaries for chemical parameters across spectrometer vendors
const PARAMETER_ALIASES: Record<ChemicalParameterKey, string[]> = {
  loi: ['loi', 'l.o.i', 'l.o.i.', 'loss on ignition', 'ignition loss', 'loss'],
  ir: ['ir', 'i.r', 'i.r.', 'insoluble residue', 'insoluble', 'residu insol', 'acid insoluble'],
  so3: ['so3', 'so_3', 'so3%', 'sulphur trioxide', 'sulfur trioxide', 'sulfate', 's'],
  lime: ['cao', 'lime', 'calcium oxide', 'cao%', 'total lime', 'ca'],
  silica: ['sio2', 'silica', 'silicon dioxide', 'sio2%', 'silice', 'si'],
  alumina: ['al2o3', 'alumina', 'aluminium oxide', 'aluminum oxide', 'al2o3%', 'al'],
  iron: ['fe2o3', 'iron oxide', 'ferric oxide', 'iron', 'fe2o3%', 'fe'],
  magnesia: ['mgo', 'magnesia', 'magnesium oxide', 'mgo%', 'mg'],
  chloride: ['cl', 'chloride', 'cl-', 'cl %', 'chlorine', 'chloride cl', 'cl_ppm'],
};

/**
 * Normalizes text for fuzzy matching
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_\-\(\)\%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matches a header string to one of the 9 chemical parameters
 */
function matchParameterKey(rawHeader: string): ChemicalParameterKey | null {
  const norm = normalizeHeader(rawHeader);
  for (const [key, aliases] of Object.entries(PARAMETER_ALIASES)) {
    for (const alias of aliases) {
      if (norm === alias || norm.startsWith(`${alias} `) || norm.endsWith(` ${alias}`)) {
        return key as ChemicalParameterKey;
      }
    }
  }
  return null;
}

/**
 * Clean numeric string from instrument tokens (e.g. "63.45%", "<0.01", "120 ppm")
 */
function cleanNumber(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (str === '-' || str.toLowerCase() === 'nd' || str.toLowerCase() === 'bld') return '';

  // If in ppm for chloride, convert to %
  if (str.toLowerCase().includes('ppm')) {
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) {
      return (num / 10000).toFixed(4);
    }
  }

  // Strip '<', '>', '%', and spaces
  str = str.replace(/[<>\%\s]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? '' : String(parsed);
}

/**
 * Detect instrument vendor from raw lines or metadata
 */
function detectInstrumentVendor(textSample: string): string {
  const lower = textSample.toLowerCase();
  if (lower.includes('thermo') || lower.includes('arl') || lower.includes('oxsas')) {
    return 'Thermo Fisher ARL XRF Spectrometer';
  }
  if (lower.includes('panalytical') || lower.includes('superq') || lower.includes('zetium') || lower.includes('axios')) {
    return 'Malvern Panalytical Zetium/Axios XRF';
  }
  if (lower.includes('bruker') || lower.includes('spectra') || lower.includes('s8 tiger') || lower.includes('puma')) {
    return 'Bruker S8 TIGER XRF Spectrometer';
  }
  if (lower.includes('shimadzu') || lower.includes('edx')) {
    return 'Shimadzu EDX Spectrometer';
  }
  return 'Standard Laboratory XRF Spectrometer';
}

/**
 * Parse an uploaded XRF File (ArrayBuffer or String)
 */
export async function parseXrfInstrumentFile(file: File): Promise<ParseResult> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase();

  try {
    let workbook: XLSX.WorkBook;

    if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(buffer, { type: 'array' });
    } else {
      // CSV, TXT, TSV
      const text = await file.text();
      workbook = XLSX.read(text, { type: 'string' });
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      return { success: false, samples: [], fileName, error: 'Empty instrument file sheet.' };
    }

    // Convert to 2D array of cells
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows || rows.length === 0) {
      return { success: false, samples: [], fileName, error: 'No data rows found in spectrometer file.' };
    }

    const fileTextSample = rows.slice(0, 10).map((r) => r.join(' ')).join(' ');
    const detectedInstrument = detectInstrumentVendor(fileTextSample);

    // Check if format is HORIZONTAL (Columns = Oxides, Rows = Samples)
    // or VERTICAL (Row 1: Element, Row 2: Concentration)
    let headerRowIndex = -1;
    let columnMap: Record<number, ChemicalParameterKey> = {};
    let sampleIdCol = -1;
    let dateCol = -1;

    // Search for header row containing at least 2 oxide names
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      let matches = 0;
      const tempMap: Record<number, ChemicalParameterKey> = {};

      row.forEach((cell: any, colIdx: number) => {
        const str = String(cell).trim();
        const norm = normalizeHeader(str);
        if (norm === 'sample' || norm === 'sample id' || norm === 'sampleid' || norm === 'batch' || norm === 'sample name') {
          sampleIdCol = colIdx;
        } else if (norm === 'date' || norm === 'test date' || norm === 'time') {
          dateCol = colIdx;
        }

        const paramKey = matchParameterKey(str);
        if (paramKey) {
          tempMap[colIdx] = paramKey;
          matches++;
        }
      });

      if (matches >= 2) {
        headerRowIndex = i;
        columnMap = tempMap;
        break;
      }
    }

    // SCENARIO A: Horizontal Tabular Format
    if (headerRowIndex !== -1) {
      const parsedSamples: ParsedSample[] = [];

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every((c: any) => String(c).trim() === '')) continue;

        const values: Record<ChemicalParameterKey, string> = {
          loi: '',
          ir: '',
          so3: '',
          lime: '',
          silica: '',
          alumina: '',
          iron: '',
          magnesia: '',
          chloride: '',
        };
        const rawValues: Record<ChemicalParameterKey, number | null> = {
          loi: null,
          ir: null,
          so3: null,
          lime: null,
          silica: null,
          alumina: null,
          iron: null,
          magnesia: null,
          chloride: null,
        };

        let matchedCount = 0;
        for (const [colIdxStr, paramKey] of Object.entries(columnMap)) {
          const colIdx = Number(colIdxStr);
          const cellVal = cleanNumber(row[colIdx]);
          if (cellVal !== '') {
            values[paramKey] = cellVal;
            rawValues[paramKey] = parseFloat(cellVal);
            matchedCount++;
          }
        }

        if (matchedCount > 0) {
          const sampleId = sampleIdCol !== -1 && row[sampleIdCol] ? String(row[sampleIdCol]).trim() : `Sample-${r - headerRowIndex}`;
          let testDate = dateCol !== -1 && row[dateCol] ? String(row[dateCol]).trim() : undefined;
          // Try parse date if in standard format
          if (testDate && !/^\d{4}-\d{2}-\d{2}$/.test(testDate)) {
            const d = new Date(testDate);
            if (!isNaN(d.getTime())) {
              testDate = d.toISOString().split('T')[0];
            } else {
              testDate = undefined;
            }
          }

          parsedSamples.push({
            sampleId,
            testDate,
            values,
            rawValues,
            matchedParametersCount: matchedCount,
            detectedInstrument,
          });
        }
      }

      if (parsedSamples.length > 0) {
        return {
          success: true,
          samples: parsedSamples,
          selectedSample: parsedSamples[0],
          fileName,
        };
      }
    }

    // SCENARIO B: Vertical Key-Value Format (Row-wise elements: Col 0 = Element, Col 1 = Concentration)
    const values: Record<ChemicalParameterKey, string> = {
      loi: '',
      ir: '',
      so3: '',
      lime: '',
      silica: '',
      alumina: '',
      iron: '',
      magnesia: '',
      chloride: '',
    };
    const rawValues: Record<ChemicalParameterKey, number | null> = {
      loi: null,
      ir: null,
      so3: null,
      lime: null,
      silica: null,
      alumina: null,
      iron: null,
      magnesia: null,
      chloride: null,
    };

    let verticalMatches = 0;
    let verticalSampleId: string | undefined = undefined;

    for (const row of rows) {
      if (!row || row.length < 2) continue;
      const label = String(row[0]).trim();
      const val = cleanNumber(row[1]);

      if (normalizeHeader(label).includes('sample') && !verticalSampleId) {
        verticalSampleId = String(row[1]).trim();
      }

      const paramKey = matchParameterKey(label);
      if (paramKey && val !== '') {
        values[paramKey] = val;
        rawValues[paramKey] = parseFloat(val);
        verticalMatches++;
      }
    }

    if (verticalMatches >= 2) {
      const sample: ParsedSample = {
        sampleId: verticalSampleId || 'Spectrometer-Sample-1',
        values,
        rawValues,
        matchedParametersCount: verticalMatches,
        detectedInstrument,
      };

      return {
        success: true,
        samples: [sample],
        selectedSample: sample,
        fileName,
      };
    }

    return {
      success: false,
      samples: [],
      fileName,
      error: 'Could not detect chemical oxide columns (CaO, SiO2, Al2O3, SO3, etc.). Ensure file is an XRF export or standard CSV.',
    };
  } catch (err: any) {
    console.error('XRF file parsing error:', err);
    return {
      success: false,
      samples: [],
      fileName,
      error: err.message || 'Error parsing spectrometer file.',
    };
  }
}

/**
 * Generates and downloads a dummy demo XRF spectrometer CSV file so chemists can test drag-and-drop
 */
export function generateDemoXrfCsv(): void {
  const csvContent =
    'Sample ID,Analysis Date,LOI %,IR %,SO3 %,CaO %,SiO2 %,Al2O3 %,Fe2O3 %,MgO %,Cl %\n' +
    'BallMill-Batch-801,2026-11-24,1.15,0.72,2.42,63.65,21.15,5.15,3.25,1.75,0.012\n' +
    'BallMill-Batch-802,2026-11-24,1.20,0.68,2.38,63.80,21.05,5.22,3.30,1.80,0.014\n' +
    'Clinker-Kiln-Line1,2026-11-24,0.45,0.35,0.85,65.20,21.80,5.40,3.50,1.90,0.008\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Thermo_ARL_XRF_Sample_Batch.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

