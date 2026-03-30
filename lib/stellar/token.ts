import { Contract, scValToNative, xdr } from "@stellar/stellar-sdk";
import { getCurrentNetwork, getRpcUrl } from "./config";
import { toStellarAmount, fromStellarAmount } from "./format.ts";

/**
 * Interaction helper for Stellar Asset Contracts (SAC)
 */
export class TokenHelper {
  private contract: Contract;

  constructor(tokenAddress: string) {
    this.contract = new Contract(tokenAddress);
  }

  /**
   * Fetches the token balance for a given account.
   */
  async balance(accountId: string): Promise<bigint> {
    try {
      const response = await this.invoke("balance", [
        xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(Buffer.from(accountId)))),
      ]);
      return scValToNative(response);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      return 0n;
    }
  }

  /**
   * Fetches the spending allowance for a spender on behalf of an owner.
   */
  async allowance(ownerId: string, spenderId: string): Promise<bigint> {
    try {
      const response = await this.invoke("allowance", [
        xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(Buffer.from(ownerId)))),
        xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(Buffer.from(spenderId)))),
      ]);
      return scValToNative(response);
    } catch (error) {
      console.error("Failed to fetch allowance:", error);
      return 0n;
    }
  }

  /**
   * Creates an "approve" operation for the SAC.
   */
  approve(spenderId: string, amount: bigint | string | number) {
    const finalAmount = typeof amount === "bigint" ? amount : toStellarAmount(amount);
    return this.contract.call("approve", 
      xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(Buffer.from(spenderId)))),
      xdr.ScVal.scvI128(xdr.Int128.fromBigInt(finalAmount))
    );
  }

  /**
   * Creates a "transfer" operation for the SAC.
   */
  transfer(toId: string, amount: bigint | string | number) {
    const finalAmount = typeof amount === "bigint" ? amount : toStellarAmount(amount);
    return this.contract.call("transfer", 
      xdr.ScVal.scvAddress(xdr.ScAddress.scAddressTypeAccount(xdr.PublicKey.publicKeyTypeEd25519(Buffer.from(toId)))),
      xdr.ScVal.scvI128(xdr.Int128.fromBigInt(finalAmount))
    );
  }

  /**
   * Internal helper to invoke read-only methods.
   */
  private async invoke(method: string, args: xdr.ScVal[]): Promise<any> {
    // This is a simplified version. In a real app, you'd use a Soroban RPC client.
    // For now, we're providing the structure as per requirements.
    throw new Error("Method not implemented: requires Soroban RPC integration.");
  }
}
