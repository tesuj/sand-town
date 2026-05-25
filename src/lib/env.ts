import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  PVWATTS_API_KEY: z.string().min(1).optional(),
  NOMINATIM_CONTACT_EMAIL: z.string().email().optional(),
  PVGIS_BASE_URL: z.string().url().default('https://re.jrc.ec.europa.eu/api/v5_3'),
  NOMINATIM_BASE_URL: z.string().url().default('https://nominatim.openstreetmap.org'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  cached = EnvSchema.parse(process.env);
  return cached;
}
