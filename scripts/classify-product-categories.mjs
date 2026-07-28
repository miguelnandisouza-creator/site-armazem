import { mkdir, readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/data/imported-products.json", import.meta.url);
const products = JSON.parse(await readFile(file, "utf8"));
const counts = {};
const reviewedProposals = (await Promise.all(["a", "b", "c"].map(async (suffix) =>
  JSON.parse(await readFile(new URL(`../reports/review-proposals-${suffix}.json`, import.meta.url), "utf8"))
))).flat();
const fullAuditCorrections = (await Promise.all(["a", "b", "c"].map(async (suffix) =>
  JSON.parse(await readFile(new URL(`../reports/full-audit-corrections-${suffix}.json`, import.meta.url), "utf8"))
))).flat();
const fullAuditUncertain = (await Promise.all(["a", "b", "c"].map(async (suffix) =>
  JSON.parse(await readFile(new URL(`../reports/full-audit-uncertain-${suffix}.json`, import.meta.url), "utf8"))
))).flat();
const userConfirmedOverrides = JSON.parse(
  await readFile(new URL("../reports/user-confirmed-category-overrides.json", import.meta.url), "utf8"),
);
const categoryOverrides = {
  ...Object.fromEntries(reviewedProposals.map((item) => [item.barcode, item.proposedCategory])),
  ...Object.fromEntries(fullAuditCorrections.map((item) => [item.barcode, item.proposedCategory])),
  ...Object.fromEntries(fullAuditUncertain.map((item) => [item.barcode, "Revisar"])),
  ...Object.fromEntries(userConfirmedOverrides.map((item) => [item.barcode, item.category])),
  "7891000440339": "Mercearia",
  "7898104900103": "Mercearia",
  "7798304851659": "Congelados",
  "7898945210027": "Congelados",
  "7891991002561": "Bebidas",
  "7894900501001": "Bebidas",
  "7898596080284": "Mercearia",
  "7891031412091": "Mercearia",
  "7896036098325": "Mercearia",
  "7892840800406": "Bebidas",
  "7896565722050": "Limpeza",
  "7896565722036": "Limpeza",
  "7896104993545": "Higiene",
  "7898047691755": "Limpeza",
  "7898047691779": "Limpeza",
  "7898964630110": "Mercearia",
  "7896022016029": "Mercearia",
  "7898408850128": "Mercearia",
  "7896022046033": "Mercearia",
  "7896041110012": "Mercearia",
};

for (const product of products) {
  normalizeMetadata(product);
  product.category = classify(product);
  counts[product.category] = (counts[product.category] || 0) + 1;
}

await writeFile(file, `${JSON.stringify(products, null, 2)}\n`);
const reviewProducts = products.filter((product) =>
  product.category === "Revisar" || !product.brand || !product.unit || !product.image
);
await mkdir(new URL("../reports/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../reports/products-needing-review.json", import.meta.url),
  `${JSON.stringify(reviewProducts.map((product) => ({
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    unit: product.unit,
    category: product.category,
    image: product.image,
    issues: [
      product.category === "Revisar" ? "categoria não confirmada" : "",
      !product.brand ? "marca ausente" : "",
      !product.unit ? "unidade ausente" : "",
      !product.image ? "imagem ausente" : "",
    ].filter(Boolean),
  })), null, 2)}\n`,
);
console.log(JSON.stringify(counts, null, 2));

function classify(product) {
  if (categoryOverrides[product.barcode]) return categoryOverrides[product.barcode];
  const text = normalize(`${product.name} ${product.brand}`);

  // Produtos cujo sabor ou marca costuma enganar regras genéricas.
  if (matches(text, [
    /\bfini\b/, /\bdocile\b/, /\bfrutitella\b/, /\bmentos\b/, /\bhalls\b/,
    /\btrident\b/, /\blacta\b/, /\bhersheys\b/, /\bclub social\b/,
    /\bnestle\b/, /\blaka\b/, /\bbauducco\b/, /\bbono\b/, /\bbon bon\b/,
    /\bruffles\b/, /\bpringles\b/, /\btorcida\b/, /\bsalgad/, /\bsnack/,
    /\bbisc/, /\bbolacha\b/, /\bwafer\b/, /\bcookie/, /\bbala\b/,
    /\bbalinha\b/, /\bchocolate\b/, /\bchoc[ .]/, /\bbombom\b/, /\bpirulito\b/, /\brosquinha\b/,
    /\bbolinho\b/, /\bbolachao\b/, /\bbisnack\b/, /\bbiluzitos\b/, /\bbrasfitos\b/,
    /^bis\b/, /\bbon o bon\b/, /\bbutter toffee/, /\bcaramelo\b/, /\bchicl/,
    /\bchiclete\b/, /\bcocada\b/, /\bcrocantinho\b/, /\bcrockissimo\b/,
  ])) return "Mercearia";
  if (/\bmanteiga de cacau\b/.test(text)) return "Higiene";
  if (/\bleite de coco\b/.test(text)) return "Mercearia";
  if (/\b(pao de mel|snaks? bites|mistura para bolo|mist bolo|fermento)\b/.test(text)) return "Mercearia";
  if (/\b(fermentad|leite ferm).*\bbob esponja\b|\bbob esponja\b.*\b(fermentad|leite)\b/.test(text)) return "Bebidas";
  if (/\bamaciante de carne\b|\bsal grosso.*amaciante\b/.test(text)) return "Mercearia";

  if (matches(text, [
    /\bracao\b/, /\bpetisco\b/, /\bgran plus\b/, /\bwhiskas\b/, /\bpedigree\b/,
    /\bfriskies\b/, /\bdog chow\b/, /\bcat chow\b/, /\balpiste\b/,
    /\bareia (higienica|sanitaria)\b/, /\bproduto para (cao|gato)\b/,
    /\bshampoo pet\b/, /\btapete higienico\b/, /\bpet\b/,
  ]) && !/\b(limpador|eliminador|garrafa|embalagem)\b/.test(text)) return "Pet";

  if (matches(text, [
    /\bchupeta\b/, /\bmamadeira\b/, /\blenco umedecido\b/, /\bfralda\b/,
    /\bfrauda\b/, /\bfralsa\b/,
  ])) return "Bebê";

  if (matches(text, [
    /^abs[ .]/, /\bmili abs\b/,
    /\bshampoo\b/, /\bcondicionador\b/, /\bsabonete\b/, /\bdesodorante\b/,
    /\bantitransp/, /\babsorvent/, /\bcreme dental\b/, /\bpasta dental\b/,
    /\bescova dental\b/, /\bfio dental\b/, /\benxaguante bucal\b/, /\bfralda\b/,
    /\bpapel higienico\b/, /\bcotonete\b/, /\bbarbeador\b/, /\baparelho de barbear\b/,
    /\bcreme de barbear\b/, /\btintura\b/, /\bcoloracao\b/, /\bhidratante\b/,
    /\bprotetor solar\b/, /\bdepilador\b/, /\bacetona\b/, /\besmalte\b/,
    /\bfixador de cabelo\b/, /\bgel cabelo\b/, /\bcreme pentear\b/,
    /\bagua oxigenada\b/, /\bhastes flexiveis\b/,
    /\b(always|intimus|rexona|pantene|seda|monange|monage|colgate|oral b|isacare|kolore)\b/,
    /^cond[ .]/, /\bdesod[ .]/, /\bbody splash\b/, /\bcreme capilar\b/,
    /\bcachos\b/, /\bcabelo\b/, /\bfrauda\b/, /\bfralsa\b/, /\bclose up\b/,
    /\bcera modeladora\b/, /^cr pent\b/, /\bherbissimo\b/,
  ])) return "Higiene";

  if (!/\b(carne|carnes|sal grosso|tempero)\b/.test(text) && matches(text, [
    /\bdetergente\b/, /\bdesinfetante\b/, /\bamaciante\b/, /\bsabao\b/,
    /\blava roupa\b/, /\bagua sanitaria\b/, /\blimpador\b/, /\bdesengordurante\b/,
    /\besponja\b/, /\bsaco de lixo\b/, /\binseticida\b/, /\brepelente eletrico\b/,
    /^alcool\b/, /\balcool (gel|liquido)\b/, /\bpano multiuso\b/, /\blustra moveis\b/,
    /\bpurificador de ar\b/, /\bodorizador\b/, /\bvassoura\b/, /\brodo\b/,
    /\balvejante\b/, /\blava roupas?\b/, /\bsaponaceo\b/, /\bsapolio\b/,
    /\bmultiuso\b/, /\bremovedor\b/, /\bremovedpr\b/,
    /\b(ajax|downy|glade|pato|vanish|baby soft|coala)\b/, /^amac[ .]/,
    /\bamacbrisa\b/, /\binset\b/, /\brefil gel adesivo\b/, /\bbom ar\b/,
    /\bair wick\b/, /\bcera liquida\b/, /\bbrilholac\b/, /\baparelho eletrico vaporizador\b/,
    /\bcera (automotiva|automotivo|liq)\b/, /\bdesamarelador\b/, /\bshdesmarelador\b/,
    /\bcheirinho\b/, /\bpastilha adesiva\b/, /\beliminador de odores\b/,
  ])) return "Limpeza";

  if (matches(text, [
    /\bmansao maromba\b/, /\babracadabra\b/, /\bcombo do jiraya\b/,
    /\bachocolatad/, /\btodinho\b/, /\bchoco leite\b/, /\bchocoleite\b/,
    /^agua (?!oxigenada|sanitaria)/,
    /\b(baly|bally|monster|amstel|budweiser|brahma|skol|antarctica|gatorade|pepsi|powerade)\b/,
    /\b(tang|frisco|refresco|guarana)\b/, /\benerg[ .]/, /\benergy\b/,
    /^achoc[ .]/, /^beb lac/, /^bebida (pacote|lactea)/,
    /\bcoca cola\b/, /^cerv[ .]/, /\bcorona extra\b/, /\bchampanhe\b/,
    /\bcorote\b/, /\bcaipirinha\b/, /\bbatavinho\b/,
    /\brefrigerante\b/, /\bcerveja\b/, /\bchopp\b/, /\bvinho\b/, /\bvodka\b/,
    /\bwhisky\b/, /\bcachaca\b/, /\benergetico\b/, /\bisotonico\b/,
    /\bsuco\b/, /\bnectar\b/, /\bagua mineral\b/, /\bagua tonica\b/,
    /\bdrink\b/, /\bbebida lactea\b/,
  ])) return "Bebidas";

  if (/^(queijo|presunto|mortadela|salame|peito de peru|iog|manteiga|margarina|requeijao|rqj|coalhada|cream cheese|leite fermentado|creme de ricota|creme ricota|cheddar|nata)\b/.test(text)) return "Frios";

  if (/^(carne|frango|linguica|calabresa|salsicha(?!.*\blata\b)|bacon|costela|pernil|file(?!.*empanad)|sobrecoxa|coxa|capa de file|coracao|coxinha da asa)\b/.test(text)) return "Carnes";

  if (matches(text, [
    /^(pizza|lasanha)\b/, /\bnugget/, /\bhamburguer\b/, /\bempanad/,
    /\bcongelad/, /\bsorvete\b/, /\bpicol[eé]\b/, /\bbatata pre frita\b/,
    /\b(c vale|cvale)\b.*\bsteak\b/,
  ])) return "Congelados";

  if (/^(carne|frango|linguica|calabresa|salsicha|bacon|costela|pernil|file|steak|sobrecoxa|coxa|capa de file|coracao|coxinha da asa)\b/.test(text)) return "Carnes";

  if (matches(text, [
    /\bpao\b/, /\bpanetone\b/, /\bbolo pronto\b/, /\btorrada\b/, /\bbisnaguinha\b/,
    /\bpao de queijo\b/, /\bmassa de pastel\b/,
  ])) return "Padaria";

  const processedProduce = matches(text, [
    /\bmolho\b/, /\bextrato\b/, /\bpolpa\b/, /\bsuco\b/, /\btempero\b/,
    /\bconserva\b/, /\benlatad/, /\bdesidratad/, /\bpo\b/, /\bpicad/, /\btriturad/,
    /\bchips?\b/, /\bpalha\b/, /\bpringles\b/, /\bpassa\b/, /\bdefumad/,
    /\bagridoce\b/, /\bfrisco\b/, /\bervas finas\b/, /\bcom azeitona\b/,
    /\bcinserva\b/, /\bfrispy\b/, /\bstrike\b/, /\bdeutschips\b/,
  ]);
  const packagedProduce = /\b(ruffles|sabor|pasta|salsa|tempero|conserva|bala|biscoito|snack|nattusul|rustica|churrasco)\b|\bfrit|\bgranulad/.test(text);
  if (!processedProduce && !packagedProduce && /^(alho|cebola|tomate|batata|cenoura|beterraba|abobora|abobrinha|pepino|pimentao|repolho|alface|rucula|couve|agriao|banana|maca|laranja|limao|mamao|manga|melancia|melao|abacaxi|uva|morango|abacate|pera|kiwi|maracuja|mandioca|aipim|chuchu|berinjela|inhame|ovo branco|ovo vermelho|ovos)\b/.test(text)) return "Hortifruti";

  if (matches(text, [
    /\barroz\b/, /\bfeijao\b/, /\bcafe\b/, /\bcapuccino\b/, /\bcappuccino\b/,
    /\bbisc/, /\bbolacha\b/, /\bcookie/, /\bwafer\b/, /\bchocolate\b/,
    /\bbombom\b/, /\bbala\b/, /\bdoce\b/, /\bpirulito\b/, /\bgoma\b/,
    /\bmacarrao\b/, /\blamen\b/, /\bmassa\b/, /\bmolho\b/, /\bextrato\b/,
    /\btempero\b/, /\bcaldo\b/, /\boleo\b/, /\bazeite\b/, /\bacucar\b/,
    /\bsal\b/, /\bfarinha\b/, /\bfuba\b/, /\bpolvilho\b/, /\bmilho\b/,
    /\bervilha\b/, /\bconserva\b/, /\bazeitona\b/, /\bmaionese\b/,
    /\bketchup\b/, /\bmostarda\b/, /\bgelatina\b/, /\bpudim\b/, /\bcha\b/,
    /\bleite em po\b/, /\bleite condensado\b/, /\bcreme de leite\b/,
    /\bcereal\b/, /\baveia\b/, /\bgranola\b/, /\bpipoca\b/, /\bsalgad/,
    /\bbatata (chips|palha)\b/, /\bpringles\b/, /\bamendoim\b/, /\bcastanha\b/,
    /\bcoco ralado\b/, /\bfermento\b/, /\badocante\b/, /\bvinagre\b/,
    /\bchimichurri\b/, /\bcanela\b/, /\bpimenta\b/, /\bcolorau\b/,
    /\b(nattusul|nissin|maggi|sazon|nunes|sadoro|neilar|treeps|dori)\b/,
    /\batum\b/, /\bpalmito\b/, /\bfarofa\b/, /\bbarbecue\b/, /\bgeleia\b/,
    /\brefresco em po\b/, /\badoc\b/, /\bbanha\b/, /\bbicarbonato\b/,
    /\bacafrao\b/, /\balecrim\b/, /\badobo\b/, /\balho\b/, /\bazeitona/,
    /\bamemdoim\b/, /\baneis de cebola\b/, /\bbat palha\b/,
    /\bbatata (lisa|rustica)\b/,
    /\badoc/, /\bcanjica\b/, /\bcap(sula|stres)\b/, /\bcatchup\b/,
    /\bcebola em (conserva|cinserva)\b/, /\bchampignon\b/, /\bcobertura\b/,
    /\bcolorifico\b/, /\bcominho\b/, /\bchimarrao\b/, /\bcorante (amarelo|azul|rosa|roxo|vermelho|violeta)\b/,
    /\bcravo\b/, /\bcurcuma\b/, /\bcreme de avela\b/, /\bchantilly\b/,
    /\bcup nood/, /\bnoodles\b/,
  ])) return "Mercearia";

  if (matches(text, [
    /\bpapel aluminio\b/, /\bfilme pvc\b/, /^pvc\b/, /\bfosforo\b/, /\bisqueiro\b/,
    /\bvela\b/, /\bpilha\b/, /\blampada\b/, /\bcopo descart/, /\bprato descart/,
    /\bguardanapo\b/, /\bpapel toalha\b/, /\bcanudo\b/, /\bcarvao\b/,
    /\bluva\b/, /\bfita\b/, /\bsaco freezer\b/, /\bpote\b/,
    /\bbalao\b/, /\bbaloes\b/, /\bstarlux\b/, /\bcanetinha\b/,
    /\bcorretivo\b/, /\bslime\b/, /\bacendedor\b/, /\bapito\b/,
    /\bborracha\b/,
    /\bcola branca\b/, /\bcolher\b/, /\bcorante para tecido\b/, /\bdesengripante\b/,
  ])) return "Utilidades";

  return "Revisar";
}

function normalize(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matches(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeMetadata(product) {
  const corrections = {
    "7791293032436": {
      brand: "Rexona",
    },
    "4005808309436": {
      brand: "Nivea",
    },
    "7891022868036": {
      brand: "Bombril",
    },
    "7896104994023": {
      name: "Fralda Mili Love & Care XXG com 20 unidades",
      brand: "Mili",
      unit: "20UN",
    },
    "7891150064300": {
      name: "Desodorante Rexona Clinical Extra Dry 150ml",
      brand: "Rexona",
      unit: "150ML",
    },
    "7894321722016": {
      name: "Achocolatado Toddynho 200ml",
      brand: "Toddynho",
      unit: "200ML",
    },
  };
  Object.assign(product, corrections[product.barcode] || {});

  if (!product.unit) {
    const match = product.name.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|un|und|unidades)\b/i);
    if (match) {
      const suffix = /^un/i.test(match[2]) ? "UN" : match[2].toUpperCase();
      product.unit = `${match[1].replace(",", ".")}${suffix}`;
    }
  }
}
