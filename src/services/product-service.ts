import { productSchema, type ProductInput } from "@/schemas/product";
import { ProductRepository } from "@/repositories/product-repository";
export class ProductService { constructor(private readonly products: ProductRepository) {} async register(storeId: string, payload: ProductInput) { const input = productSchema.parse(payload); if (input.ean && await this.products.findByEan(storeId, input.ean)) throw new Error("Já existe um produto com este código de barras nesta loja."); return this.products.create(storeId, input); } }
