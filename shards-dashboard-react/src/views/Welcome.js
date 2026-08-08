import React, { useRef } from "react";

import { useModel } from "../store/ModelContext";
import useFileImport from "../io/useFileImport";
import { scenarioToCsv } from "../io/parseCsv";

/**
 * What a visitor sees before any data is loaded. The dashboards stay out of sight until
 * they choose a source: their own workbook or CSV, or the bundled example dataset.
 */
const Welcome = () => {
  const { useExample, statics } = useModel();
  const { importFile, error, clearError } = useFileImport();
  const inputRef = useRef(null);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(
      new Blob([scenarioToCsv(statics)], { type: "text/csv" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "iam-scenario-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="welcome">
      <div className="welcome__inner">
        <p className="welcome__kicker">Oxford Simple Climate &amp; Integrated Assessment Model</p>
        <h1 className="welcome__title">
          What does a carbon price buy the world?
        </h1>
        <p className="welcome__lede">
          Set carbon prices for developed and developing countries, and this tool runs the
          full climate model — emissions, concentrations, warming, damages and costs from
          1765 to 2150 — in your browser, instantly, as you move each control.
        </p>

        <div className="welcome__actions">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="d-none"
            onChange={event => {
              importFile(event.target.files[0]);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="button button--primary"
            onClick={() => inputRef.current.click()}
          >
            Load a workbook or CSV
          </button>
          <button type="button" className="button" onClick={useExample}>
            Explore the example dataset
          </button>
        </div>

        {error && (
          <p className="welcome__error" role="alert">
            {error}{" "}
            <button type="button" className="link-button" onClick={clearError}>
              dismiss
            </button>
          </p>
        )}

        <dl className="welcome__sources">
          <div>
            <dt>.xlsx</dt>
            <dd>
              A copy of <em>Oxford_Simple_IAM_two-actor</em>. Its policy settings and
              custom scenario populate every control, and stay editable.
            </dd>
          </div>
          <div>
            <dt>.csv</dt>
            <dd>
              Your own emissions scenario — columns <code>YEAR, OTHER_RF, CO2, CH4, N2O</code>{" "}
              (W/m², GtC, MtCH₄, MtN₂O-N₂).{" "}
              <button type="button" className="link-button" onClick={downloadTemplate}>
                Download a template
              </button>
            </dd>
          </div>
          <div>
            <dt>Example</dt>
            <dd>
              The dataset shipped inside the workbook: historical emissions to 2023 and a
              plausible baseline to 2150.
            </dd>
          </div>
        </dl>

        <p className="welcome__smallprint">
          You can also drop a file anywhere on this page. Everything is computed locally —
          no data leaves your machine. Model © 2025 Myles Allen &amp; Nicholas Leach.
        </p>
      </div>
    </div>
  );
};

export default Welcome;
