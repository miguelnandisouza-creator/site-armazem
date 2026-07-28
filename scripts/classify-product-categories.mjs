import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/data/imported-products.json", import.meta.url);
const products = JSON.parse(await readFile(file, "utf8"));
const counts = {};

for (const product of products) {
  product.category = classify(`${product.name} ${product.brand}`);
  counts[product.category] = (counts[product.category] || 0) + 1;
}

await writeFile(file, `${JSON.stringify(products, null, 2)}\n`);
console.log(JSON.stringify(counts, null, 2));

function classify(value) {
  const text = normalize(value);

  if (matches(text, [
    /^abs[ .]/, /\bmili abs\b/,
    /\bshampoo\b/, /\bcondicionador\b/, /\bsabonete\b/, /\bdesodorante\b/,
    /\bantitransp/, /\babsorvent/, /\bcreme dental\b/, /\bpasta dental\b/,
    /\bescova dental\b/, /\bfio dental\b/, /\benxaguante bucal\b/, /\bfralda\b/,
    /\bpapel higienico\b/, /\bcotonete\b/, /\bbarbeador\b/, /\baparelho de barbear\b/,
    /\bcreme de barbear\b/, /\btintura\b/, /\bcoloracao\b/, /\bhidratante\b/,
    /\bprotetor solar\b/, /\bdepilador\b/, /\bacetona\b/, /\besmalte\b/,
    /\bfixador de cabelo\b/, /\bgel cabelo\b/, /\bcreme pentear\b/,
  ])) return "Higiene";

  if (!/\bamaciante de carne\b/.test(text) && matches(text, [
    /\bdetergente\b/, /\bdesinfetante\b/, /\bamaciante\b/, /\bsabao\b/,
    /\blava roupa\b/, /\bagua sanitaria\b/, /\blimpador\b/, /\bdesengordurante\b/,
    /\besponja\b/, /\bsaco de lixo\b/, /\binseticida\b/, /\brepelente eletrico\b/,
    /\balcool (gel|liquido)?\b/, /\bpano multiuso\b/, /\blustra moveis\b/,
    /\bpurificador de ar\b/, /\bodorizador\b/, /\bvassoura\b/, /\brodo\b/,
  ])) return "Limpeza";

  if (matches(text, [
    /\bmansao maromba\b/, /\babracadabra\b/, /\bcombo do jiraya\b/,
    /\brefrigerante\b/, /\bcerveja\b/, /\bchopp\b/, /\bvinho\b/, /\bvodka\b/,
    /\bwhisky\b/, /\bcachaca\b/, /\benergetico\b/, /\bisotonico\b/,
    /\bsuco\b/, /\bnectar\b/, /\bagua mineral\b/, /\bagua tonica\b/,
    /\bdrink\b/, /\bbebida lactea\b/,
  ])) return "Bebidas";

  if (/^(queijo|presunto|mortadela|salame|peito de peru|iogurte|manteiga|margarina|requeijao|coalhada|cream cheese|leite fermentado|creme de ricota)\b/.test(text)) return "Frios";

  if (matches(text, [
    /\bpao\b/, /\bpanetone\b/, /\bbolo pronto\b/, /\bmistura para bolo\b/,
    /\bmist bolo\b/, /\bfermento\b/, /\btorrada\b/, /\bbisnaguinha\b/,
    /\bpao de queijo\b/, /\bmassa de pastel\b/,
  ])) return "Padaria";

  const processedProduce = matches(text, [
    /\bmolho\b/, /\bextrato\b/, /\bpolpa\b/, /\bsuco\b/, /\btempero\b/,
    /\bconserva\b/, /\benlatad/, /\bdesidratad/, /\bpo\b/,
    /\bchips?\b/, /\bpalha\b/, /\bpringles\b/, /\bpassa\b/, /\bdefumad/,
    /\bagridoce\b/, /\bfrisco\b/, /\bervas finas\b/, /\bcom azeitona\b/,
    /\bcinserva\b/, /\bfrispy\b/, /\bstrike\b/, /\bdeutschips\b/,
  ]);
  const packagedProduce = /\b(ruffles|sabor|pasta|salsa|tempero|conserva|bala|biscoito|snack)\b|\bfrit|\bgranulad/.test(text);
  if (!processedProduce && !packagedProduce && /^(alho|cebola|tomate|batata|cenoura|beterraba|abobora|abobrinha|pepino|pimentao|repolho|alface|rucula|couve|agriao|banana|maca|laranja|limao|mamao|manga|melancia|melao|abacaxi|uva|morango|abacate|pera|kiwi|maracuja|mandioca|aipim|chuchu|berinjela|inhame|ovo branco|ovo vermelho|ovos)\b/.test(text)) return "Hortifruti";

  return "Mercearia";
}

function normalize(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matches(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}
