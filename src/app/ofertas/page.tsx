import { ArrowLeft, Package, ShoppingBasket, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("promotions")
    .select("id,promotional_price_cents,ends_at,products(name,brand,unit,image_url,price_cents,stock)")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("ends_at", { ascending: true });

  const offers = (data || []).flatMap((promotion) => {
    const product = Array.isArray(promotion.products) ? promotion.products[0] : promotion.products;
    return product ? [{ ...promotion, product }] : [];
  });

  return <main className="min-h-screen bg-[#ffd900] text-[#111315]">
    <div className="hazard-stripe h-2" />
    <header className="border-b-4 border-[#ffd900] bg-[#111315] text-white">
      <div className="mx-auto flex min-h-20 max-w-[1380px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-black uppercase text-[#ffd900]"><ArrowLeft size={19}/> Voltar ao mercado</Link>
        <span className="flex items-center gap-2 text-xs font-black uppercase"><Sparkles size={17}/> Promoções ativas</span>
      </div>
    </header>

    <section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-8 lg:py-16">
      <p className="text-xs font-black uppercase tracking-[.18em]">Preço bom de verdade</p>
      <h1 className="mt-2 text-4xl font-black uppercase sm:text-6xl">Ofertas</h1>
      <p className="mt-3 max-w-xl font-bold text-black/60">Promoções válidas por tempo limitado no Armazém Parada Obrigatória.</p>

      {offers.length ? <div className="mt-10 grid grid-cols-2 gap-3 gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
        {offers.map(({ id, promotional_price_cents, ends_at, product }) => {
          const normal = product.price_cents / 100;
          const promotional = promotional_price_cents / 100;
          const discount = normal > 0 ? Math.round((1 - promotional / normal) * 100) : 0;
          return <article key={id} className="border-2 border-[#111315] bg-white p-2 shadow-[4px_4px_0_#111315] sm:p-3">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#fff1a8]">
              {product.image_url ? <Image src={product.image_url} alt={product.name} fill unoptimized className="object-contain p-4" sizes="(max-width: 640px) 50vw, 25vw"/> : <div className="grid h-full place-items-center"><Package size={38} className="text-black/30"/></div>}
              <span className="absolute left-2 top-2 border-2 border-[#111315] bg-[#ffd900] px-2 py-1 text-[10px] font-black uppercase">Oferta{discount > 0 ? ` -${discount}%` : ""}</span>
            </div>
            <div className="pt-4">
              <p className="text-[11px] font-bold uppercase text-black/50">{product.brand || "Armazém"} · {product.unit || "unidade"}</p>
              <h2 className="mt-1 min-h-10 text-sm font-black leading-5 sm:text-base">{product.name}</h2>
              <p className="mt-3 text-xs text-black/50 line-through">{money(normal)}</p>
              <p className="text-xl font-black">{money(promotional)}</p>
              <p className="mt-2 text-[10px] font-bold uppercase text-black/45">Até {new Intl.DateTimeFormat("pt-BR").format(new Date(ends_at))}</p>
              <Link href="/" className="mt-3 flex h-10 items-center justify-center gap-2 border-2 border-[#111315] bg-[#111315] text-xs font-black uppercase text-[#ffd900]"><ShoppingBasket size={15}/> Ver no mercado</Link>
            </div>
          </article>;
        })}
      </div> : <div className="mt-10 grid min-h-72 place-items-center border-4 border-[#111315] bg-white p-8 text-center shadow-[7px_7px_0_#111315]"><div><Sparkles className="mx-auto" size={36}/><h2 className="mt-4 text-xl font-black uppercase">Nenhuma oferta disponível</h2><p className="mt-2 text-sm text-black/55">Novas promoções aparecerão aqui assim que forem cadastradas.</p><Link href="/" className="mt-6 inline-flex bg-[#111315] px-5 py-3 text-sm font-black uppercase text-[#ffd900]">Ver todos os produtos</Link></div></div>}
    </section>
  </main>;
}

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
