"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/local-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(data.get("email")),
        password: String(data.get("password")),
      }),
    });
    if (!response.ok) { setError("E-mail ou senha inválidos."); setLoading(false); return; }
    router.replace("/admin"); router.refresh();
  }

  return <main className="grid min-h-screen place-items-center bg-[#111315] p-5 text-white"><div className="absolute inset-x-0 top-0 h-3 [background:repeating-linear-gradient(45deg,#fff200_0,#fff200_22px,#111315_22px,#111315_44px)]"/><section className="w-full max-w-md rounded-[2rem] bg-white p-7 text-[#111315] shadow-2xl sm:p-10"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#111315] text-xl font-black text-[#fff200]">A</span><div className="font-black leading-5">Armazém<br/>Parada Obrigatória</div></div><div className="mt-10"><p className="text-xs font-black tracking-[.18em] text-black/45">ÁREA RESTRITA</p><h1 className="mt-2 text-3xl font-black tracking-tight">Entrar no painel</h1><p className="mt-2 text-sm leading-6 text-black/55">Acesso local temporário para testar o painel administrativo.</p></div><form onSubmit={signIn} className="mt-8 space-y-4"><label className="block text-sm font-bold">E-mail<div className="mt-2 flex items-center gap-3 rounded-xl border border-black/12 px-3"><Mail size={18} className="text-black/45"/><input required name="email" type="email" defaultValue="admin@local.test" className="h-12 w-full outline-none" placeholder="seu@email.com"/></div></label><label className="block text-sm font-bold">Senha<div className="mt-2 flex items-center gap-3 rounded-xl border border-black/12 px-3"><LockKeyhole size={18} className="text-black/45"/><input required name="password" type="password" defaultValue="admin123" className="h-12 w-full outline-none" placeholder="Sua senha"/></div></label>{error && <p className="rounded-xl bg-[#fff9bd] p-3 text-sm font-semibold">{error}</p>}<button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111315] text-sm font-black text-[#fff200] disabled:opacity-60">{loading ? "Entrando..." : "Entrar no painel"}<ArrowRight size={18}/></button></form></section></main>;
}
