/**
 * ChittorTech AI Plant Copilot & Process Advisory Engine
 * Automated kiln, ball mill, and raw mix operational optimization
 * Designed for Heavy Cement, Mineral & Grinding Plant Metallurgy
 */

import { BogueResult } from './bogueEngine';

export interface ProcessAdvisory {
  id: string;
  severity: 'critical' | 'warning' | 'optimization' | 'optimal';
  targetEquipment: 'Ball Mill' | 'Rotary Kiln' | 'Preheater / Precalciner' | 'Raw Mix Blending' | 'Quality & Compliance';
  parameterTrigger: string;
  observedValue: string;
  title: string;
  actionHindi: string;
  actionEnglish: string;
  savingsEstimate?: string;
  impactFactor: 'Thermal Energy & Coal' | 'Gypsum & Additives Cost' | 'Strength & 28-Day Curing' | 'Refractory & Ring Prevention' | 'BIS / ASTM Compliance';
}

export interface CopilotAnalysisResult {
  hasAnalysis: boolean;
  overallHealthScore: number; // 0 - 100
  statusSummary: 'Optimal Production' | 'Attention Required' | 'Critical Process Imbalance';
  advisories: ProcessAdvisory[];
  totalSavingsPotentialDaily: string;
}

export interface ChemicalOxideValues {
  loi?: number | null;
  ir?: number | null;
  so3?: number | null;
  lime?: number | null;
  silica?: number | null;
  alumina?: number | null;
  iron?: number | null;
  magnesia?: number | null;
  chloride?: number | null;
  category?: string;
}

/**
 * Generates automated industrial process advisory based on real-time chemical testing
 */
