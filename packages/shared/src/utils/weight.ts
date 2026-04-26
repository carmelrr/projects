export type WeightUnit = 'kg' | 'lbs';

export const KG_TO_LBS = 2.20462;

export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / KG_TO_LBS) * 10) / 10;
}

export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) return value;
  return from === 'kg' ? kgToLbs(value) : lbsToKg(value);
}

/**
 * Parse a prescription weight string into a numeric value and the unit it
 * was written in.  Returns `null` for non-absolute strings (percentages,
 * RPE notation, empty strings, etc.).
 *
 * Examples:
 *   "75"     → { value: 75,  unit: 'kg'  }   (no suffix → assume kg)
 *   "75kg"   → { value: 75,  unit: 'kg'  }
 *   "75 kg"  → { value: 75,  unit: 'kg'  }
 *   "165lbs" → { value: 165, unit: 'lbs' }
 *   "80%"    → null
 *   "RPE 8"  → null
 */
export function parseWeightString(
  raw: string,
): { value: number; unit: WeightUnit } | null {
  const m = raw.trim().match(/^([\d.]+)\s*(kg|lbs?|lb)?$/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value) || value < 0) return null;
  const unitStr = (m[2] ?? '').toLowerCase();
  const unit: WeightUnit = unitStr.startsWith('lb') ? 'lbs' : 'kg';
  return { value, unit };
}

/**
 * Convert a prescription weight string from one unit system to another.
 * Non-numeric strings (%, RPE, empty) are returned unchanged.
 */
export function convertWeightString(
  raw: string,
  from: WeightUnit,
  to: WeightUnit,
): string {
  if (from === to) return raw;
  const parsed = parseWeightString(raw);
  if (!parsed) return raw; // percentage / RPE / free-text — leave as-is
  const converted = convertWeight(parsed.value, from, to);
  return String(converted);
}

export function formatWeight(value: number, unit: WeightUnit): string {
  return `${value} ${unit}`;
}
