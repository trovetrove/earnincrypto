// lib/supabase/safe.ts
//
// getSupabaseServer() calls createClient() with non-null assertions on the
// env vars, so a missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
// makes it throw synchronously ("supabaseUrl is required"). Thrown from inside
// a Server Component that surfaces to the browser as the opaque
// "An error occurred in the Server Components render" — a whole page 500s.
//
// Blog and ad reads are supplementary: a listing page must still render if the
// recommendation or ad lookup can't reach the database. Use this wrapper for
// those, and let the primary content queries keep failing loudly.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "./server";
import type { Database } from "./types";

export function getSupabaseServerSafe(): SupabaseClient<Database> | null {
  try {
    return getSupabaseServer();
  } catch (err) {
    console.error("[supabase] client unavailable — check env vars:", err);
    return null;
  }
}
