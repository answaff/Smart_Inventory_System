
import api from "./api";

// Get all categories
export const getCategories = async () => {
  const response = await api.get("/categories/");

  return Array.isArray(response.data)
    ? response.data
    : response.data.results ?? [];
};

// Add a new product
export const createProduct = async (productData) => {
  const response = await api.post(
    "/products/",
    productData
  );

  return response.data;
};

// Edit an existing product
export const updateProduct = async (id, productData) => {
  const response = await api.patch(
    `/products/${id}/`,
    productData
  );

  return response.data;
};

// Delete an existing product
export const deleteProduct = async (id) => {
  await api.delete(`/products/${id}/`);
};
