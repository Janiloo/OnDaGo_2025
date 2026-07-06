import axios from "axios";

export const TOKEN_KEY = "ondago.web.jwt";

// The web admin console talks to the same ASP.NET Core API as the mobile apps.
export const API_BASE_URL = "http://localhost:5147";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length < 200) return data;
    if (data && typeof data === "object") {
      const m = (data as any).message ?? (data as any).Message ?? (data as any).title;
      if (typeof m === "string") return m;
    }
    if (error.response?.status === 401) return "Invalid email or password.";
    if (error.response?.status === 403) return "This account can't access the admin console.";
    if (!error.response) return "Cannot reach the server. Is the API running on :5147?";
  }
  return fallback;
}
