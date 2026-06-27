import http from "node:http";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RULEBOOK_VERSION, SOURCE_ANCHORS, createReading } from "../bazi-engine.js";
import { SCENES, buildSceneAdvice } from "../scene-advice.js";

const require = createRequire(import.meta.url);
const { Solar } = require("lunar-javascript");

// bazi-engine deliberately receives its calendar dependency through this boundary.
globalThis.Solar = Solar;

const MAX_BODY_BYTES = 32 * 1024;

function json(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function setCors(request, response) {
  const allowList = (process.env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const origin = request.headers.origin;
  if (origin && allowList.includes(origin)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "origin");
  }
  response.setHeader("access-control-allow-methods", "POST, GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function parseJson(request) {
  return new Promise((resolve, reject) => {
    const contentLength = Number(request.headers["content-length"] || 0);
    if (contentLength > MAX_BODY_BYTES) {
      reject(Object.assign(new Error("request body is too large"), { status: 413 }));
      request.resume();
      return;
    }
    let bytes = 0;
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("request body is too large"), { status: 413 }));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(Object.assign(new Error("request body must be valid JSON"), { status: 400 })); }
    });
    request.on("error", reject);
  });
}

function validateProfile(profile) {
  if (!profile || typeof profile !== "object") return "profile is required";
  if (!isValidDate(profile.birthDate)) return "birthDate must be a valid YYYY-MM-DD date";
  if (profile.birthTime && !isValidTime(profile.birthTime)) return "birthTime must be a valid HH:mm time";
  if (profile.dayBoundary && !["midnight", "ziStart"].includes(profile.dayBoundary)) return "dayBoundary is invalid";
  return null;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function publicReading(reading) {
  return {
    rulebookVersion: reading.rulebookVersion,
    chart: reading.chart,
    transit: reading.transit,
    analysis: reading.analysis,
  };
}

function createRateLimiter(limit = Number(process.env.RATE_LIMIT_PER_15M || 60)) {
  const hits = new Map();
  const windowMs = 15 * 60 * 1000;
  let calls = 0;
  return (request) => {
    const forwarded = request.headers["x-forwarded-for"];
    // The API is private to the Compose network; Caddy is the only public entry point.
    const key = typeof forwarded === "string" && forwarded ? forwarded.split(",")[0].trim() : request.socket.remoteAddress || "unknown";
    const now = Date.now();
    if (++calls % 100 === 0) {
      for (const [candidate, timestamps] of hits) {
        if (!timestamps.some((timestamp) => now - timestamp < windowMs)) hits.delete(candidate);
      }
    }
    const active = (hits.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
    if (active.length >= limit) return false;
    active.push(now);
    hits.set(key, active);
    return true;
  };
}

export function createApiServer({ rateLimitPerWindow } = {}) {
  const rateLimit = createRateLimiter(rateLimitPerWindow);
  return http.createServer(async (request, response) => {
    setCors(request, response);
    if (request.method === "OPTIONS") return response.writeHead(204).end();
    const url = new URL(request.url || "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/healthz") {
      return json(response, 200, { ok: true, rulebookVersion: RULEBOOK_VERSION, persistence: "disabled" });
    }
    if (request.method === "GET" && url.pathname === "/v1/rulebook") {
      return json(response, 200, { version: RULEBOOK_VERSION, anchors: SOURCE_ANCHORS, scenes: SCENES });
    }
    if (request.method !== "POST" || url.pathname !== "/v1/readings") {
      return json(response, 404, { error: "not_found" });
    }
    if (!rateLimit(request)) return json(response, 429, { error: "rate_limited" });

    try {
      const payload = await parseJson(request);
      const profileError = validateProfile(payload.profile);
      if (profileError) return json(response, 400, { error: "invalid_profile", message: profileError });
      const scene = payload.scene || "outfit";
      if (!SCENES[scene]) return json(response, 400, { error: "invalid_scene" });
      const at = payload.at ? new Date(payload.at) : new Date();
      if (Number.isNaN(at.getTime())) return json(response, 400, { error: "invalid_time" });
      const choice = typeof payload.choice === "string" && SCENES[scene].choices.includes(payload.choice) ? payload.choice : SCENES[scene].choices[0];
      const reading = createReading({ ...payload.profile, dayBoundary: payload.profile.dayBoundary || "midnight" }, at);
      const advice = buildSceneAdvice(reading, scene, choice);
      // Do not log or persist birth data in the stateless release path.
      return json(response, 200, { reading: publicReading(reading), advice, scene, choice });
    } catch (error) {
      const status = error.status || 500;
      return json(response, status, { error: status === 500 ? "calculation_failed" : "bad_request" });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 8080);
  const server = createApiServer();
  server.listen(port, "0.0.0.0", () => console.log(`Guanshi API listening on ${server.address().port}`));
}
