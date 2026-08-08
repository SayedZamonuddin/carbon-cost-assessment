import { useCallback, useState } from "react";

import { useModel } from "../store/ModelContext";
import parseWorkbook from "./parseWorkbook";
import { parseCsv } from "./parseCsv";

/**
 * Loads a workbook or scenario file into the model. Shared by the toolbar button and the
 * whole-page drop target so both behave identically, including error reporting.
 */
export default function useFileImport() {
  const { loadParams, loadScenario } = useModel();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const importFile = useCallback(
    async file => {
      if (!file) return;
      setError(null);
      setBusy(true);
      try {
        if (/\.xlsx?$/i.test(file.name)) {
          const { params, scenario } = parseWorkbook(await file.arrayBuffer());
          loadParams(params, { kind: "workbook", name: file.name }, scenario || undefined);
        } else if (/\.csv$/i.test(file.name)) {
          const { scenario, years } = parseCsv(await file.text());
          loadScenario(scenario, {
            kind: "csv",
            name: file.name,
            detail: `${years[0]}–${years[1]}`
          });
        } else {
          throw new Error(
            "Unsupported file type — upload an .xlsx workbook or a .csv scenario."
          );
        }
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setBusy(false);
      }
    },
    [loadParams, loadScenario]
  );

  return { importFile, error, clearError: () => setError(null), busy };
}
