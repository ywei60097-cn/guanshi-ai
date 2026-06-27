import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("server entrypoint starts from a path containing spaces", async (context) => {
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: projectRoot,
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  context.after(() => child.kill());
  const output = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("server did not start")), 3000);
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      if (text.includes("Guanshi API listening on")) {
        clearTimeout(timeout);
        resolve(text);
      }
    });
    child.on("error", reject);
    child.stderr.on("data", (chunk) => reject(new Error(chunk.toString())));
  });
  assert.match(output, /Guanshi API listening on \d+/);
});
