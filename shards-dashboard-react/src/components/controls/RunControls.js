import React from "react";
import PropTypes from "prop-types";

import ControlCard from "./ControlCard";
import NumberField from "./NumberField";
import { useModel } from "../../store/ModelContext";
import { EMISSION_SCENARIOS, OTHER_RF_SCENARIOS } from "../../model/constants";

/** Scenario choice, climate sensitivity and the chart window. Shared by both dashboards. */
const RunControls = ({ showDisplay }) => {
  const { params, setParam, isDefault, customScenario } = useModel();
  const { run, display } = params;
  // Only the RCP scenarios ship a forcing table; for the rest, picking one of its
  // columns resolves to zero (the workbook's IFERROR does the same, silently).
  const hasRfTable = ["RCP3PD", "RCP45", "RCP6", "RCP85"].includes(run.emissionsScenario);

  return (
    <ControlCard
      title="Model run"
      subtitle="Scenario, sensitivity and chart window"
      modified={!isDefault("run") || !isDefault("display")}
    >
      <label className="field">
        <span className="field__label">Emissions scenario</span>
        <select
          className="field__select"
          value={run.emissionsScenario}
          onChange={event => {
            const next = event.target.value;
            setParam("run.emissionsScenario", next);
            // A forcing column only exists for RCP scenarios; don't leave the run
            // pointing at a table the new scenario doesn't have.
            const nextHasTable = ["RCP3PD", "RCP45", "RCP6", "RCP85"].includes(next);
            if (!nextHasTable && !["NONE", "CUSTOM"].includes(run.otherRfScenario)) {
              setParam("run.otherRfScenario", "NONE");
            }
          }}
        >
          {EMISSION_SCENARIOS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.value === "CUSTOM" && customScenario ? " — uploaded" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">
          Non-GHG forcing
          <span className="field__hint">
            {hasRfTable
              ? "from the scenario's own forcing table"
              : "this scenario has no forcing table — only None or uploaded data apply"}
          </span>
        </span>
        <select
          className="field__select"
          value={run.otherRfScenario}
          onChange={event => setParam("run.otherRfScenario", event.target.value)}
        >
          {OTHER_RF_SCENARIOS.map(option => {
            const needsTable = !["NONE", "CUSTOM"].includes(option.value);
            return (
              <option
                key={option.value}
                value={option.value}
                disabled={needsTable && !hasRfTable}
              >
                {option.label}
              </option>
            );
          })}
        </select>
      </label>

      <NumberField
        label="Equilibrium climate sensitivity (ECS)"
        value={run.ecs}
        onChange={v => setParam("run.ecs", v)}
        min={1.5}
        max={6}
        step={0.1}
        unit="°C"
      />
      <NumberField
        label="Transient climate response (TCR)"
        value={run.tcr}
        onChange={v => setParam("run.tcr", v)}
        min={0.8}
        max={3.2}
        step={0.1}
        unit="°C"
      />

      {showDisplay && (
        <label className="switch switch--field">
          <input
            type="checkbox"
            checked={run.policyOn}
            onChange={event => setParam("run.policyOn", event.target.checked)}
          />
          <span className="switch__track" aria-hidden="true" />
          <span className="switch__label">
            Climate policy {run.policyOn ? "on" : "off"}
            <small>same switch as the policy dashboard</small>
          </span>
        </label>
      )}

      {showDisplay && (
        <div className="field-group">
          <span className="field-group__title">Chart window</span>
          <NumberField
            label="From year"
            value={display.windowFrom}
            onChange={v => setParam("display.windowFrom", Math.min(v, display.windowTo - 10))}
            min={1765}
            max={2100}
            step={5}
          />
          <NumberField
            label="To year"
            value={display.windowTo}
            onChange={v => setParam("display.windowTo", Math.max(v, display.windowFrom + 10))}
            min={1800}
            max={2150}
            step={5}
          />
          <span className="field-group__title">Temperature reference period</span>
          <NumberField
            label="Reference from"
            value={display.refFrom}
            onChange={v => setParam("display.refFrom", Math.min(v, display.refTo - 5))}
            min={1765}
            max={2000}
            step={5}
          />
          <NumberField
            label="Reference to"
            value={display.refTo}
            onChange={v => setParam("display.refTo", Math.max(v, display.refFrom + 5))}
            min={1800}
            max={2020}
            step={5}
          />
        </div>
      )}
    </ControlCard>
  );
};

RunControls.propTypes = { showDisplay: PropTypes.bool };
RunControls.defaultProps = { showDisplay: false };

export default RunControls;
