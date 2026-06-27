-- AlterTable
ALTER TABLE "Employer" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Worker" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- RenameIndex
ALTER INDEX "BalanceTransaction_userId_idx" RENAME TO "BalanceTransaction_workerId_idx";

-- RenameIndex
ALTER INDEX "Complaint_userId_idx" RENAME TO "Complaint_workerId_idx";

-- RenameIndex
ALTER INDEX "DepositRequest_userId_idx" RENAME TO "DepositRequest_workerId_idx";

-- RenameIndex
ALTER INDEX "VipPurchase_userId_idx" RENAME TO "VipPurchase_workerId_idx";
