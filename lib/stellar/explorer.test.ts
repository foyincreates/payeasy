import test from "node:test";
import assert from "node:assert/strict";

import { getCurrentNetwork, getExplorerLink, type ExplorerLinkType, type ExplorerProvider, type StellarNetwork } from "./explorer.ts";

test("getCurrentNetwork normalizes aliases and defaults", () => {
  assert.equal(getCurrentNetwork(undefined), "testnet");
  assert.equal(getCurrentNetwork("pubnet"), "mainnet");
  assert.equal(getCurrentNetwork("mainnet"), "mainnet");
  assert.equal(getCurrentNetwork("futurenet"), "testnet");
  assert.equal(getCurrentNetwork("unknown"), "testnet");
});

test("getExplorerLink returns correct URLs for each explorer, type, and network", () => {
  const cases: Array<{
    explorer: ExplorerProvider;
    network: StellarNetwork;
    type: ExplorerLinkType;
    id: string;
    expected: string;
  }> = [
    {
      explorer: "stellar.expert",
      network: "mainnet",
      type: "transaction",
      id: "abc123",
      expected: "https://stellar.expert/explorer/public/tx/abc123",
    },
    {
      explorer: "stellar.expert",
      network: "mainnet",
      type: "account",
      id: "GABC",
      expected: "https://stellar.expert/explorer/public/account/GABC",
    },
    {
      explorer: "stellar.expert",
      network: "mainnet",
      type: "contract",
      id: "CABC",
      expected: "https://stellar.expert/explorer/public/contract/CABC",
    },
    {
      explorer: "stellar.expert",
      network: "testnet",
      type: "transaction",
      id: "abc123",
      expected: "https://stellar.expert/explorer/testnet/tx/abc123",
    },
    {
      explorer: "stellar.expert",
      network: "testnet",
      type: "account",
      id: "GABC",
      expected: "https://stellar.expert/explorer/testnet/account/GABC",
    },
    {
      explorer: "stellar.expert",
      network: "testnet",
      type: "contract",
      id: "CABC",
      expected: "https://stellar.expert/explorer/testnet/contract/CABC",
    },
    {
      explorer: "stellarchain.io",
      network: "mainnet",
      type: "transaction",
      id: "abc123",
      expected: "https://stellarchain.io/transactions/abc123",
    },
    {
      explorer: "stellarchain.io",
      network: "mainnet",
      type: "account",
      id: "GABC",
      expected: "https://stellarchain.io/accounts/GABC",
    },
    {
      explorer: "stellarchain.io",
      network: "mainnet",
      type: "contract",
      id: "CABC",
      expected: "https://stellarchain.io/contracts/CABC",
    },
    {
      explorer: "stellarchain.io",
      network: "testnet",
      type: "transaction",
      id: "abc123",
      expected: "https://testnet.stellarchain.io/transactions/abc123",
    },
    {
      explorer: "stellarchain.io",
      network: "testnet",
      type: "account",
      id: "GABC",
      expected: "https://testnet.stellarchain.io/accounts/GABC",
    },
    {
      explorer: "stellarchain.io",
      network: "testnet",
      type: "contract",
      id: "CABC",
      expected: "https://testnet.stellarchain.io/contracts/CABC",
    },
  ];

  for (const scenario of cases) {
    const url = getExplorerLink(scenario.type, scenario.id, {
      explorer: scenario.explorer,
      network: scenario.network,
    });

    assert.equal(url, scenario.expected);
  }
});

test("getExplorerLink defaults to current network and default explorer", () => {
  const url = getExplorerLink("transaction", "123", {
    networkEnvValue: "mainnet",
  });

  assert.equal(url, "https://stellar.expert/explorer/public/tx/123");
});

test("getExplorerLink throws when id is missing", () => {
  assert.throws(() => getExplorerLink("transaction", ""), /explorer id is required/i);
});
