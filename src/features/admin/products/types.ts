export type LocalProduct = {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  image: string;
  price: number;
  stock: number;
  active: boolean;
  createdAt: string;
};

export type ProductDraft = Omit<LocalProduct, "id" | "createdAt">;

export const emptyProduct: ProductDraft = {
  barcode: "",
  name: "",
  brand: "",
  category: "Mercearia",
  unit: "",
  image: "",
  price: 0,
  stock: 0,
  active: true,
};
