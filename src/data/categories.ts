import { LabCategory } from '@/types';

/**
 * ============================================================================
 * CHITTORTECH LABORATORY MANAGEMENT SYSTEM — CENTRALIZED CATEGORY CONFIGURATION
 * ============================================================================
 * 
 * NOTE FOR DEVELOPER / PRODUCT OWNER:
 * When the final 8–10 official laboratory categories are provided, replace the
 * entries in this array. The CategorySelector and the rest of the application
 * read exclusively from this centralized file.
 * 
 * Structure:
 * - id: unique lowercase key (e.g. 'hematology')
 * - code: 3-4 character official laboratory code (e.g. 'HEM')
 * - name: Display title
 * - description: Brief description of the specimen / test domain
 * - iconName: Matching Lucide icon ('Activity', 'FlaskConical', 'Dna', 'Microscope', etc.)
 * - badge: Optional laboratory badge (e.g. 'Core Lab', 'Urgent')
 * - active: Toggle visibility without deleting the entry
 */
export const LABORATORY_CATEGORIES: LabCategory[] = [
  {
    id: 'category-01',
    code: 'CAT-01',
    name: 'Category Option 1 (Hematology / Blood Tests)',
    description: 'Complete blood count, coagulation profiles, and smear morphology.',
    iconName: 'Activity',
    badge: 'Routine',
    active: true,
  },
  {
    id: 'category-02',
    code: 'CAT-02',
    name: 'Category Option 2 (Clinical Biochemistry)',
    description: 'Serum electrolytes, glucose, renal, and hepatic function panels.',
    iconName: 'FlaskConical',
    badge: 'High Volume',
    active: true,
  },
  {
    id: 'category-03',
    code: 'CAT-03',
    name: 'Category Option 3 (Clinical Microbiology & Culture)',
    description: 'Pathogen cultures, gram staining, antibiotic susceptibility tests.',
    iconName: 'Microscope',
    badge: 'Microbiology',
    active: true,
  },
  {
    id: 'category-04',
    code: 'CAT-04',
    name: 'Category Option 4 (Immunology & Serology)',
    description: 'Antigen-antibody reactions, autoimmune markers, viral titers.',
    iconName: 'ShieldCheck',
    badge: 'Serology',
    active: true,
  },
  {
    id: 'category-05',
    code: 'CAT-05',
    name: 'Category Option 5 (Molecular Diagnostics & PCR)',
    description: 'DNA/RNA amplification, quantitative real-time PCR, genetic assays.',
    iconName: 'Dna',
    badge: 'Molecular',
    active: true,
  },
  {
    id: 'category-06',
    code: 'CAT-06',
    name: 'Category Option 6 (Histopathology & Biopsy)',
    description: 'Tissue sectioning, microscopic tissue examination, special stains.',
    iconName: 'Layers',
    badge: 'Pathology',
    active: true,
  },
  {
    id: 'category-07',
    code: 'CAT-07',
    name: 'Category Option 7 (Clinical Urinalysis & Body Fluids)',
    description: 'Physical, chemical, and microscopic examination of fluids.',
    iconName: 'Droplets',
    badge: 'Urinalysis',
    active: true,
  },
  {
    id: 'category-08',
    code: 'CAT-08',
    name: 'Category Option 8 (Endocrinology & Hormones)',
    description: 'Thyroid profile, fertility panel, hormone metabolism assays.',
    iconName: 'Pulse',
    badge: 'Endocrine',
    active: true,
  },
  {
    id: 'category-09',
    code: 'CAT-09',
    name: 'Category Option 9 (Toxicology & Drug Screening)',
    description: 'Therapeutic drug monitoring and acute toxicity screening.',
    iconName: 'AlertCircle',
    badge: 'Specialized',
    active: true,
  },
  {
    id: 'category-10',
    code: 'CAT-10',
    name: 'Category Option 10 (Cytogenetics & Karyotyping)',
    description: 'Chromosomal analysis, structural aberrations, and FISH assays.',
    iconName: 'FileSpreadsheet',
    badge: 'Advanced',
    active: true,
  },
];

/**
 * Helper to fetch a category by its ID
 */
export function getCategoryById(id: string): LabCategory | undefined {
  return LABORATORY_CATEGORIES.find((cat) => cat.id === id);
}

