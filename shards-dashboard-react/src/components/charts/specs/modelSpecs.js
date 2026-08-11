// The five charts of the Clim Model Dash, matching the workbook's chart10..chart14.
//
// Several charts put gases of very different magnitude on one axis. The workbook solves
// this by scaling CH4 and N2O by 1/10, and that is kept here — one shared axis rather than
// a second y-scale, with the true value restored in tooltips and the table view.

import { C_TO_CO2, N2_TO_N2O } from "../../../model/constants";
import { AQUA, BLUE, ORANGE, ROLE, SLATE, VIOLET } from "../palette";
import { points } from "./helpers";

/** Every series the "Select outputs to display" chart can show. */
export function outputOptions({ policy, statics }, window) {
  const w = window;
  return [
    {
      key: "conc-co2",
      group: "Concentrations",
      label: "CO₂ concentration",
      color: BLUE,
      unit: " ppm",
      data: () => points(policy.co2.conc, w)
    },
    {
      key: "conc-ch4",
      group: "Concentrations",
      label: "CH₄ concentration (÷10)",
      color: ORANGE,
      unit: " ppb",
      tooltipScale: 10,
      data: () => points(policy.ch4.conc, w, 0.1)
    },
    {
      key: "conc-n2o",
      group: "Concentrations",
      label: "N₂O concentration (÷10)",
      color: AQUA,
      unit: " ppb",
      tooltipScale: 10,
      data: () => points(policy.n2o.conc, w, 0.1)
    },
    {
      key: "ems-co2",
      group: "Emissions",
      label: "CO₂ emissions",
      color: BLUE,
      unit: " GtCO₂/yr",
      data: () => points(policy.co2.ems, w, C_TO_CO2)
    },
    {
      key: "ems-ch4",
      group: "Emissions",
      label: "CH₄ emissions (÷10)",
      color: ORANGE,
      unit: " MtCH₄/yr",
      tooltipScale: 10,
      data: () => points(policy.ch4.ems, w, 0.1)
    },
    {
      key: "ems-n2o",
      group: "Emissions",
      label: "N₂O emissions",
      color: AQUA,
      unit: " MtN₂O/yr",
      data: () => points(policy.n2o.ems, w, N2_TO_N2O)
    },
    {
      key: "cum-co2",
      group: "Cumulative emissions",
      label: "Cumulative CO₂",
      color: VIOLET,
      unit: " GtCO₂",
      data: () => points(policy.co2.cumEms, w, C_TO_CO2)
    },
    {
      key: "cum-ch4",
      group: "Cumulative emissions",
      label: "Cumulative CH₄ (÷10)",
      color: ORANGE,
      unit: " MtCH₄",
      tooltipScale: 10,
      data: () => points(policy.ch4.cumEms, w, 0.1)
    },
    {
      key: "cum-n2o",
      group: "Cumulative emissions",
      label: "Cumulative N₂O",
      color: AQUA,
      unit: " MtN₂O",
      data: () => points(policy.n2o.cumEms, w, N2_TO_N2O)
    },
    {
      key: "lifetime-ch4",
      group: "Other",
      label: "CH₄ lifetime",
      color: SLATE,
      unit: " years",
      data: () => points(policy.ch4.lifetime, w)
    },
    {
      key: "cmip5-26",
      group: "Other",
      label: "CMIP5 RCP2.6 warming",
      color: ROLE.contextCool,
      unit: " °C",
      data: () => points(statics.observations.cmip5rcp26, w)
    },
    {
      key: "cmip5-85",
      group: "Other",
      label: "CMIP5 RCP8.5 warming",
      color: ROLE.contextWarm,
      unit: " °C",
      data: () => points(statics.observations.cmip5rcp85, w)
    }
  ];
}

