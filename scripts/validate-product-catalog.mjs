import { access, readFile } from "node:fs/promises";

const productsFile = new URL("../public/data/imported-products.json", import.meta.url);
const products = JSON.parse(await readFile(productsFile, "utf8"));
const allowedCategories = new Set([
  "Mercearia", "Bebidas", "Frios", "Carnes", "Congelados", "Padaria",
  "Hortifruti", "Higiene", "Bebê", "Limpeza", "Pet", "Utilidades", "Revisar",
]);
const expectedReview = new Set(["7896480693190"]);
const errors = [];
const seenBarcodes = new Set();

for (const product of products) {
  if (!product.barcode || seenBarcodes.has(product.barcode)) {
    errors.push(`Código ausente ou duplicado: ${product.barcode || "(vazio)"}`);
  }
  seenBarcodes.add(product.barcode);
  if (!product.name?.trim()) errors.push(`Nome ausente: ${product.barcode}`);
  if (!allowedCategories.has(product.category)) {
    errors.push(`Categoria inválida em ${product.barcode}: ${product.category}`);
  }
  if (product.image?.startsWith("/")) {
    try {
      await access(new URL(`../public${product.image}`, import.meta.url));
    } catch {
      errors.push(`Imagem local ausente em ${product.barcode}: ${product.image}`);
    }
  }
}

const actualReview = new Set(
  products.filter((product) => product.category === "Revisar").map((product) => product.barcode),
);
for (const barcode of expectedReview) {
  if (!actualReview.has(barcode)) errors.push(`Produto incerto saiu de Revisar: ${barcode}`);
}
for (const barcode of actualReview) {
  if (!expectedReview.has(barcode)) errors.push(`Produto não auditado caiu em Revisar: ${barcode}`);
}

const counts = Object.fromEntries(
  [...allowedCategories]
    .map((category) => [category, products.filter((product) => product.category === category).length])
    .filter(([, count]) => count > 0),
);
const summary = {
  total: products.length,
  active: products.filter((product) => product.active).length,
  uniqueBarcodes: seenBarcodes.size,
  withImage: products.filter((product) => product.image).length,
  missingImage: products.filter((product) => !product.image).length,
  needsCategoryReview: actualReview.size,
  categories: counts,
  errors,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exitCode = 1;
