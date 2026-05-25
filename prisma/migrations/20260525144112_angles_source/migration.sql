-- CreateEnum
CREATE TYPE "AnglesSource" AS ENUM ('manual', 'optimal_pvgis', 'heuristic');

-- AlterTable
ALTER TABLE "ProspectRun" ADD COLUMN     "anglesSource" "AnglesSource" NOT NULL DEFAULT 'manual';
