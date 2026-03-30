export type ExplorerLinkType = "transaction" | "account" | "contract";
export type ExplorerProvider = "stellar.expert" | "stellarchain.io";
export type StellarNetwork = "testnet" | "mainnet";

export interface GetExplorerLinkOptions {
  explorer?: ExplorerProvider;
  network?: StellarNetwork;
  networkEnvValue?: string | undefined;
}

const DEFAULT_EXPLORER: ExplorerProvider = "stellar.expert";
const DEFAULT_NETWORK: StellarNetwork = "testnet";

const NETWORK_ALIASES: Record<string, StellarNetwork> = {
  testnet: "testnet",
  futurenet: "testnet",
  mainnet: "mainnet",
  pubnet: "mainnet",
  public: "mainnet",
};

const EXPLORER_PATHS: Record<
  ExplorerProvider,
  Record<StellarNetwork, Record<ExplorerLinkType, string>>
> = {
  "stellar.expert": {
    mainnet: {
      transaction: "https://stellar.expert/explorer/public/tx",
      account: "https://stellar.expert/explorer/public/account",
      contract: "https://stellar.expert/explorer/public/contract",
    },
    testnet: {
      transaction: "https://stellar.expert/explorer/testnet/tx",
      account: "https://stellar.expert/explorer/testnet/account",
      contract: "https://stellar.expert/explorer/testnet/contract",
    },
  },
  "stellarchain.io": {
    mainnet: {
      transaction: "https://stellarchain.io/transactions",
      account: "https://stellarchain.io/accounts",
      contract: "https://stellarchain.io/contracts",
    },
    testnet: {
      transaction: "https://testnet.stellarchain.io/transactions",
      account: "https://testnet.stellarchain.io/accounts",
      contract: "https://testnet.stellarchain.io/contracts",
    },
  },
};

export function getCurrentNetwork(envValue = process.env.NEXT_PUBLIC_STELLAR_NETWORK): StellarNetwork {
  if (!envValue) {
    return DEFAULT_NETWORK;
  }

  const normalized = envValue.trim().toLowerCase();
  return NETWORK_ALIASES[normalized] ?? DEFAULT_NETWORK;
}

export function getExplorerLink(
  type: ExplorerLinkType,
  id: string,
  options: GetExplorerLinkOptions = {}
): string {
  if (!id || !id.trim()) {
    throw new Error("An explorer id is required");
  }

  const explorer = options.explorer ?? DEFAULT_EXPLORER;
  const network = options.network ?? getCurrentNetwork(options.networkEnvValue);

  const basePath = EXPLORER_PATHS[explorer][network][type];
  return `${basePath}/${encodeURIComponent(id.trim())}`;
}
