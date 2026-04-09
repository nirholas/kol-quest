import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
