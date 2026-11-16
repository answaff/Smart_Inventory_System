
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Boxes,
  LockKeyhole,
  UserRound,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/token/", {
        username,
        password,
      });

      sessionStorage.setItem(
        "accessToken",
        response.data.access
      );

      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Invalid username or password.");
      } else {
        setError(
          "Login failed. Check your Django server and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">

      {/* Left branding panel */}
      <div className="hidden flex-col justify-between bg-slate-950 p-12 text-white lg:flex">

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 p-3">
            <Boxes size={28} />
          </div>

          <span className="text-xl font-bold">
            Smart Inventory
          </span>
        </div>

        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-blue-300">
            <ShieldCheck size={16} />
            Secure inventory management
          </div>

          <h1 className="max-w-lg text-5xl font-bold leading-tight">
            Manage your business with confidence.
          </h1>

          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-400">
            Track products, monitor inventory, manage orders,
            and understand your sales from one platform.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          Smart Inventory & Order Management System
        </p>
      </div>

      {/* Login form */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12">

        <div className="w-full max-w-md">

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <Boxes size={24} />
            </div>
            <span className="text-xl font-bold text-slate-900">
              Smart Inventory
            </span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900">
            Welcome back
          </h2>

          <p className="mt-2 text-slate-500">
            Sign in to access your inventory dashboard.
          </p>

          <form onSubmit={handleLogin} className="mt-9 space-y-5">

            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Username
              </label>

              <div className="relative">
                <UserRound
                  size={19}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={20} className="animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={19} />
                </>
              )}
            </button>

          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Authorized Inventory Admin and Staff access only
          </p>

        </div>
      </div>

    </div>
  );
}

export default Login;
