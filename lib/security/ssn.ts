import { createCipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION = "v1";

/**
 * Derive a fixed 32-byte AES key from `SSN_ENCRYPTION_KEY`.
 *
 * This keeps deployment simple (string env var) while always producing
 * the key length required by AES-256-GCM.
 *
 * @throws {Error} if `SSN_ENCRYPTION_KEY` is not configured.
 * @returns a 32-byte encryption key.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.SSN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("SSN_ENCRYPTION_KEY is required to encrypt SSNs");
  }

  // Normalize any strong secret string into a 32-byte key.
  return createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Encrypt an SSN for storage at rest.
 *
 * Output format is `v1:base64(iv):base64(tag):base64(ciphertext)` so
 * future format migrations can coexist safely.
 *
 * @param ssn validated SSN value (9 digits) from signup input.
 * @returns versioned ciphertext payload safe to persist in the DB.
 */
export function encryptSsn(ssn: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(ssn, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${VERSION}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

