export interface ChemicalTopic {
  id: string;
  symbol: string;
  title: string;
  definition: string;
  purpose: string;
  importance: string;
  principle: string;
  method: string;
  equipment: string;
  samplePrep: string;
  interpretation: string;
  commonMistakes: string;
  standards: string;
}

export interface CalculationTopic {
  id: string;
  title: string;
  formula: string;
  variables: string;
  units: string;
  workedExample: string;
  steps: string;
  interpretation: string;
  limitations: string;
  reference: string;
}

export interface MechanicalTopic {
  id: string;
  title: string;
  purpose: string;
  principle: string;
  equipment: string;
  methodOverview: string;
  interpretation: string;
  reference: string;
}

export interface CoalTopic {
  id: string;
  title: string;
  definition: string;
  formulaNote: string;
  kilnImportance: string;
  reference: string;
}

export interface InstrumentTopic {
  id: string;
  name: string;
  purpose: string;
  principle: string;
  components: string;
  applications: string;
  operatingOverview: string;
  routineChecks: string;
  calibrationNotes: string;
  maintenanceNotes: string;
  safetyPrecautions: string;
  commonErrors: string;
  relatedMethods: string;
}

export const CHEMICAL_TOPICS: ChemicalTopic[] = [
  {
    id: 'chem-loi',
    symbol: 'LOI',
    title: 'Loss on Ignition (LOI)',
    definition: 'Percentage weight loss when a dried sample is ignited at 950 ± 50 °C to constant mass.',
    purpose: 'Measures combined moisture, carbonates (CaCO3/MgCO3), and unburnt carbon.',
    importance: 'High LOI in cement indicates pre-hydration or excess limestone/fly ash; in clinker it reflects incomplete calcination.',
    principle: 'Thermal decomposition of carbonates and bound water at high temperature.',
    method: 'Gravimetric ignition per IS 4032.',
    equipment: 'Muffle Furnace (950–1000 °C), Platinum/Porcelain Crucible, Desiccator, Analytical Balance.',
    samplePrep: 'Dry at 105–110 °C if moisture-sensitive; weigh accurately (~1.0000 g).',
    interpretation: 'Lower LOI in clinker (<1.0%) shows good burning; cement LOI must stay within IS 269 / IS 1489 limits.',
    commonMistakes: 'Cooling crucible outside desiccator (moisture pickup) or insufficient ignition duration.',
    standards: 'IS 4032:1985, IS 269:2015',
  },
  {
    id: 'chem-ir',
    symbol: 'IR',
    title: 'Insoluble Residue (IR)',
    definition: 'Non-cementitious siliceous/clayey fraction remaining insoluble after acid (HCl) and alkali (Na2CO3) digestion.',
    purpose: 'Detects inert impurities or unreactive silica in OPC and quantifies pozzolana in PPC.',
    importance: 'Excess IR in OPC dilutes strength-giving phases.',
    principle: 'Dissolution of calcium silicates/aluminates in HCl followed by Na2CO3 wash and ignition.',
    method: 'Gravimetric acid-alkali digestion per IS 4032.',
    equipment: 'Hot Plate, Ashless Filter Paper, Muffle Furnace, Analytical Balance.',
    samplePrep: '1.0 g finely ground sample digested in dilute HCl.',
    interpretation: 'OPC IR limits are specified per cement type/grade in IS 269 / IS 1489 / IS 455; verify exact current limit in the official BIS standard.',
    commonMistakes: 'Incomplete Na2CO3 washing of gelatinous silica or tearing filter paper.',
    standards: 'IS 4032:1985, IS 269:2015',
  },
  {
    id: 'chem-so3',
    symbol: 'SO3',
    title: 'Sulphur Trioxide (SO3)',
    definition: 'Total sulphate content expressed as % SO3, primarily contributed by gypsum added during grinding.',
    purpose: 'Controls C3A hydration rate and prevents flash set.',
    importance: 'Too low SO3 causes flash set; too high SO3 causes delayed ettringite expansion and soundness failure.',
    principle: 'Precipitation as BaSO4 (wet) or X-ray fluorescence intensity (XRF).',
    method: 'IS 4032 (BaSO4 gravimetric) or IS 12803 (XRF).',
    equipment: 'XRF Spectrometer or Muffle Furnace + Hot Plate.',
    samplePrep: 'Pressed pellet / fused bead for XRF or acid digestion for wet method.',
    interpretation: 'Optimum gypsum addition keeps SO3 within IS 269 / IS 1489 specification limits.',
    commonMistakes: 'Sulphide interference in slag cement or improper pellet pressure in XRF.',
    standards: 'IS 4032:1985, IS 12803:1989',
  },
  {
    id: 'chem-sio2',
    symbol: 'SiO2',
    title: 'Silicon Dioxide (SiO2)',
    definition: 'Primary acidic oxide forming calcium silicates (C3S & C2S) in clinker and cement.',
    purpose: 'Essential input for LSF, Silica Modulus (SM), and Bogue calculations.',
    importance: 'Drives early (C3S) and late (C2S) compressive strength development.',
    principle: 'Acid dehydration gravimetry or XRF spectrometry.',
    method: 'IS 4032 / IS 12803 (XRF).',
    equipment: 'XRF Spectrometer, Muffle Furnace, Platinum Crucible.',
    samplePrep: 'Finely ground (<75 µm) dry sample.',
    interpretation: 'Used directly in SM = SiO2 / (Al2O3 + Fe2O3) and LSF.',
    commonMistakes: 'Incomplete silica dehydration in wet method or particle-size effect in pressed-pellet XRF.',
    standards: 'IS 4032:1985, IS 12803:1989',
  },
  {
    id: 'chem-al2o3',
    symbol: 'Al2O3',
    title: 'Aluminium Oxide (Al2O3)',
    definition: 'Amphoteric flux oxide forming C3A and C4AF phases during clinkerization.',
    purpose: 'Controls liquid phase formation in the kiln and early setting behavior.',
    importance: 'Excess Al2O3 increases C3A, raising heat of hydration and sulphate vulnerability.',
    principle: 'Complexometric EDTA titration or XRF spectrometry.',
    method: 'IS 4032 / IS 12803 (XRF).',
    equipment: 'XRF Spectrometer, Burette & Volumetric Glassware.',
    samplePrep: 'Homogenized dry powder.',
    interpretation: 'Evaluated via Alumina Modulus (AM = Al2O3 / Fe2O3).',
    commonMistakes: 'pH drift during EDTA titration or iron interference.',
    standards: 'IS 4032:1985, IS 12803:1989',
  },
  {
    id: 'chem-fe2o3',
    symbol: 'Fe2O3',
    title: 'Ferric Oxide (Fe2O3)',
    definition: 'Fluxing oxide that combines with Al2O3 and CaO to form C4AF (ferrite phase).',
    purpose: 'Lowers clinkerization temperature and imparts grey color to cement.',
    importance: 'Balances AM to control kiln coating and liquid phase viscosity.',
    principle: 'Dichromate/EDTA titration or XRF spectrometry.',
    method: 'IS 4032 / IS 12803 (XRF).',
    equipment: 'XRF Spectrometer, Titration Setup.',
    samplePrep: 'Dry homogenized powder.',
    interpretation: 'Higher Fe2O3 lowers AM and reduces C3A.',
    commonMistakes: 'Incomplete sample dissolution in wet titration.',
    standards: 'IS 4032:1985, IS 12803:1989',
  },
  {
    id: 'chem-cao',
    symbol: 'CaO',
    title: 'Calcium Oxide (CaO)',
    definition: 'Major basic oxide (~60–67% in OPC/clinker) derived from limestone calcination.',
    purpose: 'Primary driver of C3S/C2S formation and Lime Saturation Factor (LSF).',
    importance: 'Insufficient CaO lowers strength; excess CaO creates uncombined Free Lime causing expansion.',
    principle: 'Permanganate/EDTA titration or XRF spectrometry.',
    method: 'IS 4032 / IS 12803 (XRF).',
    equipment: 'XRF Spectrometer, Analytical Balance, Titration Assembly.',
    samplePrep: 'Dry finely ground sample.',
    interpretation: 'Must stay balanced with SiO2, Al2O3, Fe2O3 (LSF ~ 0.90–0.98 in clinker).',
    commonMistakes: 'CO2 absorption in stored samples or inaccurate sample mass.',
    standards: 'IS 4032:1985, IS 12803:1989',
  },
  {
    id: 'chem-mgo',
    symbol: 'MgO',
    title: 'Magnesium Oxide (MgO)',
    definition: 'Basic oxide originating from dolomitic limestone impurities.',
    purpose: 'Acts as a minor flux in small amounts but causes late-age expansion if crystalline periclase forms.',
    importance: 'Strictly capped by BIS standards (e.g., ≤ 6.0% in OPC) to prevent unsoundness.',
    principle: 'EDTA titration or XRF spectrometry.',
    method: 'IS 4032 / IS 12803 (XRF).',
    equipment: 'XRF Spectrometer, Autoclave (for soundness check).',
    samplePrep: 'Dry homogenized powder.',
    interpretation: 'High MgO (>5%) requires Autoclave Expansion monitoring.',
    commonMistakes: 'Co-titration of CaO and MgO without accurate CaO subtraction.',
    standards: 'IS 4032:1985, IS 269:2015',
  },
  {
    id: 'chem-na2o',
    symbol: 'Na2O',
    title: 'Sodium Oxide (Na2O)',
    definition: 'Volatile alkali oxide present in raw materials and fuels.',
    purpose: 'Used with K2O to compute Total Equivalent Alkalis (Na2O_eq).',
    importance: 'Excess alkalis risk Alkali-Silica Reaction (ASR) in concrete and kiln preheater buildup.',
    principle: 'Flame photometry, AAS, or XRF.',
    method: 'IS 4032 / IS 12803.',
    equipment: 'Flame Photometer, XRF Spectrometer.',
    samplePrep: 'Acid extract (flame photometer) or pressed pellet (XRF).',
    interpretation: 'Low-alkali cement requires Na2O_eq ≤ 0.60%.',
    commonMistakes: 'Contamination from soda-glassware or uncalibrated flame photometer.',
    standards: 'IS 4032:1985, IS 12803:1989',
  },
  {
    id: 'chem-k2o',
    symbol: 'K2O',
    title: 'Potassium Oxide (K2O)',
    definition: 'Volatile alkali oxide entering from clay/shale and coal ash.',
    purpose: 'Combined with Na2O (0.658 × K2O) for Equivalent Alkali control.',
    importance: 'Causes preheater cyclone coating/jamming and affects concrete ASR.',
    principle: 'Flame photometry or XRF spectrometry.',
    method: 'IS 4032 / IS 12803.',
    equipment: 'Flame Photometer, XRF Spectrometer.',
    samplePrep: 'Acid digestion or XRF pellet.',
    interpretation: 'Monitored alongside chloride/sulphur cycles in kiln.',
    commonMistakes: 'Dirty burner nozzle in flame photometer.',
    standards: 'IS 4032:1985, IS 12803:1989',
  },
  {
    id: 'chem-cl',
    symbol: 'Cl⁻',
    title: 'Chloride (Cl⁻)',
    definition: 'Trace halide ion in cement, raw meal, or alternate fuels.',
    purpose: 'Protects reinforced concrete steel from chloride-induced corrosion.',
    importance: 'Strictly limited (e.g., ≤ 0.10% in OPC; ≤ 0.05% for prestressed concrete) and causes kiln ring buildup.',
    principle: 'Volhard argentometric titration (AgNO3) or ion chromatography / XRF.',
    method: 'IS 4032 (Volhard titration) / IS 12803.',
    equipment: 'Micro-Burette, Hot Plate, XRF Spectrometer.',
    samplePrep: 'Nitric acid digestion without boiling off HCl.',
    interpretation: 'Reported to 3–4 decimal places (e.g., 0.015%).',
    commonMistakes: 'Boiling sample vigorously (loss of volatile chloride) or chloride-contaminated water.',
    standards: 'IS 4032:1985, IS 269:2015',
  },
  {
    id: 'chem-fl',
    symbol: 'Free Lime',
    title: 'Free Lime (f-CaO)',
    definition: 'Uncombined calcium oxide remaining in clinker after burning.',
    purpose: 'Primary real-time indicator of kiln burning efficiency and clinker soundness.',
    importance: 'High Free Lime (>1.5–2.0%) indicates under-burning or poor raw mix fineness and causes Le Chatelier expansion.',
    principle: 'Extraction in hot ethylene glycol / glycerol-ethanol followed by acid titration.',
    method: 'Glycol extraction titration (IS 4032 / ASTM C114).',
    equipment: 'Reflux Condenser / Glycol Bath, Magnetic Stirrer, Burette.',
    samplePrep: 'Freshly ground dry clinker (protect from atmospheric moisture/CO2).',
    interpretation: 'Target typically 0.8–1.5% in well-burnt clinker.',
    commonMistakes: 'Moisture exposure before extraction (converts CaO to Ca(OH)2) or incomplete reflux time.',
    standards: 'IS 4032:1985, ASTM C114',
  },
];

