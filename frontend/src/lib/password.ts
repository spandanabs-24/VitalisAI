import { randomBytes, pbkdf2, timingSafeEqual } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);

/** Tunable for UX; verifyPassword reads iterations from the stored string. */
const ITERATIONS = 120_000;
const KEYLEN = 32;
const DIGEST = "sha256";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await pbkdf2Async(
    password,
    salt,
    ITERATIONS,
    KEYLEN,
    DIGEST
  )) as Buffer;
  return `pbkdf2-sha256$${ITERATIONS}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 60_000) return false;
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  if (salt.length !== 16 || expected.length !== KEYLEN) return false;
  const key = (await pbkdf2Async(
    password,
    salt,
    iterations,
    KEYLEN,
    DIGEST
  )) as Buffer;
  return timingSafeEqual(key, expected);
}
