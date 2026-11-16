
import api from "./api";

// Fetch dashboard summary from Django REST API
export const getDashboardSummary = async () => {
  const response = await api.get("/dashboard/summary/");
  return response.data;
};
