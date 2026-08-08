import React from "react";
import PropTypes from "prop-types";

/**
 * Legend rendered as real HTML rather than on the canvas, so it is selectable, keyboard
 * reachable and readable by assistive tech. Clicking an entry hides that series.
 */
const ChartLegend = ({ series, hidden, onToggle }) => (
  <ul className="chart-legend">
    {series.map(item => {
      const isHidden = hidden.has(item.label);
      return (
        <li key={item.label}>
          <button
            type="button"
            className={`chart-legend__item${isHidden ? " is-hidden" : ""}`}
            onClick={() => onToggle(item.label)}
            aria-pressed={!isHidden}
            title={isHidden ? `Show ${item.label}` : `Hide ${item.label}`}
          >
            <span
              className="chart-legend__swatch"
              style={{
                backgroundColor: item.dash && item.dash.length ? "transparent" : item.color,
                borderColor: item.color,
                borderStyle: item.dash && item.dash.length ? "dashed" : "solid",
                opacity: item.alpha === undefined ? 1 : Math.max(item.alpha, 0.6)
              }}
            />
            <span className="chart-legend__label">{item.label}</span>
          </button>
        </li>
      );
    })}
  </ul>
);

ChartLegend.propTypes = {
  series: PropTypes.array.isRequired,
  hidden: PropTypes.instanceOf(Set).isRequired,
  onToggle: PropTypes.func.isRequired
};

export default ChartLegend;
