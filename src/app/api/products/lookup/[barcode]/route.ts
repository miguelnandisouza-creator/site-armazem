import { readFile } from "node:fs/promises";
import path from "node:path";

type ExternalProduct = {
  product_name_pt?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  categories_tags?: string[];
};

type ImportedProduct = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  image: string;
};

let importedProductsPromise: Promise<ImportedProduct[]> | undefined;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const { barcode } = await params;
  if (!/^\d{8,14}$/.test(barcode)) {
    return Response.json({ error: "Código de barras inválido." }, { status: 400 });
  }

  const importedProducts = await loadImportedProducts();
  const localProduct = importedProducts.find((product) => product.barcode === barcode);
  if (localProduct) {
    return Response.json({
      found: true,
      source: "store",
      product: {
        barcode,
        name: localProduct.name,
        brand: localProduct.brand,
        unit: localProduct.unit,
        image: localProduct.image,
        suggestedCategory: localProduct.category,
      },
    });
  }

  const sources = [
    { domain: "world.openfoodfacts.org", category: "" },
    { domain: "world.openbeautyfacts.org", category: "Higiene" },
    { domain: "world.openproductsfacts.org", category: "" },
  ];
  for (const source of sources) {
    const product = await lookupExternalProduct(source.domain, barcode);
    if (!product) continue;
    return Response.json({
      found: true,
      source: source.domain,
      product: {
        barcode,
        name: product.product_name_pt || product.product_name || "",
        brand: product.brands?.split(",")[0]?.trim() || "",
        unit: product.quantity || "",
        image: product.image_front_url || "",
        suggestedCategory: source.category || inferCategory(product.categories_tags || []),
      },
    });
  }
  return Response.json({ found: false });
}

function loadImportedProducts() {
  importedProductsPromise ??= readFile(
    path.join(process.cwd(), "public", "data", "imported-products.json"),
    "utf8",
  ).then((content) => JSON.parse(content) as ImportedProduct[]);
  return importedProductsPromise;
}

async function lookupExternalProduct(domain: string, barcode: string) {
  const fields = "product_name_pt,product_name,brands,quantity,image_front_url,categories_tags";
  try {
    const response = await fetch(
      `https://${domain}/api/v3/product/${barcode}.json?fields=${fields}`,
      {
        headers: { "User-Agent": "ArmazemParadaObrigatoria/0.1 (cadastro-produtos)" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return null;
    const data = await response.json() as { product?: ExternalProduct };
    return data.product || null;
  } catch {
    return null;
  }
}

function inferCategory(tags: string[]) {
  const value = tags.join(" ").toLowerCase();
  if (/beverage|drink|juice|water|soda|beer|wine/.test(value)) return "Bebidas";
  if (/bread|bakery|cake|biscuit/.test(value)) return "Padaria";
  if (/cheese|dairy|meat|cold-cut/.test(value)) return "Frios";
  if (/fruit|vegetable|produce/.test(value)) return "Hortifruti";
  return "Mercearia";
}
