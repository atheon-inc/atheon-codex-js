const VERSION = 0x80;
const BLOCK_SIZE = 16;

function decodeBase64Key(keyBase64: string): Uint8Array {
  let standard = keyBase64.replace(/-/g, "+").replace(/_/g, "/");
  while (standard.length % 4 !== 0) {
    standard += "=";
  }

  const binary = globalThis.atob(standard);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }

  if (buf.length !== 32) {
    throw new Error(
      `[atheon-codex] Invalid Fernet key length: expected 32 bytes, got ${buf.length}.`,
    );
  }

  return buf;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export async function fernetEncrypt(
  keyBase64: string,
  plaintext: string,
): Promise<string> {
  const keyBuf = decodeBase64Key(keyBase64);
  const signingKey = keyBuf.subarray(0, 16);
  const encryptionKey = keyBuf.subarray(16, 32);

  const versionBuf = new Uint8Array([VERSION]);
  const timestampBuf = new Uint8Array(8);
  const view = new DataView(timestampBuf.buffer);
  view.setBigUint64(0, BigInt(Math.floor(Date.now() / 1000)), false);

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(BLOCK_SIZE));

  const encKey = await globalThis.crypto.subtle.importKey(
    "raw",
    encryptionKey as unknown as BufferSource,
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  );

  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    encKey,
    plaintextBytes as unknown as BufferSource,
  );
  const ciphertext = new Uint8Array(ciphertextBuffer);

  const hmacInput = concatBytes(versionBuf, timestampBuf, iv, ciphertext);
  const macKey = await globalThis.crypto.subtle.importKey(
    "raw",
    signingKey as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const macBuffer = await globalThis.crypto.subtle.sign(
    "HMAC",
    macKey,
    hmacInput as unknown as BufferSource,
  );
  const mac = new Uint8Array(macBuffer);

  const token = concatBytes(hmacInput, mac);
  return encodeBase64Url(token);
}
