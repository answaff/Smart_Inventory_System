
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";

import {
  Boxes,
  LayoutDashboard,
  Package,
  Warehouse,
  Users,
  ShoppingCart,
  ChartNoAxesCombined,
  Menu,
  X,
  LogOut,
  RefreshCw,
} from "lucide-react";

function DashboardLayout({
children,
onRefresh,
refreshing = false,
connected = false,
title = "Dashboard",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const logout = () => {
    sessionStorage.removeItem("accessToken");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Mobile overlay */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-72
          flex-col bg-slate-950 text-white
          transition-transform duration-200
          lg:translate-x-0
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5">
              <Boxes size={24} />
            </div>

            <div>
              <h1 className="font-bold">Smart Inventory</h1>
              <p className="text-xs text-slate-400">
                Management System
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMenuOpen(false)}
            className="text-slate-400 lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-7">

          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Main Menu
          </p>

          <NavLink
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>

          <NavLink
            to="/products"
             onClick={() => setMenuOpen(false)}
             className={({ isActive }) =>
             `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
         isActive
              ? "bg-blue-600 text-white"
              : "text-slate-300 hover:bg-slate-800"
                  }`
                 }
            >
                <Package size={20} />
                     Products
            </NavLink>

            <NavLink
  to="/inventory"
  onClick={() => setMenuOpen(false)}
  className={({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800"
    }`
  }
>
  <Warehouse size={20} />
  Inventory
</NavLink>


<NavLink
  to="/customers"
  onClick={() => setMenuOpen(false)}
  className={({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800"
    }`
  }
>
  <Users size={20} />
  Customers
</NavLink>


<NavLink
  to="/orders"
  onClick={() => setMenuOpen(false)}
  className={({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800"
    }`
  }
>
  <ShoppingCart size={20} />
  Orders
</NavLink>

<NavLink
  to="/reports"
  onClick={() => setMenuOpen(false)}
  className={({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800"
    }`
  }
>
  <ChartNoAxesCombined size={20} />
  Reports
</NavLink>

        </nav>

        {/* Logout */}
        <div className="border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-72">

        {/* Top navigation */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">

          <div className="flex items-center gap-4">

            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={24} />
            </button>

            <div>
            <h2 className="text-lg font-bold sm:text-xl">
                {title}
            </h2>
            

              <p className="hidden text-xs text-slate-500 sm:block">
                Inventory and Order Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">

            <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "bg-green-500" : "bg-slate-400"
                }`}
              />

              {connected ? "API Connected" : "Checking API"}
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
