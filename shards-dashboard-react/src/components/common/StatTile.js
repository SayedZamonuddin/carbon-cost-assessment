import React from "react";
import PropTypes from "prop-types";

/**
 * One figure in the headline strip: a large serif number with its label above and its
 * context below. The strip itself (`.figures`) draws the hairlines between figures.
 *
 * `tone` is the one piece of decoration a figure carries — a short coloured tick on its
 * top edge, drawn from the chart palette so the strip belongs to the same system as the
 * graphics below. The convention across both dashboards: orange for warming, violet for
 * damages, blue for carbon and costs.
 */
const StatTile = ({ label, value, unit, delta, deltaLabel, detail, tone }) => (
  <div className="figure" style={tone ? { "--tone": tone } : undefined}>
    <span className="figure__label">{label}</span>
    <span className="figure__value">
      {value}
      {unit && <span className="figure__unit">{unit}</span>}
    </span>
    <span className="figure__context">
      {delta && (
        <span className={`figure__delta figure__delta--${delta.direction || "neutral"}`}>
          {delta.text}
          {deltaLabel && ` ${deltaLabel}`}
        </span>
      )}
      {delta && detail && <span className="figure__sep"> · </span>}
      {detail && <span className="figure__detail">{detail}</span>}
    </span>
  </div>
);

StatTile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  unit: PropTypes.string,
  delta: PropTypes.shape({
    text: PropTypes.string,
    direction: PropTypes.oneOf(["up", "down", "neutral"])
  }),
  deltaLabel: PropTypes.string,
  detail: PropTypes.node,
  /** Accent hue for the tick above the figure. Defaults to the UI accent. */
  tone: PropTypes.string
};

export default StatTile;
