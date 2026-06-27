-- E'lon nofaol holati va foydalanuvchi blok sababi
ALTER TYPE "JobPostStatus" ADD VALUE IF NOT EXISTS 'inactive';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "blockReason" TEXT;
