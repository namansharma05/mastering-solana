import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getCompiledTransactionMessageDecoder,
  isSolanaError,
  lamports,
  pipe,
  prependTransactionMessageInstructions,
  sendTransactionWithoutConfirmingFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  TransactionMessageBytes,
} from "@solana/kit";
import { config } from "../config";
import { loadSignerFromFile } from "../wallet/index";
import { getTransferSolInstruction } from "@solana-program/system";
import { getAddMemoInstruction } from "@solana-program/memo";
import { estimateComputeUnitLimitFactory, getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from "@solana-program/compute-budget";

const rpc = createSolanaRpc(config.RPC_HTTP);
const rpcSubscription = createSolanaRpcSubscriptions(config.RPC_WS);

const wallet = await loadSignerFromFile(); // 29KKX9fQspSenNUibR9fxJCLvwGfozFPGbt486SF8JqY
const receiver = await loadSignerFromFile("nam.json"); // NamnBppe88Kw1Nm9owQ7DFtScUKR2nkq6w48YesZDa3

const transferAmount = lamports(config.LAMPORTS_PER_SOL / 100n); // 0.01 SOL
const memoMessage = "Hello, Solana Transactions!";

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
    if (logContainsMemo) {
      abortController.abort();
    }
  }
})();

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const transferInstruction = getTransferSolInstruction({
  source: wallet,
  destination: receiver.address,
  amount: transferAmount,
});

const memoInstruction = getAddMemoInstruction({ memo: memoMessage });

const transactionMessage = await pipe(
  createTransactionMessage({ version: "legacy" }),
  (tx) => setTransactionMessageFeePayerSigner(wallet, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) =>
    appendTransactionMessageInstructions(
      [transferInstruction, memoInstruction],
      tx,
    ),
);


const estimateComputeUnitLimit = estimateComputeUnitLimitFactory({rpc});
const computeUnitsEstimated = await estimateComputeUnitLimit(transactionMessage);
console.log(`Estimated Compute Units: ${computeUnitsEstimated} CU`);

const budgetedTransactionMessage = prependTransactionMessageInstructions(
  [getSetComputeUnitLimitInstruction({units: computeUnitsEstimated})],
  transactionMessage
);

const prioTransactionMessage = appendTransactionMessageInstructions(
  [getSetComputeUnitLimitInstruction({units: computeUnitsEstimated * 1.1}), getSetComputeUnitPriceInstruction({microLamports: 1_000_000})],
  transactionMessage
)

const signedTransaction =
  await signTransactionMessageWithSigners(prioTransactionMessage);
console.log(`Signed Transaction: `,signedTransaction);

const compiledMessage = getCompiledTransactionMessageDecoder().decode(
  signedTransaction.messageBytes as TransactionMessageBytes,
);
console.log(`Compiled Singed Transaction Message: `, compiledMessage);

try {
  await sendTransactionWithoutConfirmingFactory({rpc})(signedTransaction, {commitment: "confirmed", skipPreflight: true});
} catch (error) {
  if(isSolanaError(error, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)) {
    console.error("This transaction depends on a blockhash that has expired");
  } else {
    throw error;
  }
}