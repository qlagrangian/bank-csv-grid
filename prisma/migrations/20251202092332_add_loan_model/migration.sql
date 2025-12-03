-- CreateTable
CREATE TABLE "public"."Loan" (
    "id" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "occurrenceYM" TEXT NOT NULL,
    "tagId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Loan_bank_idx" ON "public"."Loan"("bank");

-- CreateIndex
CREATE INDEX "Loan_occurrenceYM_idx" ON "public"."Loan"("occurrenceYM");

-- CreateIndex
CREATE INDEX "Loan_tagId_idx" ON "public"."Loan"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_bank_batchName_key" ON "public"."Loan"("bank", "batchName");
