import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// The SDK does not expose a configurable minimum. Apply the requested policy
// to its shared validator, preserving all other rules and encryption formats.
// Keep this narrowly versioned so a dependency update needs explicit review.
const require = createRequire(import.meta.url);
const root = resolve(
  dirname(require.resolve("@midnight-ntwrk/midnight-js-utils")),
  "..",
);
const { version } = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
if (version !== "4.1.1")
  throw new Error(
    "Review the password-policy patch for Midnight utils " + version,
  );
const files = [
  "index.cjs",
  "index.mjs",
  "index.d.ts",
  "index.d.cts",
  "index.d.mts",
];
const changes = await Promise.all(
  files.map(async (file) => {
    const path = resolve(root, "dist", file);
    const source = await readFile(path, "utf8");
    const pattern = /\bconst MIN_PASSWORD_LENGTH = (16|8);/g;
    const matches = [...source.matchAll(pattern)];
    if (matches.length !== 1)
      throw new Error("Unexpected password validator in " + file);
    return {
      path,
      source,
      next: source.replace(pattern, "const MIN_PASSWORD_LENGTH = 8;"),
    };
  }),
);
for (const { path, source, next } of changes)
  if (source !== next) await writeFile(path, next);
console.log("Midnight storage password minimum: 8 characters.");
