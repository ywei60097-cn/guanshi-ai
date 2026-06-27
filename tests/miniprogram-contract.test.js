import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../miniprogram/pages");
const pageNames = ["onboarding", "today", "scene", "result", "reasoning", "profile"];

test("mini-program templates contain no browser-only HTML tags", () => {
  for (const pageName of pageNames) {
    const template = fs.readFileSync(path.join(root, pageName, "index.wxml"), "utf8");
    assert.doesNotMatch(template, /<(?:b|small|strong|i)\b/, `${pageName} uses an unsupported WXML tag`);
  }
});

test("every WXML event handler exists on its page", () => {
  for (const pageName of pageNames) {
    const template = fs.readFileSync(path.join(root, pageName, "index.wxml"), "utf8");
    const script = fs.readFileSync(path.join(root, pageName, "index.js"), "utf8");
    const handlers = [...template.matchAll(/\bbind(?:tap|change|input)="([A-Za-z][A-Za-z0-9_]*)"/g)].map((match) => match[1]);
    for (const handler of handlers) {
      assert.match(script, new RegExp(`\\b${handler}\\s*\\(`), `${pageName} is missing ${handler}`);
    }
  }
});
