-- AlterTable
ALTER TABLE "design_factor_assessments"
ADD COLUMN "df06_auditee_submitted_at" TIMESTAMP(3),
ADD COLUMN "df06_auditor_submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "design_factor_df06_inputs" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "high_importance" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "high_baseline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "normal_importance" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "normal_baseline" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "low_importance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "low_baseline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_df06_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_df06_inputs_assessment_id_key" ON "design_factor_df06_inputs"("assessment_id");

-- AddForeignKey
ALTER TABLE "design_factor_df06_inputs" ADD CONSTRAINT "design_factor_df06_inputs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
