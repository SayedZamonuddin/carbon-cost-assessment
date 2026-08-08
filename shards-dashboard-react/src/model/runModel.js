// Orchestrates a complete model run: policy paths -> emissions -> gas cycles -> forcing
// -> temperature -> damages and costs.
//
// The model is run twice. The "policy" run applies abatement; the "baseline" run is the
// same world with the policy switched off. Baseline is a genuinely separate integration
// rather than a rescaling, because carbon uptake and the temperature feedback differ
// between the two worlds.

import {
  CH4,
  CO2,
  C_TO_CO2,
  N2O,
  N_YEARS,
  YEAR_START,
  YEARS,
  thermalCoefficients
} from "./constants";
import { createGasRun, stepGas } from "./gasCycle";
import { integrateForcing, relativeTo, stepThermal, createThermalState } from "./climate";
import { actorPolicyPath } from "./policy";
import {
  add,
  damageParams,
  damageSeries,
  discount,
  divide,
  grossWorldProduct,
  mitigationCost,
  multiply,
  sumThrough
} from "./economics";

const ZEROS = new Float64Array(N_YEARS);

/** World emissions for the selected scenario, in GtC / MtCH4 / MtN2O-N2. */
export function resolveScenario(statics, name, customScenario) {
  if (name === "CUSTOM" && customScenario) return customScenario;
  return statics.scenarios[name] || statics.scenarios.CUSTOM;
}

/**
 * Non-GHG radiative forcing. The workbook derives this from the emission scenario's own
 * forcing table, minus the CO2/CH4/N2O contribution the model computes itself; scenarios
 * with no forcing table (CUSTOM, pulses, steps) contribute nothing.
 */
export function resolveOtherRf(statics, emissionsScenario, otherRfScenario, customScenario) {
  if (otherRfScenario === "NONE") return ZEROS;
  if (otherRfScenario === "CUSTOM") {
    const custom = customScenario || statics.customScenario;
    return custom.otherRf || statics.customScenario.otherRf;
  }
  const table = statics.otherRf[emissionsScenario];
  if (!table || !table[otherRfScenario]) return ZEROS;
  return table[otherRfScenario];
}

/**
 * Integrate the physical climate for one world.
 *
 * `co2Remaining` / `ch4Remaining` give the fraction of each actor's baseline emissions
 * that survives abatement; pass all-ones for the no-policy baseline.
 */
function runPhysics({
  scenario,
  primap,
  rfOther,
  naturalRf,
  q1,
  q2,
  refFrom,
  refTo,
  annexCo2Remaining,
  nonAnnexCo2Remaining,
  annexCh4Remaining,
  nonAnnexCh4Remaining,
  ch4EmissionAlpha
}) {
  const co2 = createGasRun();
  const ch4 = createGasRun();
  const n2o = createGasRun();

  const rfTotal = new Float64Array(N_YEARS);
  const temp = new Float64Array(N_YEARS);
  const thermal = createThermalState();

  for (let i = 0; i < N_YEARS; i += 1) {
    const tempPrev = i > 0 ? temp[i - 1] : 0;

    const co2Share = primap.co2[i];
    const co2AnnexI = scenario.co2[i] * co2Share * annexCo2Remaining[i];
    const co2NonAnnexI =
      scenario.co2[i] * (1 - co2Share) * nonAnnexCo2Remaining[i];

    const ch4Share = primap.ch4[i];
    const ch4AnnexI = scenario.ch4[i] * ch4Share * annexCh4Remaining[i];
    const ch4NonAnnexI =
      scenario.ch4[i] * (1 - ch4Share) * nonAnnexCh4Remaining[i];

    stepGas(CO2, co2, i, co2AnnexI + co2NonAnnexI, tempPrev);
    stepGas(
      CH4,
      ch4,
      i,
      ch4AnnexI + ch4NonAnnexI,
      tempPrev,
      ch4EmissionAlpha && ch4EmissionAlpha[i]
    );
    stepGas(N2O, n2o, i, scenario.n2o[i], tempPrev);

    co2.emsAnnexI[i] = co2AnnexI;
    co2.emsNonAnnexI[i] = co2NonAnnexI;
    ch4.emsAnnexI[i] = ch4AnnexI;
    ch4.emsNonAnnexI[i] = ch4NonAnnexI;

    rfTotal[i] = rfOther[i] + co2.rf[i] + ch4.rf[i] + n2o.rf[i];
    temp[i] = stepThermal(thermal, rfTotal[i], q1, q2);
  }

  // Attribution: each forcing component integrated through the same thermal response.
  // These are already anomalies, so they are not re-referenced.
  const split = {
    other: integrateForcing(rfOther, q1, q2),
    co2: integrateForcing(co2.rf, q1, q2),
    ch4: integrateForcing(ch4.rf, q1, q2),
    n2o: integrateForcing(n2o.rf, q1, q2),
    natural: integrateForcing(naturalRf, q1, q2)
  };

  return {
    co2,
    ch4,
    n2o,
    rfOther,
    rfTotal,
    temp,
    tempRel: relativeTo(temp, refFrom, refTo),
    split
  };
}

