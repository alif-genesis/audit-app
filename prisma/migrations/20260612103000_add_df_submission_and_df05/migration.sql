-- AlterTable
ALTER TABLE "design_factor_assessments"
ADD COLUMN "df01_auditee_submitted_at" TIMESTAMP(3),
ADD COLUMN "df01_auditor_submitted_at" TIMESTAMP(3),
ADD COLUMN "df05_auditee_submitted_at" TIMESTAMP(3),
ADD COLUMN "df05_auditor_submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "design_factor_df05_inputs" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "high_importance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "high_baseline" DOUBLE PRECISION NOT NULL DEFAULT 33,
    "normal_importance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "normal_baseline" DOUBLE PRECISION NOT NULL DEFAULT 67,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_df05_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_df05_inputs_assessment_id_key" ON "design_factor_df05_inputs"("assessment_id");

-- AddForeignKey
ALTER TABLE "design_factor_df05_inputs" ADD CONSTRAINT "design_factor_df05_inputs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
