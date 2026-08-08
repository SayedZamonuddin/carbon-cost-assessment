import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

import Chart from "../../utils/chart";
import { AXIS_TEXT, GRID, INK, SURFACE } from "./palette";
import { formatValue } from "./format";

/**
 * Renders one chart spec, either as a small thumbnail (no axes, no legend, decimated) or
 * as the full focus chart (axes, legend, crosshair tooltip, end labels).
 *
 * A spec looks like:
 *   { id, title, yLabel, xLabel, series: [{ label, color, data, dash, width, alpha,
 *     tooltipScale, unit, showPoints, endLabel }], xRange: [from, to] }
 */
/** Fade a hex colour, so a counterfactual line reads as secondary to its solid twin. */
function withAlpha(hex, alpha) {
  if (alpha >= 1) return hex;
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function toDataset(series, variant) {
  const thumbnail = variant === "thumbnail";
  const alpha = series.alpha === undefined ? 1 : series.alpha;
  const stroke = withAlpha(series.color, alpha);
  return {
    label: series.label,
    data: thumbnail ? decimate(series.data) : series.data,
    borderColor: stroke,
    backgroundColor: series.fill || "transparent",
    borderWidth: thumbnail ? 1.5 : series.width || 2,
    borderDash: series.dash || [],
    fill: Boolean(series.fill),
    pointRadius: thumbnail
      ? 0
      : series.pointRadius !== undefined
      ? series.pointRadius
      : series.showPoints
      ? 2.5
      : 0,
    pointHoverRadius: thumbnail ? 0 : 4.5,
    pointBackgroundColor: series.color,
    pointBorderColor: SURFACE,
    pointBorderWidth: 1.5,
    showLine: series.showLine !== false,
    lineTension: 0,
    spanGaps: true,
    endLabel: series.endLabel !== false,
    // carried through for the tooltip
    tooltipScale: series.tooltipScale || 1,
    unit: series.unit || ""
  };
}

/** Thumbnails only need the shape of the curve, not every year. */
function decimate(data, step = 3) {
  if (!data || data.length < 200) return data;
  const out = [];
  for (let i = 0; i < data.length; i += step) out.push(data[i]);
  if (data.length && out[out.length - 1] !== data[data.length - 1]) {
    out.push(data[data.length - 1]);
  }
  return out;
}

function buildOptions(spec, variant) {
  const thumbnail = variant === "thumbnail";
  // Editorial axis convention: units live in the chart title and tooltips, so no rotated
  // y-axis caption; an x caption appears only when the ticks alone wouldn't say what the
  // axis is (never for years).
  const xCaption = spec.xLabel && spec.xLabel !== "Year" ? spec.xLabel : "";
  const scaleLabel = text => ({
    display: Boolean(text) && !thumbnail,
    labelString: text || "",
    fontColor: AXIS_TEXT,
    fontSize: 11,
    padding: 4
  });

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    layout: { padding: thumbnail ? 2 : { top: 8, right: 72, bottom: 0, left: 0 } },
    legend: { display: false },
    hover: { mode: "index", intersect: false },
    tooltips: {
      enabled: !thumbnail,
      mode: spec.tooltipMode || "index",
      intersect: false,
      backgroundColor: "rgba(28,28,26,0.94)",
      titleFontSize: 12,
      bodyFontSize: 12,
      bodySpacing: 4,
      cornerRadius: 6,
      caretSize: 5,
      xPadding: 10,
      yPadding: 8,
      itemSort: (a, b) => b.yLabel - a.yLabel,
      callbacks: {
        title: items =>
          items.length ? `${spec.xLabelPrefix || ""}${formatValue(items[0].xLabel, 4)}` : "",
        label: (item, data) => {
          const dataset = data.datasets[item.datasetIndex];
          const value = item.yLabel * (dataset.tooltipScale || 1);
          return ` ${dataset.label}: ${formatValue(value)}${dataset.unit || ""}`;
        }
      }
    },
    plugins: {
      crosshair: !thumbnail && spec.tooltipMode !== "nearest",
      endLabels: !thumbnail && spec.endLabels !== false
    },
    scales: {
      xAxes: [
        {
          type: "linear",
          position: "bottom",
          ticks: {
            display: !thumbnail,
            fontSize: 11,
            maxTicksLimit: 9,
            callback: value => (spec.xInteger === false ? value : String(Math.round(value))),
            min: spec.xRange ? spec.xRange[0] : undefined,
            max: spec.xRange ? spec.xRange[1] : undefined
          },
          gridLines: {
            display: !thumbnail,
            color: GRID,
            drawBorder: false,
            zeroLineColor: GRID
          },
          scaleLabel: scaleLabel(xCaption)
        }
      ],
      yAxes: [
        {
          ticks: {
            display: !thumbnail,
            fontSize: 11,
            maxTicksLimit: 7,
            callback: value => formatValue(value, 3),
            min: spec.yMin,
            max: spec.yMax,
            suggestedMin: spec.ySuggestedMin
          },
          gridLines: {
            display: !thumbnail,
            color: GRID,
            drawBorder: false,
            zeroLineColor: spec.zeroLine ? "#c9c8c2" : GRID,
            zeroLineWidth: spec.zeroLine ? 1.5 : 1
          },
          scaleLabel: scaleLabel("")
        }
      ]
    }
  };
}

const IamChart = ({ spec, variant }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // Create once per variant; data changes are pushed in below without a rebuild.
  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: { datasets: spec.series.map(s => toDataset(s, variant)) },
      options: buildOptions(spec, variant)
    });
    chartRef.current = chart;
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, spec.id]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const next = spec.series.map(s => toDataset(s, variant));

    if (next.length !== chart.data.datasets.length) {
      chart.data.datasets = next;
    } else {
      next.forEach((dataset, i) => {
        const hidden = chart.getDatasetMeta(i).hidden;
        Object.assign(chart.data.datasets[i], dataset);
        chart.getDatasetMeta(i).hidden = hidden;
      });
    }
    // Most options are constant per (spec.id, variant) and set at construction. The
    // exceptions — the x window follows the "chart window" controls and the MACC chart's
    // y clip follows the cost anchors — are written into the live options object, which
    // update() re-merges into the scales. (Chart.js 2 would also accept replacing
    // chart.options wholesale, but rebuilding tooltip/plugin config every keystroke for
    // two changing numbers is waste.)
    const xTicks = chart.options.scales.xAxes[0].ticks;
    xTicks.min = spec.xRange ? spec.xRange[0] : undefined;
    xTicks.max = spec.xRange ? spec.xRange[1] : undefined;
    const yTicks = chart.options.scales.yAxes[0].ticks;
    yTicks.min = spec.yMin;
    yTicks.max = spec.yMax;
    yTicks.suggestedMin = spec.ySuggestedMin;

    // Updates are drawn immediately rather than animated. These charts re-render on every
    // keystroke and slider step, and a 260 ms tween means the line is always showing a
    // value the controls no longer hold.
    chart.update(0);
  }, [spec, variant]);

  return (
    <div className={`iam-chart iam-chart--${variant}`}>
      <canvas ref={canvasRef} role="img" aria-label={spec.title} />
    </div>
  );
};

IamChart.propTypes = {
  spec: PropTypes.object.isRequired,
  variant: PropTypes.oneOf(["thumbnail", "focus"])
};

IamChart.defaultProps = { variant: "focus" };

export { INK };
export default IamChart;
