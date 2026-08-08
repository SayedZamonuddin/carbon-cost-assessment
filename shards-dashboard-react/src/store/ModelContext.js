import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import statics from "../data/model/static.json";
import { cloneDefaults } from "../model/defaults";
import { runModel } from "../model/runModel";
import { N_YEARS } from "../model/constants";

const ModelContext = createContext(null);

// Excel users expect their work to survive closing the file; a dashboard that forgets
// every edit on reload would send them straight back to the spreadsheet. State is
// persisted per browser, and versioned so a future shape change falls back to defaults
// instead of restoring something the engine can no longer read.
const STORAGE_KEY = "oxford-iam-dashboard-v1";

/** `#/policy?data=example` deep-links straight into the example dataset. */
function urlRequestsExample() {
  try {
    const query = (window.location.hash.split("?")[1] || "");
    return new URLSearchParams(query).get("data") === "example";
  } catch (e) {
    return false;
  }
}

function restoreState() {
  // "none" = nothing loaded yet: the dashboards stay behind the welcome screen until the
  // user uploads a file or opts into the bundled example dataset.
  const initialKind = urlRequestsExample() ? "example" : "none";
  const fallback = { params: cloneDefaults(), customScenario: null, source: { kind: initialKind, name: null } };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw);

    // Restore group by group over the defaults, so fields added later keep their default
    // and a corrupt group can't leave params half-shaped.
    const params = cloneDefaults();
    ["policy", "damage", "economy", "run", "display"].forEach(group => {
      if (stored.params && typeof stored.params[group] === "object") {
        if (group === "policy") {
          Object.assign(params.policy.annexI, stored.params.policy.annexI);
          Object.assign(params.policy.nonAnnexI, stored.params.policy.nonAnnexI);
        } else {
          Object.assign(params[group], stored.params[group]);
        }
      }
    });
    // The engine's domain requirements, re-checked because old storage predates the
    // control clamps that now enforce them.
    ["annexI", "nonAnnexI"].forEach(actor => {
      const p = params.policy[actor];
      if (!(p.maxAbatement > 1) || !(p.cost100 > p.cost50)) throw new Error("invalid policy");
    });

    let customScenario = null;
    const s = stored.customScenario;
    if (s && Array.isArray(s.co2) && s.co2.length === N_YEARS) {
      customScenario = s;
    }

    let source = stored.source && stored.source.kind ? stored.source : fallback.source;
    // Saved before the welcome screen existed: "defaults" meant the bundled dataset.
    if (source.kind === "defaults") source = { kind: "example", name: null };
    if (source.kind === "none" && urlRequestsExample()) {
      source = { kind: "example", name: null };
    }
    return { params, customScenario, source };
  } catch (e) {
    return fallback;
  }
}

/** Immutably set a dotted path (e.g. "policy.annexI.price2100") on a params object. */
function setPath(object, path, value) {
  const [head, ...rest] = path.split(".");
  const next = Array.isArray(object) ? object.slice() : { ...object };
  next[head] = rest.length ? setPath(object[head], rest.join("."), value) : value;
  return next;
}

function getPath(object, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), object);
}

/**
 * Holds every input the model reads, plus where those inputs came from.
 *
 * A full model run takes about 3 ms, so parameter edits recompute synchronously and the
 * charts track a slider as it is dragged — no debounce, no worker.
 */
export function ModelProvider({ children }) {
  const restored = useRef(null);
  if (restored.current === null) restored.current = restoreState();

  const [params, setParams] = useState(restored.current.params);
  const [customScenario, setCustomScenario] = useState(restored.current.customScenario);
  const [source, setSource] = useState(restored.current.source);

  const outputs = useMemo(() => runModel(params, statics, customScenario), [
    params,
    customScenario
  ]);

  // Save shortly after edits settle rather than on every slider tick.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ params, customScenario, source })
        );
      } catch (e) {
        // Storage full or blocked — the dashboard still works, it just won't remember.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [params, customScenario, source]);

  const setParam = useCallback((path, value) => {
    setParams(current => setPath(current, path, value));
  }, []);

  const getParam = useCallback(path => getPath(params, path), [params]);

  /** Replace every parameter at once — used when a workbook is uploaded. */
  const loadParams = useCallback((next, nextSource, scenario) => {
    setParams(current => ({ ...current, ...next }));
    if (scenario !== undefined) setCustomScenario(scenario);
    setSource(nextSource);
  }, []);

  /** Replace only the emissions/forcing scenario — used when a CSV is uploaded. */
  const loadScenario = useCallback((scenario, nextSource) => {
    setCustomScenario(scenario);
    setParams(current => ({
      ...current,
      run: {
        ...current.run,
        emissionsScenario: "CUSTOM",
        otherRfScenario:
          scenario.otherRf && scenario.otherRf.some(v => v !== 0)
            ? "CUSTOM"
            : current.run.otherRfScenario
      }
    }));
    setSource(nextSource);
  }, []);

  /** Open the dashboards on the bundled example dataset, no upload required. */
  const useExample = useCallback(() => {
    setSource({ kind: "example", name: null });
  }, []);

  /** Back to the workbook's shipped values, staying inside the dashboards. */
  const reset = useCallback(() => {
    setParams(cloneDefaults());
    setCustomScenario(null);
    setSource({ kind: "example", name: null });
  }, []);

  /** Forget everything, including saved state, and return to the welcome screen. */
  const unload = useCallback(() => {
    setParams(cloneDefaults());
    setCustomScenario(null);
    setSource({ kind: "none", name: null });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Nothing to clean up if storage is unavailable.
    }
  }, []);

  const isDefault = useMemo(() => {
    const defaults = cloneDefaults();
    return group => JSON.stringify(getPath(params, group)) === JSON.stringify(getPath(defaults, group));
  }, [params]);

  const value = useMemo(
    () => ({
      params,
      setParam,
      getParam,
      loadParams,
      loadScenario,
      reset,
      unload,
      useExample,
      isDefault,
      outputs,
      statics,
      source,
      dataLoaded: source.kind !== "none",
      customScenario
    }),
    [params, setParam, getParam, loadParams, loadScenario, reset, unload, useExample, isDefault, outputs, source, customScenario]
  );

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useModel() {
  const context = useContext(ModelContext);
  if (!context) throw new Error("useModel must be used inside a ModelProvider");
  return context;
}

export default ModelContext;
