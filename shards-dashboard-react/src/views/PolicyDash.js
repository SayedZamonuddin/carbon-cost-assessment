import React, { useMemo } from "react";
import { Container } from "shards-react";

import ChartGallery from "../components/charts/ChartGallery";
import buildPolicySpecs from "../components/charts/specs/policySpecs";
import StatTile from "../components/common/StatTile";
import ActorControls from "../components/controls/ActorControls";
import EconomyControls from "../components/controls/EconomyControls";
import RunControls from "../components/controls/RunControls";
import { formatSigned } from "../components/charts/format";
import { BLUE, ORANGE, VIOLET } from "../components/charts/palette";
import { useModel } from "../store/ModelContext";
import Welcome from "./Welcome";

const PolicyDash = () => {
  const { outputs, statics, params, setParam, reset, source, dataLoaded } = useModel();
  const { kpis } = outputs;

  const window = [params.display.windowFrom, params.display.windowTo];
  const specs = useMemo(
    () => buildPolicySpecs({ outputs, statics, params, window }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outputs, statics, params, window[0], window[1]]
  );

  const avoidedWarming = kpis.warming2100 - kpis.baselineWarming2100;
  const avoidedDamage = (kpis.damage2100 - kpis.baselineDamage2100) * 100;
  const policyOn = params.run.policyOn;

  if (!dataLoaded) return <Welcome />;

  return (
    <Container fluid className="dash">
      <div className="figures">
        <StatTile
          tone={ORANGE}
          label="Warming in 2100"
          value={kpis.warming2100.toFixed(2)}
          unit="°C"
          delta={
            policyOn
              ? {
                  text: `${formatSigned(avoidedWarming, 2, " °C")}`,
                  direction: avoidedWarming < 0 ? "down" : avoidedWarming > 0 ? "up" : "neutral"
                }
              : null
          }
          deltaLabel="vs no policy"
          detail={`Peaks at ${kpis.peakWarming.toFixed(2)} °C`}
        />
        <StatTile
          tone={VIOLET}
          label="Climate damage in 2100"
          value={(kpis.damage2100 * 100).toFixed(2)}
          unit="% of GWP"
          delta={
            policyOn
              ? {
                  text: `${formatSigned(avoidedDamage, 2, " pts")}`,
                  direction: avoidedDamage < 0 ? "down" : avoidedDamage > 0 ? "up" : "neutral"
                }
              : null
          }
          deltaLabel="vs no policy"
        />
        <StatTile
          tone={BLUE}
          label={`Total cost to ${params.economy.finalCostYear}`}
          value={`$${kpis.totalCost.toFixed(0)}`}
          unit="T"
          detail={`${kpis.totalDamage.toFixed(0)}T damage · ${kpis.totalMitigation.toFixed(
            0
          )}T mitigation`}
        />
        <StatTile
          tone={BLUE}
          label={`Discounted to ${params.economy.discountYear}`}
          value={`$${kpis.discountedCost.toFixed(0)}`}
          unit="T"
          detail={`${kpis.discountedDamage.toFixed(
            0
          )}T damage · ${kpis.discountedMitigation.toFixed(0)}T mitigation`}
        />
      </div>

      <ChartGallery specs={specs} storageKey="policy" />

      <div className="controls-header">
        <div>
          <h2>Climate policy controls</h2>
          <p>
            Every field below feeds the model directly — charts and headline figures update
            as you change them.
            {["workbook", "csv"].includes(source.kind) &&
              " Values were loaded from your file and remain editable."}
          </p>
        </div>
        <div className="controls-header__actions">
          <label className="switch">
            <input
              type="checkbox"
              checked={policyOn}
              onChange={event => setParam("run.policyOn", event.target.checked)}
            />
            <span className="switch__track" aria-hidden="true" />
            <span className="switch__label">Policy {policyOn ? "on" : "off"}</span>
          </label>
          <button type="button" className="button button--small" onClick={reset}>
            Reset to defaults
          </button>
        </div>
      </div>

      <div className="controls-grid">
        <ActorControls
          actorKey="annexI"
          title="Annex I"
          subtitle="Developed countries"
        />
        <ActorControls
          actorKey="nonAnnexI"
          title="Non-Annex I"
          subtitle="Developing countries"
        />
        <EconomyControls />
        <RunControls />
      </div>
    </Container>
  );
};

export default PolicyDash;
