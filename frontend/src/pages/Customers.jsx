import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  CalendarDays,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import CustomerForm from "../components/CustomerForm";
import { deleteCustomer, getCustomers } from "../services/customerService";

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const getApiErrorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join(" | ");
  }
  return "Request failed. Please try again.";
};

function Customers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getCustomers(search);
        if (active) setCustomers(data);
      } catch (requestError) {
        if (!active) return;
        if (requestError.response?.status === 401) {
          sessionStorage.removeItem("accessToken");
          navigate("/login", { replace: true });
          return;
        }
        setError(
          requestError.response?.status === 403
            ? "You do not have permission to view customers."
            : "Unable to load customers from Django. Check your API connection."
        );
      } finally {
        if (active) setLoading(false);
      }
    }, search.trim() ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, reload, navigate]);

  const refreshCustomers = () => setReload((value) => value + 1);

  const handleSaved = (action) => {
    setShowAddForm(false);
    setEditingCustomer(null);
    setSuccessMessage(
      action === "created"
        ? "Customer added successfully."
        : "Customer updated successfully."
    );
    setSearch("");
    refreshCustomers();
  };

  const handleDelete = async () => {
    if (!deletingCustomer || deleting) return;

    setDeleting(true);
    setDeleteError("");
    try {
      await deleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
      setSuccessMessage("Customer deleted successfully.");
      refreshCustomers();
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }
      setDeleteError(
        requestError.response?.status === 403
          ? "You do not have permission to delete customers."
          : getApiErrorMessage(requestError)
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout
      title="Customers"
      onRefresh={refreshCustomers}
      refreshing={loading}
      connected={!loading && !error}
    >
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" size={30} />
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Customer Management
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Maintain customer contacts and manage customer records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSuccessMessage("");
            setShowAddForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={19} />
          Add Customer
        </button>
      </div>

      {successMessage && (
        <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={19} className="text-blue-600" />
            Customers Loaded
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {loading ? "…" : customers.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Search size={19} className="text-blue-600" />
            Current Search
          </div>
          <p className="mt-4 truncate text-lg font-semibold text-slate-900">
            {search.trim() ? search.trim() : "All customers"}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Customer List</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search by customer name, email or phone.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshCustomers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="p-5">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-3 text-slate-400" size={19} />
            <input
              type="search"
              aria-label="Search customers"
              placeholder="Search name, email or phone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Address</th>
                <th className="px-5 py-4">Added On</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-slate-500">
                    {error
                      ? "Customer data is unavailable."
                      : search.trim()
                        ? "No customers match your search."
                        : "No customers yet. Click Add Customer to create one."}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{customer.name}</div>
                      <div className="mt-1 text-xs text-slate-400">ID: {customer.id}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Mail size={15} className="shrink-0 text-slate-400" />
                        {customer.email}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={15} className="shrink-0 text-slate-400" />
                        {customer.phone}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-5 py-4 text-slate-600">
                      <span className="inline-flex items-start gap-2">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                        <span className="break-words">{customer.address || "—"}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={15} className="text-slate-400" />
                        {formatDate(customer.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSuccessMessage("");
                            setEditingCustomer(customer);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <Pencil size={15} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSuccessMessage("");
                            setDeleteError("");
                            setDeletingCustomer(customer);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing {loading ? "…" : customers.length} customers from the current API response.
        </div>
      </section>

      {showAddForm && (
        <CustomerForm
          onClose={() => setShowAddForm(false)}
          onSaved={handleSaved}
        />
      )}

      {editingCustomer && (
        <CustomerForm
          key={editingCustomer.id}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSaved={handleSaved}
        />
      )}

      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            aria-describedby="delete-customer-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-red-100 p-3 text-red-600">
                <AlertTriangle size={25} />
              </span>
              <button
                type="button"
                aria-label="Close confirmation"
                onClick={() => { setDeletingCustomer(null); setDeleteError(""); }}
                disabled={deleting}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            <h2 id="delete-customer-title" className="text-xl font-bold text-slate-900">
              Delete Customer?
            </h2>
            <p id="delete-customer-description" className="mt-3 text-sm text-slate-600">
              Delete <strong>{deletingCustomer.name}</strong> ({deletingCustomer.email})?
              This action cannot be undone.
            </p>
            <p className="mt-2 text-sm text-amber-800">
              Only delete disposable test customers without order history.
              Confirm backend deletion safeguards before removing real customers.
            </p>
            {deleteError && (
              <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => { setDeletingCustomer(null); setDeleteError(""); }}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={17} />
                {deleting ? "Deleting..." : "Delete Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Customers;
