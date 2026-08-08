import React, { useRef, useState } from "react";
import { Tooltip } from "shards-react";

import { useModel } from "../../../store/ModelContext";
import useFileImport from "../../../io/useFileImport";
import { scenarioToCsv } from "../../../io/parseCsv";

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Where the numbers come from, and the way to change that. An .xlsx repopulates every
 * control from the workbook; a .csv supplies an emissions scenario; the ✕ unloads
 * everything and returns to the welcome screen.
 */
const DataSourceControl = () => {
  const { unload, source, statics, dataLoaded } = useModel();
  const { importFile, error, clearError } = useFileImport();
  const inputRef = useRef(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const onChange = event => {
    importFile(event.target.files[0]);
    event.target.value = "";
  };

  const sourceLabel =
    source.kind === "example" ? "Example dataset" : source.name || "Uploaded file";

  return (
    <div className="data-source">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="d-none"
        onChange={onChange}
      />

      {dataLoaded && (
        <span className="source-tag" title={source.name || "Workbook default values"}>
          <span className="source-tag__label">Data</span>
          <span className="source-tag__name">{sourceLabel}</span>
          {source.detail && <span className="source-tag__detail">{source.detail}</span>}
          <button type="button" onClick={unload} aria-label="Unload data and start over">
            <i className="material-icons">close</i>
          </button>
        </span>
      )}

      <button
        type="button"
        className="button button--primary button--small"
        onClick={() => inputRef.current.click()}
      >
        Load data
      </button>

      <button
        type="button"
        id="upload-help"
        className="icon-button"
        aria-label="What can I load?"
        onClick={() => setHelpOpen(open => !open)}
      >
        <i className="material-icons">help_outline</i>
      </button>
      <Tooltip
        open={helpOpen}
        target="#upload-help"
        toggle={() => setHelpOpen(open => !open)}
        placement="bottom"
      >
        <div className="upload-help">
          <strong>.xlsx</strong> — a copy of the Oxford Simple IAM workbook. Every control
          is repopulated from it, and stays editable.
          <br />
          <strong>.csv</strong> — a custom scenario with columns{" "}
          <code>YEAR, OTHER_RF, CO2, CH4, N2O</code> (W/m², GtC, MtCH₄, MtN₂O-N₂).
          <br />
          <button
            type="button"
            className="link-button"
            onClick={() => download("iam-scenario-template.csv", scenarioToCsv(statics), "text/csv")}
          >
            Download a template
          </button>
        </div>
      </Tooltip>

      {error && (
        <div className="upload-error" role="alert">
          <i className="material-icons">error_outline</i>
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss">
            <i className="material-icons">close</i>
          </button>
        </div>
      )}
    </div>
  );
};

export default DataSourceControl;
