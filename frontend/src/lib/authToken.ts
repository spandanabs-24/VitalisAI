import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "vitalis_session";

export function getAuthSecretKey() {
  const raw =
    process.env.AUTH_SECRET || "vitalis-dev-secret-min-32-characters!!";
  return new TextEncoder().encode(raw);
}

export async function signSession(email: string): Promise<string> {
  return await new SignJWT({ sub: email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecretKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getAuthSecretKey());
  return payload as { sub?: string };
}
