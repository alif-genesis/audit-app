CREATE TYPE "ApprovalTargetType" AS ENUM ('AUDIT', 'DESIGN_FACTOR');
CREATE TYPE "ApprovalDecision" AS ENUM ('REVIEW', 'APPROVE', 'REJECT', 'REOPEN');
CREATE TYPE "CapaStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'VERIFICATION', 'CLOSED', 'REJECTED');

ALTER TABLE "audits"
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by_id" TEXT,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "approved_by_id" TEXT,
  ADD COLUMN "approval_note" TEXT;

ALTER TABLE "design_factor_assessments"
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by_id" TEXT,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "approved_by_id" TEXT,
  ADD COLUMN "approval_note" TEXT;

UPDATE "audit_findings" finding
SET "response_id" = NULL
WHERE "response_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "audit_responses" response
    WHERE response."id" = finding."response_id"
  );

WITH ranked_findings AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "audit_id", "response_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id"
    ) AS row_number
  FROM "audit_findings"
  WHERE "response_id" IS NOT NULL
)
UPDATE "audit_findings"
SET "response_id" = NULL
WHERE "id" IN (
  SELECT "id"
  FROM ranked_findings
  WHERE row_number > 1
);

CREATE TABLE "evidence_files" (
  "id" TEXT NOT NULL,
  "audit_response_id" TEXT NOT NULL,
  "audit_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "stored_name" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "download_path" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "checksum_sha256" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capa_actions" (
  "id" TEXT NOT NULL,
  "finding_id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "status" "CapaStatus" NOT NULL DEFAULT 'OPEN',
  "root_cause" TEXT,
  "corrective_action" TEXT,
  "due_date" TIMESTAMP(3),
  "evidence_notes" TEXT,
  "verification_notes" TEXT,
  "verified_by_id" TEXT,
  "verified_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "capa_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_approval_logs" (
  "id" TEXT NOT NULL,
  "target_type" "ApprovalTargetType" NOT NULL,
  "audit_id" TEXT,
  "design_factor_id" TEXT,
  "actor_id" TEXT NOT NULL,
  "decision" "ApprovalDecision" NOT NULL,
  "from_status" TEXT NOT NULL,
  "to_status" TEXT NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_approval_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audit_findings_audit_id_response_id_key" ON "audit_findings"("audit_id", "response_id");
CREATE UNIQUE INDEX "evidence_files_download_path_key" ON "evidence_files"("download_path");
CREATE UNIQUE INDEX "evidence_files_audit_response_id_version_stored_name_key" ON "evidence_files"("audit_response_id", "version", "stored_name");

CREATE INDEX "audits_reviewed_by_id_idx" ON "audits"("reviewed_by_id");
CREATE INDEX "audits_approved_by_id_idx" ON "audits"("approved_by_id");
CREATE INDEX "design_factor_assessments_reviewed_by_id_idx" ON "design_factor_assessments"("reviewed_by_id");
CREATE INDEX "design_factor_assessments_approved_by_id_idx" ON "design_factor_assessments"("approved_by_id");
CREATE INDEX "audit_findings_response_id_idx" ON "audit_findings"("response_id");
CREATE INDEX "evidence_files_audit_id_idx" ON "evidence_files"("audit_id");
CREATE INDEX "evidence_files_question_id_idx" ON "evidence_files"("question_id");
CREATE INDEX "evidence_files_uploaded_by_id_idx" ON "evidence_files"("uploaded_by_id");
CREATE INDEX "evidence_files_checksum_sha256_idx" ON "evidence_files"("checksum_sha256");
CREATE INDEX "capa_actions_finding_id_idx" ON "capa_actions"("finding_id");
CREATE INDEX "capa_actions_owner_id_idx" ON "capa_actions"("owner_id");
CREATE INDEX "capa_actions_status_idx" ON "capa_actions"("status");
CREATE INDEX "capa_actions_due_date_idx" ON "capa_actions"("due_date");
CREATE INDEX "audit_approval_logs_target_type_idx" ON "audit_approval_logs"("target_type");
CREATE INDEX "audit_approval_logs_audit_id_idx" ON "audit_approval_logs"("audit_id");
CREATE INDEX "audit_approval_logs_design_factor_id_idx" ON "audit_approval_logs"("design_factor_id");
CREATE INDEX "audit_approval_logs_actor_id_idx" ON "audit_approval_logs"("actor_id");
CREATE INDEX "audit_approval_logs_created_at_idx" ON "audit_approval_logs"("created_at");

ALTER TABLE "audits" ADD CONSTRAINT "audits_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audits" ADD CONSTRAINT "audits_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "design_factor_assessments" ADD CONSTRAINT "design_factor_assessments_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "design_factor_assessments" ADD CONSTRAINT "design_factor_assessments_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "audit_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_audit_response_id_fkey" FOREIGN KEY ("audit_response_id") REFERENCES "audit_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "audit_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_approval_logs" ADD CONSTRAINT "audit_approval_logs_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_approval_logs" ADD CONSTRAINT "audit_approval_logs_design_factor_id_fkey" FOREIGN KEY ("design_factor_id") REFERENCES "design_factor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_approval_logs" ADD CONSTRAINT "audit_approval_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
