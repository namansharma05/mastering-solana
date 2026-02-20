import {
  createKeyPairSignerFromBytes,
  generateKeyPairSigner,
  getBase58Decoder,
  getBase58Encoder,
  getUtf8Encoder,
  isOffCurveAddress,
  signBytes,
  verifySignature,
} from "@solana/kit";
import fs from "fs";

// Create a Random Signer Keypair
const randomSignerKeypair = await generateKeyPairSigner();
console.log(`Random Signer Keypair Address: ${randomSignerKeypair.address}`);

// Restore a Signer Keypair from Array of Bytes Private Key
const restoreSignerKeypairFromPrivateKeyArrayBytes =
  await createKeyPairSignerFromBytes(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync("./src/wallet/id/nam.json", "utf-8"),
      ) as number[],
    ),
  );
console.log(
  `Restore Singer Keypair From Array Bytes Privatekey: ${restoreSignerKeypairFromPrivateKeyArrayBytes.address}`,
);

// Restore a Signer Keypair from String Private Key
const restoreSignerKeypairFromPrivateKeyString =
  await createKeyPairSignerFromBytes(
    new Uint8Array(
      getBase58Encoder().encode(
        JSON.parse(fs.readFileSync("./src/wallet/id/pri.json", "utf-8")),
      ),
    ),
  );
console.log(
  `Restore Signer Keypair From String Privatekey: ${restoreSignerKeypairFromPrivateKeyString.address}`,
);

// Verify if a keypair is valid Public Key and is on Ed25519 Curve
var isOffCurve = isOffCurveAddress(randomSignerKeypair.address);
console.log(`${randomSignerKeypair.address} is Off Curve? : ${isOffCurve}`);
isOffCurve = isOffCurveAddress(
  restoreSignerKeypairFromPrivateKeyArrayBytes.address,
);
console.log(
  `${restoreSignerKeypairFromPrivateKeyArrayBytes.address} is Off Curve? : ${isOffCurve}`,
);
isOffCurve = isOffCurveAddress(
  restoreSignerKeypairFromPrivateKeyString.address,
);
console.log(
  `${restoreSignerKeypairFromPrivateKeyString.address} is Off Curve? : ${isOffCurve}`,
);

// Sign a message with our Keypair
const message = getUtf8Encoder().encode("Hello, Solana World!");
console.log(`Encoded message: ${message}`);

const signedBytes = await signBytes(
  restoreSignerKeypairFromPrivateKeyArrayBytes.keyPair.privateKey,
  message,
);
console.log(`Signed Bytes: ${signedBytes}`);

const decodeSignedBytes = getBase58Decoder().decode(signedBytes);
console.log(`Decoded Signed Bytes to Base58: ${decodeSignedBytes}`);

// verify if the message is signed using a particular keypair
var verified = await verifySignature(
  randomSignerKeypair.keyPair.publicKey,
  signedBytes,
  message,
);
console.log(
  `Message was signed by ${randomSignerKeypair.address} : ${verified}`,
);

verified = await verifySignature(
  restoreSignerKeypairFromPrivateKeyArrayBytes.keyPair.publicKey,
  signedBytes,
  message,
);
console.log(
  `Message was signed by ${restoreSignerKeypairFromPrivateKeyArrayBytes.address} : ${verified}`,
);

verified = await verifySignature(
  restoreSignerKeypairFromPrivateKeyString.keyPair.publicKey,
  signedBytes,
  message,
);
console.log(
  `Message was signed by ${restoreSignerKeypairFromPrivateKeyString.address} : ${verified}`,
);
