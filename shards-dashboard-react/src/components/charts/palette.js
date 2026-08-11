// The dashboard's visual system.
//
// Four categorical hues carry identity. They were validated together on the all-pairs
// list (the strictest case, since overlapping lines can end up beside any other line):
// worst CVD separation ΔE 9.2, worst normal-vision separation ΔE 15.9 — both clear.
// Aggregates ("World", "Total") are drawn in SLATE rather than a fifth hue: the sum
// should dominate its components, and it keeps every chart inside the validated four.
// Slate is deliberately outside the categorical band (it is a dark near-neutral, not an
// identity hue) — it reads as "the total" the way ink would, but carries enough blue to
// sit warm against the paper instead of stamping the page with pure black.
//
// Two conventions run through every chart:
//   * gases are always CO2 / CH4 / N2O in blue / orange / aqua;
//   * actors are always Annex I orange, Non-Annex I aqua.
// Gases and actors never appear in the same chart, so the shared hues never collide.
//
// Aqua sits at 2.79:1 against the chart surface, below the 3:1 bar. The relief that
// licenses it is shipped on every chart: a legend is always present, the focus chart
// direct-labels its series, and a table view exposes the numbers.

export const INK = "#241f1a";
/** The aggregate stroke, and the UI's structural dark. */
export const SLATE = "#1f3a52";
export const SURFACE = "#fffdf7";
export const GRID = "#ece8db";
export const AXIS_TEXT = "#6f6a5e";
export const MUTED = "#9d978a";
export const MUTED_SOFT = "#cfc9b8";

export const BLUE = "#2a78d6";
export const ORANGE = "#eb6834";
export const AQUA = "#1baf7a";
export const VIOLET = "#4a3aa7";

/** Semantic roles. Every series in the app draws its colour from here. */
export const ROLE = {
  world: SLATE,
  total: SLATE,
  annexI: ORANGE,
  nonAnnexI: AQUA,
  co2: BLUE,
  ch4: ORANGE,
  n2o: AQUA,
  other: VIOLET,
  damage: VIOLET,
  mitigation: BLUE,
  observations: "#726c60",
  contextCool: "#9dc0e8",
  contextWarm: "#e5b09a"
};

/** Ordered hues for charts whose series are user-chosen (the model dash "outputs" chart). */
export const SERIES_ORDER = [BLUE, ORANGE, AQUA, VIOLET, INK];

export const DASH_BASELINE = [6, 4];
export const DASH_CONTEXT = [2, 3];

/** A counterfactual series: same hue as its policy twin, dashed and stepped back. */
export function baselineStyle(color) {
  return { color, dash: DASH_BASELINE, alpha: 0.55, width: 1.75 };
}
