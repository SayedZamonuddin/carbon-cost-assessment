// FaIR v2.0-style gas cycle: a four-pool impulse response whose timescales are stretched
// by `alpha`, a state-dependent factor responding to cumulative uptake, warming and
// airborne burden. Ports the CO2 / CH4 / N2O sheets' CALC tables.

import { N_YEARS } from "./constants";

/** Allocate the per-year state and output arrays for one gas over one model run. */
export function createGasRun() {
  return {
    pools: [0, 0, 0, 0],
    cumEmsPrev: 0,
    uptakePrev: 0,
    accumulatedPrev: 0,
    ems: new Float64Array(N_YEARS),
    emsAnnexI: new Float64Array(N_YEARS),
    emsNonAnnexI: new Float64Array(N_YEARS),
    cumEms: new Float64Array(N_YEARS),
    alpha: new Float64Array(N_YEARS),
    uptake: new Float64Array(N_YEARS),
    accumulated: new Float64Array(N_YEARS),
    conc: new Float64Array(N_YEARS),
    rf: new Float64Array(N_YEARS),
    lifetime: new Float64Array(N_YEARS)
  };
}

/**
 * Advance one gas by a single year.
 *
 * `tempPrev` is last year's global mean temperature of the *same* run — the temperature
 * feedback on carbon uptake. Everything else the feedback reads is also lagged one year,
 * so the whole model resolves in a single forward pass with no iteration.
 */
export function stepGas(gas, run, i, emissions, tempPrev, emissionAlpha) {
  const { a, tau, g0, g1, r0, rC, rT, rA, emis2conc, piConc, f0, f1, f2 } = gas;

  const cumEms = run.cumEmsPrev + emissions;
  const alpha =
    g0 *
    Math.sinh(
      (r0 +
        rC * run.uptakePrev +
        rT * tempPrev +
        rA * run.accumulatedPrev) /
        g1
    );

  // `emissionAlpha` exists only to reproduce a defect in the workbook: the baseline CH4
  // pool (CH4!R12) scales this year's emissions by the *policy* run's alpha while
  // decaying the existing burden with its own. Left undefined, the gas behaves
  // self-consistently. See WORKBOOK-FIDELITY.md.
  const inputAlpha = emissionAlpha === undefined ? alpha : emissionAlpha;

  let burden = 0;
  for (let k = 0; k < 4; k += 1) {
    const decay = Math.exp(-1 / (alpha * tau[k]));
    run.pools[k] =
      emissions * emis2conc * a[k] * inputAlpha * tau[k] * (1 - decay) +
      run.pools[k] * decay;
    burden += run.pools[k];
  }

  const accumulated = burden / emis2conc;
  const uptake = cumEms - accumulated;
  const conc = burden + piConc;

  run.ems[i] = emissions;
  run.cumEms[i] = cumEms;
  run.alpha[i] = alpha;
  run.accumulated[i] = accumulated;
  run.uptake[i] = uptake;
  run.conc[i] = conc;
  run.rf[i] =
    f0 * Math.log(conc / piConc) +
    f1 * (conc - piConc) +
    f2 * (Math.sqrt(conc) - Math.sqrt(piConc));
  run.lifetime[i] = alpha * tau[0];

  run.cumEmsPrev = cumEms;
  run.uptakePrev = uptake;
  run.accumulatedPrev = accumulated;
}
