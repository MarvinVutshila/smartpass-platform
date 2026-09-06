import axios from "axios";

// Use the environment variable, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
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
      sessionStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;