/**
 * Bogue Mineral Phases and Cement Moduli Calculation Engine
 * Formulated in accordance with ASTM C150 / EN 197 / IS 269 / Taylor's Cement Chemistry
 *
 * Primary Oxides:
 * - CaO (Lime)
 * - SiO2 (Silica)
 * - Al2O3 (Alumina)
 * - Fe2O3 (Iron Oxide)
 * - SO3 (Sulphur Trioxide)
 */

export interface BogueResult {
  hasSufficientData: boolean;
  // Moduli
  lsf: number | null; // Lime Saturation Factor (0-100 scale)
  sm: number | null;  // Silica Modulus (SR)
  am: number | null;  // Alumina Modulus (AR)
  
  // Bogue Compounds (% wt/wt)
  c3s: number | null;  // Tricalcium Silicate (Alite)
  c2s: number | null;  // Dicalcium Silicate (Belite)
  c3a: number | null;  // Tricalcium Aluminate (Celit)
  c4af: number | null; // Tetracalcium Aluminoferrite (Ferrite/Brownmillerite)
  
  // Workbook Clinker / Burnability Values
  cv: number | null;   // Coating Value: C3A + C4AF + 0.2*C2S + 2*Fe2O3
  lv: number | null;   // Liquid Value: 2.95*Al2O3 + 2.2*Fe2O3 + MgO + K2O + Na2O
  
  totalSilicates: number | null; // C3S + C2S
  
  // Quality & Operational Interpretations
  lsfStatus: 'optimal' | 'low' | 'high';
  smStatus: 'optimal' | 'low' | 'high';
  amStatus: 'optimal' | 'low' | 'high';
  strengthProfile: 'High Early Strength' | 'Standard Structural' | 'Slow Hydrating / High Late Strength' | 'Unbalanced';
  sulfateResistance: 'High Sulfate Resistance' | 'Moderate Sulfate Resistance' | 'Normal / Standard';
  insights: string[];
}

export interface OxideInputs {
  lime?: number | null;      // CaO %
  silica?: number | null;    // SiO2 %
  alumina?: number | null;   // Al2O3 %
  iron?: number | null;      // Fe2O3 %
  so3?: number | null;       // SO3 %
  magnesia?: number | null;  // MgO %
  k2o?: number | null;       // K2O %
  na2o?: number | null;      // Na2O %
  free_lime?: number | null; // Free Lime %
}

/**
 * Calculates Bogue Mineral Phases and Moduli Ratios
 */
