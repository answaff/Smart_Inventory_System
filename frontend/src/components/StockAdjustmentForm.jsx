
import { useState } from "react";
import { useNavigate } from "react-router";

import {
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  LoaderCircle,
} from "lucide-react";

import {
  stockIn,
  stockOut,
} from "../services/inventoryService";

function StockAdjustmentForm({
  mode,
  products,
  onClose,
  onSuccess,
}) {
  const navigate = useNavigate();

  const isStockIn = mode === "IN";

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeProducts = products.filter(
    (product) => product.is_active !== false
  );

  const selectedProduct = activeProducts.find(
    (product) => String(product.id) === productId
  );

  const currentStock = Number(
    selectedProduct?.stock_quantity ?? 0
  );

  const quantityNumber = Number(quantity);

  const validQuantity =
    quantity.trim() !== "" &&
    Number.isSafeInteger(quantityNumber) &&
    quantityNumber >= 1;

  const newStock =
    selectedProduct && validQuantity
      ? isStockIn
        ? currentStock + quantityNumber
        : currentStock - quantityNumber
      : null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (!selectedProduct) {
      setError("Please select a valid product.");
      return;
    }

    if (!validQuantity) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (!isStockIn && quantityNumber > currentStock) {
      setError(
        `Insufficient stock. Only ${currentStock} units are available.`
      );
      return;
    }

    const payload = {
      product: Number(productId),
      quantity: quantityNumber,
      notes: notes.trim(),
    };

    setSaving(true);

    try {
      if (isStockIn) {
        await stockIn(payload);
      } else {
        await stockOut(payload);
      }

      onSuccess({
        mode,
        productName: selectedProduct.name,
        quantity: quantityNumber,
      });
    } catch (err) {
      const status = err.response?.status;
      const details = err.response?.data;

      if (status === 401) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }

      if (status === 403) {
        setError(
          "Inventory Admin or Staff permission is required."
        );
      } else if (details && typeof details === "object") {
        const messages = Object.entries(details).map(
          ([field, value]) => {
            const message = Array.isArray(value)
              ? value.join(", ")
              : String(value);

            return `${field}: ${message}`;
          }
        );

        setError(messages.join(" | "));
      } else {
        setError(
          "Unable to adjust stock. Check your connection."
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
        aria-labelledby="stock-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl p-3 ${
                isStockIn
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {isStockIn ? (
                <ArrowDownToLine size={23} />
              ) : (
                <ArrowUpFromLine size={23} />
              )}
            </div>

            <div>
              <h2
                id="stock-form-title"
                className="text-xl font-bold text-slate-900"
              >
                {isStockIn ? "Stock In" : "Stock Out"}
              </h2>

              <p className="text-sm text-slate-500">
                {isStockIn
                  ? "Add inventory to an existing product."
                  : "Remove inventory from an existing product."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close stock form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Product selection */}
          <div>
            <label
              htmlFor="stock-product"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Select Product *
            </label>

            <select
              id="stock-product"
              required
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value);
                setError("");
              }}
              className={inputClass}
            >
              <option value="">Choose a product</option>

              {activeProducts.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                  disabled={
                    !isStockIn &&
                    Number(product.stock_quantity) <= 0
                  }
                >
                  {product.name} — Stock: {product.stock_quantity}
                </option>
              ))}
            </select>
          </div>

          {/* Current stock */}
          {selectedProduct && (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Current Available Stock
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {currentStock} units
              </p>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label
              htmlFor="stock-quantity"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Quantity *
            </label>

            <input
              id="stock-quantity"
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setError("");
              }}
              placeholder="Enter quantity"
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="stock-notes"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Notes
            </label>

            <textarea
              id="stock-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                isStockIn
                  ? "Example: Stock received from supplier"
                  : "Example: Damaged items removed"
              }
              className={inputClass}
            />
          </div>

          {/* Stock preview */}
          {newStock !== null && newStock >= 0 && (
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-700">
                Stock After Adjustment (Preview)
              </p>

              <p className="mt-2 text-xl font-bold text-blue-900">
                {currentStock} → {newStock} units
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3">
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
              disabled={saving || activeProducts.length === 0}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-50 ${
                isStockIn
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {saving && (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
              )}

              {saving
                ? "Processing..."
                : isStockIn
                ? "Confirm Stock In"
                : "Confirm Stock Out"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StockAdjustmentForm;
