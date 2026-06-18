-- AlterTable
ALTER TABLE "design_factor_assessments"
ADD COLUMN "df07_auditee_submitted_at" TIMESTAMP(3),
ADD COLUMN "df07_auditor_submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "design_factor_df07_inputs" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "support_importance" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "support_baseline" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "factory_importance" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "factory_baseline" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "turnaround_importance" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "turnaround_baseline" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "strategic_importance" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "strategic_baseline" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_df07_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_df07_inputs_assessment_id_key" ON "design_factor_df07_inputs"("assessment_id");

-- AddForeignKey
ALTER TABLE "design_factor_df07_inputs" ADD CONSTRAINT "design_factor_df07_inputs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
