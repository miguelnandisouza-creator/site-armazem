import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const productsFile = new URL("../public/data/imported-products.json", import.meta.url);
const outputDirectory = new URL("../public/images/products/", import.meta.url);

const sources = {
  "7891098000415": "https://papelecia.cdn.orangestore.cc/kniC6EwRf5iZ19NWlfYlduj8NMU=/fit-in/330x330/filters:quality(70):fill(ffffff,1)/n49shopv2_papelecia/images/products/666c5c14e4267/7891098000415_1-666c5c14e43c3.jpg",
  "7896028085654": "https://vilanova.vtexassets.com/arquivos/ids/194962/18450-1.jpg?v=638937070826870000",
  "7891150102347": "https://cdn-cosmos.bluesoft.com.br/products/7891150102347",
  "7897185002171": "https://cdn-cosmos.bluesoft.com.br/products/7897185002171",
  "7791293033235": "https://cdn-cosmos.bluesoft.com.br/products/7791293033235",
  "7891182860123": "https://cdn-cosmos.bluesoft.com.br/products/7891182860123",
};

const products = JSON.parse(await readFile(productsFile, "utf8"));
await mkdir(outputDirectory, { recursive: true });

for (const [barcode, source] of Object.entries(sources)) {
  const product = products.find((item) => item.barcode === barcode);
  if (!product) throw new Error(`Produto ${barcode} não encontrado no catálogo.`);

  const response = await fetch(source, {
    headers: { "User-Agent": "ArmazemParadaObrigatoria/1.0 (product-image-repair)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Falha ao baixar ${barcode}: HTTP ${response.status}`);

  const input = Buffer.from(await response.arrayBuffer());
  const output = new URL(`../public/images/products/${barcode}.webp`, import.meta.url);
  await sharp(input, { failOn: "warning" })
    .rotate()
    .trim({ background: "#ffffff", threshold: 12 })
    .resize(900, 900, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toFile(fileURLToPath(output));

  product.image = `/images/products/${barcode}.webp`;
  console.log(`${barcode}: ${product.name}`);
}

await writeFile(productsFile, `${JSON.stringify(products, null, 2)}\n`);
