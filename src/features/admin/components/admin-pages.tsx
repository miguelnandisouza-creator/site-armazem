"use client";

import {
  AlertTriangle, Boxes, CheckCircle2, Clock3, PackagePlus, Save,
  Tags, Trash2, Users,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAdminProducts } from "../hooks/use-admin-products";
import { createClient } from "@/lib/supabase/client";

type Promotion = { id: string; productId: string; productName: string; normalPrice: number; promotionalPrice: number; startsAt: string; endsAt: string; active: boolean };
type TeamUser = { id: string; name: string; email: string; role: string; active: boolean };
const supabase = createClient();

export function AdminDashboard() {
  const products = useAdminProducts();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  useEffect(() => {
    supabase.from("promotions").select("id,product_id,promotional_price_cents,starts_at,ends_at,products(name,price_cents)").then(({ data }) => setPromotions((data || []).flatMap((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      return product ? [{ id: row.id, productId: row.product_id, productName: product.name, normalPrice: product.price_cents / 100, promotionalPrice: row.promotional_price_cents / 100, startsAt: row.starts_at, endsAt: row.ends_at, active: true }] : [];
    })));
    supabase.from("profiles").select("id,full_name,email,role,active").then(({ data }) => setUsers((data || []).map((row) => ({ id: row.id, name: row.full_name || "", email: row.email || "", role: row.role, active: row.active }))));
  }, []);
  const now = new Date();
  const activePromotions = promotions.filter((item) => item.active && new Date(item.startsAt) <= now && new Date(item.endsAt) >= now).length;
  return <AdminPage title="Visão geral" subtitle="Dados atuais do teste local">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Boxes} label="Produtos cadastrados" value={products.length} />
      <Metric icon={CheckCircle2} label="Produtos ativos" value={products.filter((item) => item.active).length} />
      <Metric icon={Tags} label="Promoções ativas" value={activePromotions} />
      <Metric icon={Users} label="Funcionários" value={users.filter((item) => item.active).length} />
    </div>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <section className="border-2 border-[#111315] bg-white p-6 shadow-[5px_5px_0_#111315]"><h2 className="text-xl">Ações rápidas</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><Link href="/admin/produtos" className="flex items-center gap-3 bg-[#ffd900] p-4 font-black uppercase"><PackagePlus/>Cadastrar produto</Link><Link href="/admin/promocoes" className="flex items-center gap-3 bg-[#111315] p-4 font-black uppercase text-[#ffd900]"><Tags/>Criar promoção</Link></div></section>
      <section className="border-2 border-[#111315] bg-white p-6"><h2 className="text-xl">Atenção</h2><div className="mt-5 space-y-3 text-sm"><Notice text={`${products.filter((item) => item.price === 0).length} produtos sem preço`} /><Notice text={`${products.filter((item) => item.stock === 0).length} produtos sem estoque`} /><Notice text={`${promotions.filter((item) => new Date(item.endsAt) < now).length} promoções encerradas`} /></div></section>
    </div>
  </AdminPage>;
}

export function PromotionsPage() {
  const products = useAdminProducts();
  const [items, setItems] = useState<Promotion[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    supabase.from("promotions")
      .select("id,product_id,promotional_price_cents,starts_at,ends_at,products(name,price_cents)")
      .order("starts_at", { ascending: false })
      .then(({ data }) => setItems((data || []).flatMap((row) => {
        const product = Array.isArray(row.products) ? row.products[0] : row.products;
        return product ? [{ id: row.id, productId: row.product_id, productName: product.name, normalPrice: product.price_cents / 100, promotionalPrice: row.promotional_price_cents / 100, startsAt: row.starts_at, endsAt: row.ends_at, active: true }] : [];
      })));
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const product = products.find((item) => item.id === data.get("productId"));
    if (!product) return;
    const { data: store } = await supabase.from("stores").select("id").eq("slug", "armazem-parada-obrigatoria").single();
    if (!store) return;
    const startsAt = String(data.get("startsAt"));
    const endsAt = String(data.get("endsAt"));
    const promotionalPrice = Number(data.get("promotionalPrice"));
    const { data: saved, error } = await supabase.from("promotions").insert({ store_id: store.id, product_id: product.id, promotional_price_cents: Math.round(promotionalPrice * 100), starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString() }).select("id").single();
    if (error) { alert(`Erro ao salvar promoção: ${error.message}`); return; }
    setItems((current) => [{ id: saved.id, productId: product.id, productName: product.name, normalPrice: product.price, promotionalPrice, startsAt, endsAt, active: true }, ...current]);
    setOpen(false);
  }
  return <AdminPage title="Promoções" subtitle="Ofertas separadas do cadastro normal" action={<button onClick={() => setOpen(true)} className="admin-primary"><Tags size={18}/>Nova promoção</button>}>
    <div className="grid gap-4">{items.length ? items.map((promotion) => <article key={promotion.id} className="grid gap-4 border-2 border-[#111315] bg-white p-5 shadow-[4px_4px_0_#d6ad00] sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-black">{promotion.productName}</p><p className="mt-1 text-sm"><span className="line-through">{formatPrice(promotion.normalPrice)}</span> → <b>{formatPrice(promotion.promotionalPrice)}</b></p><p className="mt-2 text-xs text-black/55">{formatDate(promotion.startsAt)} até {formatDate(promotion.endsAt)}</p></div><div className="flex items-center gap-2"><StatusBadge promotion={promotion}/><button onClick={() => setItems((current) => current.filter((item) => item.id !== promotion.id))} className="admin-icon text-red-600"><Trash2 size={17}/></button></div></article>) : <Empty title="Nenhuma promoção criada" text="Crie uma oferta selecionando um produto cadastrado." />}
    </div>
    {open && <Modal title="Nova promoção" onClose={() => setOpen(false)}><form onSubmit={save} className="grid gap-4"><label><span className="field-label">Produto</span><select required name="productId" className="field mt-2"><option value="">Selecione</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} — {product.price ? formatPrice(product.price) : "sem preço"}</option>)}</select></label><label><span className="field-label">Preço promocional</span><input required min="0.01" step="0.01" type="number" name="promotionalPrice" className="field mt-2"/></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Início</span><input required type="datetime-local" name="startsAt" className="field mt-2"/></label><label><span className="field-label">Término</span><input required type="datetime-local" name="endsAt" className="field mt-2"/></label></div><button className="admin-primary mt-2 justify-center"><Save size={18}/>Salvar promoção</button></form></Modal>}
  </AdminPage>;
}