/** Costs and damages for one actor, given the world's warming and economy. */
function actorEconomics(path, worldBaselineCo2, gwp, totalDamage, econ) {
  const cost = mitigationCost(path.price, path.co2Remaining, worldBaselineCo2);
  return {
    price: path.price,
    abatement: path.co2Remaining,
    mitigationCost: cost,
    fractionalMitigationCost: divide(cost, gwp),
    discountedMitigationCost: discount(cost, econ),
    discountedDamage: discount(totalDamage, econ)
  };
}

/**
 * Run the full integrated assessment model.
 *
 * @param params  { policy: { annexI, nonAnnexI }, damage, economy, run, display }
 * @param statics bundled workbook datasets (see data/model/static.json)
 * @param customScenario optional uploaded scenario overriding CUSTOM
 */
export function runModel(params, statics, customScenario) {
  const { policy, damage, economy, run, display } = params;
  const { q1, q2 } = thermalCoefficients(run.ecs, run.tcr);
  const scenario = resolveScenario(statics, run.emissionsScenario, customScenario);
  const rfOther = resolveOtherRf(
    statics,
    run.emissionsScenario,
    run.otherRfScenario,
    customScenario
  );

  const shared = {
    scenario,
    primap: statics.primap,
    rfOther,
    naturalRf: statics.naturalRf,
    q1,
    q2,
    refFrom: display.refFrom,
    refTo: display.refTo
  };

  const annexPath = actorPolicyPath(policy.annexI, {
    policyOn: run.policyOn,
    discountYear: economy.discountYear
  });
  const nonAnnexPath = actorPolicyPath(policy.nonAnnexI, {
    policyOn: run.policyOn,
    discountYear: economy.discountYear
  });
  const ones = new Float64Array(N_YEARS).fill(1);

  const policyRun = runPhysics({
    ...shared,
    annexCo2Remaining: annexPath.co2Remaining,
    nonAnnexCo2Remaining: nonAnnexPath.co2Remaining,
    annexCh4Remaining: annexPath.ch4Remaining,
    nonAnnexCh4Remaining: nonAnnexPath.ch4Remaining
  });

  const baselineRun = runPhysics({
    ...shared,
    annexCo2Remaining: ones,
    nonAnnexCo2Remaining: ones,
    annexCh4Remaining: ones,
    nonAnnexCh4Remaining: ones,
    ch4EmissionAlpha: policyRun.ch4.alpha
  });

  // ---------------------------------------------------------------- economics
  const dp = damageParams(damage);
  const gwp = grossWorldProduct(economy);
  const worldBaselineCo2 = scenario.co2;

  const damageFrac = damageSeries(policyRun.tempRel, dp);
  const totalDamage = multiply(damageFrac, gwp);
  const baselineDamageFrac = damageSeries(baselineRun.tempRel, dp);
  const baselineTotalDamage = multiply(baselineDamageFrac, gwp);

  const annexI = actorEconomics(annexPath, worldBaselineCo2, gwp, totalDamage, economy);
  const nonAnnexI = actorEconomics(
    nonAnnexPath,
    worldBaselineCo2,
    gwp,
    totalDamage,
    economy
  );

  const worldMitigationCost = add(annexI.mitigationCost, nonAnnexI.mitigationCost);
  const worldAbatement = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) {
    const share = statics.primap.co2[i];
    worldAbatement[i] =
      share * annexPath.co2Remaining[i] + (1 - share) * nonAnnexPath.co2Remaining[i];
  }

  const world = {
    annexShare: statics.primap.co2,
    abatement: worldAbatement,
    mitigationCost: worldMitigationCost,
    fractionalMitigationCost: divide(worldMitigationCost, gwp),
    damageFraction: damageFrac,
    gwp,
    totalDamage,
    discountedDamage: discount(totalDamage, economy),
    discountedMitigationCost: discount(worldMitigationCost, economy),
    baselineDamageFraction: baselineDamageFrac,
    baselineTotalDamage,
    baselineDiscountedDamage: discount(baselineTotalDamage, economy)
  };

  // -------------------------------------------------------------------- KPIs
  const idx2100 = 2100 - YEAR_START;
  const idx2018 = 2018 - YEAR_START;

  let peak = -Infinity;
  let peakIndex = 0;
  for (let i = 0; i < N_YEARS; i += 1) {
    if (policyRun.split.co2[i] > peak) {
      peak = policyRun.split.co2[i];
      peakIndex = i;
    }
  }
  // The 2018 warming figure averages natural warming over the reference period
  // inclusively (AVERAGEIFS), unlike the OFFSET-based anomaly baseline.
  let naturalSum = 0;
  let naturalCount = 0;
  for (let y = display.refFrom; y <= display.refTo; y += 1) {
    naturalSum += policyRun.split.natural[y - YEAR_START];
    naturalCount += 1;
  }

  const kpis = {
    warming2100: policyRun.tempRel[idx2100],
    baselineWarming2100: baselineRun.tempRel[idx2100],
    damage2100: damageFrac[idx2100],
    baselineDamage2100: baselineDamageFrac[idx2100],
    totalDamage: sumThrough(totalDamage, economy.finalCostYear) / 1e12,
    totalMitigation: sumThrough(worldMitigationCost, economy.finalCostYear) / 1e12,
    baselineTotalDamage:
      sumThrough(baselineTotalDamage, economy.finalCostYear) / 1e12,
    discountedDamage: sumThrough(world.discountedDamage, YEARS[N_YEARS - 1]) / 1e12,
    discountedMitigation:
      sumThrough(world.discountedMitigationCost, YEARS[N_YEARS - 1]) / 1e12,
    baselineDiscountedDamage:
      sumThrough(world.baselineDiscountedDamage, YEARS[N_YEARS - 1]) / 1e12,
    tcre: (1000 * peak) / policyRun.co2.cumEms[peakIndex],
    warming2018:
      policyRun.tempRel[idx2018] -
      policyRun.split.natural[idx2018] +
      naturalSum / naturalCount,
    peakWarming: Math.max(...policyRun.tempRel),
    netZeroYear: netZeroYear(policyRun.co2.ems)
  };
  kpis.totalCost = kpis.totalDamage + kpis.totalMitigation;
  kpis.discountedCost = kpis.discountedDamage + kpis.discountedMitigation;

  return {
    years: YEARS,
    policy: policyRun,
    baseline: baselineRun,
    paths: { annexI: annexPath, nonAnnexI: nonAnnexPath },
    economics: { annexI, nonAnnexI, world },
    damageParams: dp,
    kpis
  };
}

/** First year in which world CO2 emissions reach or fall below zero, if any. */
function netZeroYear(ems) {
  for (let i = 0; i < N_YEARS; i += 1) {
    if (YEAR_START + i >= 2000 && ems[i] <= 0) return YEAR_START + i;
  }
  return null;
}

export { C_TO_CO2 };
