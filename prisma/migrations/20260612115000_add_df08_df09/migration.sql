-- AlterTable
ALTER TABLE "design_factor_assessments"
ADD COLUMN "df08_auditee_submitted_at" TIMESTAMP(3),
ADD COLUMN "df08_auditor_submitted_at" TIMESTAMP(3),
ADD COLUMN "df09_auditee_submitted_at" TIMESTAMP(3),
ADD COLUMN "df09_auditor_submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "design_factor_df08_inputs" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "outsourcing_importance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "outsourcing_baseline" DOUBLE PRECISION NOT NULL DEFAULT 33,
    "cloud_importance" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "cloud_baseline" DOUBLE PRECISION NOT NULL DEFAULT 33,
    "insourcing_importance" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "insourcing_baseline" DOUBLE PRECISION NOT NULL DEFAULT 34,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_df08_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_factor_df09_inputs" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "agile_importance" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "agile_baseline" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "devops_importance" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "devops_baseline" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "traditional_importance" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "traditional_baseline" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_factor_df09_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_df08_inputs_assessment_id_key" ON "design_factor_df08_inputs"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "design_factor_df09_inputs_assessment_id_key" ON "design_factor_df09_inputs"("assessment_id");

-- AddForeignKey
ALTER TABLE "design_factor_df08_inputs" ADD CONSTRAINT "design_factor_df08_inputs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_factor_df09_inputs" ADD CONSTRAINT "design_factor_df09_inputs_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
