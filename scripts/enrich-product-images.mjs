import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/data/imported-products.json", import.meta.url);
const products = JSON.parse(await readFile(file, "utf8"));
const sources = [
  "world.openfoodfacts.org",
  "world.openbeautyfacts.org",
  "world.openproductsfacts.org",
];
const concurrency = 12;
let found = 0;
let checked = 0;

for (const domain of sources) {
  const pending = products.filter((product) => !product.image && /^\d{8,14}$/.test(product.barcode));
  console.log(`Consultando ${domain}: ${pending.length} produtos sem foto`);

  for (let start = 0; start < pending.length; start += concurrency) {
    const batch = pending.slice(start, start + concurrency);
    await Promise.all(batch.map(async (product) => {
      const external = await lookup(domain, product.barcode);
      checked += 1;
      if (!external?.image_front_url) return;
      product.image = external.image_front_url;
      product.name = isBarcodeName(product.name) ? (external.product_name_pt || external.product_name || product.name) : product.name;
      product.brand ||= external.brands?.split(",")[0]?.trim() || "";
      product.unit ||= external.quantity || "";
      found += 1;
    }));
    if (start % 240 === 0) {
      console.log(`${domain}: ${Math.min(start + concurrency, pending.length)}/${pending.length} | fotos encontradas: ${found}`);
    }
  }
  await writeFile(file, `${JSON.stringify(products, null, 2)}\n`);
}

console.log(JSON.stringify({ total: products.length, checked, imagesFound: found, remaining: products.filter((product) => !product.image).length }));

async function lookup(domain, barcode) {
  try {
    const fields = "product_name_pt,product_name,brands,quantity,image_front_url";
    const response = await fetch(`https://${domain}/api/v3/product/${barcode}.json?fields=${fields}`, {
      headers: { "User-Agent": "ArmazemParadaObrigatoria/1.0 (catalog-image-enrichment)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.product || null;
  } catch {
    return null;
  }
}

function isBarcodeName(name) {
  return /^\d{8,14}$/.test(String(name).trim());
}
