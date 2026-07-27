"use client";

import { ArrowLeft, ArrowRight, LockKeyhole, Mail, UserPlus, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CustomerAccount = { name: string; email: string; passwordHash: string };
const ACCOUNTS_KEY = "armazem:customer-accounts";
const SESSION_KEY = "armazem:customer-session";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));

    if (mode === "signup") {
      const accounts: CustomerAccount[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
      if (accounts.some((account) => account.email === email)) {
        setError("Já existe uma conta com este e-mail.");
        setLoading(false);
        return;
      }
      const account = { name: String(data.get("name")).trim(), email, passwordHash: await hashPassword(password) };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
      localStorage.setItem(SESSION_KEY, JSON.stringify({ name: account.name, email }));
      setMessage("Conta criada! Você já está conectado.");
      setTimeout(() => router.replace("/"), 700);
      return;
    }

    if (email === "miguelnandisouza@gmail.com") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
      return;
    }

    const accounts: CustomerAccount[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    const passwordHash = await hashPassword(password);
    const account = accounts.find((item) => item.email === email && item.passwordHash === passwordHash);
    if (!account) {
      setError("Conta não encontrada ou senha incorreta.");
      setLoading(false);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ name: account.name, email }));
    router.replace("/");
  }

  return <main className="grid min-h-screen bg-[#111315] text-white lg:grid-cols-[.9fr_1.1fr]">
    <section className="relative hidden overflow-hidden border-r-4 border-[#ffd900] lg:block">
      <Image src="/images/logo.png" alt="Armazém Parada Obrigatória" fill priority className="object-cover opacity-65" sizes="45vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
      <div className="absolute inset-x-10 bottom-10"><p className="text-sm font-black uppercase tracking-[.2em] text-[#ffd900]">Sua conta no Armazém</p><h1 className="mt-3 text-5xl font-black uppercase leading-[.92]">Mais praticidade para seus pedidos.</h1><p className="mt-4 max-w-lg text-white/70">Criar uma conta é opcional. Você também pode continuar comprando sem cadastro.</p></div>
    </section>
    <section className="relative grid min-h-screen place-items-center p-5 sm:p-10">
      <div className="hazard-stripe absolute inset-x-0 top-0 h-3" />
      <Link href="/" className="absolute left-5 top-8 flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"><ArrowLeft size={17}/>Voltar para a loja</Link>
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-3 lg:hidden"><span className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-[#ffd900]"><Image src="/images/logo.png" alt="Logo" fill className="object-cover" sizes="64px"/></span><p className="font-black uppercase">Armazém<br/><b className="text-[#ffd900]">Parada Obrigatória</b></p></div>
        <div className="border-2 border-[#ffd900] bg-white p-6 text-[#111315] shadow-[8px_8px_0_#d6ad00] sm:p-9">
          <div className="grid grid-cols-2 border-2 border-[#111315]">
            <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} className={`flex h-11 items-center justify-center gap-2 text-xs font-black uppercase ${mode === "login" ? "bg-[#111315] text-[#ffd900]" : ""}`}><UserRound size={16}/>Entrar</button>
            <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className={`flex h-11 items-center justify-center gap-2 text-xs font-black uppercase ${mode === "signup" ? "bg-[#111315] text-[#ffd900]" : ""}`}><UserPlus size={16}/>Criar conta</button>
          </div>
          <div className="mt-8"><p className="text-xs font-black uppercase tracking-[.18em] text-[#a08100]">{mode === "login" ? "Acesso à conta" : "Cadastro opcional"}</p><h2 className="mt-2 text-3xl font-black uppercase">{mode === "login" ? "Bem-vindo" : "Criar minha conta"}</h2><p className="mt-2 text-sm leading-6 text-black/55">{mode === "login" ? "Clientes e administradores entram pela mesma tela." : "Facilite seus próximos pedidos. Você pode comprar sem cadastro."}</p></div>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "signup" && <label className="block text-sm font-bold">Nome<div className="mt-2 flex items-center gap-3 border-2 border-[#111315] px-3"><UserRound size={18}/><input required name="name" className="h-12 w-full outline-none" placeholder="Seu nome"/></div></label>}
            <label className="block text-sm font-bold">E-mail<div className="mt-2 flex items-center gap-3 border-2 border-[#111315] px-3"><Mail size={18}/><input required name="email" type="email" className="h-12 w-full outline-none" placeholder="seu@email.com"/></div></label>
            <label className="block text-sm font-bold">Senha<div className="mt-2 flex items-center gap-3 border-2 border-[#111315] px-3"><LockKeyhole size={18}/><input required minLength={6} name="password" type="password" className="h-12 w-full outline-none" placeholder="Mínimo de 6 caracteres"/></div></label>
            {error && <p className="bg-red-100 p-3 text-sm font-bold text-red-700">{error}</p>}
            {message && <p className="bg-green-100 p-3 text-sm font-bold text-green-700">{message}</p>}
            <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 bg-[#ffd900] text-sm font-black uppercase disabled:opacity-60">{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}<ArrowRight size={18}/></button>
          </form>
          <Link href="/" className="mt-5 block text-center text-xs font-bold text-black/50 underline">Continuar sem criar conta</Link>
        </div>
      </div>
    </section>
  </main>;
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
