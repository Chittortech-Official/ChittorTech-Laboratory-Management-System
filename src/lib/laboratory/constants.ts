import { ParameterMetadata } from '@/types';

export const CHEMICAL_PARAMETERS: ParameterMetadata[] = [
  {
    key: 'loi',
    label: 'Loss on Ignition',
    symbol: 'LOI',
    formula: 'LOI',
    unit: '%',
    decimals: 2,
    description: 'Volatile matter & combined water loss at 950°C - 1000°C',
  },
  {
    key: 'ir',
    label: 'Insoluble Residue',
    symbol: 'IR',
    formula: 'IR',
    unit: '%',
    decimals: 2,
    description: 'Non-reactive siliceous residue remaining after acid digestion',
  },
  {
    key: 'so3',
    label: 'Sulphur Trioxide',
    symbol: 'SO₃',
    formula: 'SO₃',
    unit: '%',
    decimals: 2,
    description: 'Gypsum dosage regulatory indicator for setting time regulation',
  },
  {
    key: 'lime',
    label: 'Calcium Oxide (Lime)',
    symbol: 'Lime',
    formula: 'CaO',
    unit: '%',
    decimals: 2,
    description: 'Primary active basic oxide responsible for alite/belite formation',
  },
  {
    key: 'silica',
    label: 'Silicon Dioxide',
    symbol: 'Silica',
    formula: 'SiO₂',
    unit: '%',
    decimals: 2,
    description: 'Acidic oxide controlling silicate phase balance and ultimate strength',
  },
  {
    key: 'alumina',
    label: 'Aluminium Oxide',
    symbol: 'Alumina',
    formula: 'Al₂O₃',
    unit: '%',
    decimals: 2,
    description: 'Fluxing oxide governing aluminate phase (C3A) and rapid hydration',
  },
  {
    key: 'iron',
    label: 'Iron Oxide',
    symbol: 'Iron',
    formula: 'Fe₂O₃',
    unit: '%',
    decimals: 2,
    description: 'Fluxing oxide forming brownmillerite (C4AF) giving cement its grey tone',
  },
  {
    key: 'magnesia',
    label: 'Magnesium Oxide',
    symbol: 'Magnesia',
    formula: 'MgO',
    unit: '%',
    decimals: 2,
    description: 'Monitored periclasic oxide to prevent delayed unsound expansion',
  },
  {
    key: 'chloride',
    label: 'Chloride Content',
    symbol: 'Chloride',
    formula: 'Cl⁻',
    unit: '%',
    decimals: 3,
    description: 'Trace halogen strictly restricted to prevent reinforcement corrosion',
  },
];

export const PLANT_CATEGORIES = [
  'Ball Mill',
  'Ball Mill - Line 1',
  'Ball Mill - Line 2',
  'Raw Mill Feed',
  'Kiln Clinker',
  'Finished Cement (OPC)',
  'Finished Cement (PPC)',
] as const;

export const LAB_SHIFTS = [
  'General',
  'Shift A',
  'Shift B',
  'Shift C',
] as const;

