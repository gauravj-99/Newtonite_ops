import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ops-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? "Request failed";
  }
  return error instanceof Error ? error.message : "Something went wrong";
};
