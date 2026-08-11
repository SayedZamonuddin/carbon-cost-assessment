import React, { useMemo, useState } from "react";
import { Container } from "shards-react";

import ChartGallery from "../components/charts/ChartGallery";
import buildModelSpecs, { outputOptions } from "../components/charts/specs/modelSpecs";
import { BLUE, ORANGE } from "../components/charts/palette";
import StatTile from "../components/common/StatTile";
import RunControls from "../components/controls/RunControls";
import { useModel } from "../store/ModelContext";
import Welcome from "./Welcome";

const DEFAULT_OUTPUTS = ["conc-co2", "conc-ch4", "conc-n2o"];

/** Checkbox chips driving the "Select outputs to display" chart. */
const OutputPicker = ({ options, selected, onToggle }) => {
  const groups = options.reduce((acc, option) => {
    (acc[option.group] = acc[option.group] || []).push(option);
    return acc;
  }, {});

  return (
    <div className="output-picker">
      {Object.keys(groups).map(group => (
        <div key={group} className="output-picker__group">
          <span className="output-picker__title">{group}</span>
          <div className="output-picker__chips">
            {groups[group].map(option => {
              const active = selected.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`chip${active ? " chip--active" : ""}`}
                  onClick={() => onToggle(option.key)}
                  aria-pressed={active}
                  style={active ? { borderColor: option.color, color: option.color } : undefined}
                >
                  <span className="chip__dot" style={{ backgroundColor: option.color }} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const ModelDash = () => {
  const { outputs, statics, params, dataLoaded } = useModel();
  const { kpis, policy } = outputs;
  const [selectedOutputs, setSelectedOutputs] = useState(DEFAULT_OUTPUTS);

  const window = [params.display.windowFrom, params.display.windowTo];

  const specs = useMemo(
    () => buildModelSpecs({ outputs, statics, window, selectedOutputs }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outputs, statics, window[0], window[1], selectedOutputs]
  );

  const options = useMemo(
    () => outputOptions({ policy, statics }, window),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policy, statics, window[0], window[1]]
  );

  const toggleOutput = key =>
    setSelectedOutputs(current =>
      current.includes(key) ? current.filter(k => k !== key) : [...current, key]
    );

  const picker = (
    <OutputPicker options={options} selected={selectedOutputs} onToggle={toggleOutput} />
  );

  if (!dataLoaded) return <Welcome />;

  return (
    <Container fluid className="dash">
      <div className="figures">
        <StatTile
          tone={BLUE}
          label="Diagnosed TCRE"
          value={kpis.tcre.toFixed(2)}
          unit="°C/TtC"
          detail="Warming per trillion tonnes of carbon emitted"
        />
        <StatTile
          tone={ORANGE}
          label="Anthropogenic warming in 2018"
          value={kpis.warming2018.toFixed(2)}
          unit="°C"
          detail={`Relative to ${params.display.refFrom}–${params.display.refTo}`}
        />
        <StatTile
          tone={ORANGE}
          label="Peak warming"
          value={kpis.peakWarming.toFixed(2)}
          unit="°C"
          detail={`ECS ${params.run.ecs} °C · TCR ${params.run.tcr} °C`}
        />
        <StatTile
          tone={BLUE}
          label="CO₂ net zero"
          value={kpis.netZeroYear || "Not reached"}
          detail={
            kpis.netZeroYear
              ? "First year world CO₂ emissions reach zero"
              : `Emissions stay positive to ${params.display.windowTo}`
          }
        />
      </div>

      <ChartGallery specs={specs} storageKey="model" focusExtras={{ outputs: picker }} />

      <div className="controls-header">
        <div>
          <h2>Model run controls</h2>
          <p>
            The scenario and climate sensitivity drive every chart on both dashboards.
          </p>
        </div>
      </div>

      <div className="controls-grid controls-grid--narrow">
        <RunControls showDisplay />
      </div>
    </Container>
  );
};

export default ModelDash;
