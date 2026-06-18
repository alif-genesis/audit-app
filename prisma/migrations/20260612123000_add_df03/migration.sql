-- AlterTable
ALTER TABLE "design_factor_assessments"
ADD COLUMN "df03_auditee_submitted_at" TIMESTAMP(3),
ADD COLUMN "df03_auditor_submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "design_factor_df03_inputs" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "rows" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_df03_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_df03_inputs_assessment_id_key" ON "design_factor_df03_inputs"("assessment_id");

-- AddForeignKey
ALTER TABLE "design_factor_df03_inputs" ADD CONSTRAINT "design_factor_df03_inputs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
