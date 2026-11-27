export interface GlossaryEntry {
  term: string;
  fullForm: string;
  simpleMeaning: string;
  technicalExplanation: string;
  practicalExample: string;
  relatedTopics: string;
}

export interface LearningPathItem {
  slug: string;
  trackType: 'Beginner' | 'Practical' | 'Role-Based';
  targetRole?: string;
  title: string;
  description: string;
  topics: { key: string; title: string; summary: string }[];
}

export interface QuizQuestionItem {
  id: string;
  topicSlug: string;
  topicLabel: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChecklistTemplate {
  slug: string;
  title: string;
  purpose: string;
  applicableActivity: string;
  guidanceType: string;
  items: string[];
}

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  { term: 'LOI', fullForm: 'Loss on Ignition', simpleMeaning: 'Weight lost when a sample is strongly heated.', technicalExplanation: 'Percentage mass loss at 950 ± 50 °C due to moisture, bound water, and carbonate decomposition.', practicalExample: 'High clinker LOI indicates under-burning in the kiln.', relatedTopics: 'Chemical Analysis, IS 4032' },
  { term: 'IR', fullForm: 'Insoluble Residue', simpleMeaning: 'Unreactive mineral impurities left after acid/alkali washing.', technicalExplanation: 'Gravimetric fraction insoluble in HCl and Na2CO3 per IS 4032.', practicalExample: 'Checks inert silica contamination in OPC.', relatedTopics: 'Chemical Analysis, IS 269' },
  { term: 'LSF', fullForm: 'Lime Saturation Factor', simpleMeaning: 'Ratio showing whether enough lime is present to combine with silica, alumina, and iron.', technicalExplanation: 'CaO / (2.8·SiO2 + 1.2·Al2O3 + 0.65·Fe2O3). Governs C3S/C2S balance.', practicalExample: 'Target clinker LSF ~ 0.94–0.97.', relatedTopics: 'Chemical Calculations, Bogue' },
  { term: 'SM', fullForm: 'Silica Modulus', simpleMeaning: 'Ratio of silica to alumina + iron oxides.', technicalExplanation: 'SiO2 / (Al2O3 + Fe2O3). Balances clinker burnability vs. silicate phase content.', practicalExample: 'Typical SM = 2.2–2.7.', relatedTopics: 'Chemical Calculations' },
  { term: 'AM', fullForm: 'Alumina Modulus', simpleMeaning: 'Ratio of alumina to ferric oxide.', technicalExplanation: 'Al2O3 / Fe2O3. Controls liquid phase viscosity and C3A/C4AF ratio.', practicalExample: 'Typical AM = 1.3–1.8.', relatedTopics: 'Chemical Calculations' },
  { term: 'GCV', fullForm: 'Gross Calorific Value', simpleMeaning: 'Total heat energy released by burning 1 kg of coal.', technicalExplanation: 'Measured in kcal/kg using an oxygen Bomb Calorimeter per IS 1350 (Part 2).', practicalExample: 'Used to calculate kiln specific heat consumption.', relatedTopics: 'Coal Analysis, Calorimeter' },
  { term: 'UHV', fullForm: 'Useful Heat Value', simpleMeaning: 'Estimated usable heat value of Indian coal based on ash and moisture.', technicalExplanation: 'Calculated empirically as 8900 − 138 × (Ash% + IM%).', practicalExample: 'Used alongside GCV for coal grade comparison.', relatedTopics: 'Coal Analysis' },
  { term: 'Blaine', fullForm: 'Blaine Specific Surface Area', simpleMeaning: 'How finely ground a cement powder is (m²/kg).', technicalExplanation: 'Air permeability method measuring total particle surface area per kg per IS 4031 (Part 2).', practicalExample: 'OPC 53 often targets 300–340 m²/kg.', relatedTopics: 'Mechanical Testing, IS 4031' },
  { term: 'XRF', fullForm: 'X-Ray Fluorescence', simpleMeaning: 'Rapid instrumental elemental oxide analyzer.', technicalExplanation: 'Non-destructive spectrometry measuring characteristic secondary X-rays per IS 12803.', practicalExample: 'Hourly raw meal & clinker oxide control.', relatedTopics: 'Instruments, IS 12803' },
  { term: 'XRD', fullForm: 'X-Ray Diffraction', simpleMeaning: 'Instrument identifying actual crystal phases in clinker.', technicalExplanation: 'Uses Bragg’s Law diffraction patterns and Rietveld refinement to quantify C3S, C2S, C3A, C4AF.', practicalExample: 'Distinguishes actual alite/belite vs. theoretical Bogue.', relatedTopics: 'Instruments' },
  { term: 'PT', fullForm: 'Proficiency Testing', simpleMeaning: 'External inter-lab test comparing your lab against other labs.', technicalExplanation: 'Evaluation of participant performance against pre-established criteria via interlaboratory comparisons (ISO 17025 Clause 7.7).', practicalExample: 'Mandatory for NABL accreditation maintenance.', relatedTopics: 'ISO 17025, NABL' },
  { term: 'ILC', fullForm: 'Interlaboratory Comparison', simpleMeaning: 'Comparing test results of the same sample across two or more labs.', technicalExplanation: 'Organization, performance, and evaluation of measurements on the same or similar items by multiple laboratories.', practicalExample: 'Plant lab cross-checking cement sample with corporate QA lab.', relatedTopics: 'ISO 17025 Clause 7.7' },
  { term: 'CAPA', fullForm: 'Corrective and Preventive Action', simpleMeaning: 'Fixing the root cause of a problem so it does not happen again.', technicalExplanation: 'Structured investigation, root-cause elimination, and effectiveness check under ISO 17025 Clause 8.7.', practicalExample: 'Recalibrating balance and retraining operator after check-weight failure.', relatedTopics: 'ISO 17025, NABL' },
  { term: 'NC', fullForm: 'Nonconformity', simpleMeaning: 'Failure to fulfill a specified standard, SOP, or requirement.', technicalExplanation: 'Deviation in testing, equipment, or QMS documentation identified during internal audit or NABL assessment.', practicalExample: 'Testing with an overdue calibration instrument.', relatedTopics: 'ISO 17025 Clause 7.10' },
  { term: 'SOP', fullForm: 'Standard Operating Procedure', simpleMeaning: 'Step-by-step controlled written instruction for a lab task.', technicalExplanation: 'Controlled QMS document specifying apparatus, reagents, procedure, safety, and calculations.', practicalExample: 'SOP-CHEM-01 for Free Lime determination.', relatedTopics: 'Document Control' },
  { term: 'Traceability', fullForm: 'Metrological Traceability', simpleMeaning: 'Unbroken chain of calibrations linking your instrument to national/SI standards.', technicalExplanation: 'Property of a measurement result whereby it can be related to a reference through a documented unbroken chain of calibrations (Clause 6.5).', practicalExample: 'CTM -> NABL calibration lab -> NPL primary force standard.', relatedTopics: 'ISO 17025 Clause 6.5' },
  { term: 'Measurement Uncertainty', fullForm: 'Evaluation of Measurement Uncertainty', simpleMeaning: 'The ± range around a test result showing measurement confidence.', technicalExplanation: 'Non-negative parameter characterizing the dispersion of values attributed to a measurand (Clause 7.6).', practicalExample: 'Compressive strength 54.2 ± 1.4 MPa (95% confidence, k=2).', relatedTopics: 'ISO 17025 Clause 7.6' },
  { term: 'Calibration', fullForm: 'Instrument Calibration', simpleMeaning: 'Comparing an instrument against a known reference standard to check accuracy.', technicalExplanation: 'Operation establishing relation between reference quantity values and corresponding instrument indications with uncertainty.', practicalExample: 'Annual NABL calibration of Analytical Balance.', relatedTopics: 'Equipment Management' },
  { term: 'Verification', fullForm: 'Method / Equipment Verification', simpleMeaning: 'Confirming a standard method or instrument works properly in your lab.', technicalExplanation: 'Provision of objective evidence that a given item or standard method fulfills specified requirements (Clause 7.2).', practicalExample: 'Running a CRM on XRF before routine testing.', relatedTopics: 'ISO 17025 Clause 7.2' },
  { term: 'Validation', fullForm: 'Method Validation', simpleMeaning: 'Proving a non-standard or modified method is fit for its intended use.', technicalExplanation: 'Confirmation by examination and objective evidence that requirements for a specific intended use are fulfilled.', practicalExample: 'Validating a modified rapid titration method against IS 4032.', relatedTopics: 'ISO 17025 Clause 7.2' },
];

