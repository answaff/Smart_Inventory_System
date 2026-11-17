// Models exposed by the existing Smart Inventory Django REST APIs.
export type UserProfile = {
  username: string;
  role?: string;
  can_manage_products?: boolean;
  can_view_products?: boolean;
};

export type Category = { id: number; name: string };
export type Product = {
  id: number;
  name: string;
  sku: string;
  category?: number | Category | null;
  category_name?: string;
  price: string | number;
  stock_quantity: string | number;
  low_stock_threshold: string | number;
  is_active?: boolean;
};
export type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  created_at?: string;
};
export type StockMovement = {
  id: number;
  product: number;
  product_name?: string;
  movement_type: string;
  quantity: number;
  notes?: string;
  created_by_username?: string;
  created_at: string;
};
export type OrderItem = {
  id: number;
  product: number;
  product_name?: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
};
export type Order = {
  id: number;
  customer: number;
  customer_name?: string;
  status: "PLACED" | "COMPLETED" | "CANCELLED";
  total_amount: string | number;
  notes?: string;
  items?: OrderItem[];
  created_at: string;
  updated_at?: string;
};
export function numberOf(value: string | number | undefined | null): number {
  const valueAsNumber = Number(value ?? 0);
  return Number.isFinite(valueAsNumber) ? valueAsNumber : 0;
}
export const rupees = (value: string | number) =>
  `₹${numberOf(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const readableDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
export const canManageProducts = (user: UserProfile): boolean => {
  if (typeof user.can_manage_products === "boolean") return user.can_manage_products;
  const role = (user.role ?? "").trim().toLowerCase();
  return role === "inventory admin" || role === "admin";
};
