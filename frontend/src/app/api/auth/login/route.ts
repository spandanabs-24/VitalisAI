import { NextResponse } from "next/server";
import { validateSignupEmail } from "@/lib/authValidation";
import { verifyPassword } from "@/lib/password";
import { findUserByEmail } from "@/lib/usersStore";
import { AUTH_COOKIE, signSession } from "@/lib/authToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "");
  const password = String(body.password || "");

  if (!password || password.length > 128) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }
  const emailErr = validateSignupEmail(email);
  if (emailErr) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const user = findUserByEmail(email);
  if (
    !user ||
    !(await verifyPassword(password, user.passwordHash).catch(() => false))
  ) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = await signSession(user.email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
