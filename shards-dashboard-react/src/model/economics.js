// Climate damages, mitigation costs, gross world product and discounting.
// Ports the 'Data Annex I' / 'Data Non-Annex I' tables and the world-level ClimWorksCalc
// table on 'Clim Policy Dash'.

import { C_TO_CO2, N_YEARS, YEAR_START } from "./constants";

/**
 * Calibrate the damage function from the two points the user edits: the fraction of GWP
 * lost at 1 °C and at 6 °C of warming ('Clim Policy Dash'!D15:E15).
 */
export function damageParams({ damageAt1C, damageAt6C }) {
  const exponent =
    Math.log(((1 - damageAt1C) * damageAt6C) / (damageAt1C * (1 - damageAt6C))) /
    Math.log(6);
  const alpha = Math.exp(Math.log(damageAt1C / (1 - damageAt1C)) / exponent);
  return { alpha, exponent };
}

/** Fraction of gross world product lost to climate damage at a given warming level. */
export function damageFraction(warming, { alpha, exponent }) {
  return 1 - 1 / (1 + Math.pow(Math.abs(warming) * alpha, exponent));
}

/** The damage curve plotted on the policy dashboard, 0…7 °C. */
export function damageCurve(params) {
  const dp = damageParams(params);
  const points = [];
  for (let k = 0; k <= 140; k += 1) {
    const t = k * 0.05;
    points.push({ x: t, y: damageFraction(t, dp) * 100 });
  }
  return points;
}

/**
 * Gross world product: exponential growth whose rate declines linearly with time, and is
 * held flat once it would turn negative. The 0.02887 / 0.00077768 coefficients apply to
 * years before the reference year and are hard-coded in the workbook.
 */
export function grossWorldProduct(econ) {
  const { gwp, gwpValueYear, initialGrowthRate, growthDecline } = econ;
  const peak = -initialGrowthRate / (2 * growthDecline);
  const out = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) {
    const dy = YEAR_START + i - gwpValueYear;
    let growth;
    if (dy < 0) {
      growth = (0.02887 - 0.00077768 * dy) * dy;
    } else if (dy > peak) {
      growth = -(initialGrowthRate * initialGrowthRate) / (4 * growthDecline);
    } else {
      growth = (initialGrowthRate + growthDecline * dy) * dy;
    }
    out[i] = gwp * Math.exp(growth);
  }
  return out;
}

/**
 * Cumulative mitigation cost for one actor, in dollars per year.
 *
 * Each year adds the newly abated share priced at the current carbon price to a running
 * cost per tonne, which is then applied to that year's baseline emissions. Note the
 * workbook deliberately scales both actors by *world* baseline emissions rather than the
 * actor's own — reproduced here.
 */
export function mitigationCost(price, remaining, worldBaselineCo2) {
  const cost = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) {
    const remainingPrev = i > 0 ? remaining[i - 1] : 0;
    const carried =
      i > 0 && worldBaselineCo2[i - 1] !== 0
        ? cost[i - 1] / worldBaselineCo2[i - 1]
        : 0;
    cost[i] =
      ((remainingPrev - remaining[i]) * price[i] * 1e9 * C_TO_CO2 + carried) *
      worldBaselineCo2[i];
  }
  return cost;
}

/**
 * Discount a cost/damage stream back to the present. Years before the discount year
 * contribute nothing, matching the workbook's `--(Year > discountYear - 1)` mask.
 */
export function discount(values, { discountRate, discountYear }) {
  const out = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) {
    const year = YEAR_START + i;
    out[i] =
      year >= discountYear
        ? Math.pow(1 - discountRate, year - discountYear) * values[i]
        : 0;
  }
  return out;
}

/** Element-wise damage fraction over a whole warming series. */
export function damageSeries(tempRel, dp) {
  const out = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) out[i] = damageFraction(tempRel[i], dp);
  return out;
}

export function multiply(a, b) {
  const out = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) out[i] = a[i] * b[i];
  return out;
}

export function divide(a, b) {
  const out = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) out[i] = b[i] === 0 ? 0 : a[i] / b[i];
  return out;
}

export function add(a, b) {
  const out = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) out[i] = a[i] + b[i];
  return out;
}

/** Sum a series over the years up to and including `finalYear`. */
export function sumThrough(values, finalYear) {
  let total = 0;
  const last = Math.min(finalYear - YEAR_START, N_YEARS - 1);
  for (let i = 0; i <= last; i += 1) total += values[i];
  return total;
}
