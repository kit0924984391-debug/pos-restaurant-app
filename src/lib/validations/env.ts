import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET ต้องมีความยาวอย่างน้อย 16 ตัวอักษร').default('pos-secret-restaurant-jwt-key-2026'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  BASE_URL: z.string().url('BASE_URL ต้องเป็น URL ที่ถูกต้อง').optional().default('http://localhost:3000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates process environment variables safely
 */
export function validateEnv(customEnv?: Record<string, any>): {
  success: boolean;
  data?: EnvConfig;
  errors?: Record<string, string[]>;
} {
  const envToValidate = customEnv || (typeof process !== 'undefined' ? process.env : {});
  const result = envSchema.safeParse(envToValidate);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || '_env';
    if (!errors[field]) errors[field] = [];
    errors[field].push(issue.message);
  }

  return {
    success: false,
    errors,
  };
}
