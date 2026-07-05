import axios, { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config";

export const TOKEN_KEY = "ondago.jwt";
export const USER_KEY = "ondago.user";

export const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT (issued by the ASP.NET Core backend) to every request.
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

/** Registered by AuthContext so a 401 anywhere forces a logout. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

/** Turns an axios error into a message safe to show the user. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length < 200) return data;
    if (data && typeof data === "object") {
      const message = (data as any).message ?? (data as any).Message ?? (data as any).title;
      if (typeof message === "string") return message;
    }
    if (error.response?.status === 401) return "Invalid credentials or session expired.";
    if (error.response?.status === 403) return "You don't have permission to do that.";
    if (error.response?.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
    if (!error.response) return "Cannot reach the server. Check your connection.";
  }
  return fallback;
}

/**
 * MongoDB ObjectIds can arrive as a plain hex string or, depending on the
 * backend serializer, as an object. Normalize to a string so screens and
 * PATCH/DELETE-by-id calls always work.
 */
export function normalizeId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const v = value as any;
    if (typeof v.$oid === "string") return v.$oid;
    if (typeof v.toString === "function") {
      const s = String(v);
      if (/^[a-f0-9]{24}$/i.test(s)) return s;
    }
  }
  return "";
}
