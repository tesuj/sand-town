-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('map_click', 'manual_coordinates', 'browser_geolocation', 'nominatim_search', 'unknown');

-- CreateEnum
CREATE TYPE "ProspectRunStatus" AS ENUM ('success', 'partial', 'needs_location_choice', 'invalid_location', 'provider_error', 'failed');

-- CreateEnum
CREATE TYPE "ProviderSource" AS ENUM ('pvgis', 'pvwatts');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('success', 'failed', 'partial', 'disabled', 'timeout', 'rate_limited');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('standard', 'premium', 'thinfilm');

-- CreateEnum
CREATE TYPE "MountingType" AS ENUM ('free', 'roof');

-- CreateTable
CREATE TABLE "ProspectRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "locationInput" TEXT NOT NULL,
    "locationDisplayLabel" TEXT,
    "locationSource" "LocationSource" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "systemSizeKwp" DOUBLE PRECISION NOT NULL,
    "lossPercent" DOUBLE PRECISION NOT NULL,
    "tiltDegrees" DOUBLE PRECISION NOT NULL,
    "uiAzimuthDegrees" DOUBLE PRECISION NOT NULL,
    "pvgisAspectDegrees" DOUBLE PRECISION NOT NULL,
    "moduleType" "ModuleType" NOT NULL,
    "mountingType" "MountingType" NOT NULL,
    "status" "ProspectRunStatus" NOT NULL,
    "annualKwh" DOUBLE PRECISION,
    "annualKwhPerKwp" DOUBLE PRECISION,
    "sourceDeltaPercent" DOUBLE PRECISION,
    "warningsJson" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "ProspectRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectSourceResult" (
    "id" TEXT NOT NULL,
    "prospectRunId" TEXT NOT NULL,
    "source" "ProviderSource" NOT NULL,
    "status" "ProviderStatus" NOT NULL,
    "annualKwh" DOUBLE PRECISION,
    "annualKwhPerKwp" DOUBLE PRECISION,
    "monthlyJson" JSONB NOT NULL DEFAULT '[]',
    "assumptionsJson" JSONB NOT NULL DEFAULT '{}',
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "warningsJson" JSONB NOT NULL DEFAULT '[]',
    "rawResponseRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectSourceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodingCache" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'nominatim',
    "normalizedQuery" TEXT NOT NULL,
    "acceptLanguage" TEXT NOT NULL DEFAULT 'en',
    "resultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeocodingCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectSettings" (
    "id" TEXT NOT NULL,
    "defaultSystemSizeKwp" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultLossPercent" DOUBLE PRECISION NOT NULL DEFAULT 14,
    "defaultTiltDegrees" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "defaultUiAzimuthDegrees" DOUBLE PRECISION NOT NULL DEFAULT 180,
    "defaultModuleType" "ModuleType" NOT NULL DEFAULT 'standard',
    "defaultMountingType" "MountingType" NOT NULL DEFAULT 'free',
    "pvgisBaseUrl" TEXT NOT NULL DEFAULT 'https://re.jrc.ec.europa.eu/api/v5_3',
    "pvwattsBaseUrl" TEXT NOT NULL DEFAULT 'https://developer.nrel.gov/api/pvwatts/v8.json',
    "geocodingProvider" TEXT NOT NULL DEFAULT 'nominatim',
    "nominatimBaseUrl" TEXT NOT NULL DEFAULT 'https://nominatim.openstreetmap.org',
    "cacheTtlDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProspectRun_createdAt_idx" ON "ProspectRun"("createdAt");

-- CreateIndex
CREATE INDEX "ProspectRun_lat_lon_idx" ON "ProspectRun"("lat", "lon");

-- CreateIndex
CREATE INDEX "ProspectSourceResult_source_status_idx" ON "ProspectSourceResult"("source", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectSourceResult_prospectRunId_source_key" ON "ProspectSourceResult"("prospectRunId", "source");

-- CreateIndex
CREATE INDEX "GeocodingCache_expiresAt_idx" ON "GeocodingCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeocodingCache_provider_normalizedQuery_acceptLanguage_key" ON "GeocodingCache"("provider", "normalizedQuery", "acceptLanguage");

-- AddForeignKey
ALTER TABLE "ProspectSourceResult" ADD CONSTRAINT "ProspectSourceResult_prospectRunId_fkey" FOREIGN KEY ("prospectRunId") REFERENCES "ProspectRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
