import { readSheet } from "read-excel-file/browser";
import type { ProductDraft } from "./types";

export type ImportRow = ProductDraft & {
  rowNumber: number;
  errors: string[];
  warnings: string[];
};

const aliases = {
  barcode: ["CODIGO", "CODIGO DE BARRAS", "EAN", "GTIN", "BARCODE"],
  name: ["DESCRICAO", "PRODUTO", "NOME", "NOME DO PRODUTO"],
  stock: ["QTD", "QUANTIDADE", "ESTOQUE"],
  price: ["PRECO", "VALOR", "PRECO NORMAL"],
  brand: ["MARCA"],
  category: ["CATEGORIA", "DEPARTAMENTO"],
  unit: ["UNIDADE", "PESO", "VOLUME", "PESO OU VOLUME"],
  image: ["IMAGEM", "URL DA IMAGEM", "IMAGE URL"],
  status: ["ATIVO", "STATUS"],
} as const;

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findColumn(headers: string[], names: readonly string[]) {
  return headers.findIndex((header) => names.includes(header));
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  const raw = String(value ?? "").trim().replace(/[R$\s]/g, "");
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  return Number(normalized);
}

function cell(row: unknown[], index: number) {
  return index >= 0 ? row[index] : "";
}

export async function parseProductSpreadsheet(file: File): Promise<ImportRow[]> {
  const matrix = await readSheet(file);
  if (matrix.length < 2) throw new Error("A planilha não possui produtos.");

  const headers = matrix[0].map(normalize);
  const columns = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [key, findColumn(headers, names)]),
  ) as Record<keyof typeof aliases, number>;

  if (columns.barcode < 0 || columns.name < 0) {
    throw new Error("A planilha precisa ter as colunas CODIGO e DESCRICAO (ou EAN e PRODUTO).");
  }

  const parsed = matrix.slice(1).map((row, offset): ImportRow | null => {
    const barcode = String(cell(row, columns.barcode) ?? "").replace(/\D/g, "");
    const name = String(cell(row, columns.name) ?? "").trim();
    if (!barcode && !name) return null;

    const price = parseNumber(cell(row, columns.price));
    const stockValue = parseNumber(cell(row, columns.stock));
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!/^\d{8,14}$/.test(barcode)) errors.push("Código deve ter de 8 a 14 números");
    if (!name) errors.push("Nome não informado");
    if (!Number.isFinite(price) || price < 0) errors.push("Preço inválido");
    if (!Number.isFinite(stockValue) || stockValue < 0) errors.push("Estoque inválido");
    if (columns.price < 0) warnings.push("Preço não informado; será usado R$ 0,00");
    if (columns.stock < 0) warnings.push("Estoque não informado; será usado 0");

    const status = normalize(cell(row, columns.status));
    return {
      rowNumber: offset + 2,
      barcode,
      name,
      brand: String(cell(row, columns.brand) ?? "").trim(),
      category: String(cell(row, columns.category) ?? "").trim() || "Mercearia",
      unit: String(cell(row, columns.unit) ?? "").trim(),
      image: String(cell(row, columns.image) ?? "").trim(),
      price: Number.isFinite(price) ? price : 0,
      stock: Number.isFinite(stockValue) ? Math.max(0, Math.trunc(stockValue)) : 0,
      active: !["INATIVO", "NAO", "N", "0", "DRAFT"].includes(status),
      errors,
      warnings,
    };
  }).filter((row): row is ImportRow => Boolean(row));

  const occurrences = new Map<string, number>();
  parsed.forEach((row) => occurrences.set(row.barcode, (occurrences.get(row.barcode) || 0) + 1));
  parsed.forEach((row) => {
    if (row.barcode && (occurrences.get(row.barcode) || 0) > 1) {
      row.errors.push("Código duplicado na planilha");
    }
  });
  return parsed;
}
