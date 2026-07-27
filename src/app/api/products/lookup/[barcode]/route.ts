type OpenFoodFactsProduct = {
  product_name_pt?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  categories_tags?: string[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const { barcode } = await params;
  if (!/^\d{8,14}$/.test(barcode)) {
    return Response.json({ error: "Código de barras inválido." }, { status: 400 });
  }

  const fields = "product_name_pt,product_name,brands,quantity,image_front_url,categories_tags";
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${barcode}.json?fields=${fields}`,
      {
        headers: { "User-Agent": "ArmazemParadaObrigatoria/0.1 (cadastro-local)" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      return Response.json({ found: false });
    }

    const data = await response.json() as { product?: OpenFoodFactsProduct };
    if (!data.product) return Response.json({ found: false });

    const product = data.product;
    return Response.json({
      found: true,
      product: {
        barcode,
        name: product.product_name_pt || product.product_name || "",
        brand: product.brands?.split(",")[0]?.trim() || "",
        unit: product.quantity || "",
        image: product.image_front_url || "",
        suggestedCategory: inferCategory(product.categories_tags || []),
      },
    });
  } catch {
    return Response.json(
      { error: "Não foi possível consultar o produto agora." },
      { status: 502 },
    );
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
