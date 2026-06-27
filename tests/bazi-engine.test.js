import assert from "node:assert/strict";
import test from "node:test";
import lunarCalendar from "lunar-javascript";

globalThis.Solar = lunarCalendar.Solar;

const { analyzeChart, buildChart, buildTransit, createReading } = await import("../bazi-engine.js");

test("uses the calendar library for a documented EightChar example", () => {
  const chart = buildChart({ birthDate: "2005-12-23", birthTime: "08:37", dayBoundary: "midnight" });
  assert.deepEqual(chart.pillars.map((pillar) => pillar.text), ["乙酉", "戊子", "辛巳", "壬辰"]);
  assert.equal(chart.options.monthBoundary, "按节气换月");
});

test("keeps the Zi-hour day-boundary choice explicit", () => {
  const midnight = buildChart({ birthDate: "1988-02-15", birthTime: "23:30", dayBoundary: "midnight" });
  const ziStart = buildChart({ birthDate: "1988-02-15", birthTime: "23:30", dayBoundary: "ziStart" });
  assert.equal(midnight.pillars[2].text, "庚子");
  assert.equal(ziStart.pillars[2].text, "辛丑");
});

test("does not quietly use an invented hour pillar when birth time is unknown", () => {
  const chart = buildChart({ birthDate: "1994-09-08", birthTime: "", dayBoundary: "midnight" });
  const analysis = analyzeChart(chart, buildTransit(new Date(2026, 5, 26, 9, 0, 0)));
  assert.equal(chart.timeKnown, false);
  assert.equal(chart.pillars[3], null);
  assert.match(analysis.limitations[0], /出生时辰未知/);
});

test("records the rule ordering before producing a daily tendency", () => {
  const chart = buildChart({ birthDate: "1994-09-08", birthTime: "09:20", dayBoundary: "midnight" });
  const transit = buildTransit(new Date(2026, 5, 26, 9, 0, 0));
  const analysis = analyzeChart(chart, transit);
  assert.equal(analysis.ruleTrace[0].id, "ZPZQ.MONTH-COMMAND.001");
  assert.equal(analysis.ruleTrace.at(-1).id, "NO-MISSING-ELEMENT.001");
  assert.ok(analysis.dailyFocus.primary);
  assert.ok(analysis.limitations.length >= 2);
});

test("creates one traceable reading from chart to transit", () => {
  const reading = createReading({ birthDate: "1994-09-08", birthTime: "09:20", dayBoundary: "midnight" }, new Date(2026, 5, 26, 9, 0, 0));
  assert.equal(reading.rulebookVersion, "0.2.0");
  assert.equal(reading.chart.pillars.length, 4);
  assert.equal(reading.transit.day.length, 2);
});
