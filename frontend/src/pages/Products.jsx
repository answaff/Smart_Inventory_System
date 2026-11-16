import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  Search,
  RefreshCw,
  Boxes,
} from "lucide-react";

import ProductForm from "../components/ProductForm";
import { deleteProduct } from "../services/productService";
import api from "../services/api";
import DashboardLayout from "../layouts/DashboardLayout";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value ?? 0));

const getStockStatus = (product) => {
  const quantity = Number(product.stock_quantity ?? 0);
  const threshold = Number(product.low_stock_threshold ?? 0);

  if (quantity === 0) return "out";
  if (quantity <= threshold) return "low";
  return "available";
};

function StockBadge({ product }) {
  const status = getStockStatus(product);

  if (status === "out") {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Out of Stock
      </span>
    );
  }

  if (status === "low") {
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

function Products() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [roleError, setRoleError] = useState("");
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const canManage = currentUser?.can_manage_products === true;

  // Get the authenticated user's Inventory Admin / Staff role.
  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const response = await api.get("/auth/me/");
        if (!active) return;

        setCurrentUser(response.data);
        setRoleError("");
      } catch (err) {
        if (!active) return;
        setCurrentUser(null);

        if (err.response?.status === 401) {
          sessionStorage.removeItem("accessToken");
          navigate("/login", { replace: true });
        } else {
          setRoleError("Unable to verify your account role.");
        }
      }
    };

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, [navigate]);

  // Load products whenever the search term or refresh counter changes.
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/products/", {
          params: search.trim() ? { search: search.trim() } : {},
        });

        if (cancelled) return;

        const result = response.data;
        const items = Array.isArray(result)
          ? result
          : result.results ?? [];

        setProducts(items);
      } catch (err) {
        if (cancelled) return;

        if (err.response?.status === 401) {
          sessionStorage.removeItem("accessToken");
          navigate("/login", { replace: true });
          return;
        }

        if (err.response?.status === 403) {
          setError("You do not have permission to view products.");
        } else {
          setError("Unable to load products from the Django API.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, reload, navigate]);

  const refreshProducts = () => {
    setReload((value) => value + 1);
  };

  const handleFormSaved = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    setSearch("");
    setFilter("all");
    refreshProducts();
  };

  // IMPORTANT: this handler belongs inside Products(), outside useEffect().
  const handleDeleteProduct = async () => {
    if (!deletingProduct || deleting || !canManage) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      refreshProducts();
    } catch (err) {
      const status = err.response?.status;
      const details = err.response?.data;

      if (status === 401) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }

      if (status === 403) {
        setDeleteError("Inventory Admin permission is required.");
      } else if (status === 400 || status === 409) {
        setDeleteError(
          typeof details?.detail === "string"
            ? details.detail
            : "This product cannot be deleted because it has remaining stock, order history, or stock movements."
        );
      } else if (status === 404) {
        setDeleteError("Product not found. Refresh the product list.");
      } else {
        setDeleteError("Unable to delete product. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const filteredProducts = products.filter(
    (product) => filter === "all" || getStockStatus(product) === filter
  );

  const listedStock = products.reduce(
    (total, product) => total + Number(product.stock_quantity ?? 0),
    0
  );

  const lowStockCount = products.filter(
    (product) => getStockStatus(product) !== "available"
  ).length;

  return (
    <DashboardLayout
      title="Products"
      onRefresh={refreshProducts}
      refreshing={loading}
      connected={!error && !loading}
    >
      {/* Page heading and Admin-only Add button */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Product Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage and monitor your inventory catalog.
          </p>

          {currentUser && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                {currentUser.role}
              </span>
              <span className="text-sm text-slate-500">
                {canManage
                  ? "Product management access enabled"
                  : "Read-only product access"}
              </span>
            </div>
          )}

          {roleError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {roleError}
            </p>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={19} />
            Add Product
          </button>
        )}
      </div>

      {/* Summary cards: values refer to products in the loaded list */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Package className="text-blue-600" size={22} />
            <p className="text-sm text-slate-500">Listed Products</p>
          </div>
          <h2 className="mt-4 text-3xl font-bold">{products.length}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Boxes className="text-green-600" size={22} />
            <p className="text-sm text-slate-500">Listed Stock Units</p>
          </div>
          <h2 className="mt-4 text-3xl font-bold">{listedStock}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={22} />
            <p className="text-sm text-slate-500">Listed Low Stock</p>
          </div>
          <h2 className="mt-4 text-3xl font-bold">{lowStockCount}</h2>
        </div>
      </div>

      {/* Product list and filters */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Product List</h2>
            <p className="mt-1 text-sm text-slate-500">
              Products loaded from Django REST API
            </p>
          </div>

          <button
            type="button"
            onClick={refreshProducts}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            aria-label="Filter by stock status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All Stock Statuses</option>
            <option value="available">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-5 mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Status</th>
                {canManage && <th className="px-6 py-4">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    {error ? "Products unavailable." : "No products found."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {product.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Product ID: {product.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {product.category_name ??
                        product.category?.name ??
                        product.category ??
                        "—"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {product.stock_quantity}
                    </td>
                    <td className="px-6 py-4">
                      <StockBadge product={product} />
                    </td>

                    {canManage && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(product)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                          >
                            <Pencil size={16} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setDeletingProduct(product);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
          Showing {filteredProducts.length} loaded products
        </div>
      </section>

      {/* Add Product form */}
      {showAddForm && canManage && (
        <ProductForm
          onClose={() => setShowAddForm(false)}
          onCreated={handleFormSaved}
        />
      )}

      {/* Edit Product form */}
      {editingProduct && canManage && (
        <ProductForm
          key={editingProduct.id}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={handleFormSaved}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingProduct && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            aria-describedby="delete-product-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle size={28} className="text-red-600" />
            </div>

            <h2
              id="delete-product-title"
              className="text-xl font-bold text-slate-900"
            >
              Delete Product?
            </h2>

            <p
              id="delete-product-description"
              className="mt-3 text-sm leading-relaxed text-slate-600"
            >
              Are you sure you want to delete{" "}
              <strong className="text-slate-900">
                {deletingProduct.name}
              </strong>
              ?
            </p>

            <p className="mt-2 text-sm text-slate-500">
              This action cannot be undone. Products with order history,
              stock movements, or remaining stock cannot be deleted.
            </p>

            {deleteError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {deleteError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteError("");
                  setDeletingProduct(null);
                }}
                className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteProduct}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={18} />
                {deleting ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Products;