export const LEARNING_PATHS: LearningPathItem[] = [
  {
    slug: 'beginner-cement-qa',
    trackType: 'Beginner',
    title: 'Beginner Learning Path — Cement & Laboratory Fundamentals',
    description: 'Essential foundation for newly joined laboratory technicians and trainees.',
    topics: [
      { key: 'beg-1', title: 'Introduction to Cement Manufacturing', summary: 'Overview of limestone quarrying, raw meal grinding, pyro-processing, and finish grinding.' },
      { key: 'beg-2', title: 'Raw Materials & Raw Meal', summary: 'Role of limestone, clay/shale, iron ore, bauxite, and target fineness.' },
      { key: 'beg-3', title: 'Clinker Formation', summary: 'Calcination and clinkerization zones producing C3S, C2S, C3A, and C4AF.' },
      { key: 'beg-4', title: 'Cement Manufacturing Process & Grades', summary: 'OPC 33/43/53, PPC, and PSC grinding with gypsum.' },
      { key: 'beg-5', title: 'Laboratory Fundamentals & Sample Identification', summary: 'Shift sampling, unique sample IDs, moisture-tight storage, and contamination control.' },
      { key: 'beg-6', title: 'Laboratory Safety & Technical Terminology', summary: 'PPE for hot furnaces, acid handling, X-ray safety, and key terms (LOI, LSF, Blaine).' },
    ],
  },
  {
    slug: 'practical-lab-skills',
    trackType: 'Practical',
    title: 'Practical Laboratory Learning — Step-by-Step Guidance',
    description: 'Educational bench-level overview. Always follow your lab’s approved SOP, standard method, and OEM instrument manual.',
    topics: [
      { key: 'prac-1', title: 'Sample Preparation & Grinding', summary: 'Coning/quartering, drying at 105 °C, and grinding without cross-contamination.' },
      { key: 'prac-2', title: 'Chemical Testing & Result Recording', summary: 'LOI, IR, SO3, Free Lime, and original-value recording per Clause 7.5.' },
      { key: 'prac-3', title: 'Mechanical & Blaine Testing', summary: 'Normal consistency, IST/FST, Le Chatelier, Blaine air-permeability, and CTM cube crushing.' },
      { key: 'prac-4', title: 'Coal Testing & XRF Operation', summary: 'Proximate analysis (IM, VM, Ash), Bomb Calorimeter GCV, and pressed-pellet XRF runs.' },
      { key: 'prac-5', title: 'Calculation Verification & Instrument Care', summary: 'Checking oxide sum (98.5–100.5%), LSF/SM/AM sanity, daily balance checks, and desiccator care.' },
    ],
  },
  {
    slug: 'role-technician',
    trackType: 'Role-Based',
    targetRole: 'Laboratory Technician',
    title: 'Role Path: Laboratory Technician',
    description: 'Focused on accurate sampling, physical/mechanical tests, instrument care, and zero-error data entry.',
    topics: [
      { key: 'role-tech-1', title: 'Sample Receiving & Preparation', summary: 'Preventing moisture/CO2 pickup and maintaining sample ID traceability.' },
      { key: 'role-tech-2', title: 'Blaine, Vicat & CTM Execution', summary: 'Controlling 27 ± 2 °C water/curing temperatures and loading rates.' },
      { key: 'role-tech-3', title: 'Daily Equipment & Opening Checklists', summary: 'Verifying balance level, oven/furnace temps, and calibration tags.' },
    ],
  },
  {
    slug: 'role-chemist',
    trackType: 'Role-Based',
    targetRole: 'Chemist / QA/QC Engineer',
    title: 'Role Path: Chemist & QA/QC Engineer',
    description: 'Focused on XRF/wet chemistry, Bogue/LSF/SM/AM interpretation, coal blending, and statistical trends.',
    topics: [
      { key: 'role-chem-1', title: 'Oxide Mass Balance & Bogue Interpretation', summary: 'Spotting XRF drift, Free Lime spikes, and alkali/chloride cycles.' },
      { key: 'role-chem-2', title: 'Kiln & Mill Control Analytics', summary: 'Tracking LSF, SM, SO3, and 28D strength trends.' },
      { key: 'role-chem-3', title: 'Technical Records & Audit Compliance', summary: 'Documenting reasons for every record revision under Clause 7.5.' },
    ],
  },
  {
    slug: 'role-manager',
    trackType: 'Role-Based',
    targetRole: 'Quality Manager / Laboratory Head',
    title: 'Role Path: Quality Manager & Laboratory Head',
    description: 'Focused on ISO/IEC 17025 governance, NABL accreditation preparation, PT/ILC, internal audits, and CAPA.',
    topics: [
      { key: 'role-mgr-1', title: 'ISO/IEC 17025 Clauses 4–8 Governance', summary: 'Impartiality, competency authorization, traceability, and management reviews.' },
      { key: 'role-mgr-2', title: 'NABL Assessment & Scope Preparation', summary: 'NABL 100A/100B/120/131 readiness, PT cycles, and NC closure.' },
      { key: 'role-mgr-3', title: 'Document Control & Calibration Oversight', summary: 'Managing SOP revisions, overdue calibration holds, and annual MRM.' },
    ],
  },
];

