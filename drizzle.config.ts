// drizzle.config.ts
// Used by `pnpm drizzle-kit push` / `pnpm drizzle-kit generate`

import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Verbose output for auditing schema changes
  verbose: true,
  strict: true,
} satisfies Config;
