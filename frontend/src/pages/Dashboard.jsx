import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Package,
  Boxes,
  Wallet,
  ShoppingCart,
  IndianRupee,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowRight,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import { getDashboardSummary } from "../services/dashboardService";
import { getLowStockProducts } from "../services/inventoryService";
import { getOrders } from "../services/orderService";

const number = (value) => Number(value ?? 0).toLocaleString("en-IN");
const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const asList = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const statusTheme = {
  PLACED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

function MetricCard({ label, value, icon: Icon, color = "blue", note }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [alertsUnavailable, setAlertsUnavailable] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      setWarning("");
      setAlertsUnavailable(false);

      const [summaryResult, alertsResult, ordersResult] =
        await Promise.allSettled([
          getDashboardSummary(),
          getLowStockProducts(),
          getOrders(),
        ]);

      if (!active) return;

      const failures = [summaryResult, alertsResult, ordersResult]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);

      if (failures.some((err) => err?.response?.status === 401)) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
      } else {
        setError(
          summaryResult.reason?.response?.status === 403
            ? "You do not have permission to view the dashboard."
            : "Unable to load the dashboard summary. Check your Django server and try Refresh."
        );
      }

      if (alertsResult.status === "fulfilled") {
        setLowStock(
          asList(alertsResult.value).filter(
            (p) =>
              p.is_active !== false &&
              Number(p.stock_quantity ?? 0) <=
                Number(p.low_stock_threshold ?? 0)
          )
        );
      } else {
        setLowStock([]);
        setAlertsUnavailable(true);
      }

      if (ordersResult.status === "fulfilled") {
        const sorted = [...asList(ordersResult.value)].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
              new Date(a.created_at ?? 0).getTime() ||
            Number(b.id) - Number(a.id)
        );
        setRecentOrders(sorted.slice(0, 5));
      } else {
        setRecentOrders([]);
      }

      const missing = [
        alertsResult.status === "rejected" ? "low-stock details" : null,
        ordersResult.status === "rejected" ? "recent orders" : null,
      ].filter(Boolean);

      if (missing.length) {
        setWarning(`Could not load ${missing.join(" and ")}. Other dashboard data is still available.`);
      }
      setLoading(false);
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [navigate, reload]);

  const refresh = () => setReload((count) => count + 1);
  const values = summary?.orders_by_status ?? {};
  const placed = Number(values.placed ?? 0);
  const completed = Number(values.completed ?? 0);
  const cancelled = Number(values.cancelled ?? 0);
  const totalOrders = Number(summary?.total_orders ?? 0);
  const percent = (value) =>
    totalOrders > 0 ? `${(value / totalOrders) * 100}%` : "0%";
  const display = (value, formatter = number) =>
    summary ? formatter(value) : "—";

  const metrics = [
    {
      label: "Active Products",
      value: display(summary?.total_products),
      icon: Package,
      note: "Products available in your catalog",
    },
    {
      label: "Units in Stock",
      value: display(summary?.total_stock),
      icon: Boxes,
      color: "violet",
      note: "Total stock across active products",
    },
    {
      label: "Inventory Value",
      value: display(summary?.stock_value, money),
      icon: Wallet,
      color: "emerald",
      note: "Current stock at product selling prices",
    },
    {
      label: "Orders Today",
      value: display(summary?.orders_today),
      icon: ShoppingCart,
      color: "blue",
      note: "Orders created today",
    },
    {
      label: "Sales Today",
      value: display(summary?.sales_today, money),
      icon: IndianRupee,
      color: "emerald",
      note: "Orders marked completed today",
    },
    {
      label: "Low Stock Alerts",
      value: display(summary?.low_stock_count),
      icon: AlertTriangle,
      color: "amber",
      note: "At or below the reorder threshold",
    },
  ];

  return (
    <DashboardLayout
      title="Dashboard"
      onRefresh={refresh}
      refreshing={loading}
      connected={Boolean(summary) && !error}
    >
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Smart Inventory / Overview
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Business Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Inventory, orders and sales — updated when you refresh.
          </p>
          {summary?.date && (
            <p className="mt-1 text-xs text-slate-400">
              Reporting date: {summary.date}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {warning && (
        <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Order Overview</h2>
              <p className="mt-1 text-sm text-slate-500">All-time order status distribution</p>
            </div>
            <span className="rounded-xl bg-slate-100 p-3 text-slate-600">
              <ClipboardList size={20} />
            </span>
          </div>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">
              {display(summary?.total_orders)}
            </span>
            <span className="text-sm text-slate-500">total orders</span>
          </div>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Order status proportions">
            <div className="bg-blue-500" style={{ width: percent(placed) }} />
            <div className="bg-emerald-500" style={{ width: percent(completed) }} />
            <div className="bg-rose-400" style={{ width: percent(cancelled) }} />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Placed", count: placed, icon: Clock3, tone: "text-blue-600", dot: "bg-blue-500" },
              { label: "Completed", count: completed, icon: CheckCircle2, tone: "text-emerald-600", dot: "bg-emerald-500" },
              { label: "Cancelled", count: cancelled, icon: XCircle, tone: "text-rose-600", dot: "bg-rose-400" },
            ].map(({ label, count, icon: Icon, tone, dot }) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {label}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xl font-bold text-slate-900">
                    {summary ? number(count) : "—"}
                  </span>
                  <Icon size={18} className={tone} aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            View all orders <ArrowRight size={16} />
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Low Stock Alerts</h2>
              <p className="mt-1 text-sm text-slate-500">Products that may need restocking</p>
            </div>
            <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <AlertTriangle size={20} />
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {!loading && lowStock.length === 0 && !alertsUnavailable ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No low-stock products found.
              </p>
            ) : lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {loading ? "Loading alerts..." : "Low-stock details unavailable."}
              </p>
            ) : (
              lowStock.slice(0, 5).map((product) => {
                const empty = Number(product.stock_quantity ?? 0) === 0;
                return (
                  <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        SKU: {product.sku || "—"} · Threshold: {number(product.low_stock_threshold)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${empty ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                      {number(product.stock_quantity)} left
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate("/inventory")}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            Manage inventory <ArrowRight size={16} />
          </button>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
            <p className="mt-1 text-sm text-slate-500">Your latest five order records</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            View orders <ArrowRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    {loading ? "Loading orders..." : "No recent orders to display."}
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-900">#{order.id}</td>
                    <td className="px-6 py-4 text-slate-600">{order.customer_name || `Customer #${order.customer}`}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{money(order.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTheme[order.status] || "bg-slate-100 text-slate-600"}`}>
                        {order.status || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <TrendingUp size={15} aria-hidden="true" />
        Today's sales reflect orders completed today. Inventory value uses selling prices, not purchase cost.
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
