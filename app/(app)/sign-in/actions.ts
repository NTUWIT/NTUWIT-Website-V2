"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { readAuthMode } from "@/lib/auth";
import { insertGuest } from "@/lib/db/queries";
import { GUEST_COOKIE, newGuestId, signGuest } from "@/lib/guest-cookie";
import { withinLimit } from "@/lib/ratelimit";
import { guestName } from "@/lib/validation";

/**
 * Joining without an account, for a night when invite emails do not arrive.
 * A server action is a public endpoint, so the mode is re-checked here rather
 * than trusting that the form was only shown in `none` mode.
 */

export type JoinResult = { ok: false; error: string };

const SEVEN_DAYS = 7 * 24 * 60 * 60;

export async function joinAsGuest(name: string, redirectTo: string): Promise<JoinResult> {
  const { mode } = readAuthMode();
  if (mode !== "none") {
    return { ok: false, error: "Joining without an account is turned off. Sign in instead." };
  }

  const parsed = guestName.safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: "Use a name between 1 and 40 characters, letters, numbers and spaces." };
  }

  // Keyed by IP only here: an id does not exist yet. Vercel sets the first
  // x-forwarded-for entry itself, so a client cannot choose its own bucket.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await withinLimit("guest", ip))) {
    return { ok: false, error: "Too many people joined from this network just now. Wait a minute and try again." };
  }

  const id = newGuestId();
  const value = signGuest(id, process.env.GUEST_COOKIE_SECRET);
  if (!value) {
    console.error("joinAsGuest: GUEST_COOKIE_SECRET is missing or shorter than 32 bytes");
    return { ok: false, error: "Couldn't join right now. Try again in a moment." };
  }

  try {
    await insertGuest(id, parsed.data);
  } catch (error) {
    // No saved name, no entry: an unnamed guest would show up as unknown.
    console.error("joinAsGuest: could not save guest name", error);
    return { ok: false, error: "Couldn't join right now. Try again in a moment." };
  }
  (await cookies()).set(GUEST_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
  });

  // Same rule as the sign-in page: same-origin paths only.
  redirect(redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/ide");
}
