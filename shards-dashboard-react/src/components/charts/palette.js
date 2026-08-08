// The dashboard's visual system.
//
// Four categorical hues carry identity. They were validated together on the all-pairs
// list (the strictest case, since overlapping lines can end up beside any other line):
// worst CVD separation ΔE 9.2, worst normal-vision separation ΔE 16.3 — both clear.
// Aggregates ("World", "Total") are drawn in ink rather than a fifth hue: the sum should
// dominate its components, and it keeps every chart inside the validated four.
//
// Two conventions run through every chart:
//   * gases are always CO2 / CH4 / N2O in blue / orange / aqua;
//   * actors are always Annex I orange, Non-Annex I aqua.
// Gases and actors never appear in the same chart, so the shared hues never collide.
//
// Aqua sits at 2.74:1 against the chart surface, below the 3:1 bar. The relief that
// licenses it is shipped on every chart: a legend is always present, the focus chart
// direct-labels its series, and a table view exposes the numbers.

export const INK = "#191817";
export const SURFACE = "#fffefb";
export const GRID = "#eceadf";
export const AXIS_TEXT = "#767268";
export const MUTED = "#a8a7a1";
export const MUTED_SOFT = "#cfceC8";

export const BLUE = "#2a78d6";
export const ORANGE = "#eb6834";
export const AQUA = "#1baf7a";
export const VIOLET = "#4a3aa7";

/** Semantic roles. Every series in the app draws its colour from here. */
export const ROLE = {
  world: INK,
  total: INK,
  annexI: ORANGE,
  nonAnnexI: AQUA,
  co2: BLUE,
  ch4: ORANGE,
  n2o: AQUA,
  other: VIOLET,
  damage: VIOLET,
  mitigation: BLUE,
  observations: "#7a7974",
  contextCool: "#9fbfe4",
  contextWarm: "#e0b6a4"
};

/** Ordered hues for charts whose series are user-chosen (the model dash "outputs" chart). */
export const SERIES_ORDER = [BLUE, ORANGE, AQUA, VIOLET, INK];

export const DASH_BASELINE = [6, 4];
export const DASH_CONTEXT = [2, 3];

/** A counterfactual series: same hue as its policy twin, dashed and stepped back. */
export function baselineStyle(color) {
  return { color, dash: DASH_BASELINE, alpha: 0.55, width: 1.75 };
}
