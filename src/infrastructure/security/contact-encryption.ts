import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { getEnv } from "@/src/infrastructure/config/env";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const raw = getEnv().CONTACT_ENCRYPTION_KEY;
  if (!raw) {
    if (getEnv().APP_ENV === "test" || getEnv().APP_ENV === "development") {
      return createHash("sha256").update("startup-automation-scout:local-protected-values").digest();
    }
    return null;
  }
  // Allow base64 or hex or raw utf8 if 32 bytes
  let key: Buffer;
  if (/^[A-Za-z0-9+/=]{44}$/.test(raw)) {
    key = Buffer.from(raw, "base64");
  } else if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "utf8");
  }
  if (key.length !== 32) {
    key = createHash("sha256").update(raw).digest();
  }
  return key;
}

export function encryptContactValue(plain: string): string {
  const key = getKey();
  if (!key) {
    throw new Error("CONTACT_ENCRYPTION_KEY is required for encryption in production");
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv + tag + ciphertext as base64
  return `enc:${Buffer.concat([iv, tag, enc]).toString("base64")}`;
}

export function decryptContactValue(encrypted: string | null): string | null {
  if (!encrypted) return null;
  if (encrypted.startsWith("plain:")) return encrypted.slice(6);
  if (!encrypted.startsWith("enc:")) return encrypted; // fallback
  const key = getKey();
  if (!key) throw new Error("CONTACT_ENCRYPTION_KEY required to decrypt");
  const data = Buffer.from(encrypted.slice(4), "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return dec.toString("utf8");
}

export function isEncrypted(value: string | null): boolean {
  return !!value && value.startsWith("enc:");
}

export function hashContactValue(channelType: string, value: string): string {
  const key = getKey();
  if (!key) throw new Error("CONTACT_ENCRYPTION_KEY is required to hash protected values");
  return createHmac("sha256", key)
    .update(`${channelType}\u0000${value.trim().toLowerCase()}`)
    .digest("hex");
}

export function maskContactValue(channelType: string, value: string): string {
  const trimmed = value.trim();
  if (channelType === "public_professional_email") {
    const at = trimmed.indexOf("@");
    if (at > 1) return `${trimmed.slice(0, 1)}***${trimmed.slice(at)}`;
    if (at === 1) return `***${trimmed.slice(at)}`;
  }
  if (channelType === "public_profile_url" || channelType === "company_contact_form") return trimmed;
  return trimmed.length > 2 ? `${trimmed.slice(0, 2)}***` : "***";
}

export const encryptProtectedValue = encryptContactValue;
export const decryptProtectedValue = decryptContactValue;
