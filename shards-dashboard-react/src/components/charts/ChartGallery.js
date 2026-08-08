import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

import IamChart from "./IamChart";
import ChartLegend from "./ChartLegend";
import ChartTable from "./ChartTable";

/**
 * The gallery: every chart is available at a glance as a thumbnail, and one of them is
 * enlarged. Clicking a thumbnail promotes it into the focus slot; the arrow keys step
 * through; the focused chart's id lives in the URL so a view can be shared.
 */
const ChartGallery = ({ specs, storageKey, focusExtras }) => {
  const initial = () => {
    const fromUrl = new URLSearchParams(window.location.hash.split("?")[1] || "").get("chart");
    return specs.some(s => s.id === fromUrl) ? fromUrl : specs[0].id;
  };

  const [focusId, setFocusId] = useState(initial);
  const [hiddenByChart, setHiddenByChart] = useState({});
  const [showTable, setShowTable] = useState(false);
  const focusRef = useRef(null);

  const focusSpec = useMemo(
    () => specs.find(s => s.id === focusId) || specs[0],
    [specs, focusId]
  );
  const hidden = useMemo(
    () => new Set(hiddenByChart[focusSpec.id] || []),
    [hiddenByChart, focusSpec.id]
  );

  const visibleSpec = useMemo(
    () => ({ ...focusSpec, series: focusSpec.series.filter(s => !hidden.has(s.label)) }),
    [focusSpec, hidden]
  );

  // Keep the focused chart in the URL without adding history entries for every click.
  useEffect(() => {
    const [path, query] = window.location.hash.replace(/^#/, "").split("?");
    const params = new URLSearchParams(query || "");
    params.set("chart", focusSpec.id);
    window.history.replaceState(null, "", `#${path}?${params.toString()}`);
  }, [focusSpec.id]);

  useEffect(() => {
    setShowTable(false);
  }, [focusSpec.id]);

  const step = useCallback(
    delta => {
      const index = specs.findIndex(s => s.id === focusSpec.id);
      const next = specs[(index + delta + specs.length) % specs.length];
      setFocusId(next.id);
    },
    [specs, focusSpec.id]
  );

  const onKeyDown = event => {
    if (event.key === "ArrowLeft") {
      step(-1);
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      step(1);
      event.preventDefault();
    }
  };

  const toggleSeries = label => {
    setHiddenByChart(current => {
      const set = new Set(current[focusSpec.id] || []);
      if (set.has(label)) set.delete(label);
      else set.add(label);
      return { ...current, [focusSpec.id]: Array.from(set) };
    });
  };

  const exportPng = () => {
    const canvas = focusRef.current && focusRef.current.querySelector("canvas");
    if (!canvas) return;
    // Chart.js canvases are transparent; paint the surface behind so the file is usable.
    const output = document.createElement("canvas");
    output.width = canvas.width;
    output.height = canvas.height;
    const ctx = output.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(canvas, 0, 0);
    const link = document.createElement("a");
    link.download = `${focusSpec.id}.png`;
    link.href = output.toDataURL("image/png");
    link.click();
  };

  const exportCsv = () => {
    const series = visibleSpec.series.filter(s => s.data && s.data.length);
    if (!series.length) return;
    const xs = Array.from(
      new Set(series.reduce((acc, s) => acc.concat(s.data.map(p => p.x)), []))
    ).sort((a, b) => a - b);
    const maps = series.map(s => new Map(s.data.map(p => [p.x, p.y])));
    const header = [visibleSpec.xLabel || "x"].concat(
      series.map(s => `${s.label}${s.unit ? ` (${s.unit.trim()})` : ""}`)
    );
    const rows = xs.map(x =>
      [x]
        .concat(
          maps.map((map, i) => {
            const y = map.get(x);
            return y === undefined ? "" : y * (series[i].tooltipScale || 1);
          })
        )
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.download = `${focusSpec.id}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className="chart-gallery"
      onKeyDown={onKeyDown}
      tabIndex={-1}
      aria-label={`${storageKey} charts`}
    >
      <div className="thumb-strip" role="tablist" aria-label="Choose a chart">
        {specs.map(spec => {
          const isFocus = spec.id === focusSpec.id;
          return (
            <button
              key={spec.id}
              type="button"
              role="tab"
              aria-selected={isFocus}
              className={`thumb${isFocus ? " thumb--active" : ""}`}
              onClick={() => setFocusId(spec.id)}
              disabled={isFocus}
            >
              <span className="thumb__title">{spec.shortTitle || spec.title}</span>
              <span className="thumb__canvas">
                <IamChart spec={spec} variant="thumbnail" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="focus-card" ref={focusRef}>
        <header className="focus-card__header">
          <div>
            <h2>{focusSpec.title}</h2>
            {focusSpec.note && <p className="focus-card__note">{focusSpec.note}</p>}
          </div>
          <div className="focus-card__actions">
            <button
              type="button"
              className={`icon-button${showTable ? " is-active" : ""}`}
              onClick={() => setShowTable(v => !v)}
              title={showTable ? "Show chart" : "Show data table"}
            >
              <i className="material-icons">{showTable ? "show_chart" : "table_rows"}</i>
            </button>
            <button type="button" className="icon-button" onClick={exportPng} title="Download PNG">
              <i className="material-icons">image</i>
            </button>
            <button type="button" className="icon-button" onClick={exportCsv} title="Download CSV">
              <i className="material-icons">download</i>
            </button>
          </div>
        </header>

        <ChartLegend series={focusSpec.series} hidden={hidden} onToggle={toggleSeries} />

        {focusExtras[focusSpec.id]}

        <div className="focus-card__body">
          {visibleSpec.series.length === 0 ? (
            <p className="focus-card__empty">
              <i className="material-icons">insights</i>
              Nothing selected — choose at least one series to plot.
            </p>
          ) : showTable ? (
            <ChartTable spec={visibleSpec} />
          ) : (
            <IamChart spec={visibleSpec} variant="focus" />
          )}
        </div>
      </div>
    </section>
  );
};

ChartGallery.propTypes = {
  specs: PropTypes.array.isRequired,
  storageKey: PropTypes.string,
  /** Extra controls rendered above a given chart, keyed by chart id. */
  focusExtras: PropTypes.object
};

ChartGallery.defaultProps = { storageKey: "dashboard", focusExtras: {} };

export default ChartGallery;