export const CALCULATION_TOPICS: CalculationTopic[] = [
  {
    id: 'calc-total',
    title: 'Total Oxides (Σ)',
    formula: 'Total = LOI + IR + SO3 + SiO2 + Al2O3 + Fe2O3 + CaO + MgO + K2O + Na2O + Cl⁻',
    variables: 'Each oxide entered in weight % (g/100g).',
    units: '%',
    workedExample: 'LOI=1.20, IR=0.50, SO3=2.30, SiO2=20.80, Al2O3=5.10, Fe2O3=3.60, CaO=63.40, MgO=1.80, K2O=0.55, Na2O=0.22, Cl=0.02',
    steps: '1.20 + 0.50 + 2.30 + 20.80 + 5.10 + 3.60 + 63.40 + 1.80 + 0.55 + 0.22 + 0.02 = 99.49%',
    interpretation: 'A valid full cement analysis normally sums between 98.5% and 100.5% (excluding double-counted Free Lime/IR).',
    limitations: 'Free Lime is part of total CaO and must not be added again to avoid double counting.',
    reference: 'ChittorTech `exportService.ts` / IS 4032 Mass Balance Check',
  },
  {
    id: 'calc-na2o-eq',
    title: 'Total Alkali as Na2O (Na2O_eq)',
    formula: 'Na2O_eq = Na2O + 0.658 × K2O',
    variables: 'Na2O = Sodium Oxide (%), K2O = Potassium Oxide (%), 0.658 = molar mass ratio Na2O (61.98) / K2O (94.20).',
    units: '%',
    workedExample: 'Na2O = 0.20%, K2O = 0.50%',
    steps: 'Na2O_eq = 0.20 + (0.658 × 0.50) = 0.20 + 0.329 = 0.529%',
    interpretation: 'Low-alkali cement limit is ≤ 0.60% (ASTM C150 / IS 269 optional requirement).',
    limitations: 'Assumes total acid-soluble alkalis contribute equally to pore solution.',
    reference: 'IS 269:2015 / ASTM C150',
  },
  {
    id: 'calc-lsf',
    title: 'Lime Saturation Factor (LSF)',
    formula: 'LSF = CaO / (2.8 × SiO2 + 1.2 × Al2O3 + 0.65 × Fe2O3)  [× 100 if expressed in %]',
    variables: 'CaO, SiO2, Al2O3, Fe2O3 in weight %.',
    units: 'Ratio (or %)',
    workedExample: 'CaO = 64.5, SiO2 = 21.0, Al2O3 = 5.2, Fe2O3 = 3.5',
    steps: 'Denominator = 2.8(21.0) + 1.2(5.2) + 0.65(3.5) = 58.80 + 6.24 + 2.275 = 67.315; LSF = 64.5 / 67.315 = 0.958 (95.8%)',
    interpretation: 'Controls C3S/C2S ratio. Typical clinker LSF is 0.92–0.98 (92–98%).',
    limitations: 'Note: Some plant sheets use 1.18 instead of 1.2 for Al2O3; ChittorTech uses 1.2 in `bogueEngine.ts`.',
    reference: 'Lea’s Chemistry of Cement / `bogueEngine.ts`',
  },
  {
    id: 'calc-sm',
    title: 'Silica Modulus (SM)',
    formula: 'SM = SiO2 / (Al2O3 + Fe2O3)',
    variables: 'SiO2, Al2O3, Fe2O3 in weight %.',
    units: 'Dimensionless ratio',
    workedExample: 'SiO2 = 21.0, Al2O3 = 5.2, Fe2O3 = 3.5',
    steps: 'SM = 21.0 / (5.2 + 3.5) = 21.0 / 8.7 = 2.41',
    interpretation: 'Typical cement clinker SM is 2.2–2.7. Higher SM makes raw meal harder to burn; lower SM increases liquid phase.',
    limitations: 'Does not account for quartz fineness in raw meal.',
    reference: 'Cement Kiln Process Control / `bogueEngine.ts`',
  },
  {
    id: 'calc-am',
    title: 'Alumina Modulus (AM)',
    formula: 'AM = Al2O3 / Fe2O3',
    variables: 'Al2O3, Fe2O3 in weight %.',
    units: 'Dimensionless ratio',
    workedExample: 'Al2O3 = 5.2, Fe2O3 = 3.5',
    steps: 'AM = 5.2 / 3.5 = 1.49',
    interpretation: 'Typical clinker AM is 1.3–1.8. Determines C3A/C4AF ratio and burning-zone melt viscosity.',
    limitations: 'If AM < 0.64, standard Bogue equations change because excess Fe2O3 forms C2F instead of C3A.',
    reference: 'Cement Chemistry / `bogueEngine.ts`',
  },
  {
    id: 'calc-bogue',
    title: 'Bogue Compounds (C3S, C2S, C3A, C4AF)',
    formula: 'C4AF = 3.043·Fe2O3 | C3A = 2.650·Al2O3 − 1.692·Fe2O3 | C3S = 4.071·CaO − 7.600·SiO2 − 6.718·Al2O3 − 1.430·Fe2O3 − 2.852·SO3 | C2S = 2.867·SiO2 − 0.7544·C3S',
    variables: 'Oxide % (when Free Lime is subtracted from CaO for clinker, effective CaO = CaO − f-CaO). Valid when AM ≥ 0.64.',
    units: '%',
    workedExample: 'CaO=63.4, SiO2=20.8, Al2O3=5.1, Fe2O3=3.6, SO3=2.3',
    steps: 'C4AF = 3.043×3.6 = 10.95% | C3A = 2.65×5.1 − 1.692×3.6 = 7.42% | C3S = 4.071(63.4) − 7.6(20.8) − 6.718(5.1) − 1.43(3.6) − 2.852(2.3) = 53.95% | C2S = 2.867(20.8) − 0.7544(53.95) = 18.93%',
    interpretation: 'C3S gives early strength (1–7d); C2S gives later strength (28d+); C3A controls heat & setting; C4AF acts as flux.',
    limitations: 'Potential phase calculation assuming chemical equilibrium during cooling; actual XRD mineralogy may differ slightly.',
    reference: 'ASTM C150 / Bogue (1929) / `bogueEngine.ts`',
  },
  {
    id: 'calc-cv-lv',
    title: 'Coating Value (C.V.) & Liquid Phase Value (L.V.)',
    formula: 'L.V. = 3.00·Al2O3 + 2.25·Fe2O3 + MgO + K2O + Na2O (at ~1450 °C) | C.V. = C3A + C4AF + 0.2·C2S + 2·Fe2O3',
    variables: 'Oxide % and Bogue phases in clinker.',
    units: '% (empirical index)',
    workedExample: 'Al2O3=5.1, Fe2O3=3.6, MgO=1.8, K2O=0.55, Na2O=0.22',
    steps: 'L.V. ≈ 3.00(5.1) + 2.25(3.6) + 1.8 + 0.55 + 0.22 = 25.97%',
    interpretation: 'Predicts kiln burning-zone liquid melt (~24–28% typical) and protective refractory coating stability.',
    limitations: 'Plant empirical / ChittorTech reference formula (not an official BIS/ASTM standard formula); verify against your plant’s historical kiln operating range.',
    reference: 'Cement Kiln Process Engineering / ChittorTech `bogueEngine.ts` (Empirical Reference)',
  },
];

