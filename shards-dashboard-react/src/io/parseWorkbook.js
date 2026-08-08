// Reads an uploaded copy of Oxford_Simple_IAM_3_two-actor_v1.8.xlsx entirely in the
// browser. Nothing is uploaded anywhere.
//
// SheetJS Community does not expose Excel table objects, so cells are addressed
// directly. The addresses are stable across the workbook's revisions because the two
// dashboard sheets are hand-laid-out.

import * as XLSX from "xlsx";

import { N_YEARS, YEAR_START } from "../model/constants";

const POLICY_SHEET = "Clim Policy Dash";
const MODEL_SHEET = "Clim Model Dash";
const INPUT_SHEET = "INPUT DATA";

function cell(sheet, address) {
  const c = sheet[address];
  return c ? c.v : undefined;
}

function numeric(sheet, address, label) {
  const value = cell(sheet, address);
  if (typeof value !== "number" || !isFinite(value)) {
    throw new Error(`Expected a number in ${label} (${address})`);
  }
  return value;
}

/** One actor's nine policy controls, laid out across columns B..J of a single row. */
function readActor(sheet, row) {
  const columns = ["B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const [
    startYear,
    price2035,
    price2060,
    price2100,
    cost50,
    cost100,
    maxAbatement,
    participation,
    ch4Abatement
  ] = columns.map(column => numeric(sheet, `${column}${row}`, `policy row ${row}`));
  const actor = {
    startYear,
    price2035,
    price2060,
    price2100,
    cost50,
    cost100,
    maxAbatement,
    participation,
    ch4Abatement
  };

  // The MACC calibration is undefined outside this domain. Excel shows #NUM! for such a
  // workbook; failing here with a reason beats rendering NaN everywhere.
  if (!(maxAbatement > 1)) {
    throw new Error(
      `Row ${row}: "Max abatement fraction" is ${maxAbatement} but must be greater than 1 ` +
        "for the abatement cost curve to be defined."
    );
  }
  if (!(cost100 > cost50)) {
    throw new Error(
      `Row ${row}: the 100% abatement cost (${cost100}) must exceed the 50% cost (${cost50}).`
    );
  }
  return actor;
}

/**
 * The workbook's CUSTOM scenario, read from the INPUT DATA sheet. Rows run 1765..2150 in
 * columns A (year), B (non-GHG forcing), C (CO2, GtC), D (CH4), E (N2O).
 */
function readCustomScenario(workbook) {
  const sheet = workbook.Sheets[INPUT_SHEET];
  if (!sheet) return null;

  const co2 = new Array(N_YEARS).fill(0);
  const ch4 = new Array(N_YEARS).fill(0);
  const n2o = new Array(N_YEARS).fill(0);
  const otherRf = new Array(N_YEARS).fill(0);

  let found = 0;
  for (let row = 4; row <= 3 + N_YEARS + 8; row += 1) {
    const year = cell(sheet, `A${row}`);
    if (typeof year !== "number") continue;
    const i = year - YEAR_START;
    if (i < 0 || i >= N_YEARS) continue;
    otherRf[i] = Number(cell(sheet, `B${row}`)) || 0;
    co2[i] = Number(cell(sheet, `C${row}`)) || 0;
    ch4[i] = Number(cell(sheet, `D${row}`)) || 0;
    n2o[i] = Number(cell(sheet, `E${row}`)) || 0;
    found += 1;
  }
  return found > 100 ? { co2, ch4, n2o, otherRf } : null;
}

/**
 * @returns {{ params: object, scenario: object|null }}
 * @throws if the file is not this workbook.
 */
export function parseWorkbook(arrayBuffer) {
  // Normalise to bytes: handed a bare ArrayBuffer, SheetJS can misidentify the container
  // and fall through to its plain-text reader.
  const bytes =
    arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(bytes, { type: "array" });
  const policy = workbook.Sheets[POLICY_SHEET];
  const model = workbook.Sheets[MODEL_SHEET];

  if (!policy || !model) {
    throw new Error(
      `This workbook has no "${POLICY_SHEET}" and "${MODEL_SHEET}" sheets — is it the Oxford Simple IAM model?`
    );
  }

  const params = {
    policy: {
      annexI: readActor(policy, 6),
      nonAnnexI: readActor(policy, 11)
    },
    damage: {
      damageAt1C: numeric(policy, "B15", "damage at 1 °C"),
      damageAt6C: numeric(policy, "C15", "damage at 6 °C")
    },
    economy: {
      gwpValueYear: numeric(policy, "F15", "GWP value year"),
      gwp: numeric(policy, "G15", "GWP"),
      initialGrowthRate: numeric(policy, "H15", "initial growth rate"),
      growthDecline: numeric(policy, "I15", "growth decline"),
      discountRate: numeric(policy, "J15", "discount rate"),
      discountYear: numeric(policy, "K15", "discount year"),
      finalCostYear: numeric(policy, "L15", "final cost year")
    },
    run: {
      emissionsScenario: String(cell(model, "A3") || "CUSTOM").toUpperCase(),
      otherRfScenario: String(cell(model, "B3") || "NONE").toUpperCase(),
      ecs: numeric(model, "C3", "ECS"),
      tcr: numeric(model, "D3", "TCR"),
      policyOn: String(cell(model, "E3") || "ON").toUpperCase() === "ON"
    },
    display: {
      windowFrom: Number(cell(model, "B6")) || 1900,
      windowTo: Number(cell(model, "C6")) || 2150,
      refFrom: Number(cell(model, "B7")) || 1850,
      refTo: Number(cell(model, "C7")) || 1900
    }
  };

  return { params, scenario: readCustomScenario(workbook) };
}

export default parseWorkbook;