export function generateProcessAdvisory(
  oxides: ChemicalOxideValues,
  bogue?: BogueResult
): CopilotAnalysisResult {
  const advisories: ProcessAdvisory[] = [];
  let deduction = 0;

  const loi = Number(oxides.loi || 0);
  const ir = Number(oxides.ir || 0);
  const so3 = Number(oxides.so3 || 0);
  const lime = Number(oxides.lime || 0);
  const silica = Number(oxides.silica || 0);
  const alumina = Number(oxides.alumina || 0);
  const iron = Number(oxides.iron || 0);
  const magnesia = Number(oxides.magnesia || 0);
  const chloride = Number(oxides.chloride || 0);
  const category = (oxides.category || 'Ball Mill').toLowerCase();

  const isCementOrMill = category.includes('mill') || category.includes('cement');
  const isClinkerOrRaw = category.includes('clinker') || category.includes('kiln') || category.includes('raw');

  // Check if at least some data is present
  const validCount = [loi, ir, so3, lime, silica, alumina, iron, magnesia, chloride].filter((v) => v > 0).length;
  if (validCount < 2) {
    return {
      hasAnalysis: false,
      overallHealthScore: 100,
      statusSummary: 'Optimal Production',
      advisories: [],
      totalSavingsPotentialDaily: '₹0',
    };
  }

  // 1. SO3 & GYPSUM DOSAGE ADVISORY
  if (so3 > 0) {
    if (so3 > 2.85) {
      deduction += 18;
      advisories.push({
        id: 'so3-high',
        severity: so3 > 3.2 ? 'critical' : 'warning',
        targetEquipment: 'Ball Mill',
        parameterTrigger: 'SO₃ (Sulphur Trioxide)',
        observedValue: `${so3.toFixed(2)}% (High)`,
        title: 'Gypsum Dosage Excess Detected at Ball Mill Feeder',
        actionHindi: `⚠️ Gypsum dosage high detected (${so3.toFixed(2)}%). Ball Mill weigh-feeder par gypsum feed rate ~0.25 - 0.35 tph kam karne ki recommendation hai taaki false set aur delayed expansion prevent ho sake.`,
        actionEnglish: `Reduce gypsum weigh-feeder setpoint by 0.25 - 0.35 tph. Excess SO3 increases risk of false set, rapid stiffening, and exceeds ASTM C150 / IS 269 limits.`,
        savingsEstimate: 'Saves ~2.2 tonnes gypsum / day (approx ₹8,800/day)',
        impactFactor: 'Gypsum & Additives Cost',
      });
    } else if (so3 < 1.70 && isCementOrMill) {
      deduction += 15;
      advisories.push({
        id: 'so3-low',
        severity: 'warning',
        targetEquipment: 'Ball Mill',
        parameterTrigger: 'SO₃ (Sulphur Trioxide)',
        observedValue: `${so3.toFixed(2)}% (Deficient)`,
        title: 'Gypsum Starvation Alert — Risk of Flash Setting',
        actionHindi: `⚡ SO₃ ki matra deficient hai (${so3.toFixed(2)}%). C₃A hydration control karne ke liye Ball Mill gypsum weigh-feeder feed rate 0.20 tph badhayein taaki concrete flash-set na ho.`,
        actionEnglish: `Increase gypsum proportion by +0.20 tph immediately. Insufficient sulfate regulator will lead to unretarded C3A hydration and early flash setting.`,
        savingsEstimate: 'Prevents batch rejection (₹50,000+ per silo)',
        impactFactor: 'Strength & 28-Day Curing',
      });
    } else if (so3 >= 2.0 && so3 <= 2.6) {
      advisories.push({
        id: 'so3-optimal',
        severity: 'optimal',
        targetEquipment: 'Ball Mill',
        parameterTrigger: 'SO₃',
        observedValue: `${so3.toFixed(2)}%`,
        title: 'Gypsum Regulation in Sweet Spot',
        actionHindi: `✅ Ball Mill gypsum proportion bilkul perfect chal raha hai (${so3.toFixed(2)}%). Optimum initial setting time guaranteed.`,
        actionEnglish: `Gypsum addition is optimal. Sulfate-aluminate balance maintains standard initial setting time (~140-160 mins).`,
        impactFactor: 'Strength & 28-Day Curing',
      });
    }
  }

  // 2. LOI & KILN BURNING ZONE / CALCINATION ADVISORY
  if (loi > 0) {
    if (loi > 3.0 && !category.includes('ppc')) {
      deduction += 20;
      advisories.push({
        id: 'loi-high',
        severity: loi > 4.5 ? 'critical' : 'warning',
        targetEquipment: 'Rotary Kiln',
        parameterTrigger: 'LOI (Loss on Ignition)',
        observedValue: `${loi.toFixed(2)}% (High)`,
        title: 'High Unburnt Carbon / Incomplete Calcination in Kiln',
        actionHindi: `🔥 Kiln burning zone temperature check karein ya fine coal firing rate (+0.4 tph) adjust karein. LOI high (${loi.toFixed(2)}%) incomplete decarbonation ko darshata hai. Precalciner tertiary air damper inspect karein.`,
        actionEnglish: `Inspect kiln burning zone pyrometer (target 1450°C) and optimize coal firing rate (+0.3 to +0.5 tph). Elevated LOI indicates uncalcined CaCO3 carryover.`,
        savingsEstimate: 'Optimizes fuel thermal heat rate by ~18 kcal/kg clinker (approx ₹14,500/day)',
        impactFactor: 'Thermal Energy & Coal',
      });
    } else if (loi < 1.0 && isCementOrMill) {
      advisories.push({
        id: 'loi-optimal',
        severity: 'optimal',
        targetEquipment: 'Rotary Kiln',
        parameterTrigger: 'LOI',
        observedValue: `${loi.toFixed(2)}%`,
        title: 'Excellent Complete Decarbonation & Dryness',
        actionHindi: `✅ Loss on Ignition uttam level par hai (${loi.toFixed(2)}%). Clinker me zero unburnt fuel carryover hai.`,
        actionEnglish: `Complete decarbonation achieved with minimum pre-hydration in final cement.`,
        impactFactor: 'Thermal Energy & Coal',
      });
    }
  }

  // 3. CHLORIDE CORROSION & PREHEATER CYCLONE BUILD-UP
  if (chloride > 0) {
    if (chloride >= 0.05) {
      deduction += 25;
      advisories.push({
        id: 'cl-critical',
        severity: 'critical',
        targetEquipment: 'Preheater / Precalciner',
        parameterTrigger: 'Cl⁻ (Chloride Content)',
        observedValue: `${chloride.toFixed(3)}% (Alarm Level)`,
        title: 'High Halogen Ring Hazard & Rebar Corrosion Threat',
        actionHindi: `🚨 CRITICAL CHLORIDE SPIKE (${chloride.toFixed(3)}%)! BIS IS:269 maximum threshold (0.10%) ke kareeb hai. Alternative fuel (RDF/plastic) feed check karein; kiln inlet aur lower cyclone riser me severe coating/ring formation ka khatra hai.`,
        actionEnglish: `Severe chloride accumulation. Check chlorine input from alternative fuel / raw meal. Immediate cyclone riser purging required to prevent preheater blockages.`,
        savingsEstimate: 'Prevents unplanned kiln shutdown (approx ₹4,00,000+ per stoppage)',
        impactFactor: 'Refractory & Ring Prevention',
      });
    }
  }

  // 4. MAGNESIA (MgO) EXPANSION THREAT
  if (magnesia > 0) {
    if (magnesia > 4.2) {
      deduction += 16;
      advisories.push({
        id: 'mgo-high',
        severity: magnesia > 5.0 ? 'critical' : 'warning',
        targetEquipment: 'Raw Mix Blending',
        parameterTrigger: 'MgO (Magnesium Oxide)',
        observedValue: `${magnesia.toFixed(2)}% (Elevated)`,
        title: 'High Periclase Hazard — Delayed Unsoundness Risk',
        actionHindi: `⚠️ High Magnesia warning (${magnesia.toFixed(2)}%). Periclase crystals delayed expansion paida karte hain. Mines block se high-dolomite limestone reduce karein aur low-magnesia sweetening limestone blend karein.`,
        actionEnglish: `Magnesia is approaching statutory threshold (max 5.0% or 6.0%). Adjust quarry blend ratio to prevent autoclave unsoundness failure.`,
        impactFactor: 'BIS / ASTM Compliance',
      });
    }
  }

  // 5. INSOLUBLE RESIDUE (IR) & GRINDING CLASSIFICATION
  if (ir > 0) {
    if (ir > 2.5 && !category.includes('ppc')) {
      deduction += 12;
      advisories.push({
        id: 'ir-high',
        severity: 'warning',
        targetEquipment: 'Ball Mill',
        parameterTrigger: 'IR (Insoluble Residue)',
        observedValue: `${ir.toFixed(2)}% (High for OPC)`,
        title: 'Coarse Quartz Residue / Inefficient Separator Classification',
        actionHindi: `⚠️ Insoluble Residue high aaya hai (${ir.toFixed(2)}%). Ball Mill dynamic separator rotor RPM check karein; unground coarse quartz silica strength formation me participate nahi karega.`,
        actionEnglish: `Elevated IR indicates unreacted siliceous phases or inefficient air separator classification. Adjust separator guide vanes / rotor speed.`,
        savingsEstimate: 'Grinding efficiency boost: ~1.5 kWh/tonne cement',
        impactFactor: 'Strength & 28-Day Curing',
      });
    }
  }

  // 6. BOGUE & MODULI DERIVED ADVISORY (If available)
  if (bogue && bogue.hasSufficientData) {
    // High LSF
    if (bogue.lsf !== null && bogue.lsf > 1.01) {
      deduction += 15;
      advisories.push({
        id: 'lsf-excess',
        severity: 'warning',
        targetEquipment: 'Rotary Kiln',
        parameterTrigger: 'LSF (Lime Saturation Factor)',
        observedValue: `${bogue.lsf.toFixed(3)} (Excess Lime)`,
        title: 'High LSF — Excessive Free Lime (fCaO) Risk in Clinker',
        actionHindi: `⚡ LSF elevated hai (${bogue.lsf.toFixed(3)}). Raw meal me limestone over-dosed hai. Kiln burning zone heat increase karein ya raw meal limestone/silica ratio blend adjust karein taaki uncombined lime sound failure na kare.`,
        actionEnglish: `High LSF increases uncombined free lime. Increase burning zone temperature or trim raw meal limestone feeder setpoint by 0.5%.`,
        savingsEstimate: 'Saves ~1.2 tonnes raw limestone / hour',
        impactFactor: 'Thermal Energy & Coal',
      });
    }

    // High C3A Heat
    if (bogue.c3a !== null && bogue.c3a > 11.5) {
      deduction += 10;
      advisories.push({
        id: 'c3a-high',
        severity: 'warning',
        targetEquipment: 'Ball Mill',
        parameterTrigger: 'C₃A (Tricalcium Aluminate)',
        observedValue: `${bogue.c3a.toFixed(1)}% (Hot Clinker)`,
        title: 'High C₃A Matrix — Elevated Hydration Heat Alert',
        actionHindi: `🔥 C₃A high hai (${bogue.c3a.toFixed(1)}%). Cement jaldi heat produce karega aur setting time fast ho sakta hai. Ball Mill water spray system inspect karein taaki mill discharge temperature 110°C ke andar rahe.`,
        actionEnglish: `High C3A content increases heat of hydration. Ensure Ball Mill internal water injection cooling is operating to prevent gypsum dehydration to hemihydrate.`,
        impactFactor: 'Strength & 28-Day Curing',
      });
    }

    // Optimal High Strength Clinker Matrix
    if (bogue.c3s !== null && bogue.c3s >= 54 && bogue.lsf !== null && bogue.lsf >= 0.92 && bogue.lsf <= 0.98) {
      advisories.push({
        id: 'matrix-perfect',
        severity: 'optimal',
        targetEquipment: 'Quality & Compliance',
        parameterTrigger: 'C₃S & LSF Balance',
        observedValue: `C₃S: ${bogue.c3s.toFixed(1)}% | LSF: ${bogue.lsf.toFixed(3)}`,
        title: 'Gold Standard Alite-Rich Quality Clinker',
        actionHindi: `🌟 Clinker mineralogy bilkul supreme hai! High Alite (C₃S > 54%) 53-Grade / High Early Strength cement parameters ko exceed karega. Premium batch dispatch approved.`,
        actionEnglish: `Optimal mineralogical equilibrium. High C3S ensures superior 3-day and 28-day compressive strength exceeding BIS 53-Grade standard.`,
        impactFactor: 'Strength & 28-Day Curing',
      });
    }
  }

  // Calculate overall health score
  const score = Math.max(20, Math.min(100, 100 - deduction));
  let statusSummary: CopilotAnalysisResult['statusSummary'] = 'Optimal Production';
  if (score < 60) statusSummary = 'Critical Process Imbalance';
  else if (score < 85) statusSummary = 'Attention Required';

  // Estimate total daily savings potential
  let totalSavingsDaily = '₹0';
  if (deduction > 0) {
    const estimatedRup = 8000 + deduction * 950;
    totalSavingsDaily = `₹${estimatedRup.toLocaleString('en-IN')}`;
  }

  return {
    hasAnalysis: advisories.length > 0,
    overallHealthScore: score,
    statusSummary,
    advisories,
    totalSavingsPotentialDaily: totalSavingsDaily,
  };
}
