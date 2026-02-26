import {
  address,
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  isOffCurveAddress,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { config } from "../config";
import { loadSignerFromFile } from "../wallet";
import {
  getBurnCheckedInstruction,
  getCloseAccountInstruction,
} from "@solana-program/token";

// connection to cluster
const rpc = createSolanaRpc(config.RPC_HTTP);
const rpcSubscriptions = createSolanaRpcSubscriptions(config.RPC_WS);

// primary wallet
const wallet = await loadSignerFromFile(); // 29KKX9fQspSenNUibR9fxJCLvwGfozFPGbt486SF8JqY
// ATA to close
const tokenAccountToClose = address(
  "HxGmL2szj2Ztr6A3REyYPPc9uCMEdYJYW6EKtewRvtyK",
);
// mint address
const mintAddress = address("4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R");

// latest blockhash
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// get the token account to transfer the tokens to
const receiverTokenAccounts = await rpc
  .getTokenAccountsByOwner(
    wallet.address,
    { programId: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") },
    { encoding: "jsonParsed" },
  )
  .send();

// getting all the token addresses associated with an owner (29KKX9fQspSenNUibR9fxJCLvwGfozFPGbt486SF8JqY)
const receiverTokenAddress = receiverTokenAccounts.value.find(
  (item) =>
    item.account.data.parsed &&
    "info" in item.account.data.parsed &&
    item.account.data.parsed.info.mint === mintAddress,
);

// verifying if the received token addres is the actual account to close
console.log(
  "Verified Token Address: ",
  receiverTokenAddress?.pubkey === tokenAccountToClose
    ? "Verified"
    : "Not Verified",
);

// get the token amount and token decimal
const tokenAmount =
  receiverTokenAddress?.account.data.parsed.info.tokenAmount.amount ?? 0n;
const tokenDecimals =
  receiverTokenAddress?.account.data.parsed.info.tokenAmount.decimals ?? 6;

// burning tokens before closing ATA account
const burnInstruction = getBurnCheckedInstruction({
  account: tokenAccountToClose,
  mint: mintAddress,
  authority: wallet.address,
  amount: BigInt(tokenAmount),
  decimals: tokenDecimals,
});
// close account instruction
const closeAccountInstruction = getCloseAccountInstruction({
  account: tokenAccountToClose,
  destination: wallet.address,
  owner: wallet,
});

// tranaction close message
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

// signing transaction
const signedTransaction = await signTransactionMessageWithSigners(
  transactionCloseMessage,
);

try {
  // sending and confirming transaction
  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(
    { ...signedTransaction, lifetimeConstraint: latestBlockhash },
    { commitment: "confirmed" },
  );
} catch (e) {
  // catching error
  throw e;
}
