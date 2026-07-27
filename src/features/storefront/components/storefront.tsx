"use client";

import {
  ArrowRight, Check, ChevronRight, Clock3, Croissant, Heart, Home, Leaf,
  MapPin, Menu, MessageCircle, Minus, Package, Plus, Search, ShoppingBasket,
  Sparkles, Store, UserRound, X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { categories, formatPrice, products as demoProducts, type CatalogProduct } from "../data/catalog";
import type { LocalProduct } from "@/features/admin/products/types";

const categoryIcons = { leaf: Leaf, croissant: Croissant, package: Package, bottle: Store, sandwich: ShoppingBasket, sparkles: Sparkles };
const ACTIVATE_ALL_MIGRATION = "armazem:migration:activate-all-v1";

export function Storefront() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Mercearia");
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(24);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<number[]>([]);
  const [list, setList] = useState<number[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setFavorites(JSON.parse(localStorage.getItem("armazem:favorites") || "[]"));
      setList(JSON.parse(localStorage.getItem("armazem:list") || "[]"));
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem("armazem:admin-products");
      let localProducts: LocalProduct[] = saved ? JSON.parse(saved) : [];
      if (!localStorage.getItem(ACTIVATE_ALL_MIGRATION)) {
        localProducts = localProducts.map((product) => ({ ...product, active: true }));
        localStorage.setItem("armazem:admin-products", JSON.stringify(localProducts));
        localStorage.setItem(ACTIVATE_ALL_MIGRATION, "done");
      }
      fetch("/data/imported-products.json")
        .then((response) => response.json())
        .then((importedProducts: LocalProduct[]) => {
          const merged = new Map(importedProducts.map((product) => [product.barcode, product]));
          localProducts
            .filter((product) => !product.id.startsWith("import-"))
            .forEach((product) => merged.set(product.barcode, product));
          const active = [...merged.values()].filter((product) => product.active);
          setCatalogProducts(active.map(toCatalogProduct));
        })
        .catch(() => setCatalogProducts(demoProducts));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("armazem:favorites", JSON.stringify(favorites)); }, [favorites, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("armazem:list", JSON.stringify(list)); }, [list, hydrated]);

  const visible = useMemo(() => catalogProducts.filter((product) => {
    const term = query.toLocaleLowerCase("pt-BR");
    return (category === "Todos" || product.category === category)
      && `${product.name} ${product.brand} ${product.category}`.toLocaleLowerCase("pt-BR").includes(term);
  }), [catalogProducts, category, query]);
  const listedProducts = catalogProducts.filter((product) => list.includes(product.id));

  const toggle = (id: number, setter: React.Dispatch<React.SetStateAction<number[]>>) =>
    setter((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <main className="min-h-screen bg-[#f3f1e9] pb-20 text-[#111315] md:pb-0">
      <div className="hazard-stripe h-2" />
      <header className="sticky top-0 z-40 border-b-4 border-[#ffd900] bg-[#111315]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-17 max-w-[1380px] items-center gap-5 px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#ffd900]"><Image src="/images/logo.png" alt="Logo Armazém Parada Obrigatória" fill priority className="object-cover" sizes="44px" /></span>
            <span className="hidden text-[14px] font-extrabold uppercase leading-[1.05] sm:block">Armazém<br /><b className="text-[#ffd900]">Parada Obrigatória</b></span>
          </Link>
          <nav className="ml-4 hidden items-center gap-6 text-sm font-semibold lg:flex">
            <Link href="/ofertas">Ofertas</Link><a href="#categorias">Categorias</a><a href="#mercado">O mercado</a>
          </nav>
          <label className="mx-auto hidden h-11 max-w-xl flex-1 items-center gap-3 border-2 border-[#ffd900] bg-white px-4 text-[#111315] md:flex">
            <Search size={18} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleLimit(24); }} className="w-full bg-transparent text-sm outline-none" placeholder="Buscar produto, marca ou categoria" />
            {query && <button aria-label="Limpar busca" onClick={() => { setQuery(""); setVisibleLimit(24); }}><X size={16} /></button>}
          </label>
          <button className="hidden items-center gap-2 text-sm font-semibold xl:flex"><MapPin size={17} />Tubarão, SC</button>
          <button onClick={() => setDrawer(true)} className="relative ml-auto grid h-10 w-10 place-items-center bg-[#ffd900] text-[#111315]" aria-label="Abrir lista de compras">
            <ShoppingBasket size={19} />
            {list.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#f4c430] px-1 text-[10px] font-black text-[#17251d]">{list.length}</span>}
          </button>
          <Link href="/login" className="grid h-10 w-10 place-items-center border-2 border-[#ffd900] text-[#ffd900] transition hover:bg-[#ffd900] hover:text-[#111315]" aria-label="Entrar ou criar conta"><UserRound size={22} /></Link>
          <button className="grid h-10 w-10 place-items-center border border-[#17251d]/12 lg:hidden" aria-label="Abrir menu"><Menu size={20} /></button>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <label className="flex h-11 items-center gap-3 border border-[#17251d]/12 bg-white px-4"><Search size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleLimit(24); }} className="w-full bg-transparent text-sm outline-none" placeholder="O que você procura?" /></label>
        </div>
      </header>

      <section className="mx-auto max-w-[1380px] px-4 pt-4 sm:px-6 lg:px-10 lg:pt-7">
        <div className="hero-grid relative min-h-[520px] overflow-hidden border-4 border-[#111315] bg-[#111315] text-white lg:min-h-[600px]">
          <Image src="/images/hero-market.png" alt="Sacola com alimentos frescos e produtos do mercado" fill priority className="object-cover object-[62%_center]" sizes="(max-width: 768px) 100vw, 1380px" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.98)_0%,rgba(0,0,0,.92)_38%,rgba(0,0,0,.16)_74%)]" />
          <div className="relative z-10 flex min-h-[520px] max-w-2xl flex-col justify-center px-6 py-12 sm:px-12 lg:min-h-[600px] lg:px-16">
            <p className="mb-5 flex w-fit -rotate-2 items-center gap-2 bg-[#ffd900] px-3 py-2 text-xs font-black uppercase text-[#111315]"><Sparkles size={15} /> ofertas toda semana</p>
            <h1 className="max-w-xl text-4xl font-black uppercase leading-[.92] tracking-[-.04em] sm:text-6xl lg:text-7xl">Preço baixo é parada obrigatória.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/78 sm:text-lg">Qualidade de perto, preço justo e uma lista inteligente para você ganhar tempo todos os dias.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/ofertas" className="inline-flex h-12 items-center gap-2 border-2 border-[#ffd900] bg-[#ffd900] px-5 text-sm font-black uppercase text-[#111315]">Ver ofertas <ArrowRight size={17} /></Link>
              <button onClick={() => setDrawer(true)} className="h-12 border border-white/35 bg-white/8 px-5 text-sm font-bold backdrop-blur">Abrir minha lista</button>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 hidden border-l-4 border-t-4 border-[#111315] bg-[#ffd900] p-5 text-[#111315] sm:flex sm:items-center sm:gap-4">
            <span className="grid h-10 w-10 place-items-center bg-[#111315] text-[#ffd900]"><Clock3 size={20} /></span>
            <div><p className="text-xs text-[#637067]">Hoje</p><p className="text-sm font-extrabold">Aberto até as 21h</p></div>
          </div>
        </div>
      </section>

      <section id="categorias" className="mx-auto max-w-[1380px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <div className="mb-7 flex items-end justify-between"><div><p className="eyebrow">Corredores</p><h2>Encontre sem perder tempo</h2></div><button onClick={() => { setCategory("Todos"); setVisibleLimit(24); }} className="hidden items-center gap-1 text-sm font-bold sm:flex">Ver todas as categorias <ChevronRight size={17} /></button></div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
          {categories.map((item) => {
            const Icon = categoryIcons[item.icon];
            const active = category === item.name;
            return <button key={item.name} onClick={() => { setCategory(item.name); setVisibleLimit(24); document.querySelector("#produtos")?.scrollIntoView({ behavior: "smooth" }); }} className={`group flex min-h-28 flex-col items-center justify-center border-2 p-3 transition sm:min-h-36 ${active ? "border-[#111315] bg-[#ffd900] text-[#111315] shadow-[5px_5px_0_#111315]" : "border-[#111315]/15 bg-white hover:-translate-y-1 hover:border-[#111315]"}`}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#111315] text-[#ffd900]"><Icon size={21} /></span>
              <span className="mt-3 text-xs font-extrabold sm:text-sm">{item.name}</span>
            </button>;
          })}
        </div>
      </section>

      <section id="produtos" className="border-y-4 border-[#111315] bg-[#f3f1e9] py-14 lg:py-20">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-10">
          <div className="mb-7 flex items-end justify-between gap-5"><div><p className="eyebrow">Preço bom de verdade</p><h2>{query ? `Resultados para “${query}”` : category !== "Todos" ? category : "Ofertas para aproveitar"}</h2><p className="mt-2 text-sm font-bold text-[#111315]/65">{visible.length} produtos encontrados</p></div><span className="hidden rotate-1 bg-[#111315] px-3 py-2 text-xs font-black uppercase text-[#ffd900] sm:block">Preços válidos esta semana</span></div>
          {category === "Todos" && !query
            ? <AllCategorySections products={catalogProducts} limits={categoryLimits} setLimits={setCategoryLimits} favorites={favorites} setFavorites={setFavorites} list={list} setList={setList} toggle={toggle} />
            : visible.length ? <>
              <motion.div layout className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence>{visible.slice(0, visibleLimit).map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} listed={list.includes(product.id)} onFavorite={() => toggle(product.id, setFavorites)} onList={() => toggle(product.id, setList)} />)}</AnimatePresence>
              </motion.div>
              {visible.length > visibleLimit && <div className="mt-10 text-center"><button onClick={() => setVisibleLimit((current) => current + 24)} className="border-2 border-[#111315] bg-[#111315] px-6 py-3 text-sm font-black uppercase text-[#ffd900]">Ver mais {category}</button></div>}
            </> : <div className="grid min-h-64 place-items-center border border-dashed border-[#111315]/20 text-center"><div><Search className="mx-auto text-[#d6ad00]" /><p className="mt-4 font-extrabold">Nenhum produto encontrado</p><button onClick={() => { setQuery(""); setCategory("Mercearia"); setVisibleLimit(24); }} className="mt-2 text-sm font-bold text-[#d6ad00]">Limpar filtros</button></div></div>}
        </div>
      </section>

      <section id="mercado" className="mx-auto grid max-w-[1380px] gap-4 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-10 lg:py-20">
        <div className="border-4 border-[#111315] bg-[#ffd900] p-7 sm:p-10"><p className="eyebrow">Pertinho de você</p><h2 className="max-w-md">Seu mercado de bairro, agora no seu bolso.</h2><p className="mt-4 max-w-lg text-sm leading-6">Monte sua lista antes de sair de casa, acompanhe as ofertas e encontre tudo com praticidade.</p><div className="mt-8 flex gap-8 text-sm"><div><b className="block text-xl">Seg–Sáb</b>8h às 21h</div><div><b className="block text-xl">Domingo</b>8h às 13h</div></div></div>
        <div className="flex min-h-72 flex-col justify-between border-4 border-[#111315] bg-[#111315] p-7 text-white sm:p-10"><MessageCircle size={32} className="text-[#ffd900]" /><div><h2 className="max-w-md">Fale com quem resolve.</h2><p className="mt-3 text-sm text-white/70">Dúvidas sobre produtos, encomendas ou disponibilidade? Chame no WhatsApp.</p><a href="https://wa.me/5548999999999" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#ffd900]">Iniciar conversa <ArrowRight size={16} /></a></div></div>
      </section>

      <footer className="border-t border-[#17251d]/10 px-4 py-8"><div className="mx-auto flex max-w-[1300px] flex-col justify-between gap-4 text-xs text-[#637067] sm:flex-row"><p>© 2026 Armazém Parada Obrigatória</p><Link href="/login" className="font-bold text-[#17251d]">Acesso administrativo</Link></div></footer>
      <nav className="fixed bottom-0 z-30 grid h-17 w-full grid-cols-4 border-t border-[#17251d]/10 bg-white md:hidden">
        <a href="#" className="mobile-nav active"><Home size={19} />Início</a><a href="#produtos" className="mobile-nav"><Search size={19} />Buscar</a><button className="mobile-nav" onClick={() => setCategory("Todos")}><Heart size={19} />Favoritos</button><button className="mobile-nav" onClick={() => setDrawer(true)}><ShoppingBasket size={19} />Lista</button>
      </nav>
      <AnimatePresence>{drawer && <ShoppingDrawer products={listedProducts} onClose={() => setDrawer(false)} onRemove={(id) => toggle(id, setList)} />}</AnimatePresence>
    </main>
  );
}

