// Round-trips the genuine workbook and a generated CSV through the browser parsers.
// The .xlsx used here is the file the dashboard was built from, so a successful parse
// must reproduce the shipped defaults exactly.

import fs from "fs";
import path from "path";

import { parseWorkbook } from "../parseWorkbook";
import { parseCsv, scenarioToCsv } from "../parseCsv";
import statics from "../../data/model/static.json";
import defaults from "../../data/model/defaults.json";
import { cloneDefaults } from "../../model/defaults";
import { runModel } from "../../model/runModel";
import { N_YEARS, YEAR_START } from "../../model/constants";
import golden from "../../data/model/golden.json";

const WORKBOOK = path.resolve(
  __dirname,
  "../../../../Oxford_Simple_IAM_3_two-actor_v1.8.xlsx"
);

describe("xlsx upload", () => {
  const buffer = fs.readFileSync(WORKBOOK);
  const { params, scenario } = parseWorkbook(new Uint8Array(buffer));

  it("reads back the parameters the dashboard ships as defaults", () => {
    expect(params.policy).toEqual(defaults.policy);
    expect(params.damage).toEqual(defaults.damage);
    expect(params.economy).toEqual(defaults.economy);
    expect(params.run).toEqual(defaults.run);
    expect(params.display).toEqual(defaults.display);
  });

  it("reads the custom emissions scenario", () => {
    expect(scenario).not.toBeNull();
    expect(scenario.co2).toHaveLength(N_YEARS);
    expect(scenario.co2[0]).toBeCloseTo(0.003, 9);
    expect(scenario.co2[2015 - YEAR_START]).toBeCloseTo(10.21455, 6);
  });

  it("reproduces the workbook's own results once loaded", () => {
    const result = runModel(params, statics, scenario);
    expect(result.kpis.warming2100).toBeCloseTo(golden.kpis.warming2100, 6);
    expect(result.kpis.totalCost).toBeCloseTo(golden.kpis.totalCost, 4);
    expect(result.kpis.tcre).toBeCloseTo(golden.kpis.tcre, 6);
  });

  it("rejects a file that is not this model", () => {
    expect(() => parseWorkbook(new ArrayBuffer(8))).toThrow();
  });

  it("rejects a workbook whose policy parameters are outside the model's domain", () => {
    const XLSX = require("xlsx");
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    // A max abatement fraction at or below 1 makes the MACC calibration undefined —
    // Excel itself shows #NUM! for this; the parser must fail with a reason.
    workbook.Sheets["Clim Policy Dash"].H6 = { t: "n", v: 0.9 };
    const edited = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    expect(() => parseWorkbook(edited)).toThrow(/Max abatement/i);
  });
});

describe("csv upload", () => {
  it("round-trips the downloadable template", () => {
    const { scenario } = parseCsv(scenarioToCsv(statics));
    expect(scenario.co2).toHaveLength(N_YEARS);
    scenario.co2.forEach((value, i) => {
      expect(value).toBeCloseTo(statics.customScenario.co2[i], 9);
    });
    const result = runModel(cloneDefaults(), statics, scenario);
    expect(result.kpis.warming2100).toBeCloseTo(golden.kpis.warming2100, 6);
  });

  it("accepts a sparse file and holds emissions forward", () => {
    const csv = ["YEAR,CO2", "2020,10", "2050,5", "2100,0"].join("\n");
    const { scenario, years } = parseCsv(csv);
    expect(years).toEqual([2020, 2100]);
    expect(scenario.co2[2020 - YEAR_START]).toBe(10);
    expect(scenario.co2[2050 - YEAR_START]).toBe(5);
    expect(scenario.co2[2149 - YEAR_START]).toBe(0); // held forward past the last row
    expect(scenario.co2[2000 - YEAR_START]).toBe(0); // nothing before the first row
    expect(scenario.ch4.every(v => v === 0)).toBe(true);
  });

  it("is case- and order-insensitive about headers", () => {
    const { scenario, columns } = parseCsv("co2,Year\n7,2030");
    expect(columns).toContain("co2");
    expect(scenario.co2[2030 - YEAR_START]).toBe(7);
  });

  it("explains what is wrong with an unusable file", () => {
    expect(() => parseCsv("alpha,beta\n1,2")).toThrow(/YEAR column/i);
    expect(() => parseCsv("YEAR\n2020\n2030")).toThrow(/CO2, CH4, N2O/i);
    expect(() => parseCsv("YEAR,CO2\n1500,4")).toThrow(/1765-2150/);
  });
});
