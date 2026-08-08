// Carbon-price paths and the marginal abatement cost curve that turns a price into an
// emissions-reduction fraction. Ports 'Data Annex I'!B4 / C4 and the MACC calibration in
// 'Clim Policy Dash'!K6:M6.

import { N_YEARS, YEAR_START } from "./constants";

/**
 * Calibrate the marginal abatement cost curve from the two cost anchors the user edits.
 *
 * The curve is  abatement(price) = C1 / (1 + C2 * price^shape)  with a negative shape,
 * fitted so that a price of `cost50` abates 50% of baseline emissions and `cost100`
 * abates 100%. `maxAbatement` above 1 permits net-negative emissions.
 */
export function maccParams({ cost50, cost100, maxAbatement }) {
  const shape =
    (Math.log(0.5 * (maxAbatement - 1)) - Math.log(maxAbatement - 0.5)) /
    (Math.log(cost100) - Math.log(cost50));
  return {
    shape,
    c1: maxAbatement,
    c2: (maxAbatement - 1) / Math.pow(cost100, shape)
  };
}

/**
 * Carbon price in year `year` for one actor: zero until the start year, then piecewise
 * linear through the 2035/2060/2100 anchors and flat thereafter. Clamped to
 * [0, price2100] exactly as the workbook's MIN(MAX(...)) wrapper does.
 */
export function carbonPrice(year, p) {
  const { startYear, price2035, price2060, price2100 } = p;
  let value;
  if (year < startYear + 1) {
    value = 0;
  } else if (year < 2035) {
    value = price2035 * (1 - (2035 - year) / (2035 - startYear));
  } else if (year < 2060 && startYear < 2035) {
    value = price2035 + (price2060 - price2035) * (1 - (2060 - year) / 25);
  } else if (year < 2060 && startYear < 2061) {
    value = price2060 * (1 - (2060 - year) / (2060 - startYear));
  } else if (year < 2100 && startYear < 2061) {
    value = price2060 + (price2100 - price2060) * (1 - (2100 - year) / 40);
  } else if (year < 2100 && startYear < 2101) {
    value = price2100 * (1 - (2100 - year) / (2100 - startYear));
  } else {
    value = price2060 + (price2100 - price2060) * (1 - (2100 - year) / 40);
  }
  return Math.min(Math.max(value, 0), price2100);
}

/**
 * Fraction of baseline CO2 emissions that remains after abatement (1 = no abatement,
 * below 0 = net removal). The 1e-30 floor mirrors the workbook and keeps price^shape
 * finite at a zero price, where `shape` is negative.
 */
export function remainingFraction(price, p, macc) {
  return (
    1 -
    (p.participation * macc.c1) /
      (1 + macc.c2 * Math.pow(price + 1e-30, macc.shape))
  );
}

/** Cost of the marginal tonne at a given abatement rate — the MACC chart's y value. */
export function marginalCost(abatement, p, macc) {
  return Math.pow(
    (p.maxAbatement - abatement) / (macc.c2 * abatement),
    1 / macc.shape
  );
}

/** 140-point marginal abatement cost curve for one actor. */
export function maccCurve(p) {
  const macc = maccParams(p);
  const points = [];
  for (let k = 1; k <= 140; k += 1) {
    const abatement = (k * p.maxAbatement) / 140;
    points.push({ x: abatement * 100, y: marginalCost(abatement, p, macc) });
  }
  return points;
}

/**
 * CH4 emissions fraction remaining: a linear phase-down of `ch4Abatement` spread over the
 * 30 years following the discount year, then held flat (workbook CH4!M12).
 */
export function ch4RemainingFraction(year, ch4Abatement, discountYear) {
  return Math.max(
    Math.min(1 - ((year - discountYear) * ch4Abatement) / 30, 1),
    1 - ch4Abatement
  );
}

/**
 * Per-year price and abatement paths for one actor.
 * `policyOn` false yields a zero price and no abatement, which drives the baseline run.
 */
export function actorPolicyPath(actorParams, { policyOn, discountYear }) {
  const macc = maccParams(actorParams);
  const price = new Float64Array(N_YEARS);
  const co2Remaining = new Float64Array(N_YEARS);
  const ch4Remaining = new Float64Array(N_YEARS);
  for (let i = 0; i < N_YEARS; i += 1) {
    const year = YEAR_START + i;
    if (!policyOn) {
      price[i] = 0;
      co2Remaining[i] = 1;
      ch4Remaining[i] = 1;
      continue;
    }
    price[i] = carbonPrice(year, actorParams);
    co2Remaining[i] = remainingFraction(price[i], actorParams, macc);
    ch4Remaining[i] = ch4RemainingFraction(
      year,
      actorParams.ch4Abatement,
      discountYear
    );
  }
  return { macc, price, co2Remaining, ch4Remaining };
}
