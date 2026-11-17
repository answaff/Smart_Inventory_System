import * as SecureStore from "expo-secure-store";

// These exact names are used by the EXISTING, TESTED persistent login.
const ACCESS_KEY = "smartinventory_access";
const REFRESH_KEY = "smartinventory_refresh";
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export class InventoryApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "InventoryApiError";
    this.status = status;
  }
}

function resolveApiPath(path: string): string {
  if (!API_URL) throw new Error("Missing EXPO_PUBLIC_API_URL in .env.local.");
  if (!path.startsWith("/")) throw new Error("API path must start with '/'.");
  return `${API_URL}${path}`;
}

function safePaginationUrl(next: string): string {
  if (!API_URL) throw new Error("Missing EXPO_PUBLIC_API_URL.");
  // DRF can return fully qualified URLs or paths beginning with /api/.
  const base = new URL(API_URL);
  const target = new URL(next, `${base.origin}/`);
  if (target.origin !== base.origin || !target.pathname.startsWith(`${base.pathname}/`)) {
    throw new Error("Django returned an unexpected pagination URL.");
  }
  return target.toString();
}

let refreshInProgress: Promise<string> | null = null;

async function refreshToken(): Promise<string> {
  if (!refreshInProgress) {
    refreshInProgress = (async () => {
      const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refresh) throw new Error("Your session has expired. Please sign out and sign in again.");
      const response = await fetch(resolveApiPath("/token/refresh/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (response.status === 401 || response.status === 400) {
        throw new Error("Your session has expired. Please sign out and sign in again.");
      }
      if (!response.ok) throw new InventoryApiError("Could not refresh the login session.", response.status);
      const data = (await response.json()) as { access?: string; refresh?: string };
      if (!data.access) throw new Error("The server returned no access token.");
      // Persist rotated refresh tokens BEFORE the new access token.
      if (data.refresh) await SecureStore.setItemAsync(REFRESH_KEY, data.refresh);
      await SecureStore.setItemAsync(ACCESS_KEY, data.access);
      return data.access;
    })().finally(() => { refreshInProgress = null; });
  }
  return refreshInProgress;
}

function extractError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const details = data as Record<string, unknown>;
    if (typeof details.detail === "string") return details.detail;
    for (const [field, value] of Object.entries(details)) {
      if (Array.isArray(value) && value.length) return `${field}: ${String(value[0])}`;
      if (typeof value === "string") return `${field}: ${value}`;
    }
  }
  if (status === 403) return "Permission denied for this account.";
  if (status === 404) return "The requested record was not found.";
  return `API request failed (${status}).`;
}

// Authenticated requests, including GET/POST/PATCH/DELETE, with one 401 retry.
async function requestUrl<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  let access = await SecureStore.getItemAsync(ACCESS_KEY);
  if (!access) access = await refreshToken();
  const send = (token: string) => fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let response = await send(access);
  if (response.status === 401) {
    access = await refreshToken();
    response = await send(access);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let result: unknown = undefined;
  if (text) {
    try { result = JSON.parse(text); } catch { result = text; }
  }
  if (!response.ok) throw new InventoryApiError(extractError(result, response.status), response.status);
  return result as T;
}

export const apiGet = <T,>(path: string): Promise<T> => requestUrl<T>(resolveApiPath(path));
export const apiPost = <T,>(path: string, body?: unknown): Promise<T> => requestUrl<T>(resolveApiPath(path), "POST", body);
export const apiPatch = <T,>(path: string, body: unknown): Promise<T> => requestUrl<T>(resolveApiPath(path), "PATCH", body);
export const apiDelete = (path: string): Promise<void> => requestUrl<void>(resolveApiPath(path), "DELETE");

// Handle list endpoints returning arrays or DRF pagination {results,next}.
// Limit pagination to avoid unbounded load against accidental API cycles.
export async function apiList<T>(path: string): Promise<T[]> {
  let next: string | null = resolveApiPath(path);
  const all: T[] = [];
  const seen = new Set<string>();
  for (let pages = 0; next && pages < 100; pages += 1) {
    if (seen.has(next)) throw new Error("Django pagination returned a repeated page.");
    seen.add(next);
    const data: unknown = await requestUrl<unknown>(next);
    if (Array.isArray(data)) return [...all, ...(data as T[])];
    if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results)) {
      throw new Error("Unexpected Django list response. Expected an array or paginated results.");
    }
    const page = data as { results: T[]; next?: string | null };
    all.push(...page.results);
    next = page.next ? safePaginationUrl(page.next) : null;
  }
  if (next) throw new Error("More than 100 pages returned. Narrow your query.");
  return all;
}
