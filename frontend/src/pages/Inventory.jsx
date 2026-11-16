import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import StockAdjustmentForm from "../components/StockAdjustmentForm";

import {
  Warehouse,
  Package,
  Boxes,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Search,
  CheckCircle2,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";

import {
  getInventoryProducts,
  getStockMovements,
  getLowStockProducts,
} from "../services/inventoryService";

const formatNumber = (value) =>
  Number(value ?? 0).toLocaleString("en-IN");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

function SummaryCard({ title, value, Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
          <Icon size={22} />
        </div>
      </div>

      <h2 className="mt-4 text-3xl font-bold text-slate-900">
        {value}
      </h2>
    </div>
  );
}

function StockBadge({ product }) {
  const quantity = Number(product.stock_quantity ?? 0);
  const threshold = Number(product.low_stock_threshold ?? 0);

  if (product.is_active === false) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        Inactive
      </span>
    );
  }

  if (quantity === 0) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Out of Stock
      </span>
    );
  }

  if (quantity <= threshold) {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        Low Stock
      </span>
    );
  }

  return (
    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
      In Stock
    </span>
  );
}

function Inventory() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  const [search, setSearch] = useState("");
  const [adjustmentMode, setAdjustmentMode] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        productData,
        movementData,
        lowStockData,
      ] = await Promise.all([
        getInventoryProducts(),
        getStockMovements(),
        getLowStockProducts(),
      ]);

      setProducts(productData);
      setMovements(movementData);
      setLowStock(lowStockData);
      setLoaded(true);
    } catch (err) {
      const status = err.response?.status;

      if (status === 401) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }

      if (status === 403) {
        setError(
          "You do not have permission to view inventory."
        );
      } else {
        setError(
          "Unable to load inventory data. Check your Django server."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const totalStock = products.reduce(
    (total, product) =>
      total + Number(product.stock_quantity ?? 0),
    0
  );

  const filteredProducts = products.filter((product) => {
    const query = search.toLowerCase();

    return (
      String(product.name ?? "")
        .toLowerCase()
        .includes(query) ||
      String(product.sku ?? "")
        .toLowerCase()
        .includes(query)
    );
  });

  return (
    <DashboardLayout
      title="Inventory"
      onRefresh={loadInventory}
      refreshing={loading}
      connected={loaded && !error}
    >
      {/* Page heading */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Warehouse size={30} className="text-blue-600" />

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Inventory Management
          </h1>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Track product stock, inventory movements and
          low-stock alerts.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Successful stock adjustment */}
      {successMessage && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
        >
          {successMessage}
        </div>
      )}

      {/* Loading message */}
      {loading && !loaded && (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500">
          Loading inventory data...
        </div>
      )}

      {loaded && (
        <>
          {/* Inventory summary */}
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Listed Products"
              value={formatNumber(products.length)}
              Icon={Package}
            />

            <SummaryCard
              title="Listed Stock Units"
              value={formatNumber(totalStock)}
              Icon={Boxes}
            />

            <SummaryCard
              title="Low Stock Alerts"
              value={formatNumber(lowStock.length)}
              Icon={AlertTriangle}
            />

            <SummaryCard
              title="Loaded Movements"
              value={formatNumber(movements.length)}
              Icon={ArrowLeftRight}
            />
          </section>

          {/* Stock adjustment operations */}
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Stock Operations
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Add or remove inventory with a recorded stock movement.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setSuccessMessage("");
                  setAdjustmentMode("IN");
                }}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                <ArrowDownToLine size={19} />
                Stock In
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setSuccessMessage("");
                  setAdjustmentMode("OUT");
                }}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <ArrowUpFromLine size={19} />
                Stock Out
              </button>
            </div>
          </section>

          {/* Product stock table */}
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold">
                Current Product Stock
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Product quantities from your Django API
              </p>

              <div className="relative mt-5 max-w-md">
                <Search
                  size={18}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  type="search"
                  placeholder="Search by product name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Threshold</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {product.name}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {product.sku}
                        </td>

                        <td className="px-6 py-4 font-semibold">
                          {formatNumber(product.stock_quantity)}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {formatNumber(product.low_stock_threshold)}
                        </td>

                        <td className="px-6 py-4">
                          <StockBadge product={product} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Stock movement history */}
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold">
                Stock Movement History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Recorded stock additions and removals
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {movements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No stock movements recorded.
                      </td>
                    </tr>
                  ) : (
                    movements.map((movement) => {
                      const isStockIn =
                        movement.movement_type === "IN";

                      return (
                        <tr key={movement.id}>
                          <td className="px-6 py-4 font-medium">
                            {movement.product_name}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isStockIn
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {isStockIn
                                ? "Stock In"
                                : "Stock Out"}
                            </span>
                          </td>

                          <td
                            className={`px-6 py-4 font-semibold ${
                              isStockIn
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {isStockIn ? "+" : "-"}
                            {formatNumber(movement.quantity)}
                          </td>

                          <td className="px-6 py-4 text-slate-600">
                            {movement.notes || "—"}
                          </td>

                          <td className="px-6 py-4 text-slate-600">
                            {movement.created_by_username || "—"}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                            {formatDate(movement.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Low stock alerts */}
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <AlertTriangle
                size={21}
                className="text-amber-500"
              />
              Low Stock Alerts
            </h2>

            {lowStock.length === 0 ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-green-50 p-5 text-green-700">
                <CheckCircle2 size={22} />

                <p className="text-sm font-medium">
                  No active products are currently at
                  or below their low-stock threshold.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {lowStock.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {product.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {product.sku}
                      </p>
                    </div>

                    <p className="text-sm font-medium text-amber-800">
                      Stock: {product.stock_quantity} |
                      Threshold: {product.low_stock_threshold}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Keep the modal outside the tables and map() loops. */}
      {adjustmentMode && (
        <StockAdjustmentForm
          mode={adjustmentMode}
          products={products}
          onClose={() => setAdjustmentMode(null)}
          onSuccess={({ mode, productName, quantity }) => {
            setAdjustmentMode(null);
            setSuccessMessage(
              `${mode === "IN" ? "Stock In" : "Stock Out"} successful: ${quantity} units of ${productName}.`
            );
            loadInventory();
          }}
        />
      )}
    </DashboardLayout>
  );
}

export default Inventory;
