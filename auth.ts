import {
  create,
  verify,
  getNumericDate,
} from "https://deno.land/x/djwt/mod.ts";
import { hash } from "https://deno.land/x/argontwo/mod.ts";

const JWT_SECRET_KEY = "123123123123123123";

export function hashPassword(input: string): [string, string] {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const password = encoder.encode(input);
  const hashBuffer = hash(password, salt);
  return [hashBuffer.toString(), salt.toString()];
}

export function verifyPassword(
  input: string,
  inputHash: string,
  salt: string
): boolean {
  const encoder = new TextEncoder();
  const password = encoder.encode(input);
  const hashBuffer = hash(password, encoder.encode(salt));
  return hashBuffer.toString() === inputHash;
}

export async function createToken(username: string): Promise<string> {
  return await create(
    { alg: "HS512", typ: "JWT" },
    { exp: getNumericDate(60 * 60 * 24), username },
    JWT_SECRET_KEY as any
  );
}

export async function verifyToken(token: string): Promise<any | null> {
  try {
    const payload = await verify(token, JWT_SECRET_KEY as any);
    return payload;
  } catch {
    return null;
  }
}
