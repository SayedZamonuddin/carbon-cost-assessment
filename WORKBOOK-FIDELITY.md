# Workbook fidelity notes

The JavaScript engine in `shards-dashboard-react/src/model/` is a port of
`Oxford_Simple_IAM_3_two-actor_v1.8.xlsx`. `src/model/__tests__/golden.test.js` asserts it
against the values Excel itself computed and cached in that file: every series (carbon
cycle, forcing, temperature, attribution, prices, abatement, costs, damages, discounting)
matches to a relative tolerance of 1e-6, as do all ten headline outputs.

Reproducing a spreadsheet faithfully means reproducing its quirks. These are the ones that
mattered, recorded so nobody later "fixes" them by accident.

## 1. The reference period is 1851–1900, not 1850–1900

`RF & Temp!G12` computes the temperature anomaly with

```
TEMP - AVERAGE(OFFSET(TEMP_CALC[TEMP], MATCH(1850), 0, MATCH(1900) - MATCH(1850)))
```

`OFFSET` starts one row *past* the matched row, so with the shipped 1850/1900 settings the
average covers 1851–1900 (50 years). Every temperature-derived number in the workbook —
warming, damages, costs — inherits this offset of ≈0.00097 °C relative to a true 1850–1900
mean. `climate.js:referenceMean` reproduces it.

The "2018 anthropogenic warming" figure on the model dashboard is the exception: it uses
`AVERAGEIFS` over the reference period, which *is* inclusive (1850–1900, 51 years). The two
windows genuinely differ within the same workbook.

## 2. The baseline is a second full model run

`*_BASELINE` columns are not the policy run rescaled. Carbon uptake and the temperature
feedback differ between a world with and without abatement, so the engine integrates the
whole physics twice. N2O is unaffected either way (its temperature feedback coefficient is
zero), and non-GHG forcing is shared.

## 3. Defect: the baseline CH4 pool borrows the policy run's alpha

`CH4!R12` reads:

```
= CH4_BASELINE[EMS_BASELINE] * emis2conc * a1 * CH4_CALC[alpha] * tau1 * (1 - EXP(-1/(CH4_BASELINE[alpha]*tau1)))
  + SUMIFS(CH4_BASELINE[R1], ...) * EXP(-1/(CH4_BASELINE[alpha]*tau1))
```

The emissions term scales by `CH4_CALC[alpha]` — the **policy** run's lifetime factor —
while the decay terms correctly use `CH4_BASELINE[alpha]`. The equivalent CO2 cell
(`CO2!R12`) is fully self-consistent, so this is a partially-rebound copy-paste, not a
modelling choice.

It is reproduced (`gasCycle.js`, the `emissionAlpha` argument) so the dashboard's baseline
matches the workbook exactly. Its effect is small but not invisible: baseline warming in
2079 is 2.3528 °C with the defect versus 2.3593 °C without (0.18%), which propagates into
the baseline damage figures the KPI tiles compare against.

**If the workbook is ever corrected upstream, delete the `ch4EmissionAlpha` argument passed
to the baseline run in `runModel.js` and re-extract the golden values.**

## 4. Mitigation cost is scaled by *world* emissions for both actors

`Data Annex I!D4` multiplies the running per-tonne cost by `INPUT_EM[CO2]` — total world
baseline CO2 — rather than the actor's own emissions, for Annex I and Non-Annex I alike.
Both actors' absolute costs are therefore denominated in world emissions. Faithful, and
deliberately left alone.

## 5. Deliberate divergence: actor splits apply to every scenario

In the workbook, the Annex I / Non-Annex I split only exists for the CUSTOM scenario. For
the RCP scenarios `INPUT_EM[CO2_AnxI]` resolves to zero, and `CO2!B12` falls through to a
branch that applies **Annex I's** abatement to the entire world and drops CH4 abatement
altogether — a degenerate fallback rather than an intended behaviour.

The engine instead splits every scenario by the PRIMAP shares, which is exactly what the
workbook does for CUSTOM (`INPUT DATA!G4` = PRIMAP share × world emissions). On the default
CUSTOM scenario the two are identical, which is why the golden tests still hold; on the RCP
scenarios the two-actor policy controls now behave meaningfully instead of silently
collapsing.

## 6. Dropped: the RCP concentration/forcing overlay

The named ranges `CONC_RCP_CO2`, `CONC_RCP_CH4`, `CONC_RCP_N2O`, `RF_RCP_*` all resolve to
`#REF!` in v1.8 — the sheets they pointed at were removed. The corresponding series and the
`Clim Model Dash!V10` toggle that controlled them are omitted from the dashboard.

## Regenerating the data

```bash
python3 -m venv .venv && .venv/bin/pip install openpyxl
.venv/bin/python scripts/extract_workbook.py
cd shards-dashboard-react && npm test
```
