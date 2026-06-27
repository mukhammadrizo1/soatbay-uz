-- Mijoz (Employer) va ishchi (Worker) alohida jadvallarga ajratiladi.
-- Bir Telegram akkaunt ikkala jadvalda ham bo'lishi mumkin.

-- 1) Yangi jadvallar
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL,
    "seq" INTEGER,
    "telegramId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "vipExpiresAt" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "seq" INTEGER,
    "telegramId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "age" INTEGER,
    "passportPhotoUrl" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "vipExpiresAt" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "offerAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- 2) Ma'lumotlarni ko'chirish
INSERT INTO "Employer" (
    "id", "seq", "telegramId", "fullName", "phone",
    "isVip", "vipExpiresAt", "isBlocked", "blockReason", "createdAt", "updatedAt"
)
SELECT
    "id", "seq", "telegramId", "fullName", "phone",
    "isVip", "vipExpiresAt", "isBlocked", "blockReason", "createdAt", "updatedAt"
FROM "User"
WHERE "role" = 'employer';

INSERT INTO "Worker" (
    "id", "seq", "telegramId", "fullName", "phone", "age", "passportPhotoUrl",
    "balance", "isVip", "vipExpiresAt", "isBlocked", "blockReason",
    "offerAccepted", "createdAt", "updatedAt"
)
SELECT
    "id", "seq", "telegramId", "fullName", "phone", "age", "passportPhotoUrl",
    "balance", "isVip", "vipExpiresAt", "isBlocked", "blockReason",
    "offerAccepted", "createdAt", "updatedAt"
FROM "User"
WHERE "role" = 'worker';

-- 3) PendingRequest: employerId / workerId
ALTER TABLE "PendingRequest" ADD COLUMN "employerId" TEXT;
ALTER TABLE "PendingRequest" ADD COLUMN "workerId" TEXT;

UPDATE "PendingRequest" SET "employerId" = "userId" WHERE "type" = 'post';
UPDATE "PendingRequest" SET "workerId" = "userId" WHERE "type" IN ('topup', 'registration', 'application');

ALTER TABLE "PendingRequest" DROP CONSTRAINT IF EXISTS "PendingRequest_userId_fkey";
ALTER TABLE "PendingRequest" DROP COLUMN "userId";

-- 4) DepositRequest, BalanceTransaction, VipPurchase, Complaint → workerId
ALTER TABLE "DepositRequest" RENAME COLUMN "userId" TO "workerId";
ALTER TABLE "BalanceTransaction" RENAME COLUMN "userId" TO "workerId";
ALTER TABLE "VipPurchase" RENAME COLUMN "userId" TO "workerId";
ALTER TABLE "Complaint" RENAME COLUMN "userId" TO "workerId";

-- 5) Eski User FK larini olib tashlash
ALTER TABLE "JobPost" DROP CONSTRAINT IF EXISTS "JobPost_employerId_fkey";
ALTER TABLE "Application" DROP CONSTRAINT IF EXISTS "Application_workerId_fkey";
ALTER TABLE "DepositRequest" DROP CONSTRAINT IF EXISTS "DepositRequest_userId_fkey";
ALTER TABLE "BalanceTransaction" DROP CONSTRAINT IF EXISTS "BalanceTransaction_userId_fkey";
ALTER TABLE "VipPurchase" DROP CONSTRAINT IF EXISTS "VipPurchase_userId_fkey";
ALTER TABLE "Complaint" DROP CONSTRAINT IF EXISTS "Complaint_userId_fkey";

-- 6) User jadvali va trigger
DROP TRIGGER IF EXISTS trg_assign_user_seq ON "User";
DROP FUNCTION IF EXISTS assign_user_seq();
DROP TABLE "User";
DROP TYPE "UserRole";

-- 7) Indekslar va FK lar
CREATE UNIQUE INDEX "Employer_seq_key" ON "Employer"("seq");
CREATE UNIQUE INDEX "Employer_telegramId_key" ON "Employer"("telegramId");
CREATE UNIQUE INDEX "Employer_phone_key" ON "Employer"("phone");
CREATE INDEX "Employer_isBlocked_idx" ON "Employer"("isBlocked");

CREATE UNIQUE INDEX "Worker_seq_key" ON "Worker"("seq");
CREATE UNIQUE INDEX "Worker_telegramId_key" ON "Worker"("telegramId");
CREATE UNIQUE INDEX "Worker_phone_key" ON "Worker"("phone");
CREATE INDEX "Worker_isBlocked_idx" ON "Worker"("isBlocked");

ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_employerId_fkey"
    FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Application" ADD CONSTRAINT "Application_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DepositRequest" ADD CONSTRAINT "DepositRequest_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VipPurchase" ADD CONSTRAINT "VipPurchase_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PendingRequest" ADD CONSTRAINT "PendingRequest_employerId_fkey"
    FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PendingRequest" ADD CONSTRAINT "PendingRequest_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PendingRequest_employerId_idx" ON "PendingRequest"("employerId");
CREATE INDEX "PendingRequest_workerId_idx" ON "PendingRequest"("workerId");

-- 8) Seq triggerlari (alohida ketma-ketliklar)
CREATE OR REPLACE FUNCTION assign_employer_seq() RETURNS trigger AS $$
BEGIN
  IF NEW."seq" IS NULL THEN
    NEW."seq" := nextval('user_employer_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assign_worker_seq() RETURNS trigger AS $$
BEGIN
  IF NEW."seq" IS NULL THEN
    NEW."seq" := nextval('user_worker_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_employer_seq ON "Employer";
CREATE TRIGGER trg_assign_employer_seq
  BEFORE INSERT ON "Employer"
  FOR EACH ROW EXECUTE FUNCTION assign_employer_seq();

DROP TRIGGER IF EXISTS trg_assign_worker_seq ON "Worker";
CREATE TRIGGER trg_assign_worker_seq
  BEFORE INSERT ON "Worker"
  FOR EACH ROW EXECUTE FUNCTION assign_worker_seq();
