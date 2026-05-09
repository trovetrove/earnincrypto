// lib/supabase/server.ts
// Singleton Supabase server client for Server Components and Server Actions.
// Uses the service role key — NEVER expose to the client.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Prevent multiple instances in development due to HMR
declare global {
  // eslint-disable-next-line no-var
  var _supabaseServer: SupabaseClient<Database> | undefined;
}

export function getSupabaseServer(): SupabaseClient<Database> {
  if (process.env.NODE_ENV === "production") {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: "public" },
      }
    );
  }

  // In development, reuse existing client across HMR reloads
  if (!global._supabaseServer) {
    global._supabaseServer = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: "public" },
      }
    );
  }
  return global._supabaseServer;
}
