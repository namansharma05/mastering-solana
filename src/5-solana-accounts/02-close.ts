import {
  address,
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  isSolanaError,
  pipe,
  sendAndConfirmTransactionFactory,
  sendTransactionWithoutConfirmingFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { config } from "../config";
import { loadSignerFromFile } from "../wallet";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getBurnCheckedInstruction, getCloseAccountInstruction } from "@solana-program/token";

const rpc = createSolanaRpc(config.RPC_HTTP);
const rpcSubscriptions = createSolanaRpcSubscriptions(config.RPC_WS);

const wallet = await loadSignerFromFile();
const accountToClose = address("HxGmL2szj2Ztr6A3REyYPPc9uCMEdYJYW6EKtewRvtyK");
const mintAddress = address("4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R");

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// Get the token account we're closing
const { value: accountInfo } = await rpc
  .getAccountInfo(accountToClose, {
    encoding: "jsonParsed",
  })
  .send();

if (!accountInfo) {
  console.error("Account not found!");
  process.exit(1);
}

console.log("Account Info:", accountInfo);
const solBalance = Number(accountInfo.lamports) / Number(config.LAMPORTS_PER_SOL);
console.log(`SOL Balance: ${solBalance} SOL`);
console.log("Wallet address:", wallet.address);

// Parse the token account data to get token amount
const parsedData = (accountInfo.data as any).parsed;
const tokenAmount = BigInt(parsedData.info.tokenAmount.amount);
const tokenDecimal = parsedData.info.tokenAmount.decimals;
const tokenOwner = address(parsedData.info.owner);

console.log("Token Amount:", tokenAmount.toString());
console.log("Token Decimals:", tokenDecimal);
console.log("Token Owner:", tokenOwner);

// Verify the wallet owns this account
if (tokenOwner !== wallet.address) {
  console.error("Wallet does not own this token account!");
  process.exit(1);
}

// Create burn instruction
const burnInstruction = getBurnCheckedInstruction({
  account: accountToClose,
  mint: mintAddress,
  authority: wallet.address,
  amount: tokenAmount,
  decimals: tokenDecimal,
});

// Create close account instruction
const closeAccountInstruction = getCloseAccountInstruction({
  account: accountToClose,
  destination: wallet.address,
  owner: wallet,
});

console.log("Instructions created");

const transactionCloseMessage = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(wallet, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) =>
    appendTransactionMessageInstructions(
      [burnInstruction, closeAccountInstruction],
      tx,
    ),
);

const signedTransaction = await signTransactionMessageWithSigners(
  transactionCloseMessage,
);

console.log("Transaction signed, sending...");

try {
  await sendTransactionWithoutConfirmingFactory({ rpc })(
    signedTransaction,
    { commitment: "confirmed" },
  );
} catch (e) {
  console.error("❌ Transaction failed:", isSolanaError(e) ? e.message : String(e));
  if (isSolanaError(e) && e.context) {
    console.error("Error context:", e.context);
  }
  throw e;
}