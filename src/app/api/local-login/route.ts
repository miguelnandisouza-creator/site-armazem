import { NextResponse } from "next/server";

const LOCAL_EMAIL = "admin@local.test";
const LOCAL_PASSWORD = "admin123";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Login local indisponível." }, { status: 403 });
  }

  const { email, password } = await request.json();
  if (email !== LOCAL_EMAIL || password !== LOCAL_PASSWORD) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("local-admin-session", "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
