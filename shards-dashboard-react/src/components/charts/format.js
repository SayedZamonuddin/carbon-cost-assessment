// Number formatting shared by charts, tooltips, tables and KPI tiles.

/** Significant-figure formatting that stays readable across ten orders of magnitude. */
export function formatValue(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const magnitude = Math.abs(value);
  if (magnitude === 0) return "0";
  if (magnitude >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (magnitude >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (magnitude >= 1000) return value.toFixed(0);
  if (magnitude >= 100) return value.toFixed(1);
  if (magnitude >= 1) return value.toFixed(2);
  if (magnitude >= 0.01) return value.toFixed(3);
  return value.toPrecision(digits);
}

export function formatPercent(fraction, digits = 2) {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return "—";
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatTrillion(dollars, digits = 1) {
  return `$${(dollars).toFixed(digits)}T`;
}

export function formatTemperature(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)} °C`;
}

export function formatSigned(value, digits = 2, unit = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}${unit}`;
}
