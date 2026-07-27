export type UserRole = "admin" | "customer" | "manager" | "employee" | "cashier";
export type ProductStatus = "draft" | "active" | "archived";
export interface Store { id: string; name: string; slug: string; }
export interface Product { id: string; storeId: string; categoryId: string | null; name: string; brand: string | null; ean: string | null; description: string | null; priceCents: number; salePriceCents: number | null; status: ProductStatus; }
