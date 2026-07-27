import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

const source = process.argv[2];
if (!source) throw new Error("Informe o caminho do arquivo CSV.");

const text = await fs.readFile(source, "utf8");
const rows = parse(text, { columns: true, skip_empty_lines: true, relax_quotes: true });
const products = new Map();
const rejected = [];

for (const row of rows) {
  const barcode = String(row.CODIGO || "").replace(/\D/g, "");
  const name = String(row.DESCRICAO || "").trim();
  if (!/^\d{8,14}$/.test(barcode) || !name) {
    rejected.push({ barcode, name, reason: "Código fora do padrão de 8 a 14 dígitos" });
    continue;
  }

  const quantity = parseInteger(row.QTD);
  const price = parseDecimal(row.PRECO);
  const current = products.get(barcode);
  if (!current) {
    products.set(barcode, createProduct(barcode, name, quantity, price));
    continue;
  }

  current.stock += quantity;
  if (!current.price && price) {
    current.price = price;
    current.active = true;
  }
}

const imported = [...products.values()].sort((a, b) =>
  a.name.localeCompare(b.name, "pt-BR"),
);
const outputDir = path.resolve("public/data");
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  path.join(outputDir, "imported-products.json"),
  `${JSON.stringify(imported, null, 2)}\n`,
);
await fs.writeFile(
  path.join(outputDir, "rejected-products.json"),
  `${JSON.stringify(rejected, null, 2)}\n`,
);

console.log(JSON.stringify({
  sourceRows: rows.length,
  importedProducts: imported.length,
  productsWithPrice: imported.filter((product) => product.price > 0).length,
  productsWithoutPrice: imported.filter((product) => product.price === 0).length,
  rejectedRows: rejected.length,
  stockTotal: imported.reduce((sum, product) => sum + product.stock, 0),
}, null, 2));

function createProduct(barcode, name, stock, price) {
  return {
    id: `import-${barcode}`,
    barcode,
    name: toTitleCase(name),
    brand: inferBrand(name),
    category: inferCategory(name),
    unit: inferUnit(name),
    image: "",
    price,
    stock,
    active: true,
    createdAt: "2026-07-27T12:00:00.000Z",
  };
}

function parseInteger(value) {
  const parsed = Number.parseInt(String(value || "").replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDecimal(value) {
  const normalized = String(value || "").trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toTitleCase(value) {
  return value.toLocaleLowerCase("pt-BR").replace(/(^|\s)\S/g, (letter) =>
    letter.toLocaleUpperCase("pt-BR"),
  );
}

function inferBrand(name) {
  const brands = [
    "NESTLE", "NESTLÉ", "TIROL", "BATAVO", "AURORA", "SANTA CLARA",
    "COCA COLA", "COCA-COLA", "PEPSI", "ANTARCTICA", "BRAHMA", "AMBEV",
    "YOKI", "MAGGI", "SADIA", "PERDIGAO", "PERDIGÃO", "SEARA", "PILAO",
    "PILÃO", "MELITTA", "3 CORACOES", "3 CORAÇÕES", "NESCAU", "MUCILON",
    "ROYAL", "RED BULL", "MONSTER", "FYS", "SHEFA", "FRUTILAC", "NATTUSUL",
  ];
  return brands.find((brand) => name.toLocaleUpperCase("pt-BR").includes(brand)) || "";
}

function inferCategory(name) {
  const value = name.toLocaleUpperCase("pt-BR");
  if (/SUCO|REFRI|REFRIG|AGUA|ÁGUA|CERVEJA|VINHO|ENERGY|ENERGET|CHA |CHÁ |BEBIDA (?!LACT)/.test(value)) return "Bebidas";
  if (/IOG|QUEIJO|NATA|LEITE|REQUEI|MANTEIGA|PRESUNTO|SALAME|MORTADELA|BEB LACT|BEBIDA LACT|PETIT|FERMENTADO/.test(value)) return "Frios";
  if (/PAO |PÃO |BOLO|ROSQUINHA|CROISSANT|BISNAG/.test(value)) return "Padaria";
  if (/DETERG|SABAO|SABÃO|AMACIANTE|DESINF|LIMPADOR|ESPONJA|ALVEJANTE/.test(value)) return "Limpeza";
  if (/SHAMPOO|SABONETE|CREME DENTAL|DESODORANTE|ABSORVENTE|FRALDA/.test(value)) return "Higiene";
  if (/BANANA|MACA|MAÇÃ|CEBOLA|TOMATE|BATATA|ALFACE|LARANJA|MAMAO|MAMÃO/.test(value)) return "Hortifruti";
  return "Mercearia";
}

function inferUnit(name) {
  const matches = [...name.toLocaleUpperCase("pt-BR").matchAll(/\d+(?:[,.]\d+)?\s?(?:KG|ML|G|L)\b/g)];
  return matches.at(-1)?.[0].replace(/\s/g, "") || "";
}
