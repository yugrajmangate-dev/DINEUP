import "server-only";

import crypto from "crypto";

export const ADMIN_COOKIE = "dineup_admin_session";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@dineup.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "dineup-admin-secret";

function signValue(value: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

export function validateAdminCredentials(email: string, password: string) {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function createAdminSessionValue() {
  const payload = `${ADMIN_EMAIL}:${Date.now()}`;
  return `${payload}.${signValue(payload)}`;
}

export function isValidAdminSession(value: string | undefined) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  return signValue(payload) === signature;
}
