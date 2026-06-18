-- CreateEnum
CREATE TYPE "AuditMode" AS ENUM ('GAP_ASSESSMENT', 'AUDIT');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'APPROVED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLY', 'NOT_COMPLY', 'NA');

-- CreateEnum
CREATE TYPE "FindingLevel" AS ENUM ('MAJOR', 'MINOR', 'OFI', 'PASS');

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "audit_type_id" TEXT NOT NULL,
    "mode" "AuditMode" NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_assignments" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "auditor_id" TEXT,
    "auditee_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_responses" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "auditee_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "compliance" "ComplianceStatus" NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "response_id" TEXT,
    "level" "FindingLevel" NOT NULL,
    "description" TEXT,
    "recommendation" TEXT,
    "status" TEXT DEFAULT 'OPEN',
    "due_date" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audits_company_name_idx" ON "audits"("company_name");

-- CreateIndex
CREATE INDEX "audits_audit_type_id_idx" ON "audits"("audit_type_id");

-- CreateIndex
CREATE INDEX "audits_status_idx" ON "audits"("status");

-- CreateIndex
CREATE INDEX "audit_assignments_audit_id_idx" ON "audit_assignments"("audit_id");

-- CreateIndex
CREATE INDEX "audit_assignments_auditor_id_idx" ON "audit_assignments"("auditor_id");

-- CreateIndex
CREATE INDEX "audit_assignments_auditee_id_idx" ON "audit_assignments"("auditee_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_assignments_audit_id_auditee_id_key" ON "audit_assignments"("audit_id", "auditee_id");

-- CreateIndex
CREATE INDEX "audit_responses_audit_id_idx" ON "audit_responses"("audit_id");

-- CreateIndex
CREATE INDEX "audit_responses_auditee_id_idx" ON "audit_responses"("auditee_id");

-- CreateIndex
CREATE INDEX "audit_responses_question_id_idx" ON "audit_responses"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_responses_audit_id_auditee_id_question_id_key" ON "audit_responses"("audit_id", "auditee_id", "question_id");

-- CreateIndex
CREATE INDEX "audit_findings_audit_id_idx" ON "audit_findings"("audit_id");

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_audit_type_id_fkey" FOREIGN KEY ("audit_type_id") REFERENCES "audit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_auditee_id_fkey" FOREIGN KEY ("auditee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_auditee_id_fkey" FOREIGN KEY ("auditee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "audit_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
