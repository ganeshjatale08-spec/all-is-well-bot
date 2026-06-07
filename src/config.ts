import { z } from 'zod'

const envSchema = z.object({
  PORT:                 z.coerce.number().default(3000),
  DATABASE_URL:         z.string().min(1),
  REDIS_HOST:           z.string().default('localhost'),
  PHONE_NUMBER_ID:      z.string().min(1),
  META_ACCESS_TOKEN:    z.string().min(1),
  WEBHOOK_VERIFY_TOKEN: z.string().min(1),
})

export const env = envSchema.parse(process.env)
