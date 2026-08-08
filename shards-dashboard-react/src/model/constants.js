// Constants of the Oxford Simple Climate and Integrated Assessment Model v1.8
// (Myles Allen & Nicholas Leach). Values transcribed from the workbook's CO2_PARAMS,
// CH4_PARAMS, N2O_PARAMS and CLIMATE_PARAMS tables.

export const YEAR_START = 1765;
export const YEAR_END = 2150;
export const N_YEARS = YEAR_END - YEAR_START + 1;

export const YEARS = new Array(N_YEARS);
for (let i = 0; i < N_YEARS; i += 1) YEARS[i] = YEAR_START + i;

/** Index of a calendar year in every series the engine returns. */
export const yearIndex = year => year - YEAR_START;

// GtC -> GtCO2, MtN2O-N2 -> MtN2O
export const C_TO_CO2 = 44 / 12;
export const N2_TO_N2O = 44 / 28;

// Mass of the atmosphere expressed so that emis2conc converts Mt/Gt of a gas into ppb/ppm.
const ATMOSPHERE = 5.148;
const MEAN_MOLAR_MASS = 28.97;
const emis2conc = molarMass => MEAN_MOLAR_MASS / (ATMOSPHERE * molarMass);

/**
 * g0/g1 linearise the impulse-response function around alpha = 1 (workbook CO2!L7:M7).
 * g1 is the 100-year integrated impulse response gradient, g0 normalises alpha to 1 at
 * pre-industrial conditions.
 */
function impulseResponseScaling(a, tau) {
  let g1 = 0;
  let sum = 0;
  for (let i = 0; i < 4; i += 1) {
    const decay = Math.exp(-100 / tau[i]);
    g1 += a[i] * tau[i] * (1 - (1 + 100 / tau[i]) * decay);
    sum += a[i] * tau[i] * (1 - decay);
  }
  return { g0: 1 / Math.sinh(sum / g1), g1 };
}

function gas(spec) {
  const { g0, g1 } = impulseResponseScaling(spec.a, spec.tau);
  return { ...spec, g0, g1, emis2conc: emis2conc(spec.molarMass) };
}

export const CO2 = gas({
  name: "co2",
  molarMass: 12,
  piConc: 278,
  a: [0.2173, 0.224, 0.2824, 0.2763],
  tau: [1000000, 394.4, 36.54, 4.304],
  r0: 28.627296,
  rC: 0.019773,
  rT: 4.334433,
  rA: 0,
  f0: 5.754389,
  f1: 0.001215,
  f2: -0.069598
});

export const CH4 = gas({
  name: "ch4",
  molarMass: 16,
  piConc: 733.82,
  a: [1, 0, 0, 0],
  tau: [9.15, 1, 1, 1],
  r0: 8.444641,
  rC: 0,
  rT: -0.287247,
  rA: 0.000343,
  f0: 0.061736,
  f1: -0.000049,
  f2: 0.038416
});

export const N2O = gas({
  name: "n2o",
  molarMass: 28,
  piConc: 271.258,
  a: [1, 0, 0, 0],
  tau: [116, 1, 1, 1],
  r0: 67.843356,
  rC: 0,
  rT: 0,
  rA: -0.000999,
  f0: -0.054407,
  f1: 0.000157,
  f2: 0.106208
});

// Two-box thermal response: d1 deep ocean, d2 upper ocean (years).
export const D1 = 239;
export const D2 = 4.1;

/** Forcing from doubling CO2, derived from the CO2 forcing coefficients. */
export const RF_2X_CO2 =
  CO2.f0 * Math.LN2 +
  CO2.f1 * CO2.piConc +
  CO2.f2 * (Math.sqrt(2 * CO2.piConc) - Math.sqrt(CO2.piConc));

// Fraction of equilibrium warming realised in each box over a 70-year ramp; used to map
// the user's ECS/TCR onto the box response coefficients q1/q2.
export const K1 = 1 - (D1 / 70) * (1 - Math.exp(-70 / D1));
export const K2 = 1 - (D2 / 70) * (1 - Math.exp(-70 / D2));

/** Map equilibrium/transient climate sensitivity onto the two-box coefficients. */
export function thermalCoefficients(ecs, tcr) {
  const scale = (1 / RF_2X_CO2) * (1 / (K1 - K2));
  return { q1: scale * (tcr - ecs * K2), q2: scale * (ecs * K1 - tcr) };
}

export const EMISSION_SCENARIOS = [
  { value: "CUSTOM", label: "Custom (workbook INPUT DATA)" },
  { value: "RCP3PD", label: "RCP 2.6 (RCP3PD)" },
  { value: "RCP45", label: "RCP 4.5" },
  { value: "RCP6", label: "RCP 6.0" },
  { value: "RCP85", label: "RCP 8.5" },
  { value: "NONE", label: "No emissions" },
  { value: "PULSE_CO2", label: "Pulse — CO2" },
  { value: "PULSE_CH4", label: "Pulse — CH4" },
  { value: "PULSE_N2O", label: "Pulse — N2O" },
  { value: "STEP_CO2", label: "Step — CO2" },
  { value: "STEP_CH4", label: "Step — CH4" },
  { value: "STEP_N2O", label: "Step — N2O" }
];

export const OTHER_RF_SCENARIOS = [
  { value: "NONE", label: "None" },
  { value: "TOTAL_INCLVOLCANIC_RF", label: "Total incl. volcanic" },
  { value: "TOTAL_ANTHRO_RF", label: "Total anthropogenic" },
  { value: "GHG_RF", label: "Greenhouse gases" },
  { value: "TOTAL_NAT_RF", label: "Natural only" },
  { value: "CUSTOM", label: "Custom (from uploaded data)" }
];
