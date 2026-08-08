// The dashboard recomputes the whole model on every slider step rather than debouncing,
// which is only reasonable while a run stays far below a frame. This guards that choice.

import statics from "../../data/model/static.json";
import { cloneDefaults } from "../defaults";
import { runModel } from "../runModel";

it("completes a full run fast enough to drive controls live", () => {
  const params = cloneDefaults();
  runModel(params, statics); // warm up, so JIT compilation is not part of the measurement

  const runs = 50;
  const started = Date.now();
  for (let i = 0; i < runs; i += 1) {
    params.run.ecs = 3 + i * 0.01;
    runModel(params, statics);
  }
  const perRun = (Date.now() - started) / runs;

  // Typically ~3 ms; the ceiling is loose enough to survive a slow CI machine but tight
  // enough to catch an accidental O(n^2) in the year loop.
  expect(perRun).toBeLessThan(25);
});