export const QUIZ_QUESTIONS: QuizQuestionItem[] = [
  {
    id: 'q-1',
    topicSlug: 'chemical-calculations',
    topicLabel: 'Chemical & Bogue Calculations',
    question: 'Which Bogue compound is primarily responsible for early compressive strength (1 to 7 days) in Portland cement?',
    options: ['C2S (Belite)', 'C3S (Alite)', 'C4AF (Ferrite)', 'Gypsum'],
    correctIndex: 1,
    explanation: 'C3S (Tricalcium Silicate / Alite) hydrates rapidly and provides the majority of early strength (1–7 days), while C2S contributes to later strength (28+ days).',
  },
  {
    id: 'q-2',
    topicSlug: 'chemical-calculations',
    topicLabel: 'Chemical & Bogue Calculations',
    question: 'What is the standard formula for Total Equivalent Alkalis (Na2O_eq)?',
    options: ['Na2O + K2O', 'Na2O + 0.658 × K2O', 'K2O + 0.658 × Na2O', 'Na2O × 1.52 + K2O'],
    correctIndex: 1,
    explanation: '0.658 is the molar mass ratio of Na2O (61.98) to K2O (94.20), so Na2O_eq = Na2O + 0.658 × K2O.',
  },
  {
    id: 'q-3',
    topicSlug: 'mechanical-testing',
    topicLabel: 'Mechanical & Physical Testing',
    question: 'Why is Normal Consistency (NC%) determined before Initial Setting Time (IST) and Soundness?',
    options: [
      'To calculate Bogue compounds',
      'To determine the exact standard water % required for reproducible cement paste',
      'To measure Blaine specific surface area',
      'To check chloride content',
    ],
    correctIndex: 1,
    explanation: 'IST/FST (0.85 × NC) and Le Chatelier Soundness (0.78 × NC) depend directly on the Normal Consistency water percentage.',
  },
  {
    id: 'q-4',
    topicSlug: 'mechanical-testing',
    topicLabel: 'Mechanical & Physical Testing',
    question: 'What does Autoclave Expansion test detect that Le Chatelier Soundness may not fully capture?',
    options: ['Sulphur Trioxide only', 'Delayed expansion from crystalline MgO (periclase)', 'Blaine fineness', 'Insoluble residue'],
    correctIndex: 1,
    explanation: 'High-pressure steam curing (2.0 MPa) accelerates hydration of crystalline MgO (periclase) as well as Free Lime.',
  },
  {
    id: 'q-5',
    topicSlug: 'iso-nabl',
    topicLabel: 'ISO/IEC 17025 & NABL',
    question: 'Under ISO/IEC 17025:2017 Clause 7.5 (Technical Records), what must happen if a test record is corrected?',
    options: [
      'Delete the old value completely',
      'Preserve the original value, record the amendment, reason, date, and who made it',
      'Wait until annual audit to note it',
      'Only inform production verbally',
    ],
    correctIndex: 1,
    explanation: 'Clause 7.5.2 requires amendments to technical records to be tracked to previous versions or original observations, along with date, altered aspects, and responsible personnel.',
  },
  {
    id: 'q-6',
    topicSlug: 'iso-nabl',
    topicLabel: 'ISO/IEC 17025 & NABL',
    question: 'Which ISO/IEC 17025:2017 clause covers Equipment Management and Calibration?',
    options: ['Clause 4.1', 'Clause 6.4', 'Clause 7.8', 'Clause 8.9'],
    correctIndex: 1,
    explanation: 'Clause 6.4 governs laboratory equipment, calibration programs, identification, and protection from unintended adjustments.',
  },
];

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    slug: 'daily-lab-opening',
    title: 'Daily Laboratory Opening Checklist',
    purpose: 'Verify ambient conditions, utilities, and readiness before shift testing begins.',
    applicableActivity: 'Shift Handover & Daily Opening',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Verify physical lab & curing room temperature (27 ± 2 °C) and humidity logs',
      'Check analytical balance spirit level and run daily check-weight verification',
      'Verify XRF chiller/cooling & daily drift monitor sample',
      'Confirm distilled water availability and clean glassware ready',
    ],
  },
  {
    slug: 'sample-receiving',
    title: 'Sample Receiving Checklist',
    purpose: 'Ensure incoming samples are properly labelled, uncontaminated, and traceable.',
    applicableActivity: 'Sample Login & Preparation',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Confirm unique Sample ID, sampling date, shift, and plant category',
      'Verify sample container is sealed against moisture and CO2 absorption',
      'Check minimum required sample quantity for planned tests',
    ],
  },
  {
    slug: 'chemical-testing',
    title: 'Chemical Testing Checklist',
    purpose: 'Verify crucibles, reagents, and oxide mass balance during chemical testing.',
    applicableActivity: 'Chemical Analysis (LOI, IR, SO3, Oxides, Free Lime)',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Verify desiccator silica gel is active (blue/orange dry state) before cooling crucibles',
      'Confirm Free Lime clinker sample was freshly ground without air exposure',
      'Check Total Oxides mass balance falls within expected 98.5–100.5% range',
    ],
  },
  {
    slug: 'mechanical-testing',
    title: 'Mechanical Testing Checklist',
    purpose: 'Confirm standard sand, curing tank, and CTM readiness before casting/crushing.',
    applicableActivity: 'Blaine, Vicat, Soundness & Compressive Strength',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Verify curing tank water temperature (27 ± 1/2 °C) and water level above cubes',
      'Confirm CTM platen cleanliness and valid calibration sticker',
      'Verify Vicat 1 mm² needle is straight and free of hardened paste',
    ],
  },
  {
    slug: 'coal-testing',
    title: 'Coal Testing Checklist',
    purpose: 'Ensure safe and repeatable proximate analysis and bomb calorimetry.',
    applicableActivity: 'IM, VM, Ash, FC, GCV',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Verify oxygen cylinder pressure and bomb O-ring condition before GCV run',
      'Confirm muffle furnace calibration for 815 °C (Ash) and 900 °C (VM)',
      'Check IM% + VM% + Ash% + FC% equals 100%',
    ],
  },
  {
    slug: 'equipment-condition',
    title: 'Equipment Condition Checklist',
    purpose: 'Routine physical inspection of critical lab instruments.',
    applicableActivity: 'Equipment Maintenance',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Check all active equipment displays valid calibration labels',
      'Inspect sieve meshes (+45, +90, +212 µm) for tears or clogging',
      'Confirm faulty or overdue equipment is tagged "Out of Service"',
    ],
  },
  {
    slug: 'calibration-due-review',
    title: 'Calibration Due Review Checklist',
    purpose: 'Monthly review of upcoming and overdue instrument calibrations.',
    applicableActivity: 'Calibration Management',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Review Laboratory Resources -> Equipment Register for items due within 30 days',
      'Confirm NABL-accredited calibration agency booking for due instruments',
      'Verify new calibration certificates and uncertainty values are logged',
    ],
  },
  {
    slug: 'technical-record-review',
    title: 'Technical Record Review Checklist',
    purpose: 'Verify completeness and audit trail integrity of daily lab records.',
    applicableActivity: 'Record Verification',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Confirm all daily entries have Sample ID, testing date, and operator identity',
      'Review Audit Trail for any edited or soft-deleted entries and verify documented reasons',
      'Confirm Bogue/LSF/SM/AM calculations match raw oxide inputs',
    ],
  },
  {
    slug: 'laboratory-safety',
    title: 'Laboratory Safety Checklist',
    purpose: 'Verify PPE, fume hood, and high-temperature/radiation safety compliance.',
    applicableActivity: 'Lab EHS & Safety',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Confirm heat-resistant gloves, tongs, and safety goggles available near furnaces',
      'Verify acid fume hood exhaust and eyewash station are operational',
      'Confirm XRF/XRD radiation warning indicators and interlocks are intact',
    ],
  },
  {
    slug: 'document-review',
    title: 'Document Review Checklist',
    purpose: 'Periodic review of SOPs, test methods, and BIS/NABL updates.',
    applicableActivity: 'Document Control',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Verify master list matches active SOP versions in Laboratory Resources',
      'Check BIS & NABL portals for any recent standard amendments',
      'Confirm obsolete documents are marked Obsolete and removed from benches',
    ],
  },
  {
    slug: 'internal-audit-prep',
    title: 'Internal Audit Preparation Checklist',
    purpose: 'Prepare quality records and bench readiness prior to internal audit.',
    applicableActivity: 'Internal Audit',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Confirm previous audit NCs and CAPAs are closed with effectiveness evidence',
      'Verify staff competency & authorization matrix is current for all shifts',
      'Check PT/ILC participation records are filed and reviewed',
    ],
  },
  {
    slug: 'management-review-prep',
    title: 'Management Review Preparation Checklist',
    purpose: 'Compile quality KPIs and compliance inputs for Management Review Meeting.',
    applicableActivity: 'Management Review',
    guidanceType: 'ChittorTech Operational Guidance',
    items: [
      'Compile internal audit summary, customer/plant feedback, and NC/CAPA trends',
      'Summarize equipment calibration status and PT/ILC performance',
      'Prepare resource, training, and improvement action proposals',
    ],
  },
];