export function CategoriesPage() {
  const products = useAdminProducts();
  const [categoryRows, setCategoryRows] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { void loadCategories(); }, []);
  async function loadCategories() {
    const { data } = await supabase.from("categories").select("id,name").order("name");
    setCategoryRows(data || []);
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    const name = String(new FormData(form).get("name")).trim();
    const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data: store } = await supabase.from("stores").select("id").eq("slug", "armazem-parada-obrigatoria").single();
    if (store && name) await supabase.from("categories").upsert({ store_id: store.id, name, slug }, { onConflict: "store_id,slug" });
    form.reset(); await loadCategories();
  }
  async function remove(id: string) { await supabase.from("categories").delete().eq("id", id); await loadCategories(); }
  return <AdminPage title="Categorias" subtitle="Categorias sincronizadas pelo Supabase"><form onSubmit={add} className="mb-6 flex gap-2"><input required name="name" className="field max-w-md" placeholder="Nova categoria"/><button className="admin-primary">Adicionar</button></form><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categoryRows.map((category) => <article key={category.id} className="flex items-center justify-between border-2 border-[#111315] bg-white p-5"><div><p className="font-black uppercase">{category.name}</p><p className="text-xs text-black/50">{products.filter((item) => item.category === category.name).length} produtos</p></div><button onClick={() => void remove(category.id)} className="admin-icon text-red-600"><Trash2 size={17}/></button></article>)}</div></AdminPage>;
}

