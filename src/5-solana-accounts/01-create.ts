import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
  getMinimumBalanceForRentExemption,
  lamports,
} from "@solana/kit";
import { config } from "../config";
import { loadSignerFromFile } from "../wallet";
import {
  getCreateAccountInstruction,
  SYSTEM_PROGRAM_ADDRESS,
} from "@solana-program/system";

// connection to cluster
const rpc = createSolanaRpc(config.RPC_HTTP);
const rpcSubscriptions = createSolanaRpcSubscriptions(config.RPC_WS);

// new solana account payer
const wallet = await loadSignerFromFile(); // 29KKX9fQspSenNUibR9fxJCLvwGfozFPGbt486SF8JqY

const newAccount = await generateKeyPairSigner();
const space = 0n;
const rentLamports = BigInt(getMinimumBalanceForRentExemption(space));

const createAccountInstruction = getCreateAccountInstruction({
  payer: wallet,
  newAccount: newAccount,
  space: space,
  lamports: rentLamports,
  programAddress: SYSTEM_PROGRAM_ADDRESS,
});

console.log(`create account instructoin: `, createAccountInstruction)