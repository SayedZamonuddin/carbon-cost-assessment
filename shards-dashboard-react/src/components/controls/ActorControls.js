import React from "react";
import PropTypes from "prop-types";

import ControlCard from "./ControlCard";
import NumberField from "./NumberField";
import { useModel } from "../../store/ModelContext";

/**
 * The nine policy controls for one actor. Both actors get an identical card so their
 * settings can be compared line for line.
 */
const ActorControls = ({ actorKey, title, subtitle }) => {
  const { params, setParam, isDefault } = useModel();
  const actor = params.policy[actorKey];
  const path = field => `policy.${actorKey}.${field}`;
  const set = field => value => setParam(path(field), value);

  // The MACC calibration solves for a curve through the two cost anchors and is only
  // defined for cost100 > cost50; letting the sliders cross would turn every chart into
  // NaN. Nudging one anchor pushes against the other instead of inverting.
  const setCost50 = value => setParam(path("cost50"), Math.min(value, actor.cost100 / 1.05));
  const setCost100 = value => setParam(path("cost100"), Math.max(value, actor.cost50 * 1.05));

  return (
    <ControlCard title={title} subtitle={subtitle} modified={!isDefault(`policy.${actorKey}`)}>
      <NumberField
        label="Policy start year"
        value={actor.startYear}
        onChange={set("startYear")}
        min={1990}
        max={2100}
        step={1}
      />
      <div className="field-group">
        <span className="field-group__title">Carbon price path ($/tCO₂)</span>
        <NumberField
          label="Price in 2035"
          value={actor.price2035}
          onChange={set("price2035")}
          min={0}
          max={300}
          step={5}
          unit="$"
        />
        <NumberField
          label="Price in 2060"
          value={actor.price2060}
          onChange={set("price2060")}
          min={0}
          max={800}
          step={10}
          unit="$"
        />
        <NumberField
          label="Price in 2100"
          value={actor.price2100}
          onChange={set("price2100")}
          min={0}
          max={2000}
          step={25}
          unit="$"
        />
      </div>
      <div className="field-group">
        <span className="field-group__title">Abatement cost anchors ($/tCO₂)</span>
        <NumberField
          label="Cost to abate 50%"
          value={actor.cost50}
          onChange={setCost50}
          min={5}
          max={600}
          step={5}
          unit="$"
        />
        <NumberField
          label="Cost to abate 100%"
          value={actor.cost100}
          onChange={setCost100}
          min={10}
          max={2000}
          step={10}
          unit="$"
        />
      </div>
      <NumberField
        label="Maximum abatement fraction"
        hint="above 1 allows net removal"
        value={actor.maxAbatement}
        onChange={set("maxAbatement")}
        min={1.05}
        max={2.5}
        step={0.05}
      />
      <NumberField
        label="Mitigation participation rate"
        value={actor.participation}
        onChange={set("participation")}
        min={0}
        max={1}
        step={0.01}
        unit="%"
        percent
      />
      <NumberField
        label="CH₄ abatement over 30 years"
        value={actor.ch4Abatement}
        onChange={set("ch4Abatement")}
        min={0}
        max={1}
        step={0.01}
        unit="%"
        percent
      />
    </ControlCard>
  );
};

ActorControls.propTypes = {
  actorKey: PropTypes.oneOf(["annexI", "nonAnnexI"]).isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string
};

export default ActorControls;
