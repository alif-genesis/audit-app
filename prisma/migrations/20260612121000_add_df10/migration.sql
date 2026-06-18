-- AlterTable
ALTER TABLE "design_factor_assessments"
ADD COLUMN "df10_auditee_submitted_at" TIMESTAMP(3),
ADD COLUMN "df10_auditor_submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "design_factor_df10_inputs" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "first_mover_importance" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "first_mover_baseline" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "follower_importance" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "follower_baseline" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "slow_adopter_importance" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "slow_adopter_baseline" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_df10_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_df10_inputs_assessment_id_key" ON "design_factor_df10_inputs"("assessment_id");

-- AddForeignKey
ALTER TABLE "design_factor_df10_inputs" ADD CONSTRAINT "design_factor_df10_inputs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