function AllCategorySections({ products, limits, setLimits, favorites, setFavorites, list, setList, toggle }: {
  products: CatalogProduct[];
  limits: Record<string, number>;
  setLimits: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  favorites: number[];
  setFavorites: React.Dispatch<React.SetStateAction<number[]>>;
  list: number[];
  setList: React.Dispatch<React.SetStateAction<number[]>>;
  toggle: (id: number, setter: React.Dispatch<React.SetStateAction<number[]>>) => void;
}) {
  return <div className="space-y-14">{categories.map((categoryItem) => {
    const items = products.filter((product) => product.category === categoryItem.name);
    const limit = limits[categoryItem.name] || 8;
    if (!items.length) return null;
    return <section key={categoryItem.name}>
      <div className="mb-5 flex items-end justify-between border-b-2 border-[#111315] pb-3"><div><p className="text-xs font-black uppercase tracking-widest">{items.length} produtos</p><h3 className="text-2xl font-black uppercase sm:text-3xl">{categoryItem.name}</h3></div></div>
      <motion.div layout className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
        {items.slice(0, limit).map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} listed={list.includes(product.id)} onFavorite={() => toggle(product.id, setFavorites)} onList={() => toggle(product.id, setList)} />)}
      </motion.div>
      {items.length > limit && <div className="mt-8 text-center"><button onClick={() => setLimits((current) => ({ ...current, [categoryItem.name]: limit + 12 }))} className="border-2 border-[#111315] bg-[#111315] px-6 py-3 text-sm font-black uppercase text-[#ffd900]">Ver mais {categoryItem.name}</button></div>}
    </section>;
  })}</div>;
}

