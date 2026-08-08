import React from "react";
import PropTypes from "prop-types";

import { formatValue } from "./format";

/**
 * The table view of a chart's data — the accessible fallback that lets colour carry
 * identity on screen without being the only way to read the numbers.
 *
 * Long series are sampled down to a readable number of rows; the sampling step is stated
 * so nobody mistakes it for the full record (the CSV export has every row).
 */
const MAX_ROWS = 40;

const ChartTable = ({ spec }) => {
  const visible = spec.series.filter(s => s.data && s.data.length);
  if (!visible.length) return <p className="chart-table__empty">No data to show.</p>;

  const longest = visible.reduce((a, b) => (a.data.length >= b.data.length ? a : b));
  const step = Math.max(1, Math.ceil(longest.data.length / MAX_ROWS));
  const xs = longest.data.filter((_, i) => i % step === 0).map(p => p.x);

  const lookup = visible.map(series => {
    const map = new Map();
    series.data.forEach(point => map.set(point.x, point.y));
    return map;
  });

  return (
    <div className="chart-table">
      {step > 1 && (
        <p className="chart-table__note">
          Showing every {step}
          {step === 2 ? "nd" : step === 3 ? "rd" : "th"} row of {longest.data.length}. Export
          CSV for the full series.
        </p>
      )}
      <div className="chart-table__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{spec.xLabel || "x"}</th>
              {visible.map(series => (
                <th key={series.label} scope="col">
                  <span
                    className="chart-table__swatch"
                    style={{ backgroundColor: series.color }}
                    aria-hidden="true"
                  />
                  {series.label}
                  {series.unit ? ` (${series.unit.trim()})` : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {xs.map(x => (
              <tr key={x}>
                <th scope="row">{formatValue(x, 4)}</th>
                {visible.map((series, i) => {
                  const y = lookup[i].get(x);
                  return (
                    <td key={series.label}>
                      {y === undefined ? "—" : formatValue(y * (series.tooltipScale || 1))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ChartTable.propTypes = { spec: PropTypes.object.isRequired };

export default ChartTable;
