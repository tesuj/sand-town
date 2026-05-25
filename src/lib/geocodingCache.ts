/**
 * Prisma-backed GeocodingCache implementing the NominatimCache contract.
 * TTL governed by ProspectSettings.cacheTtlDays (default 30) via expiresAt.
 */

import { prisma } from '@/lib/prisma';
import type { NominatimCache, NominatimResult } from '@/lib/providers/nominatim';

const DEFAULT_TTL_DAYS = 30;

export function createPrismaGeocodingCache(opts: { ttlDays?: number } = {}): NominatimCache {
  const ttlDays = opts.ttlDays ?? DEFAULT_TTL_DAYS;
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;

  return {
    async get(key: string) {
      const [normalizedQuery, acceptLanguage] = key.split('::');
      if (!normalizedQuery) return null;
      const now = new Date();
      const hit = await prisma.geocodingCache.findFirst({
        where: {
          provider: 'nominatim',
          normalizedQuery,
          acceptLanguage: acceptLanguage ?? 'en',
          expiresAt: { gt: now },
        },
      });
      if (!hit) return null;
      // Best-effort lastUsedAt bump; never block the call path on failure.
      prisma.geocodingCache
        .update({ where: { id: hit.id }, data: { lastUsedAt: now } })
        .catch(() => undefined);
      return hit.resultJson as unknown as NominatimResult[];
    },

    async set(key: string, value: NominatimResult[]) {
      const [normalizedQuery, acceptLanguage] = key.split('::');
      if (!normalizedQuery) return;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMs);
      await prisma.geocodingCache.upsert({
        where: {
          provider_normalizedQuery_acceptLanguage: {
            provider: 'nominatim',
            normalizedQuery,
            acceptLanguage: acceptLanguage ?? 'en',
          },
        },
        create: {
          provider: 'nominatim',
          normalizedQuery,
          acceptLanguage: acceptLanguage ?? 'en',
          resultJson: value as unknown as object,
          lastUsedAt: now,
          expiresAt,
        },
        update: {
          resultJson: value as unknown as object,
          lastUsedAt: now,
          expiresAt,
        },
      });
    },
  };
}
