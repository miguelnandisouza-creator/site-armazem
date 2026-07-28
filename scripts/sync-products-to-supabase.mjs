import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).map((line) => {
    const separator = line.indexOf("=");
    return separator > 0 ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()] : [];
  }).filter((entry) => entry.length === 2));
}

const fileEnv = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_ADMIN_EMAIL;
const password = process.env.SUPABASE_ADMIN_PASSWORD;
if (!url || !key || !email || !password) {
  throw new Error("Defina SUPABASE_ADMIN_EMAIL e SUPABASE_ADMIN_PASSWORD para executar a sincronização.");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) throw new Error(`Falha no login: ${authError.message}`);

const { data: profile, error: profileError } = await supabase
  .from("profiles").select("role").eq("id", authData.user.id).single();
if (profileError) throw profileError;
if (!["admin", "manager", "employee"].includes(profile.role)) {
  throw new Error("A conta informada não possui acesso ativo de funcionário.");
}

const { data: store, error: storeError } = await supabase
  .from("stores").select("id").eq("slug", "armazem-parada-obrigatoria").single();
if (storeError) throw storeError;

const products = JSON.parse(await readFile(new URL("../public/data/imported-products.json", import.meta.url), "utf8"));
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const categoryNames = [...new Set(products.map((product) => product.category))];
const { error: categoryError } = await supabase.from("categories").upsert(
  categoryNames.map((name) => ({ store_id: store.id, name, slug: slugify(name) })),
  { onConflict: "store_id,slug" },
);
if (categoryError) throw categoryError;

const { data: categories, error: categoriesError } = await supabase
  .from("categories").select("id,name").eq("store_id", store.id);
if (categoriesError) throw categoriesError;
const categoryIds = new Map(categories.map((category) => [category.name, category.id]));

for (let offset = 0; offset < products.length; offset += 100) {
  const chunk = products.slice(offset, offset + 100).map((product) => ({
    store_id: store.id,
    category_id: categoryIds.get(product.category),
    ean: product.barcode,
    name: product.name,
    brand: product.brand || null,
    unit: product.unit || null,
    image_url: product.image || null,
    price_cents: Math.round(Number(product.price || 0) * 100),
    stock: Math.max(0, Math.trunc(Number(product.stock || 0))),
    status: product.active ? "active" : "draft",
  }));
  const { error } = await supabase.from("products").upsert(chunk, { onConflict: "store_id,ean" });
  if (error) throw new Error(`Lote ${offset + 1}-${offset + chunk.length}: ${error.message}`);
  console.log(`Sincronizados ${offset + chunk.length}/${products.length}`);
}

const { count, error: countError } = await supabase.from("products")
  .select("id", { count: "exact", head: true }).eq("store_id", store.id);
if (countError) throw countError;
console.log(JSON.stringify({
  sourceProducts: products.length,
  productsInSupabase: count,
  categories: categoryNames.length,
  result: count >= products.length ? "ok" : "incomplete",
}, null, 2));
await supabase.auth.signOut();
