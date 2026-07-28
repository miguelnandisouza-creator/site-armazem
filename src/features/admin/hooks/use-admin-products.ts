"use client";

import { useEffect, useState } from "react";
import type { LocalProduct } from "../products/types";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function useAdminProducts() {
  const [products, setProducts] = useState<LocalProduct[]>([]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fetch("/data/imported-products.json").then((response) => response.json()).then((imported: LocalProduct[]) => {
        const merged = new Map(imported.map((product) => [product.barcode, product]));
        return supabase.from("products")
          .select("id,ean,name,brand,unit,image_url,price_cents,stock,status,created_at,categories(name)")
          .then(({ data }) => {
            (data || []).forEach((row) => {
              const relation = Array.isArray(row.categories) ? row.categories[0] : row.categories;
              if (!row.ean) return;
              const importedProduct = merged.get(row.ean);
              merged.set(row.ean, { id: row.id, barcode: row.ean, name: row.name, brand: row.brand || "", category: relation?.name || "Mercearia", unit: row.unit || "", image: row.image_url || importedProduct?.image || "", price: row.price_cents / 100, stock: row.stock, active: row.status === "active", createdAt: row.created_at });
            });
            setProducts([...merged.values()]);
          });
      }).catch(() => setProducts([]));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return products;
}
