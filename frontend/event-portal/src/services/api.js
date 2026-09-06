// src/services/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/api",
});

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config.url || "";
      if (!url.includes("/auth/login") && !url.includes("/auth/register")) {
        sessionStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// Auth endpoints (optional helpers)
export const forgotPassword = (email) => API.post("/auth/forgot-password", { email });
export const resetPassword = (token, newPassword) =>
  API.post("/auth/reset-password", { token, new_password: newPassword });

export default API;