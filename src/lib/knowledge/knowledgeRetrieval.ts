import { createClient } from '@supabase/supabase-js';
import {
  COMPLIANCE_MAPPINGS,
  ISO_17025_TOPICS,
  NABL_PROCESS_STEPS,
  SEED_KNOWLEDGE_ARTICLES,
  STANDARD_REFERENCES,
} from '@/lib/knowledge/standardsAndCompliance';
import {
  CALCULATION_TOPICS,
  CHEMICAL_TOPICS,
  COAL_TOPICS,
  INSTRUMENT_TOPICS,
  MECHANICAL_TOPICS,
} from '@/lib/knowledge/testingKnowledge';
import {
  CHECKLIST_TEMPLATES,
  GLOSSARY_ENTRIES,
  LEARNING_PATHS,
} from '@/lib/knowledge/learningAndChecklists';

export type AssistantNavigationSection =
  | 'home'
  | 'bis'
  | 'nabl'
  | 'iso'
  | 'testing'
  | 'learning'
  | 'checklists'
  | 'glossary'
  | 'mapping'
  | 'assistant';

export interface KnowledgeCitation {
  sourceId: string;
  title: string;
  category: string;
  standardRef?: string;
  clauseNumber?: string;
  editionRevision?: string;
  officialUrl?: string;
  lastVerifiedDate?: string;
  classification?: string;
  sectionTarget: AssistantNavigationSection;
  testingSubTab?: 'chemical' | 'calculations' | 'mechanical' | 'coal' | 'instruments';
  topicId?: string;
  excerpt?: string;
}

export interface KnowledgeChunk extends KnowledgeCitation {
  content: string;
  keywords: string[];
  priorityBoost: number;
}

const HINGLISH_SYNONYMS: Record<string, string[]> = {
  farak: ['difference', 'distinction', 'vs', 'compare'],
  farq: ['difference', 'distinction', 'vs', 'compare'],
  antar: ['difference', 'distinction', 'vs', 'compare'],
  diff: ['difference', 'distinction', 'vs', 'compare'],
  difference: ['vs', 'distinction', 'compare'],
  upkaran: ['equipment', 'instrument'],
  yantra: ['equipment', 'instrument'],
  pramanpatra: ['certificate', 'accreditation', 'certification'],
  gunvatta: ['quality', 'assurance', 'qa'],
  taapman: ['temperature', 'curing'],
  ankshan: ['calibration'],
  satyapan: ['verification', 'validation'],
  janch: ['testing', 'inspection', 'audit'],
  gair: ['nonconformity', 'nc', 'capa'],
  koyla: ['coal', 'gcv', 'uhv'],
  rakhrakhav: ['maintenance', 'record', 'records'],
  dastavez: ['document', 'documents', 'sop', 'records'],
  record: ['records', 'clause 7.5', 'log', 'logs'],
  records: ['record', 'clause 7.5', 'technical records', 'calibration'],
  calibration: ['calibrating', 'clause 6.4', 'clause 6.5', 'traceability', 'nabl 142'],
  verification: ['verify', 'clause 7.2', 'calibration'],
  nonconformity: ['nc', 'capa', 'clause 7.10', 'clause 8.7', 'non-conformity', 'non-conformities'],
  'non-conformity': ['nc', 'capa', 'clause 7.10', 'clause 8.7', 'nonconformity'],
  'non-conformities': ['nc', 'capa', 'clause 7.10', 'clause 8.7', 'nonconformity'],
  loi: ['loss on ignition', 'is 4032', '950'],
  ir: ['insoluble residue', 'is 4032'],
  lsf: ['lime saturation factor', 'bogue'],
  sm: ['silica modulus'],
  am: ['alumina modulus'],
  blaine: ['fineness', 'specific surface area', 'is 4031'],
  traceability: ['clause 6.5', 'nabl 142', 'si units', 'calibration'],
  accreditation: ['nabl', 'iso 17025', 'nabl 100b', 'nabl 131'],
  certification: ['bis', 'isi mark', 'is 269', 'sit'],
  audit: ['internal audit', 'clause 8.8', 'checklist'],
  checklist: ['checklists', 'audit'],
  procedure: ['method', 'methodoverview', 'steps', 'sampleprep'],
  'कैलिब्रेशन': ['calibration', 'clause 6.4', 'clause 6.5'],
  'सत्यापन': ['verification', 'clause 7.2'],
  'अंतर': ['difference', 'distinction', 'vs'],
  'उपकरण': ['equipment', 'instrument'],
  'मानक': ['standard', 'bis', 'iso', 'nabl'],
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'of', 'by', 'with', 'from', 'as', 'into',
  'and', 'or', 'but', 'what', 'which', 'who', 'how', 'when', 'where', 'why',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'will', 'must',
  'explain', 'tell', 'me', 'about', 'between', 'major', 'important', 'relevant',
  'ka', 'ke', 'ki', 'ko', 'se', 'me', 'mein', 'hai', 'hain', 'ho', 'hota',
  'hoti', 'kaise', 'kya', 'kyun', 'kab', 'kahan', 'kare', 'karein', 'karna',
  'chahiye', 'batao', 'bataiye', 'bataye', 'samjhao', 'aur', 'ya', 'ek',
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\/\-–—_.,:;()[\]{}?'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeQuery(query: string): { tokens: string[]; normalized: string } {
  const normalized = normalizeText(query);
  const rawTokens = normalized.split(' ').filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  const expanded = new Set<string>(rawTokens);

  for (const tok of rawTokens) {
    const syns = HINGLISH_SYNONYMS[tok];
    if (syns) {
      for (const s of syns) {
        for (const sub of normalizeText(s).split(' ')) {
          if (sub.length >= 2) expanded.add(sub);
        }
      }
    }
  }

  return { tokens: Array.from(expanded), normalized };
}

function getReadOnlySupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  if (!url || !key || url.includes('your-project') || key.includes('your-anon-key')) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Builds the static verified Knowledge & Compliance corpus from in-repo vetted files
 * and merges read-only Published/Current records from Supabase tables if populated.
 */
export async function buildVerifiedKnowledgeCorpus(): Promise<{
  chunks: Omit<KnowledgeChunk, 'sourceId'>[];
  dbLoaded: boolean;
}> {
  const chunks: Omit<KnowledgeChunk, 'sourceId'>[] = [];
  let dbLoaded = false;

  // 1. Verified Standard References (BIS / NABL / ISO)
  for (const s of STANDARD_REFERENCES) {
    if (s.status === 'Superseded') continue;
    chunks.push({
      title: `${s.standardNumber} — ${s.title}`,
      category: s.authority === 'BIS' ? 'BIS Standards' : s.authority === 'NABL' ? 'NABL' : 'ISO/IEC 17025',
      standardRef: s.standardNumber,
      editionRevision: s.editionInfo,
      officialUrl: s.officialUrl,
      lastVerifiedDate: s.lastVerifiedDate,
      classification: s.classification,
      sectionTarget: s.authority === 'BIS' ? 'bis' : s.authority === 'NABL' ? 'nabl' : 'iso',
      excerpt: s.scopePurpose,
      content: [
        `Authority: ${s.authority} (${s.classification}, Status: ${s.status}, Verification: ${s.verificationStatus})`,
        `Standard: ${s.standardNumber} — ${s.title}`,
        `Subject: ${s.subjectCategory} | Material: ${s.applicableMaterial}`,
        `Scope: ${s.scopePurpose}`,
        `Related Parameters: ${s.relatedParameters}`,
        `Related Methods: ${s.relatedMethods}`,
        `Related Equipment: ${s.relatedEquipment}`,
        `Edition: ${s.editionInfo} | Notes: ${s.amendmentInfo}`,
      ].join('\n'),
      keywords: [s.standardNumber, s.authority, s.subjectCategory, s.relatedParameters],
      priorityBoost: 3,
    });
  }

  // 2. ISO/IEC 17025:2017 Clauses
  for (const c of ISO_17025_TOPICS) {
    chunks.push({
      title: `ISO/IEC 17025:2017 ${c.clauseNumber} — ${c.title}`,
      category: 'ISO/IEC 17025',
      standardRef: 'ISO/IEC 17025:2017',
      clauseNumber: c.clauseNumber,
      officialUrl: c.officialReference,
      classification: 'Official Requirement',
      sectionTarget: 'iso',
      excerpt: c.simpleExplanation,
      content: [
        `Standard: ISO/IEC 17025:2017 | ${c.clauseGroup} | ${c.clauseNumber}: ${c.title}`,
        `Requirement Summary: ${c.simpleExplanation}`,
        `Why It Matters: ${c.whyItMatters}`,
        `Cement Lab Practical Example: ${c.practicalExample}`,
        `Required Records: ${c.relevantRecords}`,
        `Responsible Role: ${c.responsibleRole} | Activity: ${c.relatedActivity}`,
      ].join('\n'),
      keywords: [c.clauseNumber, c.title, c.relevantRecords, c.relatedActivity],
      priorityBoost: 4,
    });
  }

  // 3. Compliance Mappings
  for (const m of COMPLIANCE_MAPPINGS) {
    chunks.push({
      title: `Compliance Mapping: ${m.laboratoryActivity}`,
      category: 'Compliance Mapping',
      standardRef: m.referenceDocument,
      clauseNumber: m.clauseSection,
      officialUrl: m.officialSource,
      lastVerifiedDate: m.lastVerifiedDate,
      classification: 'Official Requirement',
      sectionTarget: 'mapping',
      excerpt: m.requirementSummary,
      content: [
        `Activity: ${m.laboratoryActivity}`,
        `Reference: ${m.referenceDocument} | Clause: ${m.clauseSection}`,
        `Requirement: ${m.requirementSummary}`,
        `Practical Guidance: ${m.practicalExplanation}`,
        `Required Evidence / Records: ${m.relatedRecords}`,
        `Applicability: ${m.applicabilityNotes}`,
      ].join('\n'),
      keywords: [m.laboratoryActivity, m.referenceDocument, m.clauseSection, m.relatedRecords],
      priorityBoost: 3,
    });
  }

  // 4. NABL 12-Step Accreditation Guidance
  for (const step of NABL_PROCESS_STEPS) {
    chunks.push({
      title: `NABL Guide Step ${step.step}: ${step.title}`,
      category: 'NABL',
      standardRef: 'NABL Accreditation Process',
      officialUrl: step.officialReference,
      classification: step.classification,
      sectionTarget: 'nabl',
      excerpt: step.summary,
      content: [
        `NABL Step ${step.step}: ${step.title} (${step.classification})`,
        `Summary: ${step.summary}`,
        `Detailed Guidance: ${step.detailedGuidance}`,
        `Key Evidence: ${step.keyEvidence}`,
      ].join('\n'),
      keywords: ['nabl', step.title, step.keyEvidence],
      priorityBoost: 2,
    });
  }

  // 5. Verified Seed Articles (BIS vs NABL/Testing distinctions, NABL assessment)
  for (const a of SEED_KNOWLEDGE_ARTICLES) {
    chunks.push({
      title: a.title,
      category: a.categorySlug === 'bis' ? 'BIS Standards' : 'NABL',
      standardRef: a.relatedStandards,
      clauseNumber: a.relatedClauses,
      editionRevision: a.editionRevision,
      officialUrl: a.officialSourceUrl,
      lastVerifiedDate: a.lastVerifiedDate,
      classification: 'Reference / Explanation',
      sectionTarget: a.categorySlug,
      excerpt: a.shortDescription,
      content: [
        `Article (${a.articleCode}): ${a.title}`,
        `Summary: ${a.shortDescription}`,
        `Content: ${a.detailedContent}`,
        `Related Standards: ${a.relatedStandards} | Clauses: ${a.relatedClauses}`,
      ].join('\n'),
      keywords: [a.title, a.relatedStandards, a.relatedClauses, a.relatedParameters],
      priorityBoost: 3,
    });
  }

  // 6. Testing Knowledge: Chemical, Calculations, Mechanical, Coal, Instruments
  for (const t of CHEMICAL_TOPICS) {
    chunks.push({
      title: `${t.title} — Chemical Testing Method`,
      category: 'Testing Knowledge',
      standardRef: t.standards,
      sectionTarget: 'testing',
      testingSubTab: 'chemical',
      topicId: t.id,
      excerpt: t.definition,
      content: [
        `Parameter: ${t.title} (${t.symbol})`,
        `Definition: ${t.definition}`,
        `Purpose & Importance: ${t.purpose} ${t.importance}`,
        `Principle & Method: ${t.principle} — ${t.method}`,
        `Equipment & Sample Prep: ${t.equipment} | Prep: ${t.samplePrep}`,
        `Interpretation: ${t.interpretation}`,
        `Common Mistakes: ${t.commonMistakes}`,
        `Standards: ${t.standards}`,
      ].join('\n'),
      keywords: [t.symbol, t.title, t.standards, t.method],
      priorityBoost: 3,
    });
  }

  for (const calc of CALCULATION_TOPICS) {
    chunks.push({
      title: `${calc.title} — Calculation & Formula`,
      category: 'Testing Knowledge',
      standardRef: calc.reference,
      sectionTarget: 'testing',
      testingSubTab: 'calculations',
      topicId: calc.id,
      excerpt: calc.formula,
      content: [
        `Calculation: ${calc.title}`,
        `Formula: ${calc.formula} (${calc.units})`,
        `Variables: ${calc.variables}`,
        `Worked Example: ${calc.workedExample} -> ${calc.steps}`,
        `Interpretation: ${calc.interpretation}`,
        `Limitations: ${calc.limitations}`,
        `Reference: ${calc.reference}`,
      ].join('\n'),
      keywords: [calc.title, calc.formula, calc.reference],
      priorityBoost: 3,
    });
  }

  for (const m of MECHANICAL_TOPICS) {
    chunks.push({
      title: `${m.title} — Mechanical / Physical Test`,
      category: 'Testing Knowledge',
      standardRef: m.reference,
      sectionTarget: 'testing',
      testingSubTab: 'mechanical',
      topicId: m.id,
      excerpt: m.purpose,
      content: [
        `Test: ${m.title}`,
        `Purpose: ${m.purpose}`,
        `Principle: ${m.principle}`,
        `Equipment: ${m.equipment}`,
        `Method Overview: ${m.methodOverview}`,
        `Interpretation: ${m.interpretation}`,
        `Reference: ${m.reference}`,
      ].join('\n'),
      keywords: [m.title, m.reference, m.equipment],
      priorityBoost: 3,
    });
  }

  for (const coal of COAL_TOPICS) {
    chunks.push({
      title: `${coal.title} — Coal Analysis`,
      category: 'Testing Knowledge',
      standardRef: coal.reference,
      sectionTarget: 'testing',
      testingSubTab: 'coal',
      topicId: coal.id,
      excerpt: coal.definition,
      content: [
        `Coal Parameter: ${coal.title}`,
        `Definition: ${coal.definition}`,
        `Formula Note: ${coal.formulaNote}`,
        `Kiln Importance: ${coal.kilnImportance}`,
        `Reference: ${coal.reference}`,
      ].join('\n'),
      keywords: [coal.title, coal.reference, 'coal'],
      priorityBoost: 2,
    });
  }

  for (const inst of INSTRUMENT_TOPICS) {
    chunks.push({
      title: `${inst.name} — Instrument & Calibration Guide`,
      category: 'Equipment Guide',
      standardRef: inst.relatedMethods,
      sectionTarget: 'testing',
      testingSubTab: 'instruments',
      topicId: inst.id,
      excerpt: inst.purpose,
      content: [
        `Instrument: ${inst.name}`,
        `Purpose & Principle: ${inst.purpose} (${inst.principle})`,
        `Routine Checks & Calibration: ${inst.routineChecks} | ${inst.calibrationNotes}`,
        `Maintenance & Common Errors: ${inst.maintenanceNotes} | ${inst.commonErrors}`,
        `Safety: ${inst.safetyPrecautions}`,
        `Related Methods: ${inst.relatedMethods}`,
      ].join('\n'),
      keywords: [inst.name, inst.relatedMethods, 'calibration', 'verification'],
      priorityBoost: 2,
    });
  }

  // 7. Glossary & Checklists & Learning Paths
  for (const g of GLOSSARY_ENTRIES) {
    chunks.push({
      title: `Glossary: ${g.term} (${g.fullForm})`,
      category: 'Glossary',
      standardRef: g.relatedTopics,
      sectionTarget: 'glossary',
      excerpt: g.simpleMeaning,
      content: [
        `Term: ${g.term} — ${g.fullForm}`,
        `Simple Meaning: ${g.simpleMeaning}`,
        `Technical Explanation: ${g.technicalExplanation}`,
        `Example: ${g.practicalExample}`,
        `Related: ${g.relatedTopics}`,
      ].join('\n'),
      keywords: [g.term, g.fullForm, g.relatedTopics],
      priorityBoost: 2,
    });
  }

  for (const chk of CHECKLIST_TEMPLATES) {
    chunks.push({
      title: chk.title,
      category: 'QA Checklists',
      classification: chk.guidanceType,
      sectionTarget: 'checklists',
      excerpt: chk.purpose,
      content: [
        `Checklist: ${chk.title} (${chk.guidanceType})`,
        `Activity: ${chk.applicableActivity} — ${chk.purpose}`,
        `Items:\n- ${chk.items.join('\n- ')}`,
      ].join('\n'),
      keywords: [chk.title, chk.applicableActivity, 'checklist'],
      priorityBoost: 2,
    });
  }

  for (const lp of LEARNING_PATHS) {
    chunks.push({
      title: lp.title,
      category: 'Learning Paths',
      classification: 'Practical Guidance',
      sectionTarget: 'learning',
      excerpt: lp.description,
      content: [
        `Learning Path (${lp.trackType}${lp.targetRole ? ` — ${lp.targetRole}` : ''}): ${lp.title}`,
        `Description: ${lp.description}`,
        `Topics:\n${lp.topics.map((t) => `- ${t.title}: ${t.summary}`).join('\n')}`,
      ].join('\n'),
      keywords: [lp.title, lp.trackType, lp.targetRole || ''],
      priorityBoost: 1,
    });
  }

  // 8. Read-Only Published DB Articles & DB Tables (strictly Published/Current only!)
  const supabase = getReadOnlySupabase();
  if (supabase) {
    try {
      const [articlesRes, stdRes, mapRes, glossRes] = await Promise.all([
        supabase
          .from('knowledge_articles')
          .select('id, article_code, category_slug, subcategory, title, short_description, detailed_content, related_standards, related_clauses, official_source_url, edition_revision, last_verified_date, content_status')
          .eq('content_status', 'Published')
          .limit(100),
        supabase
          .from('knowledge_standard_references')
          .select('*')
          .neq('status', 'Superseded')
          .limit(50),
        supabase
          .from('knowledge_compliance_mappings')
          .select('*')
          .limit(50),
        supabase
          .from('knowledge_glossary')
          .select('*')
          .limit(100),
      ]);

      if (!articlesRes.error && Array.isArray(articlesRes.data)) {
        dbLoaded = true;
        const existingTitles = new Set(chunks.map((c) => c.title.toLowerCase()));
        for (const a of articlesRes.data) {
          if (!a?.title || existingTitles.has(String(a.title).toLowerCase())) continue;
          const catSlug = (a.category_slug as AssistantNavigationSection) || 'home';
          chunks.push({
            title: String(a.title),
            category: `Published Article (${a.subcategory || a.category_slug || 'Knowledge'})`,
            standardRef: a.related_standards || undefined,
            clauseNumber: a.related_clauses || undefined,
            editionRevision: a.edition_revision || undefined,
            officialUrl: a.official_source_url || undefined,
            lastVerifiedDate: a.last_verified_date || undefined,
            classification: 'Published Knowledge Article',
            sectionTarget: ['bis', 'nabl', 'iso', 'testing', 'learning', 'checklists', 'glossary', 'mapping'].includes(catSlug)
              ? catSlug
              : 'home',
            excerpt: String(a.short_description || ''),
            content: [
              `Published Article (${a.article_code || a.id}): ${a.title}`,
              `Summary: ${a.short_description}`,
              `Content: ${String(a.detailed_content || '').slice(0, 1800)}`,
              a.related_standards ? `Standards: ${a.related_standards}` : '',
              a.related_clauses ? `Clauses: ${a.related_clauses}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
            keywords: [a.title, a.subcategory || '', a.related_standards || '', a.related_clauses || ''],
            priorityBoost: 4,
          });
        }
      }

      if (!stdRes.error && Array.isArray(stdRes.data) && stdRes.data.length > 0) {
        dbLoaded = true;
        const existingStd = new Set(chunks.map((c) => (c.standardRef || '').toLowerCase()));
        for (const s of stdRes.data) {
          if (!s?.standard_number || existingStd.has(String(s.standard_number).toLowerCase())) continue;
          chunks.push({
            title: `${s.standard_number} — ${s.title}`,
            category: s.authority === 'BIS' ? 'BIS Standards' : s.authority === 'NABL' ? 'NABL' : 'ISO/IEC 17025',
            standardRef: s.standard_number,
            editionRevision: s.edition_info || undefined,
            officialUrl: s.official_url || undefined,
            lastVerifiedDate: s.last_verified_date || undefined,
            classification: 'Official Requirement',
            sectionTarget: s.authority === 'BIS' ? 'bis' : s.authority === 'NABL' ? 'nabl' : 'iso',
            excerpt: s.scope_purpose,
            content: `Standard: ${s.standard_number} — ${s.title}\nScope: ${s.scope_purpose}\nParameters: ${s.related_parameters || ''}`,
            keywords: [s.standard_number, s.title, s.related_parameters || ''],
            priorityBoost: 3,
          });
        }
      }

      if (!mapRes.error && Array.isArray(mapRes.data) && mapRes.data.length > 0) {
        dbLoaded = true;
        const existingMaps = new Set(chunks.map((c) => c.title.toLowerCase()));
        for (const m of mapRes.data) {
          const title = `Compliance Mapping: ${m.laboratory_activity}`;
          if (existingMaps.has(title.toLowerCase())) continue;
          chunks.push({
            title,
            category: 'Compliance Mapping',
            standardRef: m.reference_document,
            clauseNumber: m.clause_section,
            officialUrl: m.official_source,
            lastVerifiedDate: m.last_verified_date,
            sectionTarget: 'mapping',
            excerpt: m.requirement_summary,
            content: `Activity: ${m.laboratory_activity}\nRef: ${m.reference_document} ${m.clause_section}\nRequirement: ${m.requirement_summary}\nRecords: ${m.related_records}`,
            keywords: [m.laboratory_activity, m.reference_document, m.clause_section],
            priorityBoost: 3,
          });
        }
      }

      if (!glossRes.error && Array.isArray(glossRes.data) && glossRes.data.length > 0) {
        dbLoaded = true;
        const existingGloss = new Set(chunks.map((c) => c.title.toLowerCase()));
        for (const g of glossRes.data) {
          const title = `Glossary: ${g.term} (${g.full_form})`;
          if (existingGloss.has(title.toLowerCase())) continue;
          chunks.push({
            title,
            category: 'Glossary',
            sectionTarget: 'glossary',
            excerpt: g.simple_meaning,
            content: `${g.term} (${g.full_form}): ${g.simple_meaning}. ${g.technical_explanation}`,
            keywords: [g.term, g.full_form],
            priorityBoost: 2,
          });
        }
      }
    } catch {
      // Fall back gracefully to verified static Knowledge Centre sources if DB unavailable
    }
  }

  return { chunks, dbLoaded };
}

export interface RetrievalResult {
  retrieved: KnowledgeChunk[];
  topScore: number;
  hasStrongMatch: boolean;
  sufficientLocalMatch: boolean;
  localAnswerMarkdown?: string;
  dbLoaded: boolean;
}

const GENERIC_LAB_TOKENS = new Set([
  'cement', 'lab', 'laboratory', 'test', 'testing', 'quality', 'standard', 'standards',
  'requirements', 'requirement', 'procedure', 'process', 'limit', 'limits', 'explain',
  'maintain', 'document', 'documentation', 'guidance', 'guide',
]);

function extractExplicitStandards(normalizedQuery: string): string[] {
  const matches = normalizedQuery.match(/\b(is\s*\d{3,5}|nabl\s*\d{3}[a-b]?|iso\s*(?:iec\s*)?\d{4,5}|clause\s*\d(?:\.\d+)?|astm\s*c\d{2,4})\b/g);
  return matches ? matches.map((m) => m.replace(/\s+/g, ' ').trim()) : [];
}

/**
 * Formats retrieved verified portal chunks into a crisp deterministic answer without calling any external AI.
 */
export function buildLocalDeterministicAnswer(
  question: string,
  chunks: KnowledgeChunk[]
): string {
  if (chunks.length === 0) return '';

  const topChunks = chunks.slice(0, 3);
  const parts: string[] = [];

  parts.push(`### Verified ChittorTech Portal Knowledge`);

  for (const chunk of topChunks) {
    const classBadge = chunk.classification
      ? `*(${chunk.classification}${chunk.standardRef ? ` · ${chunk.standardRef}` : ''}${chunk.clauseNumber ? ` · ${chunk.clauseNumber}` : ''})*`
      : chunk.standardRef
      ? `*(${chunk.standardRef})*`
      : '';

    parts.push(`#### ${chunk.title} ${classBadge ? `\n${classBadge}` : ''}`);

    const lines = chunk.content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 7);
    for (const l of lines) {
      parts.push(`- ${l}`);
    }
    parts.push('');
  }

  // Note clearly if any content is guidance vs official requirement
  const hasOfficial = topChunks.some((c) => c.classification === 'Official Requirement');
  const hasGuidance = topChunks.some((c) => c.classification && c.classification !== 'Official Requirement');
  if (hasOfficial || hasGuidance) {
    parts.push(
      `> **Verification Note:** Items marked *Official Requirement* reflect referenced BIS/NABL/ISO documentation in ChittorTech. Items marked *Practical Guidance* or *ChittorTech Operational Guidance* are advisory best practices.`
    );
  }

  return parts.join('\n').trim();
}

function hasWordMatch(words: Set<string>, wordArray: string[], token: string): boolean {
  if (!token) return false;
  if (words.has(token)) return true;
  // Allow morphological prefix matching only for longer domain words (e.g. "calibrat" -> "calibration")
  if (token.length >= 5) {
    return wordArray.some(
      (w) => (w.startsWith(token) && w.length - token.length <= 5) || (token.startsWith(w) && w.length >= 5)
    );
  }
  return false;
}

export async function retrieveRelevantKnowledge(
  question: string,
  recentUserQuestions: string[] = [],
  maxResults: number = 6
): Promise<RetrievalResult> {
  const { chunks, dbLoaded } = await buildVerifiedKnowledgeCorpus();

  // Standalone greeting check
  if (/^(hi+|hie+|hello+|hey+|hlo+|namaste|good\s*(morning|afternoon|evening))[!.,\s]*$/i.test(question.trim())) {
    return {
      retrieved: [],
      topScore: 0,
      hasStrongMatch: false,
      sufficientLocalMatch: true,
      localAnswerMarkdown:
        'Hello! I am the **ChittorTech Knowledge & Compliance Assistant**.\n\nI check ChittorTech\'s verified **BIS Standards**, **NABL Accreditation Guides**, **ISO/IEC 17025 Clauses**, **Testing Procedures**, **Glossary**, and **Checklists** first to give you traceable laboratory answers.\n\nClick any suggested question or ask about your laboratory standards or test methods.',
      dbLoaded,
    };
  }

  // Only blend previous user questions when the current prompt is explicitly an anaphoric follow-up
  const hasExplicitFollowUpCue =
    /\b(simpler|simple|summarize|summary|hindi|hinglish|translate|that|this|its|those|above|example|short|elaborate|more details)\b/i.test(
      question
    );
  const combinedQuery =
    hasExplicitFollowUpCue && recentUserQuestions.length > 0
      ? `${question} ${recentUserQuestions.slice(-1).join(' ')}`
      : question;

  const { tokens, normalized } = tokenizeQuery(combinedQuery);
  const currentTokens = tokenizeQuery(question).tokens;
  const explicitStandards = extractExplicitStandards(normalized);

  const scored = chunks.map((chunk) => {
    const titleNorm = normalizeText(chunk.title);
    const bodyNorm = normalizeText(chunk.content);
    const keyNorm = normalizeText(chunk.keywords.join(' '));
    const combinedNorm = `${titleNorm} ${keyNorm} ${bodyNorm}`;

    const titleWordsArr = titleNorm.split(' ').filter(Boolean);
    const keyWordsArr = keyNorm.split(' ').filter(Boolean);
    const bodyWordsArr = bodyNorm.split(' ').filter(Boolean);
    const titleWords = new Set(titleWordsArr);
    const keyWords = new Set(keyWordsArr);
    const bodyWords = new Set(bodyWordsArr);
    const combinedWordsArr = [...titleWordsArr, ...keyWordsArr, ...bodyWordsArr];
    const combinedWords = new Set(combinedWordsArr);

    let score = 0;

    // Exact phrase boosts for standards & clauses
    for (const phrase of explicitStandards) {
      if (titleNorm.includes(phrase) || keyNorm.includes(phrase)) score += 14;
      else if (bodyNorm.includes(phrase)) score += 8;
    }

    // Special distinction boost for "difference between X and Y"
    const isComparison = tokens.some((t) => ['difference', 'distinction', 'compare', 'vs'].includes(t));
    if (isComparison && (titleWords.has('distinction') || titleWords.has('vs') || titleWords.has('difference'))) {
      score += 8;
    }

    let matchedDistinctTokens = 0;
    for (const tok of tokens) {
      const weight = currentTokens.includes(tok) ? 1.0 : 0.45;
      let matched = false;
      if (hasWordMatch(titleWords, titleWordsArr, tok)) {
        score += 5.5 * weight;
        matched = true;
      }
      if (hasWordMatch(keyWords, keyWordsArr, tok)) {
        score += 3.5 * weight;
        matched = true;
      }
      if (hasWordMatch(bodyWords, bodyWordsArr, tok)) {
        score += 1.8 * weight;
        matched = true;
      }
      if (matched && !GENERIC_LAB_TOKENS.has(tok) && !['difference', 'distinction', 'compare', 'vs'].includes(tok)) {
        matchedDistinctTokens++;
      }
    }

    if (score > 0) {
      score += chunk.priorityBoost * 0.4;
    }

    return { chunk, score, combinedNorm, combinedWords, combinedWordsArr, matchedDistinctTokens };
  });

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0]?.score || 0;
  const filteredItems = scored.filter((item) => item.score >= 3.2).slice(0, maxResults);
  const filtered = filteredItems.map((item, idx) => ({
    ...item.chunk,
    sourceId: `SRC-${idx + 1}`,
  }));

  // Evaluate whether local Knowledge Centre data is genuinely sufficient to answer cleanly without external AI
  const specificQueryTokens = currentTokens.filter(
    (t) => !GENERIC_LAB_TOKENS.has(t) && !['difference', 'distinction', 'compare', 'vs'].includes(t)
  );
  const topMergedText = filteredItems.slice(0, 3).map((x) => x.combinedNorm).join(' ');
  const topMergedWordsArr = filteredItems.slice(0, 3).flatMap((x) => x.combinedWordsArr);
  const topMergedWords = new Set(topMergedWordsArr);

  const unmatchedExplicitStd = explicitStandards.some((std) => !topMergedText.includes(std));
  const matchedSpecificCount = specificQueryTokens.filter((t) =>
    hasWordMatch(topMergedWords, topMergedWordsArr, t)
  ).length;
  const specificCoverage =
    specificQueryTokens.length > 0 ? matchedSpecificCount / specificQueryTokens.length : 0;

  // If user specifically asks for a pure translation/simpler/Hindi conversational rewrite, allow external AI if approved
  const wantsHindiRewrite = /\b(hindi|hinglish|translate)\b/i.test(question) || /[\u0900-\u097F]/.test(question);

  const sufficientLocalMatch =
    filtered.length > 0 &&
    topScore >= 9.0 &&
    !unmatchedExplicitStd &&
    (specificQueryTokens.length > 0 ? matchedSpecificCount > 0 && specificCoverage >= 0.5 : explicitStandards.length > 0) &&
    !wantsHindiRewrite;

  return {
    retrieved: filtered,
    topScore,
    hasStrongMatch: filtered.length > 0 && topScore >= 4.0,
    sufficientLocalMatch,
    localAnswerMarkdown: sufficientLocalMatch ? buildLocalDeterministicAnswer(question, filtered) : undefined,
    dbLoaded,
  };
}
