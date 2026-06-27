import assert from "node:assert/strict";
import test from "node:test";
import lunarCalendar from "lunar-javascript";

globalThis.Solar = lunarCalendar.Solar;

const { createReading } = await import("../bazi-engine.js");
const { buildSceneAdvice } = await import("../scene-advice.js");

const reading = createReading(
  { birthDate: "1994-09-08", birthTime: "09:20", dayBoundary: "midnight" },
  new Date("2026-06-26T09:00:00+08:00"),
);

test("timing advice distinguishes a matching choice from a suggested reschedule", () => {
  const different = buildSceneAdvice(reading, "timing", "上午推进");
  assert.match(different.headline, /若能调整/);
  assert.match(different.primaryAdvice, /你选择的是上午推进/);
  assert.match(different.alternatives[0], /若必须在上午行动/);

  const matching = buildSceneAdvice(reading, "timing", "傍晚收尾");
  assert.match(matching.headline, /相合/);
  assert.match(matching.primaryAdvice, /傍晚/);
});
