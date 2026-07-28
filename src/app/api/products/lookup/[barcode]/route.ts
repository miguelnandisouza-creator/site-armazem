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

const verifiedProducts: Record<string, ImportedProduct> = {
  "7791293035857": {
    barcode: "7791293035857",
    name: "Desodorante Antitranspirante Rexona Men Active Dry",
    brand: "Rexona",
    category: "Higiene",
    unit: "200 ml",
    image: "",
  },
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
  const localProduct =
    importedProducts.find((product) => product.barcode === barcode) ??
    verifiedProducts[barcode];
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
  if (/pet-food|dog-food|cat-food|animal-food/.test(value)) return "Pet";
  if (/baby-food|diaper|nappies|feeding-bottle|pacifier/.test(value)) return "Bebê";
  if (/cleaning|detergent|disinfectant|laundry|household-cleaner/.test(value)) return "Limpeza";
  if (/hygiene|cosmetic|shampoo|deodorant|toothpaste|body-care|hair-care/.test(value)) return "Higiene";
  if (/frozen|ice-cream|pizza|ready-meal/.test(value)) return "Congelados";
  if (/meat|poultry|sausage|bacon/.test(value)) return "Carnes";
  if (/beverage|drink|juice|water|soda|beer|wine/.test(value)) return "Bebidas";
  if (/cheese|yogurt|dairy|cold-cut/.test(value)) return "Frios";
  if (/bread|fresh-bakery/.test(value)) return "Padaria";
  if (/fresh-fruit|fresh-vegetable|fresh-produce/.test(value)) return "Hortifruti";
  return "Mercearia";
}
