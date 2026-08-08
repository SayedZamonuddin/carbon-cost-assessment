// Reads a custom emissions/forcing scenario from a CSV, in the browser.
//
// Expected header (case-insensitive, order-free):
//   YEAR, OTHER_RF, CO2, CH4, N2O
// Units: W/m^2, GtC, MtCH4, MtN2O-N2. Missing gas columns are treated as zero. Years
// outside 1765-2150 are ignored; years inside the range but absent from the file hold the
// last supplied value forward, so a file covering 2020-2100 still produces a full run.

import Papa from "papaparse";

import { N_YEARS, YEAR_START, YEAR_END, YEARS } from "../model/constants";

const ALIASES = {
  year: "year",
  years: "year",
  other_rf: "otherRf",
  otherrf: "otherRf",
  "other rf": "otherRf",
  rf_other: "otherRf",
  co2: "co2",
  "co2 (gtc)": "co2",
  ch4: "ch4",
  n2o: "n2o"
};

function normaliseHeader(header) {
  const key = String(header || "").trim().toLowerCase();
  return ALIASES[key] || key;
}

/** Turn sparse year->value pairs into a dense 1765..2150 series. */
function densify(pairs, holdForward) {
  const byYear = new Map(pairs);
  const out = new Array(N_YEARS).fill(0);
  let held = 0;
  let seen = false;
  for (let i = 0; i < N_YEARS; i += 1) {
    const value = byYear.get(YEARS[i]);
    if (value !== undefined) {
      held = value;
      seen = true;
      out[i] = value;
    } else {
      out[i] = seen && holdForward ? held : 0;
    }
  }
  return out;
}

export function parseCsv(text) {
  const parsed = Papa.parse(text.trim(), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: normaliseHeader
  });

  const rows = parsed.data.filter(row => typeof row.year === "number");
  if (!rows.length) {
    throw new Error(
      "No usable rows found. The file needs a header row with a YEAR column, plus CO2, CH4, N2O and/or OTHER_RF."
    );
  }

  const columns = ["co2", "ch4", "n2o", "otherRf"];
  const present = columns.filter(name => rows.some(row => typeof row[name] === "number"));
  if (!present.length) {
    throw new Error(
      "Found a YEAR column but no data columns. Expected at least one of CO2, CH4, N2O, OTHER_RF."
    );
  }

  const inRange = rows.filter(row => row.year >= YEAR_START && row.year <= YEAR_END);
  if (!inRange.length) {
    throw new Error(`No rows fall inside the model's range (${YEAR_START}-${YEAR_END}).`);
  }

  const scenario = {};
  columns.forEach(name => {
    const pairs = inRange
      .filter(row => typeof row[name] === "number")
      .map(row => [row.year, row[name]]);
    // Emissions hold their last value forward to the end of the run; forcing does not,
    // since an unspecified forcing is more naturally zero than "forever the last value".
    scenario[name] = densify(pairs, name !== "otherRf");
  });

  return {
    scenario,
    years: [inRange[0].year, inRange[inRange.length - 1].year],
    columns: present
  };
}

/** A ready-to-edit template of the workbook's own CUSTOM scenario. */
export function scenarioToCsv(statics) {
  const { customScenario } = statics;
  const lines = ["YEAR,OTHER_RF,CO2,CH4,N2O"];
  for (let i = 0; i < N_YEARS; i += 1) {
    lines.push(
      [
        YEARS[i],
        customScenario.otherRf[i],
        customScenario.co2[i],
        customScenario.ch4[i],
        customScenario.n2o[i]
      ].join(",")
    );
  }
  return lines.join("\n");
}

export default parseCsv;
