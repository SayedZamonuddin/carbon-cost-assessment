import Chart from "chart.js";

import { AXIS_TEXT, GRID, MUTED, SURFACE } from "../components/charts/palette";

Chart.defaults.global.defaultFontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
Chart.defaults.global.defaultFontColor = AXIS_TEXT;
Chart.defaults.global.animation.duration = 0;
Chart.defaults.global.elements.line.tension = 0;

/**
 * Vertical crosshair tying the tooltip to the x position being read. Opt in per chart
 * with `options.plugins.crosshair = true`.
 */
Chart.plugins.register({
  id: "crosshair",
  afterDatasetsDraw(chart) {
    const enabled = chart.options.plugins && chart.options.plugins.crosshair;
    const active = chart.tooltip && chart.tooltip._active;
    if (!enabled || !active || !active.length) return;

    const { x } = active[0].tooltipPosition();
    const yAxis = chart.scales["y-axis-0"];
    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, yAxis.top);
    ctx.lineTo(x, yAxis.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = MUTED;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.restore();
  }
});

/**
 * Labels each series at the right-hand end of its line, so identity never rests on colour
 * alone. Opt in with `options.plugins.endLabels = true`; a dataset opts out with
 * `dataset.endLabel = false`.
 *
 * Labels are nudged apart vertically when lines converge, and dropped entirely if the
 * chart is too crowded to place them honestly.
 */
Chart.plugins.register({
  id: "endLabels",
  afterDatasetsDraw(chart) {
    if (!chart.options.plugins || !chart.options.plugins.endLabels) return;

    const { ctx } = chart;
    const yAxis = chart.scales["y-axis-0"];
    const xAxis = chart.scales["x-axis-0"];
    const candidates = [];

    chart.data.datasets.forEach((dataset, index) => {
      if (dataset.endLabel === false || chart.getDatasetMeta(index).hidden) return;
      const points = chart.getDatasetMeta(index).data;
      if (!points || !points.length) return;
      // Walk back from the end to the last point actually inside the plot area.
      for (let j = points.length - 1; j >= 0; j -= 1) {
        const model = points[j]._model;
        if (!model || model.x > xAxis.right + 1 || model.y == null || isNaN(model.y)) continue;
        candidates.push({ label: dataset.label, color: dataset.borderColor, y: model.y, x: model.x });
        break;
      }
    });

    if (!candidates.length || candidates.length > 6) return;

    candidates.sort((a, b) => a.y - b.y);
    const lineHeight = 14;
    for (let i = 1; i < candidates.length; i += 1) {
      const gap = candidates[i].y - candidates[i - 1].y;
      if (gap < lineHeight) candidates[i].y = candidates[i - 1].y + lineHeight;
    }
    const overflow = candidates[candidates.length - 1].y - yAxis.bottom;
    if (overflow > 0) candidates.forEach(c => { c.y -= overflow; });

    ctx.save();
    ctx.font = "600 11px " + Chart.defaults.global.defaultFontFamily;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    candidates.forEach(candidate => {
      const text = candidate.label;
      const width = ctx.measureText(text).width;
      // Labels live in the right-hand padding, so clamp against the canvas edge rather
      // than the plot edge — clamping to xAxis.right would push them back over the lines.
      const x = Math.max(
        xAxis.left,
        Math.min(candidate.x + 8, chart.width - width - 4)
      );
      const y = Math.max(yAxis.top + 6, Math.min(candidate.y, yAxis.bottom - 6));
      ctx.fillStyle = SURFACE;
      ctx.fillRect(x - 3, y - 7, width + 6, 14);
      ctx.fillStyle = candidate.color;
      ctx.fillText(text, x, y);
    });
    ctx.restore();
  }
});

export { GRID };
export default Chart;
