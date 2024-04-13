import {
  create,
  verify,
  getNumericDate,
} from "https://deno.land/x/djwt/mod.ts";
import { hash } from "https://deno.land/x/argontwo/mod.ts";

const ENCODER = new TextEncoder();
const JWT_SECRET_KEY = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

export function hashPassword(input: string): [string, string] {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const password = ENCODER.encode(input);
  const hashBuffer = hash(password, salt);
  return [hashBuffer.toString(), salt.toString()];
}

export function verifyPassword(
  input: string,
  inputHash: string,
  salt: string
): boolean {
  const password = ENCODER.encode(input);
  const hashBuffer = hash(password, ENCODER.encode(salt));
  return hashBuffer.toString() === inputHash;
}

export async function createToken(username: string): Promise<string> {
  return await create(
    {
      alg: "HS512",
    },
    { exp: getNumericDate(60 * 60 * 24), username },
    JWT_SECRET_KEY
  );
}

export async function verifyToken(token: string): Promise<any | null> {
  try {
    const payload = await verify(token, JWT_SECRET_KEY, {
      ignoreExp: true,
    });
    return payload;
  } catch (ex) {
    console.error("Error verifying token: ", ex);
    return null;
  }
}
