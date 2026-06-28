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

test("mahjong advice ranks positions without requiring a selected seat", () => {
  const advice = buildSceneAdvice(reading, "mahjong", "帮我排座位");

  assert.match(advice.headline, /若能自选/);
  assert.match(advice.primaryAdvice, /不能坐推荐位/);
  assert.equal(advice.ranking.length, 4);
  assert.equal(new Set(advice.ranking.map((item) => item.label)).size, 4);
});
