import { useState } from "react";
import { useNavigate } from "react-router";
import { LoaderCircle, Save, UserRoundPlus, X } from "lucide-react";

import {
  createCustomer,
  updateCustomer,
} from "../services/customerService";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const getErrorMessage = (value) => {
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "string") return value;
  return "Please check this field.";
};

function CustomerForm({ customer = null, onClose, onSaved }) {
  const navigate = useNavigate();
  const isEditing = Boolean(customer);

  const [form, setForm] = useState({
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const changeField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    setGeneralError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setGeneralError("");
    setFieldErrors({});

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    };

    if (!payload.name || !payload.email || !payload.phone) {
      setGeneralError("Name, email and phone are required.");
      return;
    }

    if (payload.name.length > 150 || payload.phone.length > 15) {
      setGeneralError("Name must be at most 150 characters and phone at most 15.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateCustomer(customer.id, payload);
      } else {
        await createCustomer(payload);
      }
      onSaved(isEditing ? "updated" : "created");
    } catch (error) {
      const status = error.response?.status;
      const details = error.response?.data;

      if (status === 401) {
        sessionStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
        return;
      }
      if (status === 403) {
        setGeneralError("You do not have permission to manage customers.");
      } else if (details && typeof details === "object" && !Array.isArray(details)) {
        const nextErrors = {};
        for (const [field, value] of Object.entries(details)) {
          nextErrors[field] = getErrorMessage(value);
        }
        setFieldErrors(nextErrors);
        setGeneralError(
          nextErrors.detail || nextErrors.non_field_errors ||
            "Please correct the highlighted fields and try again."
        );
      } else {
        setGeneralError("Unable to save the customer. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <UserRoundPlus size={23} />
            </span>
            <div>
              <h2 id="customer-form-title" className="text-xl font-bold text-slate-900">
                {isEditing ? "Edit Customer" : "Add Customer"}
              </h2>
              <p className="text-sm text-slate-500">
                {isEditing ? "Update customer contact information." : "Create a new customer record."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close customer form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {generalError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {generalError}
            </div>
          )}

          <div>
            <label htmlFor="customer-name" className="mb-2 block text-sm font-semibold text-slate-700">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              id="customer-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={150}
              value={form.name}
              onChange={changeField}
              placeholder="e.g. Arun Kumar"
              className={inputClass}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="customer-email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="customer-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={form.email}
                onChange={changeField}
                placeholder="customer@example.com"
                className={inputClass}
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="customer-phone" className="mb-2 block text-sm font-semibold text-slate-700">
                Phone <span className="text-red-600">*</span>
              </label>
              <input
                id="customer-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={15}
                value={form.phone}
                onChange={changeField}
                placeholder="e.g. 9876543210"
                className={inputClass}
              />
              {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="customer-address" className="mb-2 block text-sm font-semibold text-slate-700">
              Address <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="customer-address"
              name="address"
              rows={3}
              value={form.address}
              onChange={changeField}
              placeholder="Street, city, state, postal code"
              className={inputClass}
            />
            {fieldErrors.address && <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>}
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerForm;
