import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  LoaderCircle,
  AlertTriangle,
} from "lucide-react";

import { getCustomers } from "../services/customerService";
import { getInventoryProducts } from "../services/inventoryService";
import { createOrder } from "../services/orderService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value ?? 0));

const getApiError = (error) => {
  const data = error.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.map((item) =>
              typeof item === "string" ? item : JSON.stringify(item)
            ).join(", ")
          : typeof value === "string"
            ? value
            : JSON.stringify(value);
        return `${field}: ${message}`;
      })
      .join(" | ");
  }

  return "Unable to create the order. Please try again.";
};

/**
 * New-order dialog.
 * Submission intentionally defaults to OFF until orders/services.py
 * has been reviewed for atomic stock deduction and rollback.
 */
function OrderForm({ onClose, onCreated, allowSubmit = false }) {
  const navigate = useNavigate();
  const nextRowId = useRef(2);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([
    { rowId: 1, productId: "", quantity: "1" },
  ]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        const [customerData, productData] = await Promise.all([
          getCustomers(),
          getInventoryProducts(),
        ]);

        if (!active) return;
        setCustomers(customerData);
        setProducts(productData);
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 401) {
          sessionStorage.removeItem("accessToken");
          navigate("/login", { replace: true });
          return;
        }

        setLoadError(
          err.response?.status === 403
            ? "Your account cannot load customers or products."
            : "Unable to load customers and products. Check your Django server."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOptions();
    return () => {
      active = false;
    };
  }, [navigate]);

  const activeProducts = products.filter(
    (product) => product.is_active !== false
  );

  const getProduct = (id) =>
    activeProducts.find((product) => String(product.id) === id);

  const updateItem = (rowId, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.rowId === rowId ? { ...item, [field]: value } : item
      )
    );
    setError("");
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { rowId: nextRowId.current++, productId: "", quantity: "1" },
    ]);
  };

  const removeItem = (rowId) => {
    setItems((current) => current.filter((item) => item.rowId !== rowId));
    setError("");
  };

  // Preview only: Django is authoritative for final prices and stock.
  const previewTotal = items.reduce((total, item) => {
    const product = getProduct(item.productId);
    const quantity = Number(item.quantity);
    if (!product || !Number.isSafeInteger(quantity) || quantity < 1) {
      return total;
    }
    return total + Number(product.price ?? 0) * quantity;
  }, 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError("");

    if (!allowSubmit) {
      setError("Order submission is disabled until backend stock safety is verified.");
      return;
    }

    if (!customers.some((customer) => String(customer.id) === customerId)) {
      setError("Please select a valid customer.");
      return;
    }

    if (items.length === 0) {
      setError("Add at least one product to the order.");
      return;
    }

    const selectedIds = new Set();
    const payloadItems = [];

    for (const item of items) {
      const product = getProduct(item.productId);
      const quantity = Number(item.quantity);

      if (!product) {
        setError("Select a valid, active product in every row.");
        return;
      }

      if (selectedIds.has(product.id)) {
        setError(`Duplicate product: ${product.name}. Select each product once.`);
        return;
      }
      selectedIds.add(product.id);

      if (
        item.quantity.trim() === "" ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1
      ) {
        setError(`Enter a positive whole-number quantity for ${product.name}.`);
        return;
      }

      if (quantity > Number(product.stock_quantity ?? 0)) {
        setError(
          `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}.`
        );
        return;
      }

      payloadItems.push({ product: product.id, quantity });
    }

    setSaving(true);
    try {
      const createdOrder = await createOrder({
        customer: Number(customerId),
        items: payloadItems,
        notes: notes.trim(),
      });
      onCreated?.(createdOrder);
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }

      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-order-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h2 id="new-order-title" className="text-xl font-bold text-slate-900">
                Create New Order
              </h2>
              <p className="text-sm text-slate-500">
                Choose a customer and the products to order.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close new order form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {!allowSubmit && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle size={19} className="shrink-0" />
              <p>
                Preview mode: order submission is disabled until Django's
                transaction and stock-deduction safeguards are verified.
              </p>
            </div>
          )}

          {loadError && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {loadError}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading && <p className="text-sm text-slate-500">Loading choices...</p>}

          <div>
            <label htmlFor="order-customer" className="mb-2 block text-sm font-semibold text-slate-700">
              Customer *
            </label>
            <select
              id="order-customer"
              className={inputClass}
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              disabled={loading || saving || Boolean(loadError)}
              required
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} — {customer.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Order Items</h3>
              <button
                type="button"
                onClick={addItem}
                disabled={loading || saving || Boolean(loadError)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                <Plus size={17} /> Add Product
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const product = getProduct(item.productId);
                const available = Number(product?.stock_quantity ?? 0);
                const quantity = Number(item.quantity);
                const tooMany = product && quantity > available;
                const selectedElsewhere = new Set(
                  items
                    .filter((row) => row.rowId !== item.rowId)
                    .map((row) => row.productId)
                );

                return (
                  <div key={item.rowId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-end">
                      <div>
                        <label htmlFor={`order-product-${item.rowId}`} className="mb-2 block text-xs font-semibold text-slate-600">
                          Product {index + 1}
                        </label>
                        <select
                          id={`order-product-${item.rowId}`}
                          value={item.productId}
                          onChange={(event) => updateItem(item.rowId, "productId", event.target.value)}
                          disabled={loading || saving || Boolean(loadError)}
                          required
                          className={inputClass}
                        >
                          <option value="">Select product</option>
                          {activeProducts.map((p) => (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={
                                Number(p.stock_quantity ?? 0) < 1 ||
                                selectedElsewhere.has(String(p.id))
                              }
                            >
                              {p.name} — {p.stock_quantity} in stock — {formatCurrency(p.price)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`order-quantity-${item.rowId}`} className="mb-2 block text-xs font-semibold text-slate-600">
                          Quantity
                        </label>
                        <input
                          id={`order-quantity-${item.rowId}`}
                          type="number"
                          min="1"
                          step="1"
                          max={product ? available : undefined}
                          value={item.quantity}
                          onChange={(event) => updateItem(item.rowId, "quantity", event.target.value)}
                          disabled={loading || saving || Boolean(loadError)}
                          required
                          className={inputClass}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.rowId)}
                        disabled={items.length === 1 || saving}
                        aria-label={`Remove product row ${index + 1}`}
                        className="rounded-lg border border-red-200 p-3 text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {product && (
                      <p className={`mt-2 text-xs ${tooMany ? "text-red-700" : "text-slate-500"}`}>
                        Available: {available} units · Subtotal preview: {formatCurrency(
                          Number.isSafeInteger(quantity) && quantity >= 1
                            ? Number(product.price) * quantity
                            : 0
                        )}
                        {tooMany ? " — Quantity exceeds current stock." : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="order-notes" className="mb-2 block text-sm font-semibold text-slate-700">
              Notes (optional)
            </label>
            <textarea
              id="order-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={saving}
              placeholder="Order notes..."
              className={inputClass}
            />
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">Estimated Total</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {formatCurrency(previewTotal)}
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Django recalculates the final total and checks stock at submission.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!allowSubmit || loading || saving || Boolean(loadError)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <LoaderCircle size={18} className="animate-spin" />}
              {saving ? "Creating..." : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrderForm;
