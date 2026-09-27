import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "wisp_session";

export function getToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

export function setToken(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearToken() {
  cookies().delete(SESSION_COOKIE);
}
