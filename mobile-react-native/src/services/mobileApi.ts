import * as SecureStore from "expo-secure-store";

// Match the keys already used by your working login screen.
const ACCESS_KEY = "smartinventory_access";
const REFRESH_KEY = "smartinventory_refresh";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

type RefreshResponse = {
  access?: string;
  refresh?: string;
};

function apiUrl(path: string): string {
  if (!API_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_URL in .env.local.");
  }
  return `${API_URL}${path}`;
}

async function renewAccessToken(): Promise<string> {
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refresh) {
    throw new Error("Your session has expired. Sign out and sign in again.");
  }

  const response = await fetch(apiUrl("/token/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (response.status === 400 || response.status === 401) {
    throw new Error("Your session has expired. Sign out and sign in again.");
  }
  if (!response.ok) {
    throw new Error(`Could not refresh your session (${response.status}).`);
  }

  const tokens = (await response.json()) as RefreshResponse;
  if (!tokens.access) {
    throw new Error("The server did not return an access token.");
  }

  // Supports Simple JWT refresh-token rotation when enabled.
  if (tokens.refresh) {
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh);
  }
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.access);
  return tokens.access;
}

async function authenticatedGet(url: string): Promise<unknown> {
  let access = await SecureStore.getItemAsync(ACCESS_KEY);
  if (!access) access = await renewAccessToken();

  const makeRequest = (token: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  let response = await makeRequest(access);
  if (response.status === 401) {
    access = await renewAccessToken();
    response = await makeRequest(access);
  }
  if (!response.ok) {
    throw new Error(`Dashboard request failed (${response.status}).`);
  }
  return response.json();
}

// Works with both plain DRF arrays and paginated { results, next } responses.
// Loads every page so stock and sales totals represent the full dataset.
export async function getAllRecords<T>(path: string): Promise<T[]> {
  let next: string | null = apiUrl(path);
  const records: T[] = [];

  for (let page = 0; next && page < 50; page += 1) {
    if (!next.startsWith(`${API_URL}/`)) {
      throw new Error("Unexpected pagination URL from Django.");
    }

    const data: unknown = await authenticatedGet(next);

    if (Array.isArray(data)) {
      return [...records, ...(data as T[])];
    }

    if (
      !data ||
      typeof data !== "object" ||
      !("results" in data) ||
      !Array.isArray(data.results)
    ) {
      throw new Error("Unexpected response format from Django REST API.");
    }

    const paginated = data as { results: T[]; next?: string | null };
    records.push(...paginated.results);
    next = paginated.next || null;
  }

  if (next) throw new Error("Dashboard data exceeds the 50-page limit.");
  return records;
}
