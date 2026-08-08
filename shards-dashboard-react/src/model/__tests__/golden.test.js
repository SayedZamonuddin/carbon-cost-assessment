// Validates the JavaScript port against values Excel itself computed and cached in
// Oxford_Simple_IAM_3_two-actor_v1.8.xlsx. If these pass, the dashboard's numbers are the
// workbook's numbers.

import golden from "../../data/model/golden.json";
import statics from "../../data/model/static.json";
import { cloneDefaults } from "../defaults";
import { runModel } from "../runModel";
import { YEAR_START, RF_2X_CO2, K1, K2, CO2, CH4, N2O, thermalCoefficients } from "../constants";
import { damageParams } from "../economics";
import { maccParams } from "../policy";

const REL_TOL = 1e-6;

const at = year => year - YEAR_START;

/** Assert two numbers agree to a relative tolerance, with an absolute floor. */
function expectClose(actual, expected, tol = REL_TOL, label = "") {
  const scale = Math.max(Math.abs(expected), 1e-12);
  const diff = Math.abs(actual - expected);
  if (diff / scale > tol) {
    throw new Error(
      `${label}: expected ${expected}, got ${actual} (relative error ${diff / scale})`
    );
  }
  expect(true).toBe(true);
}

/** Assert a whole series matches, scaled by the series' own magnitude. */
function expectSeriesClose(actual, expected, label, tol = REL_TOL) {
  expect(actual.length).toBe(expected.length);
  let scale = 0;
  for (let i = 0; i < expected.length; i += 1) {
    scale = Math.max(scale, Math.abs(expected[i] || 0));
  }
  scale = Math.max(scale, 1e-12);
  let worst = 0;
  let worstIndex = -1;
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i] === null || expected[i] === undefined) continue;
    const diff = Math.abs(actual[i] - expected[i]) / scale;
    if (diff > worst) {
      worst = diff;
      worstIndex = i;
    }
  }
  if (worst > tol) {
    throw new Error(
      `${label}: worst mismatch at year ${YEAR_START + worstIndex} — expected ` +
        `${expected[worstIndex]}, got ${actual[worstIndex]} (relative ${worst})`
    );
  }
  expect(worst).toBeLessThanOrEqual(tol);
}

describe("derived constants match the workbook", () => {
  it("gas-cycle scaling factors", () => {
    expectClose(CO2.emis2conc, 0.468952343952344, 1e-12, "CO2 emis2conc");
    expectClose(CO2.g0, 0.020369508004424063, 1e-9, "CO2 g0");
    expectClose(CO2.g1, 11.413707797322035, 1e-9, "CO2 g1");
    expectClose(CH4.g0, 0.8506991661875251, 1e-9, "CH4 g0");
    expectClose(CH4.g1, 9.148042796608344, 1e-9, "CH4 g1");
    expectClose(N2O.g0, 0.1345122139388309, 1e-9, "N2O g0");
    expectClose(N2O.g1, 24.785904398923723, 1e-9, "N2O g1");
  });

  it("climate response coefficients", () => {
    expectClose(RF_2X_CO2, 3.845742434813572, 1e-12, "RF_2xCO2");
    expectClose(K1, 0.13313479088913416, 1e-12, "k1");
    expectClose(K2, 0.9414285736823019, 1e-12, "k2");
    const { q1, q2 } = thermalCoefficients(3, 1.7);
    expectClose(q1, 0.36168230537946056, 1e-12, "q1");
    expectClose(q2, 0.4184011377660057, 1e-12, "q2");
  });

  it("damage function calibration", () => {
    const dp = damageParams({ damageAt1C: 0.00239, damageAt6C: 0.5 });
    expectClose(dp.alpha, 0.16666666666666669, 1e-9, "alpha_1");
    expectClose(dp.exponent, 3.3676780595051454, 1e-9, "exponent_1");
  });

  it("marginal abatement cost curve calibration", () => {
    const macc = maccParams({ cost50: 100, cost100: 500, maxAbatement: 1.5 });
    expectClose(macc.shape, -0.8613531161467864, 1e-9, "MACC shape");
    expectClose(macc.c1, 1.5, 1e-12, "MACC C1");
    expectClose(macc.c2, 105.61758379779482, 1e-9, "MACC C2");
  });
});

