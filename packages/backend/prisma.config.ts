import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 Configuration
 *
 * This file configures Prisma ORM for the Kuzushi backend.
 * In Prisma 7, database connection URLs and other configurations
 * are managed here instead of in schema.prisma.
 *
 * IMPORTANT: In Prisma 7, environment variables are not automatically loaded.
 * We explicitly import 'dotenv/config' at the top to load .env file.
 *
 * @see https://pris.ly/d/config-datasource
 * @see https://pris.ly/d/prisma7-client-config
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
