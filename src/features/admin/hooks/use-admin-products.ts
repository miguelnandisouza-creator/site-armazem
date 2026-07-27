"use client";

import { useEffect, useState } from "react";
import type { LocalProduct } from "../products/types";

export function useAdminProducts() {
  const [products, setProducts] = useState<LocalProduct[]>([]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved: LocalProduct[] = JSON.parse(localStorage.getItem("armazem:admin-products") || "[]");
      fetch("/data/imported-products.json").then((response) => response.json()).then((imported: LocalProduct[]) => {
        const merged = new Map(imported.map((product) => [product.barcode, product]));
        saved.filter((product) => !product.id.startsWith("import-")).forEach((product) => merged.set(product.barcode, product));
        setProducts([...merged.values()]);
      }).catch(() => setProducts(saved));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return products;
}
