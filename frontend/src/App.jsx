
import { Routes, Route, Navigate } from "react-router";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import Reports from "./pages/Reports";

function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem("accessToken");

  return token
    ? children
    : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

      <Route
  path="/products"
  element={
    <ProtectedRoute>
      <Products />
    </ProtectedRoute>
  }
/>

<Route
  path="/inventory"
  element={
    <ProtectedRoute>
      <Inventory />
    </ProtectedRoute>
  }
/>

<Route
  path="/customers"
  element={
    <ProtectedRoute>
      <Customers />
    </ProtectedRoute>
  }
/>

<Route
  path="/orders"
  element={
    <ProtectedRoute>
      <Orders />
    </ProtectedRoute>
  }
/>

<Route
  path="/reports"
  element={
    <ProtectedRoute>
      <Reports />
    </ProtectedRoute>
  }
/>
    </Routes>

  
  );
}

export default App;
