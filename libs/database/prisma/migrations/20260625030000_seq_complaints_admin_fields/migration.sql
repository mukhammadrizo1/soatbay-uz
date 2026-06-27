-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('new', 'in-progress', 'resolved');

-- AlterTable: User.seq
ALTER TABLE "User" ADD COLUMN "seq" SERIAL NOT NULL;
CREATE UNIQUE INDEX "User_seq_key" ON "User"("seq");

-- AlterTable: JobPost.seq + createdByAdmin
ALTER TABLE "JobPost" ADD COLUMN "seq" SERIAL NOT NULL;
ALTER TABLE "JobPost" ADD COLUMN "createdByAdmin" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "JobPost_seq_key" ON "JobPost"("seq");

-- AlterTable: Application.seq
ALTER TABLE "Application" ADD COLUMN "seq" SERIAL NOT NULL;
CREATE UNIQUE INDEX "Application_seq_key" ON "Application"("seq");

-- AlterTable: DepositRequest.seq
ALTER TABLE "DepositRequest" ADD COLUMN "seq" SERIAL NOT NULL;
CREATE UNIQUE INDEX "DepositRequest_seq_key" ON "DepositRequest"("seq");

-- AlterTable: VipPurchase.seq
ALTER TABLE "VipPurchase" ADD COLUMN "seq" SERIAL NOT NULL;
CREATE UNIQUE INDEX "VipPurchase_seq_key" ON "VipPurchase"("seq");

-- AlterTable: PendingRequest.seq
ALTER TABLE "PendingRequest" ADD COLUMN "seq" SERIAL NOT NULL;
CREATE UNIQUE INDEX "PendingRequest_seq_key" ON "PendingRequest"("seq");

-- AlterTable: Complaint.seq + status + adminNote + updatedAt
ALTER TABLE "Complaint" ADD COLUMN "seq" SERIAL NOT NULL;
CREATE UNIQUE INDEX "Complaint_seq_key" ON "Complaint"("seq");
ALTER TABLE "Complaint" ADD COLUMN "status" "ComplaintStatus" NOT NULL DEFAULT 'new';
ALTER TABLE "Complaint" ADD COLUMN "adminNote" TEXT;
-- updatedAt: mavjud yozuvlarni to'ldirish uchun vaqtincha default, keyin olib tashlanadi (sxema bilan mos)
ALTER TABLE "Complaint" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Complaint" ALTER COLUMN "updatedAt" DROP DEFAULT;
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");