describe("default run reproduces the workbook", () => {
  const result = runModel(cloneDefaults(), statics);
  const g = golden.series;

  it("carbon cycle", () => {
    expectSeriesClose(result.policy.co2.conc, g.co2Conc, "CO2 concentration");
    expectSeriesClose(result.policy.co2.rf, g.co2Rf, "CO2 forcing");
    expectSeriesClose(result.policy.co2.ems, g.co2Ems, "CO2 emissions");
    expectSeriesClose(result.policy.co2.emsAnnexI, g.co2EmsAnxI, "Annex I CO2 emissions");
    expectSeriesClose(
      result.policy.co2.emsNonAnnexI,
      g.co2EmsNonAnxI,
      "Non-Annex I CO2 emissions"
    );
    expectSeriesClose(result.policy.co2.cumEms, g.co2CumEms, "cumulative CO2");
    expectSeriesClose(result.policy.co2.alpha, g.co2Alpha, "CO2 alpha");
  });

  it("methane and nitrous oxide", () => {
    expectSeriesClose(result.policy.ch4.conc, g.ch4Conc, "CH4 concentration");
    expectSeriesClose(result.policy.ch4.rf, g.ch4Rf, "CH4 forcing");
    expectSeriesClose(result.policy.ch4.ems, g.ch4Ems, "CH4 emissions");
    expectSeriesClose(result.policy.ch4.lifetime, g.ch4Lifetime, "CH4 lifetime");
    expectSeriesClose(result.policy.n2o.conc, g.n2oConc, "N2O concentration");
    expectSeriesClose(result.policy.n2o.rf, g.n2oRf, "N2O forcing");
    expectSeriesClose(result.policy.n2o.ems, g.n2oEms, "N2O emissions");
  });

  it("forcing and temperature", () => {
    expectSeriesClose(result.policy.rfTotal, g.rfTotal, "total forcing");
    expectSeriesClose(result.policy.temp, g.temp, "absolute temperature");
    expectSeriesClose(result.policy.tempRel, g.tempRel, "temperature anomaly");
  });

  it("temperature attribution", () => {
    expectSeriesClose(result.policy.split.co2, g.tempCo2, "CO2 warming");
    expectSeriesClose(result.policy.split.ch4, g.tempCh4, "CH4 warming");
    expectSeriesClose(result.policy.split.n2o, g.tempN2o, "N2O warming");
    expectSeriesClose(result.policy.split.natural, g.tempNat, "natural warming");
  });

  it("no-policy baseline", () => {
    expectSeriesClose(result.baseline.tempRel, g.baselineTempRel, "baseline anomaly");
    expectSeriesClose(result.baseline.co2.conc, g.baselineCo2Conc, "baseline CO2 conc");
    expectSeriesClose(result.baseline.co2.ems, g.baselineCo2Ems, "baseline CO2 emissions");
  });

  it("carbon prices and abatement", () => {
    expectSeriesClose(result.economics.annexI.price, g.annexPrice, "Annex I price");
    expectSeriesClose(
      result.economics.annexI.abatement,
      g.annexAbatement,
      "Annex I abatement"
    );
    expectSeriesClose(
      result.economics.nonAnnexI.price,
      g.nonAnnexPrice,
      "Non-Annex I price"
    );
    expectSeriesClose(
      result.economics.nonAnnexI.abatement,
      g.nonAnnexAbatement,
      "Non-Annex I abatement"
    );
    expectSeriesClose(result.economics.world.abatement, g.worldAbatement, "world abatement");
    expectSeriesClose(result.economics.world.annexShare, g.annexShare, "Annex I share");
  });

  it("costs and damages", () => {
    expectSeriesClose(result.economics.world.gwp, g.worldGwp, "gross world product");
    expectSeriesClose(
      result.economics.annexI.mitigationCost,
      g.annexMitCost,
      "Annex I mitigation cost"
    );
    expectSeriesClose(
      result.economics.nonAnnexI.mitigationCost,
      g.nonAnnexMitCost,
      "Non-Annex I mitigation cost"
    );
    expectSeriesClose(
      result.economics.world.mitigationCost,
      g.worldMitCost,
      "world mitigation cost"
    );
    expectSeriesClose(
      result.economics.world.damageFraction,
      g.worldDamageFrac,
      "damage fraction"
    );
    expectSeriesClose(
      result.economics.world.totalDamage,
      g.worldTotalDamage,
      "total damage"
    );
    expectSeriesClose(
      result.economics.world.discountedDamage,
      g.worldDiscDamage,
      "discounted damage"
    );
    expectSeriesClose(
      result.economics.world.discountedMitigationCost,
      g.worldDiscMitCost,
      "discounted mitigation cost"
    );
    expectSeriesClose(
      result.economics.world.baselineDamageFraction,
      g.baselineDamageFrac,
      "baseline damage fraction"
    );
    expectSeriesClose(
      result.economics.world.baselineTotalDamage,
      g.baselineTotalDamage,
      "baseline total damage"
    );
    expectSeriesClose(
      result.economics.world.baselineDiscountedDamage,
      g.baselineDiscDamage,
      "baseline discounted damage"
    );
  });

  it("headline outputs", () => {
    const k = golden.kpis;
    expectClose(result.kpis.warming2100, k.warming2100, REL_TOL, "2100 warming");
    expectClose(result.kpis.damage2100, k.damage2100, REL_TOL, "2100 damage");
    expectClose(result.kpis.totalDamage, k.totalDamage, REL_TOL, "total damage $T");
    expectClose(
      result.kpis.totalMitigation,
      k.totalMitigation,
      REL_TOL,
      "total mitigation $T"
    );
    expectClose(result.kpis.totalCost, k.totalCost, REL_TOL, "total cost $T");
    expectClose(
      result.kpis.discountedDamage,
      k.discountedDamage,
      REL_TOL,
      "discounted damage $T"
    );
    expectClose(
      result.kpis.discountedMitigation,
      k.discountedMitigation,
      REL_TOL,
      "discounted mitigation $T"
    );
    expectClose(result.kpis.discountedCost, k.discountedCost, REL_TOL, "discounted cost $T");
    expectClose(result.kpis.tcre, k.tcre, REL_TOL, "TCRE");
    expectClose(result.kpis.warming2018, k.warming2018, REL_TOL, "2018 warming");
  });

  it("spot values quoted in the plan", () => {
    expectClose(result.policy.temp[at(1953)], 0.43391096853180006, REL_TOL, "T(1953)");
    expectClose(result.policy.tempRel[at(1953)], 0.30351913939092806, REL_TOL, "Trel(1953)");
    expectClose(result.policy.co2.conc[at(1953)], 305.1067393332044, REL_TOL, "conc(1953)");
    expectClose(result.policy.co2.rf[at(1953)], 0.513067378385114, REL_TOL, "RF(1953)");
    expectClose(result.economics.annexI.price[at(2061)], 195.5, REL_TOL, "price(2061)");
    expectClose(
      result.economics.annexI.abatement[at(2061)],
      0.29334084544586114,
      REL_TOL,
      "abatement(2061)"
    );
    expectClose(
      result.economics.annexI.mitigationCost[at(2061)],
      2253578093509.591,
      REL_TOL,
      "mitigation cost(2061)"
    );
  });
});

