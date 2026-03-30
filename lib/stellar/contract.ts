import { Contract, networks } from "./bindings/rent-escrow";

/**
 * Configure and export the RentEscrow contract client.
 * Uses environment variables for network and contract ID.
 */
const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet" 
    ? networks.public.networkPassphrase 
    : networks.testnet.networkPassphrase;
const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";

export const rentEscrow = new Contract({
    contractId,
    networkPassphrase,
    rpcUrl,
});

export default rentEscrow;