export const MECHANICAL_TOPICS: MechanicalTopic[] = [
  { id: 'mech-r45', title: 'Residue +45 µm', purpose: 'Measures coarse particles retained on a 45-micron sieve.', principle: 'Wet or air-jet sieving of a weighed cement/raw meal sample.', equipment: '45 µm Test Sieve / Alpine Air-Jet Sieve, Analytical Balance.', methodOverview: 'Pass sample through 45 µm sieve and weigh retained fraction as % of initial mass.', interpretation: 'Lower +45 µm residue improves hydration reactivity and early strength.', reference: 'IS 4031 (Part 1)' },
  { id: 'mech-r90', title: 'Residue +90 µm', purpose: 'Standard fineness check for cement and raw meal grinding control.', principle: 'Dry or air-jet sieving through a 90-micron mesh.', equipment: '90 µm IS Sieve, Sieve Shaker, Balance.', methodOverview: '100 g (or 10 g air-jet) sieved until passing rate stabilizes; express residue in %.', interpretation: 'OPC +90 µm residue is normally limited (e.g., ≤ 10% per IS 269).', reference: 'IS 4031 (Part 1):1996' },
  { id: 'mech-r212', title: 'Residue +212 µm', purpose: 'Monitors coarse grit/unground silica in raw meal.', principle: 'Dry sieving on 212-micron sieve.', equipment: '212 µm Sieve, Balance.', methodOverview: 'Sieve weighed raw meal and calculate % retained.', interpretation: 'High +212 µm coarse quartz slows clinker burnability and raises Free Lime.', reference: 'Plant Raw Meal Control / IS 4031 (Part 1)' },
  { id: 'mech-nc', title: 'Normal Consistency (NC%)', purpose: 'Determines exact water % needed to prepare standard cement paste.', principle: 'Vicat plunger penetration depth (5–7 mm from bottom of mould).', equipment: 'Vicat Apparatus (10 mm plunger), Balance, Mixing Trowel.', methodOverview: 'Mix 400 g cement with trial water % for 3–5 min; measure plunger penetration.', interpretation: 'NC% (typically 26–32%) is mandatory input for IST, FST, and Soundness water.', reference: 'IS 4031 (Part 4)' },
  { id: 'mech-blaine', title: 'Blaine Fineness (m²/kg)', purpose: 'Measures specific surface area of cement particles.', principle: 'Air permeability through a compacted cement bed of known porosity.', equipment: 'Blaine Air Permeability Apparatus, Analytical Balance, Timer.', methodOverview: 'Weigh calibrated mass, compact in cell, time manometer drop, compute S = K·√t.', interpretation: 'Higher Blaine (e.g., 280–350 m²/kg) increases hydration rate and early strength.', reference: 'IS 4031 (Part 2)' },
  { id: 'mech-ist', title: 'Initial Setting Time (IST)', purpose: 'Measures time until cement paste begins losing plasticity.', principle: 'Vicat 1 mm² needle penetration stopping 5 ± 0.5 mm from mould bottom.', equipment: 'Vicat Apparatus (1 mm² needle), Stopwatch, 27 ± 2 °C Chamber.', methodOverview: 'Mix with 0.85 × NC water; test periodically from water-addition zero time.', interpretation: 'Must be ≥ 30 minutes (OPC/PPC/PSC) to allow concrete mixing & placing.', reference: 'IS 4031 (Part 5)' },
  { id: 'mech-fst', title: 'Final Setting Time (FST)', purpose: 'Measures time until cement paste completely hardens to resist surface impression.', principle: 'Vicat needle with annular attachment makes an impression without the outer ring.', equipment: 'Vicat Apparatus (Annular Attachment), Stopwatch.', methodOverview: 'Continue testing the IST specimen until annular ring leaves no mark.', interpretation: 'Must be ≤ 600 minutes (10 hours) per IS 269 / IS 1489.', reference: 'IS 4031 (Part 5)' },
  { id: 'mech-lech', title: 'Le Chatelier Soundness (mm)', purpose: 'Detects potential expansion caused by uncombined Free Lime.', principle: 'Measures indicator-arm separation after boiling hydrated paste.', equipment: 'Le Chatelier Mould, Water Bath, Boiling Bath, Scale.', methodOverview: 'Cure paste 24h at 27 ± 2 °C, boil 3 hours, measure expansion in mm.', interpretation: 'Must not exceed 10 mm for OPC/PPC/PSC.', reference: 'IS 4031 (Part 3)' },
  { id: 'mech-auto', title: 'Autoclave Expansion (%)', purpose: 'Detects delayed expansion from both Free Lime and crystalline MgO (periclase).', principle: 'High-pressure steam curing (2.0 MPa / 215.7 °C) accelerates MgO hydration.', equipment: 'Cement Autoclave, 25×25×282 mm Bar Moulds, Length Comparator.', methodOverview: 'Cure bar 24h, autoclave 3h at 2.0 MPa, measure % length change.', interpretation: 'Must be ≤ 0.8% per IS 269 when MgO > 3–5%.', reference: 'IS 4031 (Part 3)' },
  { id: 'mech-cs', title: 'Compressive Strength (1D, 3D, 7D, 28D)', purpose: 'Verifies structural load-bearing grade (33 / 43 / 53 MPa).', principle: 'Crushing 70.6 mm (50 cm²) 1:3 cement-standard-sand mortar cubes.', equipment: 'Compression Testing Machine (CTM), Vibrating Machine, Curing Tank (27 ± 2 °C).', methodOverview: 'Cast 3 cubes per age with (P/4 + 3)% water, cure in water, crush at 24h, 72h, 168h, 672h.', interpretation: 'Verify minimum MPa limits for the declared cement grade against the current edition of IS 269 / IS 1489 / IS 455.', reference: 'IS 4031 (Part 6), IS 269:2015' },
];