export function UsersPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [error, setError] = useState("");
  async function loadUsers() {
    const { data, error: queryError } = await supabase
      .from("profiles").select("id,full_name,email,role,active").order("full_name");
    if (queryError) { setError(queryError.message); return; }
    setUsers((data || []).map((profile) => ({
      id: profile.id,
      name: profile.full_name || "Sem nome",
      email: profile.email || "E-mail não disponível",
      role: profile.role,
      active: profile.active,
    })));
  }
  useEffect(() => {
    supabase.from("profiles").select("id,full_name,email,role,active").order("full_name")
      .then(({ data, error: queryError }) => {
        if (queryError) { setError(queryError.message); return; }
        setUsers((data || []).map((profile) => ({
          id: profile.id,
          name: profile.full_name || "Sem nome",
          email: profile.email || "E-mail não disponível",
          role: profile.role,
          active: profile.active,
        })));
      });
  }, []);
  async function updateUser(id: string, values: Partial<Pick<TeamUser, "role" | "active">>) {
    const { error: updateError } = await supabase.from("profiles").update(values).eq("id", id);
    if (updateError) setError(updateError.message);
    else await loadUsers();
  }
  return <AdminPage title="Usuários" subtitle="Contas, funções e acesso ao painel">
    {error && <p className="mb-5 border-2 border-red-600 bg-red-50 p-4 font-bold text-red-700">Erro: {error}</p>}
    <div className="overflow-x-auto border-2 border-[#111315] bg-white"><table className="w-full min-w-[760px]"><thead className="bg-[#111315] text-left text-xs uppercase text-[#ffd900]"><tr><th className="p-4">Nome</th><th className="p-4">E-mail</th><th className="p-4">Função</th><th className="p-4">Status</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-black/10"><td className="p-4 font-black">{user.name}</td><td className="p-4">{user.email}</td><td className="p-4"><select value={user.role} onChange={(event) => void updateUser(user.id, { role: event.target.value })} className="border-2 border-[#111315] bg-white p-2 font-bold"><option value="customer">Cliente</option><option value="employee">Funcionário</option><option value="manager">Gerente</option><option value="cashier">Caixa</option><option value="admin">Administrador</option></select></td><td className="p-4"><button onClick={() => void updateUser(user.id, { active: !user.active })} className={`px-3 py-2 text-xs font-black uppercase ${user.active ? "bg-[#ffd900]" : "bg-black/10"}`}>{user.active ? "Ativo" : "Bloqueado"}</button></td></tr>)}</tbody></table></div>
  </AdminPage>;
}

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({ storeName: "", whatsapp: "", address: "", openTime: "08:00", closeTime: "21:00" });
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.from("stores").select("name,whatsapp,address,open_time,close_time").eq("slug", "armazem-parada-obrigatoria").single()
      .then(({ data, error: queryError }) => {
        if (queryError) { setError(queryError.message); return; }
        setSettings({ storeName: data.name, whatsapp: data.whatsapp || "", address: data.address || "", openTime: String(data.open_time).slice(0, 5), closeTime: String(data.close_time).slice(0, 5) });
      });
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false); setError("");
    const data = new FormData(event.currentTarget);
    const { error: updateError } = await supabase.from("stores").update({
      name: String(data.get("storeName")), whatsapp: String(data.get("whatsapp")),
      address: String(data.get("address")), open_time: String(data.get("openTime")),
      close_time: String(data.get("closeTime")),
    }).eq("slug", "armazem-parada-obrigatoria");
    if (updateError) setError(updateError.message); else setSaved(true);
  }
  const change = (key: keyof typeof settings, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  return <AdminPage title="Configurações" subtitle="Informações sincronizadas pelo Supabase"><form onSubmit={save} className="grid max-w-2xl gap-5 border-2 border-[#111315] bg-white p-6 shadow-[5px_5px_0_#d6ad00]"><ControlledAdminField name="storeName" label="Nome do mercado" value={settings.storeName} onChange={(value) => change("storeName", value)}/><ControlledAdminField name="whatsapp" label="WhatsApp" value={settings.whatsapp} onChange={(value) => change("whatsapp", value)}/><ControlledAdminField name="address" label="Endereço" value={settings.address} onChange={(value) => change("address", value)}/><div className="grid gap-4 sm:grid-cols-2"><ControlledAdminField name="openTime" label="Abertura" type="time" value={settings.openTime} onChange={(value) => change("openTime", value)}/><ControlledAdminField name="closeTime" label="Fechamento" type="time" value={settings.closeTime} onChange={(value) => change("closeTime", value)}/></div><button className="admin-primary justify-center"><Save size={18}/>Salvar configurações</button>{saved && <p className="bg-green-100 p-3 text-sm font-bold">Configurações salvas no Supabase.</p>}{error && <p className="bg-red-100 p-3 text-sm font-bold text-red-700">Erro: {error}</p>}</form></AdminPage>;
}

function AdminPage({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) { return <main className="min-h-screen p-4 sm:p-7 xl:p-10"><header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#a08100]">Painel administrativo</p><h1 className="mt-1 text-3xl font-black uppercase sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-black/55">{subtitle}</p></div>{action}</header>{children}</main>; }
function Metric({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: number }) { return <article className="border-2 border-[#111315] bg-white p-5 shadow-[4px_4px_0_#d6ad00]"><Icon/><p className="mt-5 text-xs font-black uppercase text-black/45">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></article>; }
function Notice({ text }: { text: string }) { return <p className="flex items-center gap-2 border-l-4 border-[#ffd900] bg-[#f3f1e9] p-3 font-bold"><AlertTriangle size={17}/>{text}</p>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="grid min-h-72 place-items-center border-2 border-dashed border-black/25 bg-white p-8 text-center"><div><Tags className="mx-auto"/><p className="mt-4 font-black uppercase">{title}</p><p className="mt-2 text-sm text-black/50">{text}</p></div></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/65 p-4"><div className="mx-auto my-8 max-w-xl border-2 border-[#111315] bg-[#f3f1e9] shadow-[7px_7px_0_#ffd900]"><header className="flex items-center justify-between bg-[#111315] p-5 text-white"><h2 className="text-xl">{title}</h2><button onClick={onClose} className="admin-icon border-white/25">×</button></header><div className="p-5 sm:p-7">{children}</div></div></div>; }
function StatusBadge({ promotion }: { promotion: Promotion }) { const now = new Date(); const status = !promotion.active ? "Pausada" : new Date(promotion.startsAt) > now ? "Agendada" : new Date(promotion.endsAt) < now ? "Encerrada" : "Ativa"; return <span className="flex items-center gap-1 bg-[#ffd900] px-2 py-1 text-xs font-black uppercase"><Clock3 size={12}/>{status}</span>; }
function ControlledAdminField({ name, label, value, onChange, type = "text" }: { name: string; label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label><span className="field-label">{label}</span><input name={name} type={type} required value={value} onChange={(event) => onChange(event.target.value)} className="field mt-2"/></label>; }
const formatPrice = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
