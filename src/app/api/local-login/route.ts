import { NextResponse } from "next/server";

const LOCAL_EMAIL = "admin@admin1234";
const LOCAL_PASSWORD = "ADMIN1234";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (String(email).toLowerCase() !== LOCAL_EMAIL || password !== LOCAL_PASSWORD) {
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
