import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const productsFile = new URL("../public/data/imported-products.json", import.meta.url);
const reportDir = new URL("../reports/", import.meta.url);
const reportFile = new URL("../reports/product-image-audit.json", import.meta.url);
const products = JSON.parse(await readFile(productsFile, "utf8"));
const withImages = products.filter((product) => product.image);
const concurrency = 10;
const results = [];

await mkdir(reportDir, { recursive: true });

for (let start = 0; start < withImages.length; start += concurrency) {
  const batch = withImages.slice(start, start + concurrency);
  results.push(...await Promise.all(batch.map(audit)));
  if (start % 100 === 0) console.log(`${Math.min(start + concurrency, withImages.length)}/${withImages.length}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  totalProducts: products.length,
  productsWithImage: withImages.length,
  valid: results.filter((item) => item.status === "valid").length,
  broken: results.filter((item) => item.status === "broken").length,
  nearlyBlank: results.filter((item) => item.nearlyBlank).length,
  excessiveWhitespace: results.filter((item) => item.excessiveWhitespace).length,
  results,
};
await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  valid: report.valid,
  broken: report.broken,
  nearlyBlank: report.nearlyBlank,
  excessiveWhitespace: report.excessiveWhitespace,
}));

async function audit(product) {
  try {
    let buffer;
    if (product.image.startsWith("/")) {
      buffer = await readFile(new URL(`../public${product.image}`, import.meta.url));
    } else {
      const response = await fetch(product.image, {
        headers: { "User-Agent": "ArmazemParadaObrigatoria/1.0 (image-quality-audit)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    }
    const image = sharp(buffer, { failOn: "warning" });
    const metadata = await image.metadata();
    const { data, info } = await image.clone().flatten({ background: "#ffffff" })
      .resize(64, 64, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data: alphaData, info: alphaInfo } = await image.clone()
      .resize(64, 64, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let whitePixels = 0;
    let darkPixels = 0;
    let visiblePixels = 0;
    for (let index = 0; index < data.length; index += info.channels) {
      const r = data[index]; const g = data[index + 1]; const b = data[index + 2];
      if (r > 245 && g > 245 && b > 245) whitePixels += 1;
      if (r < 235 || g < 235 || b < 235) darkPixels += 1;
    }
    for (let index = 3; index < alphaData.length; index += alphaInfo.channels) {
      if (alphaData[index] > 10) visiblePixels += 1;
    }
    const pixels = info.width * info.height;
    const whiteRatio = whitePixels / pixels;
    const contentRatio = darkPixels / pixels;
    const visibleRatio = visiblePixels / pixels;
    const effectiveContentRatio = metadata.hasAlpha ? visibleRatio : contentRatio;
    return {
      barcode: product.barcode,
      name: product.name,
      url: product.image,
      status: "valid",
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      bytes: buffer.length,
      whiteRatio: Number(whiteRatio.toFixed(4)),
      contentRatio: Number(contentRatio.toFixed(4)),
      visibleRatio: Number(visibleRatio.toFixed(4)),
      nearlyBlank: effectiveContentRatio < 0.01,
      excessiveWhitespace: effectiveContentRatio >= 0.01 && effectiveContentRatio < 0.08,
    };
  } catch (error) {
    return {
      barcode: product.barcode,
      name: product.name,
      url: product.image,
      status: "broken",
      error: error instanceof Error ? error.message : String(error),
      nearlyBlank: false,
      excessiveWhitespace: false,
    };
  }
}
