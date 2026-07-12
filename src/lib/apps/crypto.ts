import CryptoJS from "crypto-js";

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY is not set");
  return key;
}

// Must stay AES passphrase-mode via crypto-js (not Node's aes-256-gcm) — this ciphertext is
// shared with the HappyKids mobile app and the app-secrets tool against the same Firestore
// projects, and both decrypt with this exact scheme.
export function encrypt(plain: string): string {
  return CryptoJS.AES.encrypt(plain, getEncryptionKey()).toString();
}

export function decrypt(cipher: string): string {
  try {
    return CryptoJS.AES.decrypt(cipher, getEncryptionKey()).toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}
