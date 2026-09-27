// Server-side client for the Go API (cmd/api). Only imported by server
// components, server actions and route handlers.
import "server-only";
import { headers as requestHeaders } from "next/headers";

export const API_URL = (process.env.API_URL ?? "").replace(/\/$/, "");

/** Live mode talks to the Go API; without API_URL the UI shows example data. */
export const isLive = () => API_URL !== "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public hint?: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  // Pass the visitor's address on, so the API rate-limits people, not this server.
  try {
    const xff = requestHeaders().get("x-forwarded-for");
    if (xff) headers["X-Forwarded-For"] = xff;
  } catch {
    /* outside a request (build time) */
  }
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(503, "API_UNREACHABLE", "Can't reach the server.", "Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string; hint?: string } } | undefined)?.error;
    throw new ApiError(res.status, e?.code ?? "HTTP_" + res.status, e?.message ?? "Request failed.", e?.hint);
  }
  return json as T;
}
