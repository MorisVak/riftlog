"use server";

import { PRIVACY_VERSION } from "@/lib/legal";

export type WaitlistState = {
  status: "idle" | "ok" | "invalid_email" | "rate_limited" | "error";
};

/** `join_waitlist` RPC return codes (see supabase/migrations/*_waitlist.sql). */
const RPC_STATUSES = ["ok", "invalid_email", "rate_limited"] as const;
type RpcStatus = (typeof RPC_STATUSES)[number];

function isRpcStatus(value: unknown): value is RpcStatus {
  return RPC_STATUSES.some((s) => s === value);
}

/**
 * Adds an email to the launch waitlist via the `join_waitlist` RPC, called
 * over PostgREST with the PUBLISHABLE key (gated by RLS + the RPC's own
 * checks) — no Supabase client dependency for one call. Never the secret key.
 */
export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  // Honeypot: a field people never see. Bots fill it; pretend it worked.
  if (String(formData.get("company") ?? "") !== "") return { status: "ok" };

  const email = String(formData.get("email") ?? "").trim();
  if (email.length < 3 || email.length > 254 || !email.includes("@")) {
    return { status: "invalid_email" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error("waitlist: Supabase env vars are not set");
    return { status: "error" };
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/join_waitlist`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_email: email, p_privacy_version: PRIVACY_VERSION }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("waitlist: RPC failed", res.status, await res.text());
      return { status: "error" };
    }
    const result: unknown = await res.json();
    return { status: isRpcStatus(result) ? result : "error" };
  } catch (err) {
    console.error("waitlist: request failed", err);
    return { status: "error" };
  }
}
