import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  lamports,
} from "@solana/kit";
import { config } from "../config";
import { loadSignerFromFile } from "../wallet";

const rpc = createSolanaRpc(config.RPC_HTTP);
const rpcSubscriptions = createSolanaRpcSubscriptions(config.RPC_WS);

const wallet = await loadSignerFromFile();

const abortController = new AbortController();

const notifications = await rpcSubscriptions
  .accountNotifications(wallet.address, { commitment: "confirmed" })
  .subscribe({ abortSignal: abortController.signal });

(async () => {
  for await (const notification of notifications) {
    console.log(`Websocket Notification:`, notification);
    console.log(
      `Lamports Balance: ${Number(notification.value.lamports / config.LAMPORTS_PER_SOL)} SOL.`,
    );
    abortController.abort();
  }
})();

const airdropSignature = await rpc
  .requestAirdrop(wallet.address, lamports(config.LAMPORTS_PER_SOL * 10n), {
    commitment: "confirmed",
  })
  .send();

while (true) {
    const status = await rpc.getSignatureStatuses([airdropSignature]).send();
    const confirmedStatus = status.value?.[0]?.confirmationStatus;
    if(confirmedStatus === "confirmed") {
        console.log(`Airdrop Status: ${confirmedStatus}`);
        break;
    }
    await new Promise((r) => setTimeout(r, 1000));
}