// Two-box energy balance: a fast-responding upper ocean and a slow deep ocean, each
// relaxing towards its equilibrium response to the total radiative forcing.
// Ports the TEMP_CALC and TEMP_SPLIT tables on the 'RF & Temp' sheet.

import { D1, D2, N_YEARS, YEAR_START } from "./constants";

const DECAY_1 = Math.exp(-1 / D1);
const DECAY_2 = Math.exp(-1 / D2);

/** One thermal box pair, integrated year by year against a single forcing series. */
export function createThermalState() {
  return { s1: 0, s2: 0 };
}

export function stepThermal(state, forcing, q1, q2) {
  state.s1 = q1 * forcing * (1 - DECAY_1) + state.s1 * DECAY_1;
  state.s2 = q2 * forcing * (1 - DECAY_2) + state.s2 * DECAY_2;
  return state.s1 + state.s2;
}

/** Integrate a complete forcing series into a temperature series. */
export function integrateForcing(forcing, q1, q2) {
  const state = createThermalState();
  const temp = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) {
    temp[i] = stepThermal(state, forcing[i], q1, q2);
  }
  return temp;
}

/**
 * Mean temperature over the reference period, subtracted to express warming relative to
 * pre-industrial.
 *
 * The workbook computes this with OFFSET(TEMP, MATCH(refFrom), 0, MATCH(refTo) -
 * MATCH(refFrom)), which starts one row *past* the matched year. With the default
 * 1850-1900 setting that averages 1851..1900, not 1851..1900's nominal span — reproduced
 * here exactly, because every temperature-derived output inherits this offset.
 */
export function referenceMean(temp, refFrom, refTo) {
  const start = refFrom - YEAR_START + 1;
  const end = refTo - YEAR_START;
  if (end < start) return 0;
  let sum = 0;
  for (let i = start; i <= end; i += 1) sum += temp[i];
  return sum / (end - start + 1);
}

/** temp minus its reference-period mean. */
export function relativeTo(temp, refFrom, refTo) {
  const mean = referenceMean(temp, refFrom, refTo);
  const rel = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) rel[i] = temp[i] - mean;
  return rel;
}
