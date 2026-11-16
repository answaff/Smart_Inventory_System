
import api from "./api";

// Convert Django API responses into arrays.
// Supports both regular and paginated responses.
const normalizeCustomers = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (data == null) {
    return [];
  }

  throw new Error("Unexpected Customer API response format.");
};

// ==========================================
// GET ALL CUSTOMERS / SEARCH CUSTOMERS
// ==========================================

export const getCustomers = async (search = "") => {
  const response = await api.get("/customers/", {
    params: search.trim()
      ? { search: search.trim() }
      : {},
  });

  return normalizeCustomers(response.data);
};

// ==========================================
// GET SINGLE CUSTOMER
// ==========================================

export const getCustomer = async (id) => {
  const response = await api.get(`/customers/${id}/`);

  return response.data;
};

// ==========================================
// CREATE CUSTOMER
// ==========================================

export const createCustomer = async (customerData) => {
  const response = await api.post(
    "/customers/",
    customerData
  );

  return response.data;
};

// ==========================================
// UPDATE CUSTOMER
// ==========================================

export const updateCustomer = async (id, customerData) => {
  const response = await api.patch(
    `/customers/${id}/`,
    customerData
  );

  return response.data;
};

// ==========================================
// DELETE CUSTOMER
// ==========================================

export const deleteCustomer = async (id) => {
  await api.delete(`/customers/${id}/`);
};
