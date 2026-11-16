
import api from "./api";

// Sales report with optional date filters
export const getSalesReport = async (params = {}) => {
  const response = await api.get("/reports/sales/", { params });
  return response.data;
};

// Product-wise sales report
export const getProductSalesReport = async (params = {}) => {
  const response = await api.get("/reports/products/", { params });
  return response.data;
};

// Inventory report with movement history
export const getInventoryReport = async () => {
  const response = await api.get("/reports/inventory/");
  return response.data;
};
