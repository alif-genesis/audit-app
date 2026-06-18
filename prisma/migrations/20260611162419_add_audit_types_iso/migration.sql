-- CreateTable
CREATE TABLE "audit_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iso_standard" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_questions" (
    "id" TEXT NOT NULL,
    "audit_type_id" TEXT NOT NULL,
    "clause" TEXT NOT NULL,
    "title" TEXT,
    "requirement" TEXT,
    "question" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_types_iso_standard_idx" ON "audit_types"("iso_standard");

-- CreateIndex
CREATE INDEX "audit_questions_audit_type_id_idx" ON "audit_questions"("audit_type_id");

-- CreateIndex
CREATE INDEX "audit_questions_clause_idx" ON "audit_questions"("clause");

-- AddForeignKey
ALTER TABLE "audit_questions" ADD CONSTRAINT "audit_questions_audit_type_id_fkey" FOREIGN KEY ("audit_type_id") REFERENCES "audit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
