// Mounts both dashboards for real: the provider runs the model, the views build every
// chart spec, and the controls render against live outputs. Chart.js is stubbed because
// jsdom has no canvas — everything upstream of the canvas is exercised for real.

import React from "react";
import { act, render, fireEvent, screen, within } from "@testing-library/react";

import { ModelProvider } from "../store/ModelContext";
import PolicyDash from "../views/PolicyDash";
import ModelDash from "../views/ModelDash";
import App from "../App";

jest.mock("../utils/chart", () => {
  class FakeChart {
    constructor(canvas, config) {
      this.data = config.data;
      this.options = config.options;
      FakeChart.instances.push(this);
    }
    getDatasetMeta() {
      return { hidden: false, data: [] };
    }
    update() {}
    destroy() {}
  }
  FakeChart.instances = [];
  FakeChart.plugins = { register: () => {} };
  FakeChart.defaults = { global: { animation: {}, elements: { line: {} } } };
  return { __esModule: true, default: FakeChart, GRID: "#eee" };
});

const Chart = require("../utils/chart").default;

const withProvider = ui => render(<ModelProvider>{ui}</ModelProvider>);

/** The numeric part of a headline figure, ignoring its unit suffix. */
function tileValue(label) {
  const figure = screen.getByText(label).parentElement;
  return parseFloat(
    figure.querySelector(".figure__value").textContent.replace(/[^0-9.-]/g, "")
  );
}

const STORAGE_KEY = "oxford-iam-dashboard-v1";

/** Most tests exercise the dashboards, which sit behind the welcome screen until a data
 *  source is chosen; seeding the example choice is the test equivalent of clicking
 *  "Explore the example dataset". Welcome-screen tests clear this seed themselves. */
function seedExampleData() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ source: { kind: "example" } }));
}

beforeEach(() => {
  Chart.instances.length = 0;
  window.location.hash = "#/policy";
  window.localStorage.clear();
  seedExampleData();
});

