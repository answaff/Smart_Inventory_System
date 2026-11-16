
import api from "./api";

// ============================================
// NORMALIZE DJANGO LIST RESPONSES
// ============================================

const normalizeOrders = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (data == null) {
    return [];
  }

  throw new Error("Unexpected Order API response.");
};

// ============================================
// GET ORDER HISTORY
// ============================================

export const getOrders = async () => {
  const response = await api.get("/orders/");

  return normalizeOrders(response.data);
};

// ============================================
// GET SINGLE ORDER DETAILS
// ============================================

export const getOrder = async (id) => {
  const response = await api.get(`/orders/${id}/`);

  return response.data;
};

// ============================================
// CREATE NEW ORDER
// ============================================

export const createOrder = async (orderData) => {
  // Expected data:
  // {
  //   customer: 2,
  //   items: [{ product: 1, quantity: 1 }],
  //   notes: ""
  // }

  const response = await api.post(
    "/orders/",
    orderData
  );

  return response.data;
};

// ============================================
// CANCEL ORDER
// ============================================

export const cancelOrder = async (id) => {
  const response = await api.post(
    `/orders/${id}/cancel/`
  );

  return response.data;
};

// ============================================
// COMPLETE ORDER
// ============================================

export const completeOrder = async (id) => {
  const response = await api.post(
    `/orders/${id}/complete/`
  );

  return response.data;
};
