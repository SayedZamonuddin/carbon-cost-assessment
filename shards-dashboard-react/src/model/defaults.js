// The workbook's shipped parameter values, extracted by scripts/extract_workbook.py.

import defaults from "../data/model/defaults.json";

/** A deep copy, so UI state can be mutated freely without touching the defaults. */
export function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaults));
}

export default defaults;
