import React from "react";

import ControlCard from "./ControlCard";
import NumberField from "./NumberField";
import { useModel } from "../../store/ModelContext";

/** Damage-function calibration and the world-economy assumptions behind every cost. */
const EconomyControls = () => {
  const { params, setParam, isDefault } = useModel();
  const { damage, economy } = params;

  return (
    <ControlCard
      title="Climate damage & world economy"
      subtitle="What warming costs, and what it is a share of"
      modified={!isDefault("damage") || !isDefault("economy")}
    >
      <div className="field-group">
        <span className="field-group__title">Damage function anchors (% of GWP)</span>
        <NumberField
          label="Damage at 1 °C"
          value={damage.damageAt1C}
          onChange={v => setParam("damage.damageAt1C", v)}
          min={0.0001}
          max={0.2}
          step={0.0001}
          unit="%"
          percent
        />
        <NumberField
          label="Damage at 6 °C"
          value={damage.damageAt6C}
          onChange={v => setParam("damage.damageAt6C", v)}
          min={0.05}
          max={0.95}
          step={0.01}
          unit="%"
          percent
        />
      </div>

      <div className="field-group">
        <span className="field-group__title">Gross world product</span>
        <NumberField
          label="GWP reference year"
          value={economy.gwpValueYear}
          onChange={v => setParam("economy.gwpValueYear", v)}
          min={1990}
          max={2050}
          step={1}
        />
        <NumberField
          label="GWP in that year"
          value={economy.gwp / 1e12}
          onChange={v => setParam("economy.gwp", v * 1e12)}
          min={10}
          max={400}
          step={1}
          unit="T$"
        />
        <NumberField
          label="Initial growth rate"
          value={economy.initialGrowthRate}
          onChange={v => setParam("economy.initialGrowthRate", v)}
          min={0}
          max={0.08}
          step={0.0001}
          unit="%"
          percent
        />
        <NumberField
          label="Growth decline per year"
          hint="negative slows growth"
          value={economy.growthDecline}
          onChange={v => setParam("economy.growthDecline", v)}
          min={-0.0005}
          max={0}
          step={0.000001}
        />
      </div>

      <div className="field-group">
        <span className="field-group__title">Discounting</span>
        <NumberField
          label="Absolute discount rate"
          value={economy.discountRate}
          onChange={v => setParam("economy.discountRate", v)}
          min={0}
          max={0.1}
          step={0.001}
          unit="%"
          percent
        />
        <NumberField
          label="Present / discount year"
          value={economy.discountYear}
          onChange={v => setParam("economy.discountYear", v)}
          min={2000}
          max={2100}
          step={1}
        />
        <NumberField
          label="Final year for total costs"
          value={economy.finalCostYear}
          onChange={v => setParam("economy.finalCostYear", v)}
          min={2050}
          max={2150}
          step={5}
        />
      </div>
    </ControlCard>
  );
};

export default EconomyControls;
