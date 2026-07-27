"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import {
  ArrowLeft, Barcode, Camera, Check, Edit3, PackagePlus, Power,
  Search, Trash2, X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emptyProduct, type LocalProduct, type ProductDraft } from "./types";

const categories = ["Mercearia", "Bebidas", "Frios", "Padaria", "Hortifruti", "Limpeza", "Higiene"];
const supabase = createClient();

export function ProductManager() {
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fetch("/data/imported-products.json")
        .then((response) => response.json())
        .then((importedProducts: LocalProduct[]) => {
          const merged = new Map(importedProducts.map((product) => [product.barcode, product]));
          return supabase
            .from("products")
            .select("id,ean,name,brand,unit,image_url,price_cents,stock,status,created_at,categories(name)")
            .then(({ data, error }) => {
              if (error) throw error;
              (data || []).forEach((row) => {
                const relation = Array.isArray(row.categories) ? row.categories[0] : row.categories;
                if (!row.ean) return;
                merged.set(row.ean, {
                  id: row.id,
                  barcode: row.ean,
                  name: row.name,
                  brand: row.brand || "",
                  category: relation?.name || "Mercearia",
                  unit: row.unit || "",
                  image: row.image_url || "",
                  price: row.price_cents / 100,
                  stock: row.stock,
                  active: row.status === "active",
                  createdAt: row.created_at,
                });
              });
              setProducts([...merged.values()]);
            });
        })
        .catch(() => setProducts([]));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const filtered = useMemo(() => {
    const term = query.toLocaleLowerCase("pt-BR");
    return products.filter((product) =>
      `${product.name} ${product.brand} ${product.barcode}`.toLocaleLowerCase("pt-BR").includes(term),
    );
  }, [products, query]);

  function openNew() {
    setDraft(emptyProduct);
    setEditingId(null);
    setLookupMessage("");
    setFormOpen(true);
  }

  function edit(product: LocalProduct) {
    const { id, createdAt, ...values } = product;
    void createdAt;
    setDraft(values);
    setEditingId(id);
    setLookupMessage("");
    setFormOpen(true);
  }

  async function lookup(barcode = draft.barcode) {
    const normalized = barcode.replace(/\D/g, "");
    setDraft((current) => ({ ...current, barcode: normalized }));
    if (!/^\d{8,14}$/.test(normalized)) {
      setLookupMessage("Digite ou leia um código com 8 a 14 números.");
      return;
    }
    setLookingUp(true);
    setLookupMessage("Consultando produto...");
    try {
      const response = await fetch(`/api/products/lookup/${normalized}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!data.found) {
        setLookupMessage("Produto não encontrado. Complete os dados manualmente.");
        return;
      }
      setDraft((current) => ({
        ...current,
        barcode: normalized,
        name: data.product.name || current.name,
        brand: data.product.brand || current.brand,
        unit: data.product.unit || current.unit,
        image: data.product.image || current.image,
        category: data.product.suggestedCategory || current.category,
      }));
      setLookupMessage("Produto encontrado. Confira os dados e informe preço e estoque.");
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : "Erro ao consultar produto.");
    } finally {
      setLookingUp(false);
    }
  }

  async function saveProductToSupabase(values: ProductDraft, currentId: string | null) {
    setLookupMessage("Salvando no Supabase...");
    const { data: store, error: storeError } = await supabase
      .from("stores").select("id").eq("slug", "armazem-parada-obrigatoria").single();
    if (storeError) {
      setLookupMessage(`Erro ao localizar o mercado: ${storeError.message}`);
      return false;
    }
    const slug = values.category.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .upsert({ store_id: store.id, name: values.category, slug }, { onConflict: "store_id,slug" })
      .select("id").single();
    if (categoryError) {
      setLookupMessage(`Erro ao salvar categoria: ${categoryError.message}`);
      return false;
    }
    const payload = {
      store_id: store.id,
      category_id: category.id,
      ean: values.barcode,
      name: values.name,
      brand: values.brand || null,
      unit: values.unit || null,
      image_url: values.image || null,
      price_cents: Math.round(values.price * 100),
      stock: values.stock,
      status: values.active ? "active" : "draft",
    };
    const result = currentId && !currentId.startsWith("import-")
      ? await supabase.from("products").update(payload).eq("id", currentId)
      : await supabase.from("products").upsert(payload, { onConflict: "store_id,ean" });
    if (result.error) {
      setLookupMessage(`Erro ao salvar produto: ${result.error.message}`);
      return false;
    }
    return true;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const synced = await saveProductToSupabase(draft, editingId);
    if (!synced) return;
    if (products.some((item) => item.barcode === draft.barcode && item.id !== editingId)) {
      setLookupMessage("Já existe um produto com esse código de barras.");
      return;
    }
    if (editingId) {
      setProducts((current) => current.map((item) =>
        item.id === editingId ? { ...item, ...draft } : item,
      ));
    } else {
      setProducts((current) => [{
        ...draft,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }, ...current]);
    }
    setFormOpen(false);
  }

  return <main className="min-h-screen bg-[#f3f1e9] text-[#111315]">
    <div className="hazard-stripe h-2" />
    <header className="border-b-4 border-[#ffd900] bg-[#111315] text-white">
      <div className="mx-auto flex min-h-20 max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="grid h-10 w-10 place-items-center border border-white/20" aria-label="Voltar ao painel"><ArrowLeft size={19} /></Link>
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffd900]">Painel administrativo</p><h1 className="text-xl font-black uppercase sm:text-2xl">Produtos</h1></div>
        </div>
        <button onClick={openNew} className="flex h-11 items-center gap-2 bg-[#ffd900] px-4 text-sm font-black uppercase text-[#111315]"><PackagePlus size={18} /> <span className="hidden sm:inline">Novo produto</span></button>
      </div>
    </header>

    <section className="mx-auto max-w-[1400px] px-4 py-7 sm:px-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Produtos cadastrados" value={products.length} />
        <Metric label="Produtos ativos" value={products.filter((item) => item.active).length} />
        <Metric label="Estoque zerado" value={products.filter((item) => item.stock === 0).length} />
      </div>
      <div className="mt-7 flex h-12 items-center gap-3 border-2 border-[#111315] bg-white px-4">
        <Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full outline-none" placeholder="Buscar por nome, marca ou código de barras" />
      </div>

      <div className="mt-6 overflow-x-auto border-2 border-[#111315] bg-white shadow-[5px_5px_0_#111315]">
        {filtered.length ? <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-[#111315] text-xs uppercase text-[#ffd900]"><tr><th className="p-4">Produto</th><th className="p-4">Código</th><th className="p-4">Preço</th><th className="p-4">Estoque</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr></thead>
          <tbody>{filtered.map((product) => <tr key={product.id} className="border-b border-black/10 last:border-0">
            <td className="p-4"><div className="flex items-center gap-3">{product.image ? <Image src={product.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 object-contain" /> : <span className="grid h-12 w-12 place-items-center bg-[#eee]"><Barcode size={20} /></span>}<div><p className="font-black">{product.name}</p><p className="text-xs text-black/55">{product.brand} · {product.unit}</p></div></div></td>
            <td className="p-4 font-mono text-xs">{product.barcode}</td><td className="p-4 font-black">{formatPrice(product.price)}</td><td className="p-4">{product.stock}</td>
            <td className="p-4"><button onClick={() => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, active: !item.active } : item))} className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-black uppercase ${product.active ? "bg-[#ffd900]" : "bg-black/10"}`}><Power size={12} />{product.active ? "Ativo" : "Inativo"}</button></td>
            <td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => edit(product)} className="grid h-9 w-9 place-items-center border border-black/20" aria-label={`Editar ${product.name}`}><Edit3 size={16} /></button><button onClick={() => confirm(`Excluir ${product.name}?`) && setProducts((current) => current.filter((item) => item.id !== product.id))} className="grid h-9 w-9 place-items-center border border-black/20 text-red-600" aria-label={`Excluir ${product.name}`}><Trash2 size={16} /></button></div></td>
          </tr>)}</tbody>
        </table> : <div className="grid min-h-72 place-items-center p-8 text-center"><div><Barcode className="mx-auto" size={38} /><h2 className="mt-4 text-xl font-black uppercase">Nenhum produto cadastrado</h2><p className="mt-2 text-sm text-black/55">Comece lendo o código de barras de um produto.</p><button onClick={openNew} className="mt-5 bg-[#ffd900] px-5 py-3 text-sm font-black uppercase">Cadastrar produto</button></div></div>}
      </div>
    </section>

    {formOpen && <ProductForm draft={draft} setDraft={setDraft} editing={Boolean(editingId)} lookupMessage={lookupMessage} lookingUp={lookingUp} onLookup={() => lookup()} onScan={() => setScannerOpen(true)} onClose={() => setFormOpen(false)} onSave={save} />}
    {scannerOpen && <BarcodeScanner onClose={() => setScannerOpen(false)} onDetected={(code) => { setScannerOpen(false); void lookup(code); }} />}
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="border-2 border-[#111315] bg-white p-5 shadow-[4px_4px_0_#d6ad00]"><p className="text-xs font-black uppercase text-black/50">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></article>;
}

