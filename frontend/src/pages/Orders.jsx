import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ShoppingCart,
  ClipboardList,
  Clock3,
  CircleCheck,
  CircleX,
  IndianRupee,
  Search,
  Eye,
  RefreshCw,
  X,
  Package,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import OrderForm from "../components/OrderForm";
import { getOrder, getOrders, cancelOrder, completeOrder } from "../services/orderService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value ?? 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const statusStyles = {
  PLACED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

function OrderStatus({ status }) {
  const label = status || "UNKNOWN";
  const className = statusStyles[label] ?? "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {label.charAt(0) + label.slice(1).toLowerCase()}
    </span>
  );
}

function SummaryCard({ title, value, Icon, iconColor = "text-blue-600" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-xl bg-slate-50 p-3 ${iconColor}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [createdMessage, setCreatedMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const detailsRequestId = useRef(0);

  // Read-only fetch: retrieving orders does not change inventory.
  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getOrders();
        if (!active) return;

        setOrders(data);
        setLoaded(true);
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 401) {
          sessionStorage.removeItem("accessToken");
          navigate("/login", { replace: true });
          return;
        }

        setError(
          err.response?.status === 403
            ? "You do not have permission to view orders."
            : "Unable to load orders. Check that Django is running."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrders();
    return () => {
      active = false;
    };
  }, [reload, navigate]);

  const refreshOrders = () => setReload((value) => value + 1);

  const openDetails = async (id) => {
    const requestId = ++detailsRequestId.current;
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError("");
    setSelectedOrder(null);

    try {
      const data = await getOrder(id);
      if (requestId !== detailsRequestId.current) return;
      setSelectedOrder(data);
    } catch (err) {
      if (requestId !== detailsRequestId.current) return;

      if (err.response?.status === 401) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }

      setDetailsError(
        err.response?.status === 403
          ? "You do not have permission to view this order."
          : "Unable to load order details. Please try again."
      );
    } finally {
      if (requestId === detailsRequestId.current) {
        setDetailsLoading(false);
      }
    }
  };

  const closeDetails = () => {
    detailsRequestId.current += 1;
    setDetailsOpen(false);
    setSelectedOrder(null);
    setDetailsError("");
  };

  // Status changes are only possible for PLACED orders. Django rechecks
  // authorization and status, so stale UI cannot bypass backend safeguards.
  const requestOrderAction = (order, kind) => {
    if (actionSaving || order.status !== "PLACED") return;
    setActionError("");
    setActionMessage("");
    setPendingAction({
      id: order.id,
      customerName: order.customer_name || `Customer #${order.customer}`,
      kind,
    });
  };

  const confirmOrderAction = async () => {
    if (!pendingAction || actionSaving) return;

    const { id, kind } = pendingAction;
    setActionSaving(true);
    setActionError("");

    try {
      const updated =
        kind === "complete" ? await completeOrder(id) : await cancelOrder(id);

      const expectedStatus = kind === "complete" ? "COMPLETED" : "CANCELLED";
      if (updated?.status !== expectedStatus) {
        throw new Error("Unexpected order status returned by Django. Refresh orders before retrying.");
      }

      // Update the visible row and open details immediately; re-fetch from
      // Django to keep summary cards, filters and history synchronized.
      setOrders((current) =>
        current.map((order) =>
          order.id === id ? { ...order, ...updated } : order
        )
      );
      setSelectedOrder((current) =>
        current?.id === id ? { ...current, ...updated } : current
      );
      setPendingAction(null);
      setActionMessage(
        kind === "complete"
          ? `Order #${id} completed successfully. No additional stock was deducted.`
          : `Order #${id} cancelled successfully. Django restored its stock.`
      );
      refreshOrders();
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }

      const data = err.response?.data;
      const apiMessage =
        typeof data?.detail === "string"
          ? data.detail
          : typeof data === "object" && data !== null
            ? Object.entries(data)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
                .join(" | ")
            : "";
      setActionError(
        err.response?.status === 403
          ? "You do not have permission to change this order."
          : apiMessage || err.message || "Unable to update order. Please try again."
      );
    } finally {
      setActionSaving(false);
    }
  };

  const countByStatus = (status) =>
    orders.filter((order) => order.status === status).length;

  const completedSales = orders
    .filter((order) => order.status === "COMPLETED")
    .reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);

  const filteredOrders = orders.filter((order) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      String(order.customer_name ?? "").toLowerCase().includes(term) ||
      String(order.id ?? "").includes(term);

    const matchesStatus =
      statusFilter === "ALL" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout
      title="Orders"
      onRefresh={refreshOrders}
      refreshing={loading}
      connected={loaded && !error}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-blue-600" size={30} />
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Order Management
          </h1>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Review orders, search by customer, and inspect order details.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setCreatedMessage("");
            setShowOrderForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          <ShoppingCart size={18} />
          New Order
        </button>
      </div>

      {actionMessage && (
        <div role="status" className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          {actionMessage}
        </div>
      )}

      {createdMessage && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
        >
          {createdMessage}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !loaded ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Loading order history...
        </div>
      ) : loaded ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard title="Loaded Orders" value={orders.length} Icon={ClipboardList} />
            <SummaryCard title="Placed" value={countByStatus("PLACED")} Icon={Clock3} />
            <SummaryCard title="Completed" value={countByStatus("COMPLETED")} Icon={CircleCheck} iconColor="text-green-600" />
            <SummaryCard title="Cancelled" value={countByStatus("CANCELLED")} Icon={CircleX} iconColor="text-red-600" />
            <SummaryCard title="Completed Sales" value={formatCurrency(completedSales)} Icon={IndianRupee} iconColor="text-green-600" />
          </section>

          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Order History</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Orders retrieved from your Django REST API
                </p>
              </div>
              <button
                type="button"
                onClick={refreshOrders}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="flex flex-col gap-3 p-5 sm:flex-row">
              <div className="relative flex-1">
                <Search size={19} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search orders by customer or order ID"
                  placeholder="Search customer name or order ID..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <select
                aria-label="Filter orders by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PLACED">Placed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Order</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        {orders.length === 0
                          ? "No orders have been created yet."
                          : "No orders match your search and filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          #{order.id}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {order.customer_name || `Customer #${order.customer}`}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {Array.isArray(order.items) ? order.items.length : 0} product(s)
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4">
                          <OrderStatus status={order.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openDetails(order.id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700 hover:bg-blue-100"
                            >
                              <Eye size={16} />
                              View Details
                            </button>
                            {order.status === "PLACED" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => requestOrderAction(order, "complete")}
                                  disabled={actionSaving}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                                >
                                  <CircleCheck size={16} />
                                  Complete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestOrderAction(order, "cancel")}
                                  disabled={actionSaving}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                                >
                                  <CircleX size={16} />
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
              Showing {filteredOrders.length} of {orders.length} loaded orders.
              Search and summary cards cover the loaded API records.
            </div>
          </section>

          <p className="mt-5 text-sm text-slate-500">
            Only PLACED orders can be completed or cancelled. Completion updates the status;
            cancellation restores stock through Django.
          </p>
        </>
      ) : null}

      {showOrderForm && (
        <OrderForm
          allowSubmit={true}
          onClose={() => setShowOrderForm(false)}
          onCreated={(order) => {
            setShowOrderForm(false);
            setSearch("");
            setStatusFilter("ALL");
            setCreatedMessage(
              `Order #${order.id} created successfully. Stock was deducted by Django.`
            );
            refreshOrders();
          }}
        />
      )}

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 id="order-details-title" className="text-xl font-bold text-slate-900">
                  {selectedOrder ? `Order #${selectedOrder.id}` : "Order Details"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Order information from Django</p>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close order details"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              {detailsLoading && (
                <p className="py-8 text-center text-slate-500">Loading order details...</p>
              )}
              {detailsError && (
                <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {detailsError}
                </p>
              )}
              {selectedOrder && !detailsLoading && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Customer</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedOrder.customer_name || `Customer #${selectedOrder.customer}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <div className="mt-1"><OrderStatus status={selectedOrder.status} /></div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="mt-1 font-medium">{formatDate(selectedOrder.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Updated</p>
                      <p className="mt-1 font-medium">{formatDate(selectedOrder.updated_at)}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="flex items-center gap-2 font-bold text-slate-900">
                      <Package size={19} className="text-blue-600" />
                      Ordered Products
                    </h3>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[450px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Qty</th>
                            <th className="px-4 py-3">Unit Price</th>
                            <th className="px-4 py-3">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedOrder.items ?? []).map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 font-medium">
                                {item.product_name || `Product #${item.product}`}
                              </td>
                              <td className="px-4 py-3">{item.quantity}</td>
                              <td className="px-4 py-3">{formatCurrency(item.unit_price)}</td>
                              <td className="px-4 py-3 font-semibold">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-blue-50 p-4">
                    <p className="text-sm text-blue-700">Order Total</p>
                    <p className="mt-1 text-2xl font-bold text-blue-900">
                      {formatCurrency(selectedOrder.total_amount)}
                    </p>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-slate-800">Notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {selectedOrder.notes || "No notes provided."}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-5">
              {selectedOrder?.status === "PLACED" && !detailsLoading && (
                <>
                  <button
                    type="button"
                    onClick={() => requestOrderAction(selectedOrder, "complete")}
                    disabled={actionSaving}
                    className="rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Complete Order
                  </button>
                  <button
                    type="button"
                    onClick={() => requestOrderAction(selectedOrder, "cancel")}
                    disabled={actionSaving}
                    className="rounded-xl bg-red-50 px-4 py-2.5 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Cancel Order
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="order-action-title"
            aria-describedby="order-action-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 id="order-action-title" className="text-xl font-bold text-slate-900">
              {pendingAction.kind === "complete" ? "Complete this order?" : "Cancel this order?"}
            </h2>
            <p id="order-action-description" className="mt-3 text-sm leading-6 text-slate-600">
              Order #{pendingAction.id} — {pendingAction.customerName}.{" "}
              {pendingAction.kind === "complete"
                ? "This marks the order COMPLETED. Stock was already deducted when it was placed; completion will not deduct it again."
                : "This marks the order CANCELLED. Django will restore the ordered quantities to inventory."}
            </p>
            {actionError && (
              <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={actionSaving}
                onClick={() => { setPendingAction(null); setActionError(""); refreshOrders(); }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={actionSaving}
                onClick={confirmOrderAction}
                className={`rounded-xl px-4 py-2.5 font-semibold text-white disabled:opacity-50 ${
                  pendingAction.kind === "complete"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionSaving
                  ? "Saving..."
                  : pendingAction.kind === "complete"
                    ? "Confirm Complete"
                    : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Orders;
