"use server";

import { callStatusRpc } from "@/lib/rpc";

export type ContactState = {
  status:
    | "idle"
    | "ok"
    | "invalid_name"
    | "invalid_email"
    | "invalid_message"
    | "rate_limited"
    | "error";
};

/** Stores a contact-form message via the `submit_contact` RPC. */
export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Honeypot: a field people never see. Bots fill it; pretend it worked.
  if (String(formData.get("company") ?? "") !== "") return { status: "ok" };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (name.length < 1 || name.length > 80) return { status: "invalid_name" };
  if (email.length < 3 || email.length > 254 || !email.includes("@")) {
    return { status: "invalid_email" };
  }
  if (message.length < 1 || message.length > 2000) {
    return { status: "invalid_message" };
  }

  const status = await callStatusRpc(
    "submit_contact",
    { p_name: name, p_email: email, p_message: message },
    ["ok", "invalid_name", "invalid_email", "invalid_message", "rate_limited"],
  );
  return { status };
}
