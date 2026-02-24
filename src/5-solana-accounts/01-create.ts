import {
  appendTransactionMessageInstruction,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPairSigner,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  isOffCurveAddress,
  isSolanaError,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  SOLANA_ERROR__BLOCKHASH_STRING_LENGTH_OUT_OF_RANGE,
} from "@solana/kit";
import { config } from "../config";
import { loadSignerFromFile } from "../wallet";
import {
  getCreateAccountInstruction,
  SYSTEM_PROGRAM_ADDRESS,
} from "@solana-program/system";

const rpc = createSolanaRpc(config.RPC_HTTP);
const rpcSubscriptions = createSolanaRpcSubscriptions(config.RPC_WS);

const wallet = await loadSignerFromFile();
console.log(`wallet address: ${wallet.address}`)

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const space = 0n;
const rentInLamports = await rpc
  .getMinimumBalanceForRentExemption(space)
  .send();
console.log(
  `Minimum balance for rent exempt for ${space} bytes: ${Number(rentInLamports) / Number(config.LAMPORTS_PER_SOL)} lamports.`,
);

const newAccount = await generateKeyPairSigner();
const createAccountInstruction = getCreateAccountInstruction({
  payer: wallet,
  newAccount: newAccount,
  lamports: rentInLamports,
  space: space,
  programAddress: SYSTEM_PROGRAM_ADDRESS,
});

const seeds = ["solana"];
const [pda, bump] = await getProgramDerivedAddress({
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    seeds: seeds,
})
console.log(`PDA Off Curve: ${isOffCurveAddress(pda)}`);

const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(wallet, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) => appendTransactionMessageInstruction(createAccountInstruction, tx),
);

const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

const transactionToSend = {...signedTransaction, lifetimeConstraint: latestBlockhash}

try {
    await sendAndConfirmTransactionFactory({rpc, rpcSubscriptions})(transactionToSend, {commitment: "confirmed"});
} catch (error) {
    if(isSolanaError(error, SOLANA_ERROR__BLOCKHASH_STRING_LENGTH_OUT_OF_RANGE)) {
        console.log(`blockhash expired`);
        throw error;
    } else {
        throw error;
    }
}   

const transactionSignature = getSignatureFromTransaction(signedTransaction);
console.log(`Transaction Signature for create account: ${transactionSignature}`);