"use client";

import {
  Boxes, LayoutDashboard, LogOut, Menu, Settings, Tags, Users, X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", icon: Boxes },
  { href: "/admin/promocoes", label: "Promoções", icon: Tags },
  { href: "/admin/categorias", label: "Categorias", icon: Boxes },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-[#f3f1e9] text-[#111315]">
    <div className="hazard-stripe fixed inset-x-0 top-0 z-[70] h-2" />
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r-4 border-[#ffd900] bg-[#111315] p-5 pt-8 text-white lg:block">
      <Brand />
      <AdminNavigation pathname={pathname} onNavigate={() => undefined} />
    </aside>
    <header className="sticky top-0 z-40 flex h-18 items-center justify-between border-b-4 border-[#ffd900] bg-[#111315] px-4 pt-2 text-white lg:hidden">
      <Brand compact />
      <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center border border-white/25" aria-label="Abrir menu"><Menu /></button>
    </header>
    {open && <><button onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/60 lg:hidden" aria-label="Fechar menu" /><aside className="fixed inset-y-0 left-0 z-[60] w-[min(86vw,320px)] border-r-4 border-[#ffd900] bg-[#111315] p-5 pt-8 text-white lg:hidden"><div className="flex items-start justify-between"><Brand /><button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center border border-white/25"><X /></button></div><AdminNavigation pathname={pathname} onNavigate={() => setOpen(false)} /></aside></>}
    <div className="lg:pl-64">{children}</div>
  </div>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/admin" className="flex items-center gap-2"><span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#ffd900]"><Image src="/images/logo.png" alt="Logo Armazém Parada Obrigatória" fill priority className="object-cover" sizes="44px" /></span><span className={`${compact ? "text-xs" : "text-sm"} font-black uppercase leading-4`}>Armazém<br/><b className="text-[#ffd900]">Admin</b></span></Link>;
}

function AdminNavigation({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    onNavigate();
    router.replace("/login");
    router.refresh();
  }
  return <nav className="mt-10 space-y-2">{links.map(({ href, label, icon: Icon }) => {
    const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
    return <Link onClick={onNavigate} key={href} href={href} className={`flex items-center gap-3 px-4 py-3 text-sm font-black uppercase transition ${active ? "bg-[#ffd900] text-[#111315]" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon size={18}/>{label}</Link>;
  })}<Link href="/" className="mt-8 flex items-center gap-3 border border-white/15 px-4 py-3 text-sm font-bold text-white/65">← Voltar para a loja</Link><button onClick={() => void logout()} className="flex w-full items-center gap-3 border border-red-400/30 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10"><LogOut size={17}/> Sair da conta</button></nav>;
}
