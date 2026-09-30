import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  InitialAPI,
  ConnectedAPI,
} from "@midnight-ntwrk/dapp-connector-api";
import {
  connectWallet,
  detectWallets,
  failure,
} from "../src/lib/midnight/wallet";

afterEach(() => vi.unstubAllGlobals());
describe("wallet authorization remains independent of storage", () => {
  it("discovers opaque API 4 providers once and excludes incompatible wallets", async () => {
    const supported = { apiVersion: "4.0.1", name: "Lace", connect: vi.fn() };
    vi.stubGlobal("window", {
      midnight: {
        opaque: supported,
        duplicate: supported,
        old: { ...supported, apiVersion: "3.0.0" },
        unrelated: {},
      },
    });
    expect((await detectWallets()).map((option) => option.name)).toEqual([
      "Lace",
    ]);
    expect(supported.connect).not.toHaveBeenCalled();
  });
  it("resolves legacy injected promises without authorizing a connection", async () => {
    vi.stubGlobal("window", {
      midnight: {
        mnLace: Promise.resolve({
          apiVersion: "4.0.1",
          connect: vi.fn(),
          name: "Lace",
        }),
      },
    });
    expect((await detectWallets())[0]?.name).toBe("Lace");
  });
  it("requests Preprod without a password and rejects a wrong-network session before reading keys", async () => {
    const getShieldedAddresses = vi.fn();
    const connected = {
      getConnectionStatus: async () => ({
        status: "connected",
        networkId: "mainnet",
      }),
      getShieldedAddresses,
    } as unknown as ConnectedAPI;
    const connect = vi.fn(async () => connected);
    await expect(
      connectWallet({
        id: "test",
        name: "Test",
        api: { connect } as unknown as InitialAPI,
      }),
    ).rejects.toThrow(/Preprod/);
    expect(connect).toHaveBeenCalledWith("preprod");
    expect(getShieldedAddresses).not.toHaveBeenCalled();
  });
  it("keeps wallet rejection recoverable without displaying provider details", () => {
    expect(
      failure(new Error("User denied request with internal wallet details")),
    ).toMatch(/declined/);
    expect(
      failure(new Error("User denied request with internal wallet details")),
    ).not.toMatch(/internal/);
  });
});