function ProductCard({ product, favorite, listed, onFavorite, onList }: { product: CatalogProduct; favorite: boolean; listed: boolean; onFavorite: () => void; onList: () => void }) {
  const discount = product.previousPrice ? Math.round((1 - product.price / product.previousPrice) * 100) : 0;
  const unavailable = product.stock === 0;
  return <motion.article layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group min-w-0 border-2 border-[#111315] bg-white p-2 shadow-[4px_4px_0_#111315] sm:p-3">
    <div className="relative aspect-[4/3] overflow-hidden" style={{ background: product.accent }}>
      {product.image ? <Image src={product.image} alt={product.name} fill unoptimized className="object-contain p-4 transition duration-500 group-hover:scale-[1.04]" sizes="(max-width: 640px) 50vw, 25vw" /> : <div className="grid h-full place-items-center bg-[#eeeae0] text-center"><div><Package size={36} className="mx-auto text-black/35" /><p className="mt-2 px-4 text-[10px] font-black uppercase text-black/40">Imagem em breve</p></div></div>}
      {product.tag && <span className="absolute left-2 top-2 -rotate-2 border-2 border-[#111315] bg-[#ffd900] px-2 py-1 text-[10px] font-black uppercase text-[#111315] sm:left-3 sm:top-3">{product.tag}</span>}
      {unavailable && <span className="absolute bottom-2 left-2 bg-[#111315] px-2 py-1 text-[10px] font-black uppercase text-white">Indisponível</span>}
      <button onClick={onFavorite} aria-label={favorite ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`} className="absolute right-2 top-2 grid h-9 w-9 place-items-center bg-white/95 shadow-sm sm:right-3 sm:top-3"><Heart size={17} className={favorite ? "fill-[#d83b36] text-[#d83b36]" : ""} /></button>
    </div>
    <div className="pt-4"><p className="text-[11px] font-bold uppercase text-[#758078]">{product.brand} · {product.unit}</p><h3 className="mt-1 min-h-10 text-sm font-extrabold leading-5 sm:text-base">{product.name}</h3>
      <div className="mt-3 flex min-h-11 items-end justify-between gap-2"><div>{product.previousPrice && <p className="text-[11px] text-[#60605c] line-through">{formatPrice(product.previousPrice)}</p>}<p className="text-lg font-black text-[#111315] sm:text-xl">{product.price > 0 ? formatPrice(product.price) : "Consulte o preço"}</p></div>{discount > 0 && <span className="bg-[#ffd900] px-2 py-1 text-[11px] font-black text-[#111315]">-{discount}%</span>}</div>
      <button disabled={unavailable} onClick={onList} className={`mt-3 flex h-10 w-full items-center justify-center gap-2 border-2 border-[#111315] text-xs font-black uppercase transition disabled:cursor-not-allowed disabled:border-black/20 disabled:bg-black/10 disabled:text-black/40 ${listed ? "bg-[#ffd900] text-[#111315]" : "bg-[#111315] text-[#ffd900] hover:bg-[#ffd900] hover:text-[#111315]"}`}>{unavailable ? "Sem estoque" : listed ? <><Check size={15} /> Na lista</> : <><ShoppingBasket size={15} /> Adicionar</>}</button>
    </div>
  </motion.article>;
}

function ShoppingDrawer({ products: items, onClose, onRemove }: { products: CatalogProduct[]; onClose: () => void; onRemove: (id: number) => void }) {
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(items.map((product) => [product.id, 1])),
  );
  const knownTotal = items.reduce((sum, product) => sum + product.price * (quantities[product.id] || 1), 0);
  const pendingPrices = items.filter((product) => product.price === 0).length;

  function changeQuantity(product: CatalogProduct, change: number) {
    setQuantities((current) => {
      const maximum = product.stock && product.stock > 0 ? product.stock : 99;
      const next = Math.max(1, Math.min(maximum, (current[product.id] || 1) + change));
      return { ...current, [product.id]: next };
    });
  }

  function sendOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const productLines = items.map((product) => {
      const quantity = quantities[product.id] || 1;
      const price = product.price > 0 ? formatPrice(product.price * quantity) : "preço a confirmar";
      return `• ${quantity}x ${product.name} — ${price}`;
    });
    const message = [
      "🛒 *NOVO PEDIDO — ARMAZÉM*",
      "",
      `*Cliente:* ${data.get("customerName")}`,
      `*Telefone:* ${data.get("customerPhone")}`,
      `*Endereço:* ${data.get("address")}`,
      `*Pagamento:* ${data.get("payment")}`,
      "",
      "*PRODUTOS*",
      ...productLines,
      "",
      `*Total dos itens com preço:* ${formatPrice(knownTotal)}`,
      pendingPrices ? `⚠️ ${pendingPrices} ${pendingPrices === 1 ? "produto está" : "produtos estão"} com preço a confirmar.` : "",
      data.get("notes") ? `*Observações:* ${data.get("notes")}` : "",
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/5548999627339?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return <><motion.button aria-label="Fechar pedido" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" /><motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-[#f3f1e9] shadow-2xl">
    <header className="flex min-h-20 items-center justify-between border-b-2 border-[#111315] px-5 py-4"><div><p className="text-xs font-black uppercase text-[#d6ad00]">Finalizar pelo WhatsApp</p><h2 className="text-xl">Meu pedido · {items.length} {items.length === 1 ? "item" : "itens"}</h2></div><button onClick={onClose} className="grid h-10 w-10 place-items-center border-2 border-[#111315]" aria-label="Fechar"><X size={19} /></button></header>
    <div className="flex-1 overflow-y-auto">
      {items.length ? <form id="order-form" onSubmit={sendOrder}>
        <div className="space-y-4 p-5">{items.map((product) => <div key={product.id} className="flex gap-3 border-b border-[#111315]/10 pb-4"><div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden bg-[#eeeae0]">{product.image ? <Image src={product.image} alt="" fill unoptimized className="object-contain p-2" sizes="80px" /> : <Package className="text-black/30" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{product.name}</p><p className="mt-1 text-sm font-black text-[#a08100]">{product.price > 0 ? formatPrice(product.price) : "Preço a confirmar"}</p><div className="mt-2 inline-flex items-center border-2 border-[#111315]"><button type="button" onClick={() => changeQuantity(product, -1)} className="grid h-8 w-8 place-items-center" aria-label="Diminuir quantidade"><Minus size={14} /></button><span className="grid h-8 min-w-9 place-items-center border-x-2 border-[#111315] text-xs font-black">{quantities[product.id] || 1}</span><button type="button" onClick={() => changeQuantity(product, 1)} className="grid h-8 w-8 place-items-center" aria-label="Aumentar quantidade"><Plus size={14} /></button></div></div><button type="button" onClick={() => onRemove(product.id)} aria-label={`Remover ${product.name}`} className="self-start text-red-600"><X size={17} /></button></div>)}</div>
        <div className="border-y-2 border-[#111315] bg-white p-5"><h3 className="text-lg font-black uppercase">Dados para entrega</h3><div className="mt-4 grid gap-4"><OrderField label="Nome" name="customerName" required placeholder="Quem receberá o pedido?" /><OrderField label="Telefone" name="customerPhone" required type="tel" placeholder="(48) 99999-9999" /><OrderField label="Endereço completo" name="address" required placeholder="Rua, número, bairro e referência" /><label><span className="field-label">Forma de pagamento</span><select required name="payment" className="field mt-2"><option value="">Selecione</option><option>PIX</option><option>Dinheiro</option><option>Cartão na entrega</option></select></label><label><span className="field-label">Observações</span><textarea name="notes" rows={3} className="mt-2 w-full border-2 border-[#111315] bg-white p-3 outline-none" placeholder="Troco, horário ou instruções para entrega" /></label></div></div>
      </form> : <div className="grid h-full min-h-96 place-items-center p-6 text-center"><div><ShoppingBasket className="mx-auto text-[#d6ad00]" size={34} /><p className="mt-4 font-extrabold">Seu pedido está vazio</p><p className="mt-1 text-sm text-[#686862]">Adicione produtos para fazer seu pedido.</p><button onClick={onClose} className="mt-5 text-sm font-bold text-[#d6ad00]">Explorar produtos</button></div></div>}
    </div>
    {items.length > 0 && <footer className="border-t-2 border-[#111315] bg-white p-5"><div className="flex items-end justify-between"><div><p className="text-sm text-[#60605c]">Total conhecido</p>{pendingPrices > 0 && <p className="mt-1 text-xs font-bold text-[#a08100]">{pendingPrices} {pendingPrices === 1 ? "preço pendente" : "preços pendentes"}</p>}</div><p className="text-2xl font-black">{formatPrice(knownTotal)}</p></div><button form="order-form" className="mt-4 flex h-12 w-full items-center justify-center gap-2 border-2 border-[#111315] bg-[#ffd900] text-sm font-black uppercase text-[#111315]"><MessageCircle size={19} /> Enviar pedido pelo WhatsApp</button><p className="mt-2 text-center text-[10px] text-[#60605c]">Você poderá conferir a mensagem antes de enviá-la.</p></footer>}
  </motion.aside></>;
}

function OrderField({ label, name, required, type = "text", placeholder }: { label: string; name: string; required?: boolean; type?: string; placeholder?: string }) {
  return <label><span className="field-label">{label}</span><input name={name} required={required} type={type} className="field mt-2" placeholder={placeholder} /></label>;
}

function toCatalogProduct(product: LocalProduct): CatalogProduct {
  const accents: Record<string, string> = {
    Mercearia: "#f3dfb8", Bebidas: "#d7e8f2", Frios: "#e8e2f2",
    Padaria: "#f1d5b5", Hortifruti: "#dce8c9", Limpeza: "#d7e9e5", Higiene: "#eaddef",
  };
  return {
    id: hashBarcode(product.barcode),
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    category: product.category,
    unit: product.unit,
    image: product.image,
    price: product.price,
    stock: product.stock,
    accent: accents[product.category] || "#eeeae0",
  };
}

function hashBarcode(barcode: string) {
  return barcode.split("").reduce((hash, digit) => ((hash * 31) + Number(digit)) | 0, 7);
}
