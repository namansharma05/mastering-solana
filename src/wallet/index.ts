import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";
import fs from "fs";
import path from "path";
import bs58 from "bs58";

export async function loadSignerFromFile(file: string = "pri.json"): Promise<KeyPairSigner<string>> {
    const resolvedPath = path.resolve(`./src/wallet/id/${file}`);
    const loadedKeyBytes = Uint8Array.from(bs58.decode(JSON.parse(fs.readFileSync(resolvedPath, "utf8"))));

    const keypairSigner = await createKeyPairSignerFromBytes(loadedKeyBytes);
    return keypairSigner;
}