import {
  createKeyPairSignerFromBytes,
  getBase58Encoder,
  type KeyPairSigner,
} from "@solana/kit";
import fs from "fs";
import path from "path";

export async function loadSignerFromFile(
  file: string = "pri.json",
): Promise<KeyPairSigner<string>> {
  const resolvedPath = path.resolve(`./src/wallet/id/${file}`);
  const fileData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  var loadedKeyBytes;
  if (typeof fileData === "string") {
    loadedKeyBytes = Uint8Array.from(
      getBase58Encoder().encode(
        JSON.parse(fs.readFileSync(resolvedPath, "utf8")),
      ),
    );
  } else {
    loadedKeyBytes = new Uint8Array(
      JSON.parse(fs.readFileSync(resolvedPath, "utf-8")) as number[],
    );
  }

  const keypairSigner = await createKeyPairSignerFromBytes(loadedKeyBytes);
  return keypairSigner;
}
