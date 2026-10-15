"use server";

import { PRIVACY_VERSION } from "@/lib/legal";
import { callStatusRpc } from "@/lib/rpc";

export type WaitlistState = {
  status: "idle" | "ok" | "invalid_email" | "rate_limited" | "error";
};

/** Adds an email to the launch waitlist via the `join_waitlist` RPC. */
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

  const status = await callStatusRpc(
    "join_waitlist",
    { p_email: email, p_privacy_version: PRIVACY_VERSION },
    ["ok", "invalid_email", "rate_limited"],
  );
  return { status };
}
