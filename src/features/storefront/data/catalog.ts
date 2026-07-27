export type CatalogProduct = {
  id: number;
  name: string;
  brand: string;
  category: string;
  unit: string;
  price: number;
  previousPrice?: number;
  image: string;
  accent: string;
  tag?: string;
  stock?: number;
  barcode?: string;
};

export const categories = [
  { name: "Hortifruti", icon: "leaf", color: "#dcedc8" },
  { name: "Padaria", icon: "croissant", color: "#ffe2b8" },
  { name: "Mercearia", icon: "package", color: "#ffeaa7" },
  { name: "Bebidas", icon: "bottle", color: "#cfe8f6" },
  { name: "Frios", icon: "sandwich", color: "#ffd6d6" },
  { name: "Limpeza", icon: "sparkles", color: "#d9eadf" },
  { name: "Higiene", icon: "sparkles", color: "#f0dff4" },
] as const;

export const products: CatalogProduct[] = [
  { id: 1, name: "Café Torrado Especial", brand: "Armazém", category: "Mercearia", unit: "500 g", price: 22.9, previousPrice: 29.9, image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=85", accent: "#f1e4d4", tag: "Mais vendido" },
  { id: 2, name: "Azeite Extra Virgem", brand: "Quinta da Serra", category: "Mercearia", unit: "500 ml", price: 34.9, previousPrice: 42.9, image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=85", accent: "#e3ead5", tag: "Oferta" },
  { id: 3, name: "Queijo Minas Frescal", brand: "Fazenda Real", category: "Frios", unit: "500 g", price: 21.9, previousPrice: 28.9, image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=85", accent: "#fff1b8", tag: "24% off" },
  { id: 4, name: "Pão Rústico Artesanal", brand: "Forno da Casa", category: "Padaria", unit: "unidade", price: 14.9, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=85", accent: "#f3dfc5", tag: "Feito hoje" },
  { id: 5, name: "Tomate Italiano", brand: "Direto do campo", category: "Hortifruti", unit: "kg", price: 8.99, previousPrice: 11.49, image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=800&q=85", accent: "#f5ded8", tag: "Fresquinho" },
  { id: 6, name: "Suco de Laranja Integral", brand: "Natural", category: "Bebidas", unit: "1 L", price: 12.9, image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=85", accent: "#ffe6a7" },
];

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
