# Oxford Simple IAM — Climate & Policy Dashboard

An interactive dashboard for the Oxford Simple Climate and Integrated Assessment Model
v1.8 (Myles Allen & Nicholas Leach). The model is ported to JavaScript and runs entirely in
the browser, so every control recomputes the full 1765–2150 run and redraws instantly.

Two dashboards, matching the workbook's two dashboard sheets:

- **Clim Policy Dash** — nine charts covering carbon prices, abatement, emissions,
  concentrations, warming, and the annual/absolute/discounted cost split between Annex I
  and Non-Annex I countries, plus every control from the workbook's *Climate Policy
  Controls* block.
- **Clim Model Dash** — five charts running emissions → concentrations → radiative forcing
  → temperature, with a build-your-own outputs chart, scenario picker and ECS/TCR.

## Running it

```bash
cd shards-dashboard-react
npm install
npm start          # http://localhost:3000
npm test           # 51 tests
npm run build
```

The app opens on a welcome screen: charts appear only after you load a workbook/CSV or
choose the bundled example dataset (`#/policy?data=example` deep-links straight to it).
Edits persist in the browser (localStorage), so closing the tab does not lose your
scenario; the ✕ next to the data source unloads everything and returns to the welcome
screen.

## Accuracy

The engine is validated against the values Excel itself computed and cached in
`Oxford_Simple_IAM_3_two-actor_v1.8.xlsx`. Every series — carbon cycle, forcing,
temperature and its attribution, prices, abatement, costs, damages, discounting — matches
to a relative tolerance of **1e-6**, as do all ten headline figures:

| | Model | Workbook |
|---|---|---|
| 2100 warming | 1.75931885 °C | 1.75931885 °C |
| 2100 damage | 1.5804% of GWP | 1.5804% of GWP |
| Total cost to 2150 | $2373.1T | $2373.1T |
| Discounted total | $273.3T | $273.3T |
| Diagnosed TCRE | 1.4916 °C/TtC | 1.4916 °C/TtC |

`WORKBOOK-FIDELITY.md` records the spreadsheet quirks that had to be reproduced deliberately
— including a defect in the workbook's baseline methane column — and the one place the
dashboard intentionally diverges. Read it before "fixing" anything in `src/model/`.

## Loading your own data

Both formats are parsed in the browser; nothing is uploaded anywhere.

- **`.xlsx`** — a copy of the Oxford workbook. Every control is repopulated from it and
  stays editable.
- **`.csv`** — a custom scenario with columns `YEAR, OTHER_RF, CO2, CH4, N2O`
  (W/m², GtC, MtCH₄, MtN₂O-N₂). Missing gases are zero; sparse years hold forward. A
  template is downloadable from the upload tooltip.

Drop a file anywhere on the page, or use **Upload data** in the header.

## Layout

```
scripts/extract_workbook.py      one-off: workbook -> static.json / defaults.json / golden.json
shards-dashboard-react/src/
  model/                         the IAM engine (pure JS, no React)
    constants.js                 gas-cycle and climate parameters
    gasCycle.js  climate.js      FaIR-style gas cycle; two-box energy balance
    policy.js    economics.js    price paths and MACC; damages, costs, discounting
    runModel.js                  orchestrates the policy and no-policy runs
    __tests__/golden.test.js     validation against the workbook
  components/charts/             gallery, Chart.js wrapper, palette, chart specs
  components/controls/           parameter cards
  store/ModelContext.js          all inputs; recomputes on every edit (~3 ms per run)
  io/                            xlsx and csv parsing
```

## Regenerating the bundled data

If the workbook is updated, re-extract and re-validate:

```bash
python3 -m venv .venv && .venv/bin/pip install openpyxl
.venv/bin/python scripts/extract_workbook.py
cd shards-dashboard-react && npm test
```

Model and figures © 2025 Myles Allen and Nicholas Leach.
