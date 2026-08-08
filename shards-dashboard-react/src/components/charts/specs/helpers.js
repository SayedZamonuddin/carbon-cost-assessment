import { YEARS } from "../../../model/constants";

/**
 * Turn a year-indexed series into chart points inside a window, dropping gaps so
 * observation records with missing years break the line rather than interpolating.
 */
export function points(values, [from, to], scale = 1) {
  const out = [];
  for (let i = 0; i < YEARS.length; i += 1) {
    const year = YEARS[i];
    if (year < from || year > to) continue;
    const value = values[i];
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    out.push({ x: year, y: value * scale });
  }
  return out;
}

/** Costs are meaningless before the industrial era; every cost chart starts at 1990. */
export function costWindow([from, to]) {
  return [Math.max(from, 1990), to];
}
