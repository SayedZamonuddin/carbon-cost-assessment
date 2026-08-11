// The nine charts of the Clim Policy Dash, matching the workbook's chart1..chart9.

import { C_TO_CO2 } from "../../../model/constants";
import { damageCurve } from "../../../model/economics";
import { maccCurve } from "../../../model/policy";
import { AQUA, BLUE, ORANGE, ROLE, SLATE, VIOLET, baselineStyle } from "../palette";
import { costWindow, points } from "./helpers";

const TRILLION = 1 / 1e12;

export default function buildPolicySpecs({ outputs, statics, params, window }) {
  const { policy, baseline, economics, kpis } = outputs;
  const w = window;
  const cw = costWindow(window);
  const obs = statics.observations;

  return [
    {
      id: "temperature",
      xRange: w,
      title: "Global average surface temperature relative to 1850-1900 (°C)",
      shortTitle: "Temperature",
      yLabel: "°C above 1850-1900",
      xLabel: "Year",
      unit: " °C",
      note:
        "Modelled warming under the current policy, against the no-policy counterfactual and the CMIP5 multi-model means for RCP2.6 and RCP8.5.",
      series: [
        { label: "With policy", color: SLATE, width: 2.5, data: points(policy.tempRel, w), unit: " °C" },
        {
          label: "No policy",
          ...baselineStyle(SLATE),
          data: points(baseline.tempRel, w),
          unit: " °C"
        },
        {
          label: "CMIP5 RCP2.6",
          color: ROLE.contextCool,
          width: 1.5,
          data: points(obs.cmip5rcp26, w),
          unit: " °C"
        },
        {
          label: "CMIP5 RCP8.5",
          color: ROLE.contextWarm,
          width: 1.5,
          data: points(obs.cmip5rcp85, w),
          unit: " °C"
        }
      ]
    },
    {
      id: "co2-emissions",
      xRange: w,
      title: "CO2 emissions (Billion tonnes per year)",
      shortTitle: "CO₂ emissions",
      yLabel: "GtCO₂ per year",
      xLabel: "Year",
      zeroLine: true,
      note:
        "World emissions split between the two actors. Values below zero are net removals, which the abatement curve permits once the maximum abatement fraction exceeds 1.",
      series: [
        {
          label: "World",
          color: SLATE,
          width: 2.5,
          data: points(policy.co2.ems, w, C_TO_CO2),
          unit: " GtCO₂"
        },
        {
          label: "Annex I",
          color: ORANGE,
          data: points(policy.co2.emsAnnexI, w, C_TO_CO2),
          unit: " GtCO₂"
        },
        {
          label: "Non-Annex I",
          color: AQUA,
          data: points(policy.co2.emsNonAnnexI, w, C_TO_CO2),
          unit: " GtCO₂"
        },
        {
          label: "Baseline",
          ...baselineStyle(SLATE),
          data: points(baseline.co2.ems, w, C_TO_CO2),
          unit: " GtCO₂"
        }
      ]
    },
    {
      id: "co2-concentration",
      xRange: w,
      title: "CO2 concentrations (ppm)",
      shortTitle: "CO₂ concentration",
      yLabel: "ppm",
      xLabel: "Year",
      series: [
        { label: "With policy", color: BLUE, width: 2.5, data: points(policy.co2.conc, w), unit: " ppm" },
        {
          label: "No policy",
          ...baselineStyle(BLUE),
          data: points(baseline.co2.conc, w),
          unit: " ppm"
        }
      ]
    },
    {
      id: "carbon-price",
      xRange: w,
      title: "Carbon price ($/tCO2)",
      shortTitle: "Carbon price",
      yLabel: "$ per tCO₂",
      xLabel: "Year",
      note:
        "Each actor's price ramps from zero at its start year through the 2035, 2060 and 2100 anchors, then stays flat.",
      series: [
        {
          label: "Annex I",
          color: ORANGE,
          width: 2.5,
          data: points(economics.annexI.price, w),
          unit: " $/tCO₂"
        },
        {
          label: "Non-Annex I",
          color: AQUA,
          width: 2.5,
          data: points(economics.nonAnnexI.price, w),
          unit: " $/tCO₂"
        }
      ]
    },
    {
      id: "macc",
      title: "Marginal Abatement Cost ($/tCO2)",
      shortTitle: "Abatement cost",
      yLabel: "$ per tCO₂",
      xLabel: "Abatement rate (% baseline)",
      xInteger: false,
      tooltipMode: "nearest",
      xLabelPrefix: "",
      // The curve is asymptotic at the maximum abatement fraction, so letting it set the
      // scale would flatten the entire priced range into the axis. Clip to a few multiples
      // of the 100% anchor, which keeps both anchors and the steep tail readable.
      yMax:
        5 * Math.max(params.policy.annexI.cost100, params.policy.nonAnnexI.cost100),
      yMin: 0,
      note:
        "The cost of the marginal tonne at each level of abatement, implied by the 50% and 100% cost anchors you set. Past 100% the curve prices net removal, rising steeply towards the maximum abatement fraction — the axis is clipped there.",
      series: [
        {
          label: "Annex I",
          color: ORANGE,
          width: 2.5,
          data: maccCurve(params.policy.annexI),
          unit: " $/tCO₂"
        },
        {
          label: "Non-Annex I",
          color: AQUA,
          width: 2.5,
          data: maccCurve(params.policy.nonAnnexI),
          unit: " $/tCO₂"
        }
      ]
    },
    {
      id: "damage-fn",
      title: "Net climate damages (% GWP)",
      shortTitle: "Damage function",
      yLabel: "% of gross world product",
      xLabel: "Global mean temperature increase (K)",
      xInteger: false,
      tooltipMode: "nearest",
      note:
        "Damage as a share of world output, calibrated through your two anchor points. The marker shows where this run lands in 2100.",
      series: [
        {
          label: "Damage function",
          color: BLUE,
          width: 2.5,
          data: damageCurve(params.damage),
          unit: "%"
        },
        {
          label: "This run, 2100",
          color: SLATE,
          showLine: false,
          pointRadius: 7,
          endLabel: false,
          data: [{ x: kpis.warming2100, y: kpis.damage2100 * 100 }],
          unit: "%"
        }
      ]
    },
    {
      id: "annual-costs",
      xRange: cw,
      title: "Annual costs (% GWP)",
      shortTitle: "Annual costs",
      yLabel: "% of gross world product",
      xLabel: "Year",
      series: [
        {
          label: "World mitigation",
          color: SLATE,
          width: 2.5,
          data: points(economics.world.fractionalMitigationCost, cw, 100),
          unit: "%"
        },
        {
          label: "Annex I mitigation",
          color: ORANGE,
          data: points(economics.annexI.fractionalMitigationCost, cw, 100),
          unit: "%"
        },
        {
          label: "Non-Annex I mitigation",
          color: AQUA,
          data: points(economics.nonAnnexI.fractionalMitigationCost, cw, 100),
          unit: "%"
        },
        {
          label: "Climate damage",
          color: VIOLET,
          width: 2.5,
          data: points(economics.world.damageFraction, cw, 100),
          unit: "%"
        },
        {
          label: "Damage, no policy",
          ...baselineStyle(VIOLET),
          data: points(economics.world.baselineDamageFraction, cw, 100),
          unit: "%"
        }
      ]
    },
    {
      id: "absolute-costs",
      xRange: cw,
      title: "Absolute costs (Trillion $/year)",
      shortTitle: "Absolute costs",
      yLabel: "Trillion $ per year",
      xLabel: "Year",
      series: [
        {
          label: "World mitigation",
          color: SLATE,
          width: 2.5,
          data: points(economics.world.mitigationCost, cw, TRILLION),
          unit: "T$"
        },
        {
          label: "Annex I mitigation",
          color: ORANGE,
          data: points(economics.annexI.mitigationCost, cw, TRILLION),
          unit: "T$"
        },
        {
          label: "Non-Annex I mitigation",
          color: AQUA,
          data: points(economics.nonAnnexI.mitigationCost, cw, TRILLION),
          unit: "T$"
        },
        {
          label: "Climate damage",
          color: VIOLET,
          width: 2.5,
          data: points(economics.world.totalDamage, cw, TRILLION),
          unit: "T$"
        },
        {
          label: "Damage, no policy",
          ...baselineStyle(VIOLET),
          data: points(economics.world.baselineTotalDamage, cw, TRILLION),
          unit: "T$"
        }
      ]
    },
    {
      id: "discounted-costs",
      xRange: cw,
      title: "Discounted costs (Trillion $/year)",
      shortTitle: "Discounted costs",
      yLabel: "Trillion $ per year, discounted",
      xLabel: "Year",
      note: `Discounted to ${params.economy.discountYear} at ${(
        params.economy.discountRate * 100
      ).toFixed(1)}% per year.`,
      series: [
        {
          label: "World mitigation",
          color: SLATE,
          width: 2.5,
          data: points(economics.world.discountedMitigationCost, cw, TRILLION),
          unit: "T$"
        },
        {
          label: "Annex I mitigation",
          color: ORANGE,
          data: points(economics.annexI.discountedMitigationCost, cw, TRILLION),
          unit: "T$"
        },
        {
          label: "Non-Annex I mitigation",
          color: AQUA,
          data: points(economics.nonAnnexI.discountedMitigationCost, cw, TRILLION),
          unit: "T$"
        },
        {
          label: "Climate damage",
          color: VIOLET,
          width: 2.5,
          data: points(economics.world.discountedDamage, cw, TRILLION),
          unit: "T$"
        },
        {
          label: "Damage, no policy",
          ...baselineStyle(VIOLET),
          data: points(economics.world.baselineDiscountedDamage, cw, TRILLION),
          unit: "T$"
        }
      ]
    }
  ];
}
