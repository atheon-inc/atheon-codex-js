import { createCipheriv, createHmac, randomBytes } from "node:crypto";

const VERSION = 0x80;
const BLOCK_SIZE = 16;

function pkcs7Pad(data: Buffer, blockSize = BLOCK_SIZE): Buffer {
  const padLen = blockSize - (data.length % blockSize);
  const padding = Buffer.alloc(padLen, padLen);
  return Buffer.concat([data, padding]);
}

function decodeKey(keyBase64: string): Buffer {
  const standard = keyBase64.replace(/-/g, "+").replace(/_/g, "/");
  const buf = Buffer.from(standard, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `[atheon-codex] Invalid Fernet key length: expected 32 bytes, got ${buf.length}.`,
    );
  }
  return buf;
}

export function fernetEncrypt(keyBase64: string, plaintext: string): string {
  const keyBuf = decodeKey(keyBase64);
  const signingKey = keyBuf.subarray(0, 16);
  const encryptionKey = keyBuf.subarray(16, 32);

  const versionBuf = Buffer.from([VERSION]);
  const timestampBuf = Buffer.alloc(8);
  timestampBuf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));
  const iv = randomBytes(BLOCK_SIZE);

  const padded = pkcs7Pad(Buffer.from(plaintext, "utf8"));
  const cipher = createCipheriv("aes-128-cbc", encryptionKey, iv);
  cipher.setAutoPadding(false);
  const ciphertext = Buffer.concat([cipher.update(padded), cipher.final()]);

  const hmacInput = Buffer.concat([versionBuf, timestampBuf, iv, ciphertext]);
  const mac = createHmac("sha256", signingKey).update(hmacInput).digest();

  const token = Buffer.concat([hmacInput, mac]);
  return token.toString("base64url");
}
