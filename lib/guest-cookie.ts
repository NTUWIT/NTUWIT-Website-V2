/**
 * The guest cookie's value: `<base64url id>.<base64url HMAC-SHA256>`.
 *
 * The guest's name is stored server-side in Redis, so the cookie only has to prove
 * the server issued it. No expiry is signed in: the cookie's max-age bounds it,
 * and rotating GUEST_COOKIE_SECRET revokes every guest at once.
 *
 * Only `node:crypto`, so scripts/check-auth-mode.ts asserts it directly.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { isGuestId } from "./auth-mode";

export const GUEST_COOKIE = "wit_guest";

/** HMAC-SHA256 wants a key at least as long as its output. */
export const MIN_SECRET_BYTES = 32;

const usable = (secret: string | undefined): secret is string =>
  typeof secret === "string" && Buffer.byteLength(secret) >= MIN_SECRET_BYTES;

const mac = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest();

export function newGuestId(): string {
  return `guest_${randomUUID()}`;
}

/** Null for a weak secret or a non-guest id, so neither can be signed by mistake. */
export function signGuest(id: string, secret: string | undefined): string | null {
  if (!usable(secret) || !isGuestId(id)) return null;
  const payload = Buffer.from(id).toString("base64url");
  return `${payload}.${mac(payload, secret).toString("base64url")}`;
}

/** The guest id if the value was signed by this secret, otherwise null. Never throws. */
export function verifyGuest(value: string | undefined, secret: string | undefined): string | null {
  if (!usable(secret) || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [payload, sig] = parts;

  const given = Buffer.from(sig, "base64url");
  const expected = mac(payload, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const id = Buffer.from(payload, "base64url").toString("utf8");
  return isGuestId(id) ? id : null;
}
