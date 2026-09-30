import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";

const directory = mkdtempSync(join(tmpdir(), "thresholdtern-storage-"));
const password = "Q7!mV2#rK9@tL5$xP8";
const pending = "0".repeat(64),
  confirmed = "a".repeat(64);
const admin = new Uint8Array(32).fill(42);
const provider = (secret: () => string | Promise<string>) =>
  levelPrivateStateProvider<string, { admin: Uint8Array }>({
    accountId: "test-account",
    midnightDbName: join(directory, "keys"),
    privateStoragePasswordProvider: secret,
  });
afterAll(() => {
  // Verify the generated deletion target remains this test's unique temp directory.
  const target = resolve(directory);
  if (
    dirname(target) !== resolve(tmpdir()) ||
    !basename(target).startsWith("thresholdtern-storage-")
  )
    throw new Error("Unexpected cleanup target");
  rmSync(target, { recursive: true, force: true });
});
describe("actual encrypted SDK storage and pending recovery namespaces", () => {
  it("requests unlock lazily and persists a pending creator secret across provider instances", async () => {
    const unlock = vi.fn(async () => password),
      first = provider(unlock);
    expect(unlock).not.toHaveBeenCalled();
    first.setContractAddress(pending);
    await first.set("creator-test", { admin });
    expect(unlock).toHaveBeenCalled();
    const next = provider(() => password);
    next.setContractAddress(pending);
    expect((await next.get("creator-test"))?.admin).toEqual(admin);
    next.setContractAddress(confirmed);
    expect(await next.get("creator-test")).toBeNull();
    await next.set("creator-test", { admin });
    const restored = provider(() => password);
    restored.setContractAddress(confirmed);
    expect((await restored.get("creator-test"))?.admin).toEqual(admin);
  });
  it("preserves encryption rather than silently accepting a different unlock password", async () => {
    const wrong = provider(() => "Z8!pN2@wH6#sJ4%uM9");
    wrong.setContractAddress(pending);
    await expect(wrong.get("creator-test")).rejects.toThrow();
  });
});