export default function buildModelSpecs({ outputs, statics, window, selectedOutputs }) {
  const { policy } = outputs;
  const w = window;
  const obs = statics.observations;

  const options = outputOptions({ policy, statics }, w);
  const chosen = options.filter(option => selectedOutputs.includes(option.key));

  return [
    {
      id: "outputs",
      xRange: w,
      title: "Select outputs to display",
      shortTitle: "Custom outputs",
      yLabel: "Value (see legend for units)",
      xLabel: "Year",
      note:
        "Pick any combination of model outputs. Series marked ÷10 are scaled to share the axis; tooltips and the table show true values.",
      series: chosen.length
        ? chosen.map(option => ({
            label: option.label,
            color: option.color,
            width: 2,
            unit: option.unit,
            tooltipScale: option.tooltipScale,
            data: option.data()
          }))
        : []
    },
    {
      id: "model-temp",
      xRange: w,
      title: "TEMPERATURE vs. 1850-1900 (°C)",
      shortTitle: "Temperature",
      yLabel: "°C above 1850-1900",
      xLabel: "Year",
      note:
        "Total warming and the contribution of each forcing agent, against the observed record and the CMIP5 multi-model means.",
      series: [
        { label: "Total", color: SLATE, width: 2.5, data: points(policy.tempRel, w), unit: " °C" },
        { label: "CO₂", color: BLUE, data: points(policy.split.co2, w), unit: " °C" },
        { label: "CH₄", color: ORANGE, data: points(policy.split.ch4, w), unit: " °C" },
        { label: "N₂O", color: AQUA, data: points(policy.split.n2o, w), unit: " °C" },
        { label: "Other forcing", color: VIOLET, data: points(policy.split.other, w), unit: " °C" },
        {
          label: "Observed (HadCRUT)",
          color: ROLE.observations,
          showLine: false,
          pointRadius: 1.6,
          endLabel: false,
          data: points(obs.hadcrut, w),
          unit: " °C"
        },
        {
          label: "CMIP5 RCP2.6",
          color: ROLE.contextCool,
          width: 1.5,
          endLabel: false,
          data: points(obs.cmip5rcp26, w),
          unit: " °C"
        },
        {
          label: "CMIP5 RCP8.5",
          color: ROLE.contextWarm,
          width: 1.5,
          endLabel: false,
          data: points(obs.cmip5rcp85, w),
          unit: " °C"
        }
      ]
    },
    {
      id: "model-rf",
      xRange: w,
      title: "RADIATIVE FORCING (Wm⁻²)",
      shortTitle: "Radiative forcing",
      yLabel: "W m⁻²",
      xLabel: "Year",
      zeroLine: true,
      series: [
        { label: "Total", color: SLATE, width: 2.5, data: points(policy.rfTotal, w), unit: " W/m²" },
        { label: "CO₂", color: BLUE, data: points(policy.co2.rf, w), unit: " W/m²" },
        { label: "CH₄", color: ORANGE, data: points(policy.ch4.rf, w), unit: " W/m²" },
        { label: "N₂O", color: AQUA, data: points(policy.n2o.rf, w), unit: " W/m²" },
        {
          label: "Other forcing",
          color: VIOLET,
          data: points(policy.rfOther, w),
          unit: " W/m²"
        }
      ]
    },
    {
      id: "model-conc",
      xRange: w,
      title: "CONCENTRATIONS (ppm / 0.1× ppb / 0.1× ppb)",
      shortTitle: "Concentrations",
      yLabel: "ppm, or ppb ÷ 10",
      xLabel: "Year",
      note: "CH₄ and N₂O are scaled by 1/10 to share the axis; tooltips show true ppb.",
      series: [
        { label: "CO₂", color: BLUE, width: 2.5, data: points(policy.co2.conc, w), unit: " ppm" },
        {
          label: "CH₄ (÷10)",
          color: ORANGE,
          tooltipScale: 10,
          data: points(policy.ch4.conc, w, 0.1),
          unit: " ppb"
        },
        {
          label: "N₂O (÷10)",
          color: AQUA,
          tooltipScale: 10,
          data: points(policy.n2o.conc, w, 0.1),
          unit: " ppb"
        }
      ]
    },
    {
      id: "model-ems",
      xRange: w,
      title: "EMISSIONS (GtCO₂ / 0.1× MtCH₄ / MtN₂O per year)",
      shortTitle: "Emissions",
      yLabel: "GtCO₂, MtCH₄ ÷ 10, MtN₂O",
      xLabel: "Year",
      zeroLine: true,
      note: "CH₄ is scaled by 1/10 to share the axis; tooltips show true MtCH₄.",
      series: [
        {
          label: "CO₂",
          color: BLUE,
          width: 2.5,
          data: points(policy.co2.ems, w, C_TO_CO2),
          unit: " GtCO₂"
        },
        {
          label: "CH₄ (÷10)",
          color: ORANGE,
          tooltipScale: 10,
          data: points(policy.ch4.ems, w, 0.1),
          unit: " MtCH₄"
        },
        {
          label: "N₂O",
          color: AQUA,
          data: points(policy.n2o.ems, w, N2_TO_N2O),
          unit: " MtN₂O"
        }
      ]
    }
  ];
}
