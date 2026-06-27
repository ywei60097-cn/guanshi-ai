import assert from "node:assert/strict";
import test from "node:test";

import { createApiServer } from "../server/index.js";

async function withServer(run, options) {
  const server = createApiServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("health endpoint exposes only operational metadata", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/healthz`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, rulebookVersion: "0.2.0", persistence: "disabled" });
  });
});

test("reading API returns a traceable result for every retained scene", async () => {
  await withServer(async (baseUrl) => {
    const retainedScenes = {
      outfit: "日常通勤",
      outing: "见客户",
      work_social: "提出想法",
      timing: "上午推进",
      mahjong: "东位",
    };
    for (const [scene, choice] of Object.entries(retainedScenes)) {
      const response = await fetch(`${baseUrl}/v1/readings`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Object.keys(retainedScenes).indexOf(scene) + 1}` },
        body: JSON.stringify({
          profile: { birthDate: "1994-09-08", birthTime: "09:20", dayBoundary: "midnight" },
          scene,
          choice,
          at: "2026-06-26T09:00:00+08:00",
        }),
      });
      const payload = await response.json();
      assert.equal(response.status, 200, scene);
      assert.equal(payload.scene, scene);
      assert.equal(payload.reading.analysis.ruleTrace[0].id, "ZPZQ.MONTH-COMMAND.001");
      if (scene === "mahjong") assert.equal(payload.advice.ranking.length, 4);
    }
  });
});

test("reading API rejects malformed birth data", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/readings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: { birthDate: "1994/09/08" } }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "invalid_profile");
  });
});

test("reading API rejects impossible dates and times before invoking the calculator", async () => {
  await withServer(async (baseUrl) => {
    for (const profile of [
      { birthDate: "2024-02-30", birthTime: "09:20" },
      { birthDate: "1994-09-08", birthTime: "24:00" },
    ]) {
      const response = await fetch(`${baseUrl}/v1/readings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, "invalid_profile");
    }
  });
});

test("rate limiting uses forwarded client identity behind the reverse proxy", async () => {
  await withServer(async (baseUrl) => {
    const request = (clientIp) => fetch(`${baseUrl}/v1/readings`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": clientIp },
      body: JSON.stringify({ profile: { birthDate: "1994-09-08", birthTime: "09:20" } }),
    });
    assert.equal((await request("203.0.113.8")).status, 200);
    assert.equal((await request("203.0.113.9")).status, 200);
    assert.equal((await request("203.0.113.8")).status, 429);
  }, { rateLimitPerWindow: 1 });
});
