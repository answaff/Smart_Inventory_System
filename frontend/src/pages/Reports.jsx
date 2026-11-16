
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  Package,
  Boxes,
  AlertTriangle,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";

import {
  getSalesReport,
  getProductSalesReport,
  getInventoryReport,
} from "../services/reportService";

const money = (value) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("en-IN") : "—";

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Reports() {
  const navigate = useNavigate();

  const [sales, setSales] = useState(null);
  const [productSales, setProductSales] = useState(null);
  const [inventory, setInventory] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({});

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError("");

      try {
        const [salesData, productData, inventoryData] =
          await Promise.all([
            getSalesReport(params),
            getProductSalesReport(params),
            getInventoryReport(),
          ]);

        setSales(salesData);
        setProductSales(productData);
        setInventory(inventoryData);
        setConnected(true);
      } catch (err) {
        setConnected(false);

        if (err.response?.status === 401) {
          sessionStorage.removeItem("accessToken");
          navigate("/login", { replace: true });
          return;
        }

        setError(
          err.response?.data?.detail ||
            "Unable to load reports. Check your Django server."
        );
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const applyFilters = (event) => {
    event.preventDefault();

    if (startDate && endDate && startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    setAppliedFilters(params);
    loadReports(params);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setAppliedFilters({});
    loadReports({});
  };

  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
  const td = "px-4 py-3 text-sm text-slate-700";

  return (
    <DashboardLayout
      title="Reports"
      connected={connected}
      refreshing={loading}
      onRefresh={() => loadReports(appliedFilters)}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sales & Inventory Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Business performance, product sales and stock activity.
          </p>
        </div>

        {/* Date filters */}
        <form
          onSubmit={applyFilters}
          className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Apply Filters
          </button>

          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Reset
          </button>

          <p className="w-full text-xs text-slate-500">
            Dates filter completed sales by order creation date.
            Inventory always shows current stock.
          </p>
        </form>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading && (
          <p className="text-sm text-blue-600">
            Loading reports...
          </p>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Completed Sales"
            value={money(sales?.total_sales)}
            icon={BarChart3}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Completed Orders"
            value={sales?.total_completed_orders ?? 0}
            icon={Package}
            color="bg-green-50 text-green-600"
          />
          <StatCard
            title="Inventory Retail Value"
            value={money(inventory?.estimated_retail_stock_value)}
            icon={Boxes}
            color="bg-violet-50 text-violet-600"
          />
          <StatCard
            title="Low Stock Products"
            value={inventory?.low_stock_products ?? 0}
            icon={AlertTriangle}
            color="bg-orange-50 text-orange-600"
          />
        </div>

        {/* Sales Report */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold">Sales by Date</h2>
            <p className="text-sm text-slate-500">
              Revenue from completed orders
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Orders</th>
                  <th className={th}>Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(sales?.sales_by_date ?? []).map((row) => (
                  <tr key={row.date}>
                    <td className={td}>{row.date}</td>
                    <td className={td}>{row.order_count}</td>
                    <td className={td}>{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!sales?.sales_by_date?.length && (
              <p className="p-5 text-sm text-slate-500">
                No completed sales for this period.
              </p>
            )}
          </div>
        </section>

        {/* Product Sales Report */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-bold">
                Product-wise Sales
              </h2>
              <p className="text-sm text-slate-500">
                Best-selling products by quantity
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              {productSales?.total_units_sold ?? 0} units sold
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>SKU</th>
                  <th className={th}>Units Sold</th>
                  <th className={th}>Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(productSales?.products ?? []).map((item) => (
                  <tr key={item.product_id}>
                    <td className={`${td} font-semibold`}>
                      {item.name}
                    </td>
                    <td className={td}>{item.sku}</td>
                    <td className={td}>{item.units_sold}</td>
                    <td className={td}>{money(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!productSales?.products?.length && (
              <p className="p-5 text-sm text-slate-500">
                No product sales found.
              </p>
            )}
          </div>
        </section>

        {/* Inventory Report */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold">
              Current Inventory
            </h2>
            <p className="text-sm text-slate-500">
              {inventory?.total_products ?? 0} active products •{" "}
              {inventory?.total_stock ?? 0} units in stock
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>SKU</th>
                  <th className={th}>Stock</th>
                  <th className={th}>Status</th>
                  <th className={th}>Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(inventory?.products ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className={`${td} font-semibold`}>
                      {item.name}
                    </td>
                    <td className={td}>{item.sku}</td>
                    <td className={td}>{item.stock_quantity}</td>
                    <td className={td}>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.stock_status === "IN_STOCK"
                            ? "bg-green-100 text-green-700"
                            : item.stock_status === "LOW_STOCK"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.stock_status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className={td}>
                      {money(item.stock_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!inventory?.products?.length && (
              <p className="p-5 text-sm text-slate-500">
                No active products found.
              </p>
            )}
          </div>
        </section>

        {/* Inventory Movement History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold">
              Recent Stock Movements
            </h2>
            <p className="text-sm text-slate-500">
              Latest 10 stock-in and stock-out transactions
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Type</th>
                  <th className={th}>Quantity</th>
                  <th className={th}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(inventory?.recent_movements ?? []).map((m) => (
                  <tr key={m.id}>
                    <td className={`${td} font-semibold`}>
                      {m.product}
                    </td>
                    <td className={td}>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          m.movement_type === "IN"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {m.movement_type === "IN"
                          ? "Stock In"
                          : "Stock Out"}
                      </span>
                    </td>
                    <td className={td}>{m.quantity}</td>
                    <td className={td}>
                      {formatDate(m.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!inventory?.recent_movements?.length && (
              <p className="p-5 text-sm text-slate-500">
                No stock movements found.
              </p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default Reports;