function ProductForm({ draft, setDraft, editing, lookupMessage, lookingUp, onLookup, onScan, onClose, onSave }: {
  draft: ProductDraft; setDraft: React.Dispatch<React.SetStateAction<ProductDraft>>;
  editing: boolean; lookupMessage: string; lookingUp: boolean; onLookup: () => void;
  onScan: () => void; onClose: () => void; onSave: (event: FormEvent) => void;
}) {
  const update = (field: keyof ProductDraft, value: string | number | boolean) => setDraft((current) => ({ ...current, [field]: value }));
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-3 sm:p-6"><form onSubmit={onSave} className="mx-auto my-3 w-full max-w-3xl border-2 border-[#111315] bg-[#f3f1e9] shadow-[8px_8px_0_#ffd900]">
    <header className="flex items-center justify-between bg-[#111315] p-5 text-white"><div><p className="text-xs font-black uppercase text-[#ffd900]">{editing ? "Editar cadastro" : "Novo cadastro"}</p><h2 className="text-2xl">Produto</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center border border-white/20"><X /></button></header>
    <div className="grid gap-5 p-5 sm:p-7">
      <div><label className="field-label">Código de barras</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input required value={draft.barcode} onChange={(event) => update("barcode", event.target.value.replace(/\D/g, ""))} className="field flex-1 font-mono" inputMode="numeric" maxLength={14} placeholder="7890000000000" /><button type="button" onClick={onScan} className="flex h-12 items-center justify-center gap-2 bg-[#111315] px-4 text-sm font-black uppercase text-[#ffd900]"><Camera size={18} /> Usar câmera</button><button type="button" disabled={lookingUp} onClick={onLookup} className="h-12 border-2 border-[#111315] px-4 text-sm font-black uppercase disabled:opacity-50">Buscar</button></div>{lookupMessage && <p className="mt-2 bg-[#fff3ad] p-3 text-sm font-bold">{lookupMessage}</p>}</div>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Nome do produto" value={draft.name} onChange={(value) => update("name", value)} required /><Field label="Marca" value={draft.brand} onChange={(value) => update("brand", value)} /></div>
      <div className="grid gap-5 sm:grid-cols-2"><label><span className="field-label">Categoria</span><select value={draft.category} onChange={(event) => update("category", event.target.value)} className="field mt-2">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><Field label="Peso ou volume" value={draft.unit} onChange={(value) => update("unit", value)} placeholder="Ex.: 500 g, 1 L" /></div>
      <Field label="URL da imagem" value={draft.image} onChange={(value) => update("image", value)} type="url" placeholder="Preenchida automaticamente quando disponível" />
      <div className="grid gap-5 sm:grid-cols-2"><NumberField label="Preço normal (R$)" value={draft.price} onChange={(value) => update("price", value)} step="0.01" /><NumberField label="Estoque" value={draft.stock} onChange={(value) => update("stock", value)} step="1" /></div>
      <label className="flex items-center gap-3 border-2 border-[#111315] bg-white p-4 font-black"><input type="checkbox" checked={draft.active} onChange={(event) => update("active", event.target.checked)} className="h-5 w-5 accent-[#d6ad00]" /> Produto ativo na loja</label>
    </div>
    <footer className="flex justify-end gap-3 border-t-2 border-[#111315] bg-white p-5"><button type="button" onClick={onClose} className="h-11 px-4 font-black uppercase">Cancelar</button><button className="flex h-11 items-center gap-2 bg-[#ffd900] px-5 font-black uppercase"><Check size={18} /> Salvar produto</button></footer>
  </form></div>;
}

function Field({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return <label><span className="field-label">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field mt-2" placeholder={placeholder} /></label>;
}
function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (value: number) => void; step: string }) {
  return <label><span className="field-label">{label}</span><input required type="number" min="0" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="field mt-2" /></label>;
}

