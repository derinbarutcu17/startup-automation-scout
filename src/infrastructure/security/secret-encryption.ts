import { decryptProtectedValue, encryptProtectedValue } from "@/src/infrastructure/security/contact-encryption";

export function encryptSecretValue(value: string): string {
  return encryptProtectedValue(value);
}

export function decryptSecretValue(value: string | null): string | null {
  return decryptProtectedValue(value);
}
