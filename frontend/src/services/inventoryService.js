
import api from "./api";

// Support both plain arrays and paginated DRF responses
const normalizeList = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};

// Get products for inventory display and dropdowns
export const getInventoryProducts = async () => {
  const response = await api.get("/products/");
  return normalizeList(response.data);
};

// Get stock movement history
export const getStockMovements = async () => {
  const response = await api.get("/inventory/movements/");
  return normalizeList(response.data);
};

// Get products at or below their low-stock threshold
export const getLowStockProducts = async () => {
  const response = await api.get("/inventory/low-stock/");
  return normalizeList(response.data);
};

// Add stock to a product
export const stockIn = async (data) => {
  const response = await api.post(
    "/inventory/stock-in/",
    data
  );

  return response.data;
};

// Remove stock from a product
export const stockOut = async (data) => {
  const response = await api.post(
    "/inventory/stock-out/",
    data
  );

  return response.data;
};