describe("Clim Policy Dash", () => {
  it("renders the headline figures from the model", () => {
    withProvider(<PolicyDash />);
    // The workbook's default run: 1.76 °C in 2100, $2373T total cost.
    expect(screen.getByText("1.76")).toBeInTheDocument();
    expect(screen.getByText("$2373")).toBeInTheDocument();
    expect(screen.getByText(/Warming in 2100/i)).toBeInTheDocument();
  });

  it("builds a thumbnail for all nine charts plus the focus chart", () => {
    withProvider(<PolicyDash />);
    expect(screen.getAllByRole("tab")).toHaveLength(9);
    // nine thumbnails + one focus chart
    expect(Chart.instances).toHaveLength(10);
  });

  it("recomputes when a policy control changes", () => {
    withProvider(<PolicyDash />);
    expect(tileValue("Warming in 2100")).toBeCloseTo(1.76, 2);

    const annexI = screen.getByRole("region", { name: "Annex I" });
    fireEvent.change(within(annexI).getByLabelText("Price in 2100 slider"), {
      target: { value: "3000" }
    });

    // A far higher carbon price must lower 2100 warming.
    expect(tileValue("Warming in 2100")).toBeLessThan(1.76);
  });

  it("percent sliders track the drag instead of pinning to the minimum", () => {
    withProvider(<PolicyDash />);
    const annexI = screen.getByRole("region", { name: "Annex I" });

    // Sliders on percent fields report display units (0-100); the value must land where
    // the thumb was dragged, not get clamped against the raw 0-1 bounds.
    const participation = within(annexI).getByLabelText(/participation rate slider/i);
    fireEvent.change(participation, { target: { value: "60" } });
    expect(within(annexI).getByLabelText(/participation rate$/i).value).toBe("60");
    expect(Number.isFinite(tileValue("Warming in 2100"))).toBe(true);

    const ch4 = within(annexI).getByLabelText(/CH₄ abatement over 30 years slider/i);
    fireEvent.change(ch4, { target: { value: "45" } });
    expect(within(annexI).getByLabelText(/CH₄ abatement over 30 years$/i).value).toBe("45");
  });

  it("edits made in the number box are applied on blur", () => {
    withProvider(<PolicyDash />);
    const annexI = screen.getByRole("region", { name: "Annex I" });
    const box = within(annexI).getByLabelText("Price in 2100");
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "50" } });
    fireEvent.blur(box);
    expect(tileValue("Warming in 2100")).toBeGreaterThan(1.76);
  });

  it("switching the policy off removes the comparison deltas", () => {
    withProvider(<PolicyDash />);
    expect(screen.getAllByText(/vs no policy/i)).toHaveLength(2);
    fireEvent.click(screen.getByRole("checkbox", { name: /Policy on/i }));
    expect(screen.queryAllByText(/vs no policy/i)).toHaveLength(0);
    // With no policy the run and its counterfactual are the same world.
    expect(tileValue("Warming in 2100")).toBeCloseTo(2.73, 1);
  });

  it("hands the chart the model's own numbers", () => {
    withProvider(<PolicyDash />);
    // The focus chart is created last, after the nine thumbnails.
    const focus = Chart.instances[Chart.instances.length - 1];
    const withPolicy = focus.data.datasets.find(d => d.label === "With policy");
    const noPolicy = focus.data.datasets.find(d => d.label === "No policy");

    const at = (dataset, year) => dataset.data.find(point => point.x === year).y;
    expect(at(withPolicy, 2100)).toBeCloseTo(1.7593188, 6);
    expect(at(noPolicy, 2100)).toBeCloseTo(2.7312145, 6);

    // The window runs 1900..2150 and no point escapes it.
    expect(withPolicy.data[0].x).toBe(1900);
    expect(withPolicy.data[withPolicy.data.length - 1].x).toBe(2150);
  });

  it("scales combined-unit series for the axis but reports true values", () => {
    withProvider(<ModelDash />);
    const focus = Chart.instances[Chart.instances.length - 1];
    const ch4 = focus.data.datasets.find(d => /CH₄/.test(d.label));
    // Plotted at a tenth so it shares the axis with CO2 ppm; the tooltip multiplies back.
    expect(ch4.tooltipScale).toBe(10);
    expect(ch4.unit).toBe(" ppb");
    const plotted = ch4.data.find(point => point.x === 2000).y;
    expect(plotted * ch4.tooltipScale).toBeGreaterThan(1500);
  });

  it("promotes a thumbnail into the focus slot when clicked", () => {
    withProvider(<PolicyDash />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Global average surface temperature/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Carbon price/i }));
    expect(
      screen.getByRole("heading", { level: 2, name: /Carbon price/i })
    ).toBeInTheDocument();
  });

  it("offers a table view of the focused chart", () => {
    withProvider(<PolicyDash />);
    fireEvent.click(screen.getByTitle("Show data table"));
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: /With policy/i })
    ).toBeInTheDocument();
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(5);
  });

  it("hides a series when its legend entry is clicked", () => {
    withProvider(<PolicyDash />);
    const legend = screen.getByRole("list");
    const entry = within(legend).getByRole("button", { name: "No policy" });
    expect(entry).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(entry);
    expect(within(legend).getByRole("button", { name: "No policy" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});

describe("Clim Model Dash", () => {
  it("renders diagnosed TCRE and the five charts", () => {
    withProvider(<ModelDash />);
    expect(screen.getByText("1.49")).toBeInTheDocument();
    expect(screen.getByText("1.15")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });

  it("lets outputs be added to the custom chart", () => {
    withProvider(<ModelDash />);
    const emissions = screen.getByText("Emissions", { selector: ".output-picker__title" })
      .parentElement;
    const co2 = within(emissions).getByRole("button", { name: "CO₂ emissions" });
    expect(co2).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(co2);
    expect(
      within(emissions).getByRole("button", { name: "CO₂ emissions" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("changing climate sensitivity moves peak warming", () => {
    withProvider(<ModelDash />);
    const before = tileValue("Peak warming");
    fireEvent.change(screen.getByLabelText(/Equilibrium climate sensitivity.*slider/i), {
      target: { value: "5" }
    });
    expect(tileValue("Peak warming")).toBeGreaterThan(before);
  });

  it("re-windows the chart axes when the chart window changes", () => {
    withProvider(<ModelDash />);
    const focus = Chart.instances[Chart.instances.length - 1];
    expect(focus.options.scales.xAxes[0].ticks.min).toBe(1900);

    fireEvent.change(screen.getByLabelText("From year slider"), {
      target: { value: "1800" }
    });
    expect(focus.options.scales.xAxes[0].ticks.min).toBe(1800);
  });

  it("offers the shared policy switch", () => {
    withProvider(<ModelDash />);
    const toggle = screen.getByRole("checkbox", { name: /Climate policy on/i });
    fireEvent.click(toggle);
    expect(screen.getByRole("checkbox", { name: /Climate policy off/i })).toBeInTheDocument();
  });
});

describe("robustness", () => {
  it("keeps every figure finite at the extremes of the policy controls", () => {
    withProvider(<PolicyDash />);
    const annexI = screen.getByRole("region", { name: "Annex I" });

    // The abatement-curve calibration is undefined at or below a fraction of 1; the
    // control floor must keep the model inside its domain.
    const maxAbatement = within(annexI).getByLabelText(/Maximum abatement fraction slider/i);
    expect(Number(maxAbatement.min)).toBeGreaterThan(1);
    fireEvent.change(maxAbatement, { target: { value: maxAbatement.min } });
    expect(Number.isFinite(tileValue("Warming in 2100"))).toBe(true);

    // Dragging the cost anchors into collision must push, not invert.
    fireEvent.change(within(annexI).getByLabelText("Cost to abate 100% slider"), {
      target: { value: "10" }
    });
    const cost50 = within(annexI).getByLabelText("Cost to abate 50%");
    const cost100 = within(annexI).getByLabelText("Cost to abate 100%");
    expect(Number(cost100.value)).toBeGreaterThan(Number(cost50.value));
    expect(Number.isFinite(tileValue("Warming in 2100"))).toBe(true);
  });

  it("remembers edits across a reload and forgets them on reset", () => {
    jest.useFakeTimers();
    try {
      const first = withProvider(<PolicyDash />);
      const annexI = screen.getByRole("region", { name: "Annex I" });
      fireEvent.change(within(annexI).getByLabelText("Price in 2100 slider"), {
        target: { value: "3000" }
      });
      const edited = tileValue("Warming in 2100");
      expect(edited).toBeLessThan(1.76);
      act(() => {
        jest.advanceTimersByTime(600);
      });
      first.unmount();

      // A fresh provider is a page reload: the edit must survive.
      const second = withProvider(<PolicyDash />);
      expect(tileValue("Warming in 2100")).toBeCloseTo(edited, 6);

      fireEvent.click(screen.getByRole("button", { name: /Reset to defaults/i }));
      expect(tileValue("Warming in 2100")).toBeCloseTo(1.76, 2);
      second.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it("ignores unusable saved state and returns to the welcome screen", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        params: { policy: { annexI: { maxAbatement: 0.5 } } },
        source: { kind: "example" }
      })
    );
    withProvider(<PolicyDash />);
    expect(
      screen.getByRole("heading", { name: /carbon price/i })
    ).toBeInTheDocument();
  });
});

describe("welcome screen", () => {
  it("keeps the dashboards behind a data choice", () => {
    window.localStorage.clear();
    withProvider(<PolicyDash />);
    expect(screen.getByRole("heading", { name: /carbon price/i })).toBeInTheDocument();
    expect(screen.queryByText(/Warming in 2100/i)).not.toBeInTheDocument();
  });

  it("opens the dashboards on the example dataset when chosen", () => {
    window.localStorage.clear();
    withProvider(<PolicyDash />);
    fireEvent.click(screen.getByRole("button", { name: /Explore the example dataset/i }));
    expect(tileValue("Warming in 2100")).toBeCloseTo(1.76, 2);
  });

  it("opens directly on the example dataset via the ?data=example link", () => {
    window.localStorage.clear();
    window.location.hash = "#/policy?data=example";
    withProvider(<PolicyDash />);
    expect(tileValue("Warming in 2100")).toBeCloseTo(1.76, 2);
  });

  it("returns to the welcome screen when data is unloaded", () => {
    render(<App />);
    expect(screen.getByText(/Warming in 2100/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Unload data/i));
    expect(screen.getByRole("heading", { name: /carbon price/i })).toBeInTheDocument();
    expect(screen.queryByText(/Warming in 2100/i)).not.toBeInTheDocument();
  });
});

describe("app shell", () => {
  it("has exactly two sidebar destinations and no demo pages", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: /Clim Policy Dash/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Clim Model Dash/i })).toBeInTheDocument();
    expect(screen.queryByText(/Blog/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/User Profile/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sign In|Logout/i)).not.toBeInTheDocument();
  });

  it("offers the load-data control and names the active source", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Load data" })).toBeInTheDocument();
    expect(screen.getByText("Example dataset")).toBeInTheDocument();
  });
});
