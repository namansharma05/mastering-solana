import {
  address,
  createKeyPairSignerFromBytes,
  generateKeyPairSigner,
  getBase58Decoder,
  getBase58Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  isOffCurveAddress,
  signBytes,
  verifySignature,
} from "@solana/kit";
import fs from "fs";
import bs58 from "bs58";

const randomKeypair = await generateKeyPairSigner();
console.log(`Random Keypair: ${randomKeypair.address}`, randomKeypair);

const privateKeyArrayBase58 = JSON.parse(
  fs.readFileSync("./src/wallet/id/nam.json", "utf-8"),
) as number[];
console.log(`Priavte Key Array Base 58: ${typeof privateKeyArrayBase58}`); // Object

const privateKeyBytes = new Uint8Array(privateKeyArrayBase58);
console.log(`Private Key Bytes: ${typeof privateKeyBytes}`); // Object

const restorePrivateKeyArrayBase58 =
  await createKeyPairSignerFromBytes(privateKeyBytes);
console.log(
  `Restored Private Key Address from Base 58 Array: ${restorePrivateKeyArrayBase58.address}`,
); // final output

const privateKeyBase58String = fs
  .readFileSync("./src/wallet/id/pri.json")
  .toString();
const privateKeyBase58Slice = privateKeyBase58String.slice(
  1,
  privateKeyBase58String.length - 1,
);
console.log(`Private Key Base 58: `, typeof privateKeyBase58Slice); // string

const restoredSigner58 = await createKeyPairSignerFromBytes(
  getBase58Encoder().encode(privateKeyBase58Slice),
);

const primaryWalletAddress = address(restoredSigner58.address);
console.log(`Off curve: `, isOffCurveAddress(primaryWalletAddress));

const message = getUtf8Encoder().encode("Hello, Solana World!");
console.log(`Encoded Message: ${message}`); // array of bytes

const signedBytes = await signBytes(
  restoredSigner58.keyPair.privateKey,
  message,
);
console.log(
  `Restored Signer 58 private key: `,
  restoredSigner58.keyPair.privateKey,
); // private key not extractable using this method or any method
console.log(`Signed Bytes: ${signedBytes}`); // array of bytes

const decodedMessage = getBase58Decoder().decode(signedBytes);
console.log(`Decoded Message: ${decodedMessage}`); // message signature

const verifySign = await verifySignature(
  restoredSigner58.keyPair.publicKey,
  signedBytes,
  message,
);
console.log(`Verified Signature: ${verifySign}`);