function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState("");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  useEffect(() => {
    let active = true;
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromConstraints({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    }, videoRef.current!, (result) => {
      if (result && active) {
        active = false;
        controlsRef.current?.stop();
        onDetected(result.getText());
      }
    }).then((controls) => {
      controlsRef.current = controls;
      setTorchAvailable(Boolean(controls.switchTorch));
    }).catch(() => setError("Não foi possível abrir a câmera traseira. Verifique a permissão do navegador."));
    return () => { active = false; controlsRef.current?.stop(); };
  }, [onDetected]);
  async function toggleTorch() {
    if (!controlsRef.current?.switchTorch) return;
    try {
      await controlsRef.current.switchTorch(!torchOn);
      setTorchOn((current) => !current);
    } catch {
      setTorchAvailable(false);
    }
  }
  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("manualBarcode")).replace(/\D/g, "");
    if (/^\d{8,14}$/.test(code)) onDetected(code);
    else setError("Digite um código com 8 a 14 números.");
  }
  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-black p-4"><section className="mx-auto my-4 w-full max-w-xl text-white"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase text-[#ffd900]">Câmera traseira</p><h2 className="text-2xl">Aponte para o código</h2></div><button onClick={onClose} className="grid h-11 w-11 place-items-center border border-white/30"><X /></button></div><div className="relative overflow-hidden border-4 border-[#ffd900] bg-black"><video ref={videoRef} className="aspect-[3/4] w-full object-cover sm:aspect-[4/3]" muted playsInline autoPlay /><div className="pointer-events-none absolute inset-x-[6%] top-1/2 h-24 -translate-y-1/2 border-2 border-[#ffd900]"><div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_red]" /></div></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm text-white/65">Mantenha as barras inteiras dentro do retângulo.</p>{torchAvailable && <button onClick={toggleTorch} className="shrink-0 border border-[#ffd900] px-3 py-2 text-xs font-black uppercase text-[#ffd900]">{torchOn ? "Apagar luz" : "Acender luz"}</button>}</div>{error && <p className="mt-4 bg-red-600 p-3 font-bold">{error}</p>}<div className="my-5 flex items-center gap-3 text-xs font-black uppercase text-white/35"><span className="h-px flex-1 bg-white/20"/>ou digite o código<span className="h-px flex-1 bg-white/20"/></div><form onSubmit={submitManual} className="flex gap-2"><input name="manualBarcode" required inputMode="numeric" maxLength={14} className="h-12 min-w-0 flex-1 border-2 border-[#ffd900] bg-white px-3 font-mono text-[#111315] outline-none" placeholder="Código de barras"/><button className="bg-[#ffd900] px-4 text-sm font-black uppercase text-[#111315]">Buscar</button></form></section></div>;
}

const formatPrice = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