export const COAL_TOPICS: CoalTopic[] = [
  { id: 'coal-im', title: 'Inherent Moisture (IM%)', definition: 'Moisture held inside coal pores at equilibrium with lab air (determined at 108 ± 2 °C).', formulaNote: 'IM% = (Loss in mass / Initial mass) × 100', kilnImportance: 'High moisture lowers net flame temperature and mill drying capacity.', reference: 'IS 1350 (Part 1)' },
  { id: 'coal-vm', title: 'Volatile Matter (VM%)', definition: 'Gaseous hydrocarbons driven off when coal is heated at 900 ± 15 °C for 7 minutes out of air.', formulaNote: 'Corrected for IM%: VM% = Total loss% − IM%', kilnImportance: 'Controls flame ignition stability and flame length in kiln & calciner.', reference: 'IS 1350 (Part 1)' },
  { id: 'coal-ash', title: 'Ash Content (Ash%)', definition: 'Incombustible mineral residue remaining after complete combustion at 815 ± 10 °C.', formulaNote: 'Ash% = (Residue mass / Initial mass) × 100', kilnImportance: 'Coal ash absorbs directly into clinker, altering SiO2/Al2O3/Fe2O3 and LSF.', reference: 'IS 1350 (Part 1)' },
  { id: 'coal-fc', title: 'Fixed Carbon (FC%)', definition: 'Solid combustible carbon residue remaining after moisture, VM, and ash are removed.', formulaNote: 'FC% = 100 − (IM% + VM% + Ash%)', kilnImportance: 'Provides sustained radiant heat in the kiln burning zone.', reference: 'IS 1350 (Part 1) / `bogueEngine.ts`' },
  { id: 'coal-gcv', title: 'Gross Calorific Value (GCV)', definition: 'Total heat released per kg of coal burned in a Bomb Calorimeter (kcal/kg).', formulaNote: 'Measured directly via calibrated Bomb Calorimeter.', kilnImportance: 'Determines specific fuel consumption (kcal/kg clinker) and kiln heat balance.', reference: 'IS 1350 (Part 2)' },
  { id: 'coal-uhv', title: 'Useful Heat Value (UHV)', definition: 'Empirical Indian coal grading index based on Ash% and IM%.', formulaNote: 'UHV = 8900 − 138 × (Ash% + IM%)', kilnImportance: 'Used for commercial coal grade benchmarking alongside GCV.', reference: 'Indian Coal Grading / `bogueEngine.ts`' },
  { id: 'coal-blend', title: 'Coal Blending (Kiln, PC, NKiln, NPC, Mixed 40:60)', definition: 'Weighted blending of high-CV/low-ash Kiln Coal with PC/Calciner Coal (40:60 ratio in ChittorTech).', formulaNote: 'Mixed = 0.40 × Kiln Coal + 0.60 × PC Coal', kilnImportance: 'Stabilizes kiln & precalciner heat input and ash absorption into clinker.', reference: 'ChittorTech `bogueEngine.ts`' },
];