export function calculateBoguePhases(inputs: OxideInputs): BogueResult {
  const c = Number(inputs.lime);
  const s = Number(inputs.silica);
  const a = Number(inputs.alumina);
  const f = Number(inputs.iron);
  const so3 = Number(inputs.so3 || 0);
  const mgo = Number(inputs.magnesia || 0);
  const k2o = Number(inputs.k2o || 0);
  const na2o = Number(inputs.na2o || 0);
  const fl = Number(inputs.free_lime || 0);

  // Check if primary 4 oxides are valid positive numbers
  if (
    isNaN(c) || c <= 0 ||
    isNaN(s) || s <= 0 ||
    isNaN(a) || a <= 0 ||
    isNaN(f) || f <= 0
  ) {
    return {
      hasSufficientData: false,
      lsf: null,
      sm: null,
      am: null,
      c3s: null,
      c2s: null,
      c3a: null,
      c4af: null,
      cv: null,
      lv: null,
      totalSilicates: null,
      lsfStatus: 'optimal',
      smStatus: 'optimal',
      amStatus: 'optimal',
      strengthProfile: 'Standard Structural',
      sulfateResistance: 'Normal / Standard',
      insights: [],
    };
  }

  // 1. Moduli Ratios (Verified against father's Excel workbook)
  // LSF (0-100%) = (CaO / (2.8*SiO2 + 1.2*Al2O3 + 0.65*Fe2O3)) * 100
  const lsfDenominator = 2.8 * s + 1.2 * a + 0.65 * f;
  const rawLsf = lsfDenominator > 0 ? (c / lsfDenominator) * 100 : 0;
  const lsf = Number(rawLsf.toFixed(2));

  // SM = SiO2 / (Al2O3 + Fe2O3)
  const smDenominator = a + f;
  const rawSm = smDenominator > 0 ? s / smDenominator : 0;
  const sm = Number(rawSm.toFixed(2));

  // AM = Al2O3 / Fe2O3
  const rawAm = f > 0 ? a / f : 0;
  const am = Number(rawAm.toFixed(2));

  // 2. Bogue Mineral Phase Equations
  let rawC3S = 0;
  let rawC2S = 0;
  let rawC3A = 0;
  let rawC4AF = 0;

  if (rawAm >= 0.64) {
    rawC3S = 4.071 * (c - fl) - 7.600 * s - 6.718 * a - 1.430 * f - 2.852 * so3;
    rawC3A = 2.65 * a - 1.69 * f;
    rawC4AF = 3.04 * f;
  } else {
    rawC3S = 4.071 * (c - fl) - 7.600 * s - 4.479 * a - 2.859 * f - 2.852 * so3;
    rawC3A = 0;
    rawC4AF = 2.100 * a + 1.702 * f;
  }

  rawC3S = Math.max(0, rawC3S);
  rawC2S = 2.867 * s - 0.7544 * rawC3S;
  rawC2S = Math.max(0, rawC2S);
  rawC3A = Math.max(0, rawC3A);
  rawC4AF = Math.max(0, rawC4AF);

  const c3s = Number(rawC3S.toFixed(2));
  const c2s = Number(rawC2S.toFixed(2));
  const c3a = Number(rawC3A.toFixed(2));
  const c4af = Number(rawC4AF.toFixed(2));
  const totalSilicates = Number((c3s + c2s).toFixed(2));

  // Workbook C.V. (Coating Value) = C3A + C4AF + 0.2*C2S + 2*Fe2O3
  const cv = Number((rawC3A + rawC4AF + 0.2 * rawC2S + 2 * f).toFixed(2));
  // Workbook L.V. (Liquid Value) = 2.95*Al2O3 + 2.2*Fe2O3 + MgO + K2O + Na2O
  const lv = Number((2.95 * a + 2.2 * f + mgo + k2o + na2o).toFixed(2));

  // 3. Status Evaluation (LSF on 0-100 scale: 90 - 102%)
  let lsfStatus: BogueResult['lsfStatus'] = 'optimal';
  if (lsf < 90) lsfStatus = 'low';
  else if (lsf > 102) lsfStatus = 'high';

  // SM Target: 2.2 - 2.6
  let smStatus: BogueResult['smStatus'] = 'optimal';
  if (sm < 2.0) smStatus = 'low';
  else if (sm > 2.8) smStatus = 'high';

  // AM Target: 1.2 - 1.8
  let amStatus: BogueResult['amStatus'] = 'optimal';
  if (am < 1.1) amStatus = 'low';
  else if (am > 2.2) amStatus = 'high';

  // Strength profile
  let strengthProfile: BogueResult['strengthProfile'] = 'Standard Structural';
  if (c3s >= 55) strengthProfile = 'High Early Strength';
  else if (c3s < 42 && c2s >= 30) strengthProfile = 'Slow Hydrating / High Late Strength';
  else if (c3s < 35) strengthProfile = 'Unbalanced';

  // Sulfate resistance
  let sulfateResistance: BogueResult['sulfateResistance'] = 'Normal / Standard';
  if (c3a <= 5) sulfateResistance = 'High Sulfate Resistance';
  else if (c3a <= 8) sulfateResistance = 'Moderate Sulfate Resistance';

  // 4. Industrial Insights & Advisory
  const insights: string[] = [];

  if (lsfStatus === 'high') {
    insights.push(`LSF is elevated (${lsf} > 102). High risk of uncombined free lime and unsoundness; inspect kiln burning temperature.`);
  } else if (lsfStatus === 'low') {
    insights.push(`LSF is low (${lsf} < 90). Raw mix is over-fluxed, which may depress 28-day early strength potential.`);
  } else {
    insights.push(`LSF is well balanced (${lsf}). Clinker burnability and lime-silicate equilibrium are within optimal manufacturing tolerances.`);
  }

  if (c3s >= 52) {
    insights.push(`Strong Alite phase (C3S: ${c3s}%). Excellent 1-day, 3-day, and 28-day compressive strength progression predicted.`);
  } else if (c3s < 45) {
    insights.push(`Belite-heavy clinker (C2S: ${c2s}%). Early 3-day strength will develop more slowly, but ultimate 90-day strength remains durable.`);
  }

  if (c3a > 10) {
    insights.push(`C3A is high (${c3a}%). Rapid heat of hydration and fast setting tendency. Ensure gypsum SO3 dosage is properly regulated in Ball Mill.`);
  } else if (c3a <= 5) {
    insights.push(`Low C3A (${c3a}%). Premium sulfate resistance characteristics suitable for marine, hydraulic, and underground foundation works.`);
  }

  return {
    hasSufficientData: true,
    lsf,
    sm,
    am,
    c3s,
    c2s,
    c3a,
    c4af,
    cv,
    lv,
    totalSilicates,
    lsfStatus,
    smStatus,
    amStatus,
    strengthProfile,
    sulfateResistance,
    insights,
  };
}

/**
 * Coal Analysis Calculations (Verified from Father's Excel Workbook)
 * - F.C. = 100 - (I.M. + V.M + ASH)
 * - UHV = 8900 - 138 * (ASH + I.M.)
 * - MIXED = 0.40 * Kiln + 0.60 * PC
 */
export function calculateCoalMetrics(
  im?: number | null,
  vm?: number | null,
  ash?: number | null
): { fc: number | null; uhv: number | null } {
  const hasIm = im !== null && im !== undefined && !isNaN(Number(im));
  const hasVm = vm !== null && vm !== undefined && !isNaN(Number(vm));
  const hasAsh = ash !== null && ash !== undefined && !isNaN(Number(ash));

  const fc =
    hasIm && hasVm && hasAsh
      ? Number((100 - (Number(im) + Number(vm) + Number(ash))).toFixed(3))
      : null;

  const uhv =
    hasIm && hasAsh
      ? Number((8900 - 138 * (Number(ash) + Number(im))).toFixed(3))
      : null;

  return { fc, uhv };
}

export function blendCoalValues(
  kilnVal?: number | null,
  pcVal?: number | null,
  kilnWeight = 0.4,
  pcWeight = 0.6
): number | null {
  const hasK = kilnVal !== null && kilnVal !== undefined && !isNaN(Number(kilnVal));
  const hasP = pcVal !== null && pcVal !== undefined && !isNaN(Number(pcVal));
  if (!hasK || !hasP) return null;
  return Number((kilnWeight * Number(kilnVal) + pcWeight * Number(pcVal)).toFixed(3));
}

