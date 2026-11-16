
import { useEffect, useState } from "react";
import { X, Save, LoaderCircle } from "lucide-react";

import {
  getCategories,
  createProduct,
  updateProduct,
} from "../services/productService";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  description: "",
  price: "",
  low_stock_threshold: "5",
  is_active: true,
};

function ProductForm({
  product = null,
  onClose,
  onCreated,
  onSaved,
}) {
  const isEditing = Boolean(product);

  const [form, setForm] = useState(() => {
    if (!product) return { ...emptyForm };

    return {
      name: product.name ?? "",
      sku: product.sku ?? "",
      category: String(product.category ?? ""),
      description: product.description ?? "",
      price: String(product.price ?? ""),
      low_stock_threshold: String(
        product.low_stock_threshold ?? 5
      ),
      is_active: product.is_active !== false,
    };
  });

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load category choices
  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const data = await getCategories();

        if (active) setCategories(data);
      } catch {
        if (active) {
          setError("Unable to load categories.");
        }
      } finally {
        if (active) setLoadingCategories(false);
      }
    };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (!form.category) {
      setError("Please select a category.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: Number(form.category),
      description: form.description.trim(),
      price: form.price,
      low_stock_threshold: Number(
        form.low_stock_threshold
      ),
      is_active: form.is_active,
    };

    setSaving(true);

    try {
      if (isEditing) {
        // Edit existing product
        await updateProduct(product.id, payload);
      } else {
        // Create new product with zero initial stock
        await createProduct({
          ...payload,
          stock_quantity: 0,
        });
      }

      // Notify the Products page
      if (onSaved) {
        onSaved();
      } else if (onCreated) {
        onCreated();
      }
    } catch (err) {
      const status = err.response?.status;
      const details = err.response?.data;

      if (status === 403) {
        setError(
          "Inventory Admin permission is required."
        );
      } else if (details && typeof details === "object") {
        const messages = Object.entries(details).map(
          ([field, value]) =>
            `${field}: ${
              Array.isArray(value)
                ? value.join(", ")
                : String(value)
            }`
        );

        setError(messages.join(" | "));
      } else {
        setError(
          "Unable to save product. Check your connection."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2
              id="product-form-title"
              className="text-xl font-bold text-slate-900"
            >
              {isEditing
                ? "Edit Product"
                : "Add New Product"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isEditing
                ? `Update details for ${product.name}`
                : "Create a new inventory product."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close product form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">

            {/* Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="product-name"
                className="mb-2 block text-sm font-medium"
              >
                Product Name *
              </label>

              <input
                id="product-name"
                name="name"
                required
                maxLength={200}
                value={form.name}
                onChange={updateField}
                className={inputClass}
              />
            </div>

            {/* SKU */}
            <div>
              <label
                htmlFor="product-sku"
                className="mb-2 block text-sm font-medium"
              >
                SKU *
              </label>

              <input
                id="product-sku"
                name="sku"
                required
                maxLength={50}
                value={form.sku}
                onChange={updateField}
                className={inputClass}
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="product-category"
                className="mb-2 block text-sm font-medium"
              >
                Category *
              </label>

              <select
                id="product-category"
                name="category"
                required
                value={form.category}
                onChange={updateField}
                disabled={loadingCategories}
                className={inputClass}
              >
                <option value="">
                  Select category
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="product-price"
                className="mb-2 block text-sm font-medium"
              >
                Price (₹) *
              </label>

              <input
                id="product-price"
                name="price"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                required
                value={form.price}
                onChange={updateField}
                className={inputClass}
              />
            </div>

            {/* Low stock threshold */}
            <div>
              <label
                htmlFor="product-threshold"
                className="mb-2 block text-sm font-medium"
              >
                Low Stock Threshold
              </label>

              <input
                id="product-threshold"
                name="low_stock_threshold"
                type="number"
                min="0"
                max="4294967295"
                step="1"
                required
                value={form.low_stock_threshold}
                onChange={updateField}
                className={inputClass}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label
                htmlFor="product-description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="product-description"
                name="description"
                rows={3}
                value={form.description}
                onChange={updateField}
                className={inputClass}
              />
            </div>

            {/* Active */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={updateField}
                  className="h-4 w-4 accent-blue-600"
                />
                Active Product
              </label>
            </div>
          </div>

          {/* Stock information */}
          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
            {isEditing
              ? `Current stock: ${product.stock_quantity}. Stock quantity is not editable here.`
              : "Initial stock will be 0."}

            <p className="mt-1">
              Use Inventory Management for stock-in
              and stock-out transactions.
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                loadingCategories ||
                categories.length === 0
              }
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <Save size={19} />
              )}

              {saving
                ? "Saving..."
                : isEditing
                ? "Update Product"
                : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;
