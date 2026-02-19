import { airdropFactory, createSolanaRpc, createSolanaRpcSubscriptions, generateKeyPairSigner, lamports } from "@solana/kit";
import { config } from "../config";

const rpc = createSolanaRpc(config.RPC_HTTP);
const rpcSubscriptions = createSolanaRpcSubscriptions(config.RPC_WS);

async function getSlot() {
    const slotConfirmed = await rpc.getSlot({commitment: "confirmed"}).send();
    const slotFinalized = await rpc.getSlot({commitment: "finalized"}).send();
    const slotProcessed = await rpc.getSlot({commitment: "processed"}).send();
    const slotDefault = await rpc.getSlot().send();

    console.log(`current confirmed slot: ${slotConfirmed}`);
    console.log(`current finalized slot: ${slotFinalized}`);
    console.log(`current processed slot: ${slotProcessed}`);
    console.log(`current default slot: ${slotDefault}`);
}

getSlot();


const wallet = await generateKeyPairSigner();
const {value: solBefore} = await rpc.getBalance(wallet.address).send();
console.log(`Balance ${wallet.address}: ${solBefore / config.LAMPORTS_PER_SOL} SOL.`);

const airdrop = await airdropFactory({rpc, rpcSubscriptions})({
    recipientAddress: wallet.address,
    lamports: lamports(config.LAMPORTS_PER_SOL),
    commitment: "confirmed",
});
console.log(`Airdrop Transaction: ${airdrop}`);

const {value: solAfter} = await rpc.getBalance(wallet.address).send();
console.log(`Balance ${wallet.address}: ${solAfter / config.LAMPORTS_PER_SOL} SOL.`);