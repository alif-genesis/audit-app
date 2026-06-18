-- CreateEnum
CREATE TYPE "DesignFactorAssessmentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'APPROVED');

-- CreateTable
CREATE TABLE "design_factor_assessments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "auditor_id" TEXT NOT NULL,
    "auditee_id" TEXT NOT NULL,
    "target_score" DOUBLE PRECISION,
    "start_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "description" TEXT,
    "status" "DesignFactorAssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_factor_df01_inputs" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "growth_importance" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "growth_baseline" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "innovation_importance" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "innovation_baseline" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "cost_importance" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "cost_baseline" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "service_importance" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "service_baseline" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_df01_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_factor_objective_results" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "baseline_score" DOUBLE PRECISION NOT NULL,
    "relative_importance" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_objective_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "design_factor_assessments_company_name_idx" ON "design_factor_assessments"("company_name");

-- CreateIndex
CREATE INDEX "design_factor_assessments_auditor_id_idx" ON "design_factor_assessments"("auditor_id");

-- CreateIndex
CREATE INDEX "design_factor_assessments_auditee_id_idx" ON "design_factor_assessments"("auditee_id");

-- CreateIndex
CREATE INDEX "design_factor_assessments_status_idx" ON "design_factor_assessments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_df01_inputs_assessment_id_key" ON "design_factor_df01_inputs"("assessment_id");

-- CreateIndex
CREATE INDEX "design_factor_objective_results_assessment_id_idx" ON "design_factor_objective_results"("assessment_id");

-- CreateIndex
CREATE INDEX "design_factor_objective_results_objective_idx" ON "design_factor_objective_results"("objective");

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_objective_results_assessment_id_objective_key" ON "design_factor_objective_results"("assessment_id", "objective");

-- AddForeignKey
ALTER TABLE "design_factor_assessments" ADD CONSTRAINT "design_factor_assessments_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_factor_assessments" ADD CONSTRAINT "design_factor_assessments_auditee_id_fkey" FOREIGN KEY ("auditee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_factor_df01_inputs" ADD CONSTRAINT "design_factor_df01_inputs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_factor_objective_results" ADD CONSTRAINT "design_factor_objective_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