export const INSTRUMENT_TOPICS: InstrumentTopic[] = [
  { id: 'inst-xrf', name: 'XRF Analyzer', purpose: 'Rapid multi-element oxide analysis (CaO, SiO2, Al2O3, Fe2O3, SO3, MgO, K2O, Na2O, Cl).', principle: 'X-ray excitation causes elements to emit characteristic fluorescent X-rays.', components: 'X-ray tube, goniometer/crystals or SDD detector, vacuum chamber, sample spinner.', applications: 'Raw meal, kiln feed, clinker, cement hourly QC.', operatingOverview: 'Grind sample, press pellet or fuse bead, load into holder, run calibrated channel.', routineChecks: 'Daily drift monitor / check sample before shift.', calibrationNotes: 'Calibrate with Certified Reference Materials (CRMs) per IS 12803.', maintenanceNotes: 'Clean sample chamber dust, check cooling water/chiller & P10 gas.', safetyPrecautions: 'Never bypass X-ray interlocks; follow AERB/radiation safety rules.', commonErrors: 'Incorrect LOI entry, cracked pressed pellet, moisture in sample.', relatedMethods: 'IS 12803:1989' },
  { id: 'inst-xrd', name: 'XRD Analyzer', purpose: 'Direct mineralogical phase quantification (C3S, C2S, C3A, C4AF, Free Lime, Gypsum/Hemihydrate).', principle: 'Bragg’s Law diffraction of monochromatic X-rays by crystalline lattice planes.', components: 'X-ray source, goniometer, sample stage, PSD detector, Rietveld software.', applications: 'Clinker mineralogy & gypsum dehydration checks.', operatingOverview: 'Back-load finely ground (<10 µm) powder flat into holder; scan 2θ range.', routineChecks: 'Corundum/Silicon peak alignment check.', calibrationNotes: 'Verify 2θ zero-shift and intensity stability.', maintenanceNotes: 'Check chiller coolant and tube hours.', safetyPrecautions: 'Radiation interlock compliance; never open shutter manually.', commonErrors: 'Preferred orientation from improper sample pressing.', relatedMethods: 'Reference standard (verify applicable edition in your lab scope)' },
  { id: 'inst-blaine', name: 'Blaine Apparatus', purpose: 'Measure cement specific surface area (m²/kg).', principle: 'Kozeny-Carman air permeability through compacted powder bed.', components: 'U-tube manometer, permeability cell, perforated disc, plunger, filter paper.', applications: 'Cement grinding fineness control (OPC/PPC/PSC).', operatingOverview: 'Weigh exact mass, form bed with plunger, draw liquid to top mark, time drop.', routineChecks: 'Check zero leak and oil meniscus cleanliness.', calibrationNotes: 'Determine apparatus constant K using NIST/NCCBM CRM 114.', maintenanceNotes: 'Replace worn filter discs and keep ground-glass joint greased.', safetyPrecautions: 'Handle glass manometer gently.', commonErrors: 'Air leak at cell joint, wrong sample mass, dirty manometer.', relatedMethods: 'IS 4031 (Part 2)' },
  { id: 'inst-ctm', name: 'Compression Testing Machine (CTM)', purpose: 'Determine 1D, 3D, 7D, and 28D mortar cube compressive strength.', principle: 'Controlled hydraulic axial load applied at uniform rate until cube failure.', components: 'Load frame, hydraulic power pack, upper spherical platen, digital load indicator.', applications: 'Cement grade certification (33 / 43 / 53 MPa).', operatingOverview: 'Center damp cube cleanly on platen, apply load at 35 N/mm²/min without shock.', routineChecks: 'Inspect platens for debris and spherical seat movement.', calibrationNotes: 'Annual NABL calibration across full working load range.', maintenanceNotes: 'Check hydraulic oil level and clean crushed mortar grit.', safetyPrecautions: 'Always close safety guard door before loading.', commonErrors: 'Off-center cube placement, wrong loading pace, dry cubes.', relatedMethods: 'IS 4031 (Part 6)' },
  { id: 'inst-bal', name: 'Analytical Weighing Balance', purpose: 'High-precision mass measurement (0.1 mg or 1 mg readability).', principle: 'Electromagnetic force restoration.', components: 'Draft shield, weighing pan, internal/external calibration weight, spirit level.', applications: 'All chemical, coal, Blaine, and residue determinations.', operatingOverview: 'Verify level bubble, tare clean vessel, read after stability indicator.', routineChecks: 'Daily check weight verification.', calibrationNotes: 'Annual NABL calibration with E2/F1 class weights.', maintenanceNotes: 'Brush chamber gently; keep away from air drafts and vibration.', safetyPrecautions: 'Do not overload pan or weigh hot crucibles.', commonErrors: 'Weighing warm samples (convection currents), uncalibrated pan.', relatedMethods: 'IS 4032 / IS 4031' },
  { id: 'inst-furnace', name: 'Muffle Furnace', purpose: 'High-temperature ignition (LOI at 950 °C, Coal Ash at 815 °C, VM at 900 °C).', principle: 'Electric resistance heating in an insulated refractory chamber.', components: 'Heating elements, PID controller, thermocouple, refractory muffle.', applications: 'LOI, IR, SO3, Coal Ash & VM.', operatingOverview: 'Preheat to setpoint, place crucibles with tongs, time accurately, transfer to desiccator.', routineChecks: 'Verify controller vs. calibrated reference thermocouple.', calibrationNotes: 'Annual thermal profile & thermocouple calibration.', maintenanceNotes: 'Inspect door seal and heating coils.', safetyPrecautions: 'Use heat-resistant gloves, face shield, and long tongs.', commonErrors: 'Temperature overshoot or opening door too frequently.', relatedMethods: 'IS 4032, IS 1350 (Part 1)' },
  { id: 'inst-oven', name: 'Drying Oven', purpose: 'Moisture removal at 105–110 °C.', principle: 'Thermostatically controlled hot-air convection.', components: 'Heater, fan, thermostat/PID, perforated shelves.', applications: 'Sample drying and Coal Inherent Moisture.', operatingOverview: 'Set 108 ± 2 °C, dry uncovered sample to constant mass, cool in desiccator.', routineChecks: 'Verify thermometer reading.', calibrationNotes: 'Annual temperature calibration.', maintenanceNotes: 'Keep vents unobstructed.', safetyPrecautions: 'Never dry flammable solvents in a standard lab oven.', commonErrors: 'Overfilling shelves blocking airflow.', relatedMethods: 'IS 1350 (Part 1)' },
  { id: 'inst-sieve', name: 'Sieve Shaker / Air-Jet Sieve', purpose: 'Particle size residue determination (+45, +90, +212 µm).', principle: 'Mechanical vibration or vacuum air-jet separation.', components: 'Standard wire-cloth sieves, lid, pan, timer/vacuum.', applications: 'Cement & raw meal fineness.', operatingOverview: 'Weigh sample, run timed cycle, weigh retained residue.', routineChecks: 'Inspect mesh for tears or blinding.', calibrationNotes: 'Verify aperture size periodically.', maintenanceNotes: 'Clean mesh with soft brush or ultrasonic bath (never sharp pins).', safetyPrecautions: 'Wear dust mask when handling fine powders.', commonErrors: 'Torn mesh or static clumping.', relatedMethods: 'IS 4031 (Part 1)' },
  { id: 'inst-lech', name: 'Le Chatelier Apparatus', purpose: 'Measure cement soundness expansion.', principle: 'Split brass cylinder amplifies linear paste expansion at indicator tips.', components: 'Split cylinder (30 mm dia × 30 mm high), 165 mm indicator arms, glass plates, 100 g weight.', applications: 'Free Lime soundness check.', operatingOverview: 'Fill oiled mould, cover with weighted glass plates, cure 24h, boil 3h, measure D2 − D1.', routineChecks: 'Check spring elasticity of split mould.', calibrationNotes: 'Verify mould dimensions & arm length.', maintenanceNotes: 'Clean and lightly oil brass after each test.', safetyPrecautions: 'Use tongs when removing from boiling water bath.', commonErrors: 'Leaking base plate or damaged indicator tips.', relatedMethods: 'IS 4031 (Part 3)' },
  { id: 'inst-auto', name: 'Autoclave', purpose: 'High-pressure steam soundness test for MgO & Free Lime.', principle: 'Accelerated hydration at 2.0 MPa steam pressure.', components: 'Pressure vessel, pressure gauge, safety valve, heating element, bar rack.', applications: 'Cement soundness (Autoclave Expansion %).', operatingOverview: 'Measure initial bar length, steam 3h at 2.0 MPa, cool gradually, measure final length.', routineChecks: 'Check safety relief valve and gasket.', calibrationNotes: 'Annual pressure gauge & comparator calibration.', maintenanceNotes: 'Use distilled water to avoid scale buildup.', safetyPrecautions: 'Never open lid until pressure gauge reads zero.', commonErrors: 'Rapid depressurization cracking specimens.', relatedMethods: 'IS 4031 (Part 3)' },
  { id: 'inst-cal', name: 'Bomb Calorimeter', purpose: 'Measure Gross Calorific Value (GCV) of coal and petcoke.', principle: 'Constant-volume oxygen combustion measuring water-jacket temperature rise.', components: 'Oxygen bomb, calorimeter bucket, stirrer, ignition unit, precision thermometer.', applications: 'Kiln Coal, PC Coal, and Mixed Coal heat value.', operatingOverview: 'Weigh ~1 g pellet in crucible, charge bomb with O2 (~2.5–3.0 MPa), ignite, record ΔT.', routineChecks: 'Inspect O-rings and firing wire.', calibrationNotes: 'Standardize heat capacity (W) using Benzoic Acid CRM.', maintenanceNotes: 'Wash bomb interior after each run.', safetyPrecautions: 'Hydrostatic pressure test bomb periodically; never exceed O2 pressure limit.', commonErrors: 'Incomplete combustion (soot) or O2 leak.', relatedMethods: 'IS 1350 (Part 2)' },
];

