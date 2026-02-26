import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getMinimumBalanceForRentExemption,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
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

// latest blockhash
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// space in bytes for new account
const space = 0n;
// minimum balance the account needs to live on-chain
const rentInLamports = BigInt(getMinimumBalanceForRentExemption(space));

// generating new private and public key
const newAccount = await generateKeyPairSigner();

// create new account instruction
const createAccountInstruction = getCreateAccountInstruction({
  payer: wallet,
  newAccount: newAccount,
  space: space,
  lamports: rentInLamports,
  programAddress: SYSTEM_PROGRAM_ADDRESS,
});

// create new account transaction message
const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(wallet, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) => appendTransactionMessageInstructions([createAccountInstruction], tx),
);

// signing the transaction
const signedTransaction =
  await signTransactionMessageWithSigners(transactionMessage);

try {
  // sending and confirming transaction
  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(
    { ...signedTransaction, lifetimeConstraint: latestBlockhash },
    { commitment: "confirmed" },
  );
} catch (e) {
  // catching the error
  throw e;
}