describe("policy responds in the expected direction", () => {
  it("switching the policy off leaves emissions unabated and costs at zero", () => {
    const params = cloneDefaults();
    params.run.policyOn = false;
    const off = runModel(params, statics);
    expectSeriesClose(off.policy.co2.ems, golden.series.baselineCo2Ems, "policy-off emissions");
    expect(off.kpis.totalMitigation).toBeCloseTo(0, 9);
    // Warming tracks the workbook's baseline column to ~0.2%. It is not bit-identical
    // because that column inherits the CH4 alpha defect described in WORKBOOK-FIDELITY.md,
    // which only applies to the comparison run, never to a genuine policy-off model run.
    expectSeriesClose(
      off.policy.tempRel,
      golden.series.baselineTempRel,
      "policy-off anomaly",
      3e-3
    );
  });

  it("a higher carbon price lowers 2100 warming", () => {
    const params = cloneDefaults();
    params.policy.annexI.price2100 = 1600;
    params.policy.nonAnnexI.price2100 = 1600;
    const strong = runModel(params, statics);
    const base = runModel(cloneDefaults(), statics);
    expect(strong.kpis.warming2100).toBeLessThan(base.kpis.warming2100);
    expect(strong.kpis.totalMitigation).toBeGreaterThan(base.kpis.totalMitigation);
  });

  it("a higher climate sensitivity raises warming", () => {
    const params = cloneDefaults();
    params.run.ecs = 4.5;
    const hot = runModel(params, statics);
    expect(hot.kpis.warming2100).toBeGreaterThan(golden.kpis.warming2100);
  });
});
