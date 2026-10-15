/**
 * Calls a Supabase RPC over PostgREST with the PUBLISHABLE key (gated by RLS
 * and each RPC's own checks) — no Supabase client dependency for a couple of
 * calls. Import it only from "use server" files; never the secret key.
 *
 * Returns the RPC's status string if it's one of `statuses`, else "error"
 * (missing env, network failure, non-2xx, or an unexpected payload — all
 * logged server-side).
 */
export async function callStatusRpc<S extends string>(
  fn: string,
  args: Record<string, string>,
  statuses: readonly S[],
): Promise<S | "error"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error(`${fn}: Supabase env vars are not set`);
    return "error";
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`${fn}: RPC failed`, res.status, await res.text());
      return "error";
    }
    const result: unknown = await res.json();
    return statuses.find((s) => s === result) ?? "error";
  } catch (err) {
    console.error(`${fn}: request failed`, err);
    return "error";
  }
}
