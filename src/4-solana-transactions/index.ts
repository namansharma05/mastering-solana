import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  isSolanaError,
  lamports,
  pipe,
  prependTransactionMessageInstructions,
  sendTransactionWithoutConfirmingFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
} from "@solana/kit";
import { config } from "../config";
import { loadSignerFromFile } from "../wallet";
import { getTransferSolInstruction } from "@solana-program/system";
import { getAddMemoInstruction } from "@solana-program/memo";
import {
  estimateComputeUnitLimitFactory,
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from "@solana-program/compute-budget";

// connect with solana cluster
const rpc = createSolanaRpc(config.RPC_HTTP);
const rpcSubscription = createSolanaRpcSubscriptions(config.RPC_WS);

// sender and receiver wallets
const wallet = await loadSignerFromFile(); // 29KKX9fQspSenNUibR9fxJCLvwGfozFPGbt486SF8JqY
const receiver = await loadSignerFromFile("nam.json"); // NamnBppe88Kw1Nm9owQ7DFtScUKR2nkq6w48YesZDa3

// amount of sol to transfer from wallet to receiver address
const transferAmount = lamports(config.LAMPORTS_PER_SOL / 100n); // 0.01 SOL

// memo message
const memoMessage = "Hello, Solana Transaction!";

// subscribe to log notifications
const abortController = new AbortController();
const notifications = await rpcSubscription
  .logsNotifications(
    { mentions: [wallet.address] },
    { commitment: "processed" },
  )
  .subscribe({ abortSignal: abortController.signal });

(async () => {
  for await (const notification of notifications) {
    const logContainsMemo = notification.value.logs.some((log) =>
      log.includes(memoMessage),
    );
    console.log(
      `Transaction found: https://solscan.io/tx/${notification.value.signature}`,
      notification.value.logs,
    );
    if (logContainsMemo) abortController.abort();
  }
})();

// transfer sol Instruction
const transferSolInstruction = getTransferSolInstruction({
  source: wallet,
  destination: receiver.address,
  amount: transferAmount,
});

// memo message instruction
const memoInstruction = getAddMemoInstruction({
  memo: memoMessage,
});

// latest blockhash
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// transaction message
const transactionMessage = await pipe(
  createTransactionMessage({ version: "legacy" }),
  (tx) => setTransactionMessageFeePayerSigner(wallet, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) =>
    appendTransactionMessageInstructions(
      [transferSolInstruction, memoInstruction],
      tx,
    ),
);

// simulation to get the exact compute units
const computeUnitsEstimate = await estimateComputeUnitLimitFactory({ rpc })(
  transactionMessage,
);
console.log(`Compute Units Estimate: ${computeUnitsEstimate} CU`);

// transaction message with compute units
const budgetTransactionMessage = prependTransactionMessageInstructions(
  [getSetComputeUnitLimitInstruction({ units: computeUnitsEstimate })],
  transactionMessage,
);

// adding a priority fee with compute units in transaction message
const prioTransactionMessage = prependTransactionMessageInstructions(
  [
    getSetComputeUnitLimitInstruction({ units: computeUnitsEstimate * 1.1 }),
    getSetComputeUnitPriceInstruction({ microLamports: 1_000_000 }),
  ],
  transactionMessage,
);

// sign transaction
const signedTransaction = await signTransactionMessageWithSigners(
  prioTransactionMessage,
);
console.log(`transaction signature: `, signedTransaction);

// send transaction
try {
  await sendTransactionWithoutConfirmingFactory({ rpc })(signedTransaction, {
    commitment: "confirmed",
    skipPreflight: true,
  });
} catch (error) {
  if (isSolanaError(error, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)) {
    console.error(`Block hash height exceeded`);
  } else {
    throw error;
  }
}
