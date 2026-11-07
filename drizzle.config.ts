import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'e4e2260dbde349bb06a3897b51dcef1a',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || 'b4c64b7c-902d-4116-ba9d-319887b5f433',
    token: process.env.CLOUDFLARE_D1_TOKEN || 'dummy-token-for-local',
  },
});
