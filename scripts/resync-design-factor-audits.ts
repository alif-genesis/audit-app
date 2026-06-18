import { PrismaClient, type AuditStatus } from "@prisma/client";
import {
  buildDesignFactorSummaryRows,
  isCobitFramework,
  questionMatchesObjective,
} from "../lib/cobit/auditScope";
import type { CobitObjective } from "../lib/cobit/designFactorMatrix";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

type SyncCounters = {
  assessments: number;
  createdAudits: number;
  updatedAudits: number;
  createdResponses: number;
  deletedResponses: number;
  keptTouchedResponses: number;
  skippedNoScope: number;
  skippedNoAuditType: number;
};

type SyncResult = {
  createdAudit: boolean;
  updatedAudit: boolean;
  createdResponses: number;
  deletedResponses: number;
  keptTouchedResponses: number;
  skippedNoAuditType: boolean;
};

async function main() {
  const counters: SyncCounters = {
    assessments: 0,
    createdAudits: 0,
    updatedAudits: 0,
    createdResponses: 0,
    deletedResponses: 0,
    keptTouchedResponses: 0,
    skippedNoScope: 0,
    skippedNoAuditType: 0,
  };

  const assessments = await prisma.designFactorAssessment.findMany({
    where: { status: { in: ["SUBMITTED", "REVIEWED", "APPROVED"] } },
    include: {
      df01Input: true,
      df02Input: true,
      df03Input: true,
      df04Input: true,
      df05Input: true,
      df06Input: true,
      df07Input: true,
      df08Input: true,
      df09Input: true,
      df10Input: true,
    },
    orderBy: { createdAt: "asc" },
  });

  for (const assessment of assessments) {
    counters.assessments += 1;
    const level4Objectives = buildDesignFactorSummaryRows(assessment)
      .filter((row) => row.suggestedCapability === 4)
      .map((row) => row.objective);

    if (level4Objectives.length === 0) {
      counters.skippedNoScope += 1;
      continue;
    }

    const syncResult = await syncAssessmentAudit(assessment, level4Objectives);
    counters.createdAudits += syncResult.createdAudit ? 1 : 0;
    counters.updatedAudits += syncResult.updatedAudit ? 1 : 0;
    counters.createdResponses += syncResult.createdResponses;
    counters.deletedResponses += syncResult.deletedResponses;
    counters.keptTouchedResponses += syncResult.keptTouchedResponses;
    counters.skippedNoAuditType += syncResult.skippedNoAuditType ? 1 : 0;
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Design Factor audit resync complete`);
  console.table(counters);
}

async function syncAssessmentAudit(
  assessment: Awaited<ReturnType<typeof prisma.designFactorAssessment.findMany>>[number],
  level4Objectives: CobitObjective[],
) {
  const existingAudit = await prisma.audit.findFirst({
    where: {
      companyName: assessment.companyName,
      auditType: {
        OR: [
          { name: { contains: "COBIT", mode: "insensitive" } },
          { isoStandard: { contains: "COBIT", mode: "insensitive" } },
        ],
      },
      description: { contains: `Design Factor Assessment ID: ${assessment.id}` },
    },
    include: {
      auditType: true,
      assignments: { select: { auditeeId: true } },
    },
  });

  const auditType =
    existingAudit?.auditType ??
    (await prisma.auditType.findFirst({
      where: {
        OR: [
          { name: { contains: "COBIT", mode: "insensitive" } },
          { isoStandard: { contains: "COBIT", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "asc" },
    }));

  if (!auditType || !isCobitFramework(auditType)) {
    return emptySyncResult({ skippedNoAuditType: true });
  }

  const questions = await prisma.auditQuestion.findMany({
    where: { auditTypeId: auditType.id },
    select: { id: true, clause: true },
    orderBy: { sortOrder: "asc" },
  });
  const scopedQuestionIds = questions
    .filter((question) => questionMatchesObjective(question.clause, level4Objectives))
    .map((question) => question.id);

  if (scopedQuestionIds.length === 0) {
    return emptySyncResult();
  }

  const description = buildAuditDescription(assessment.id, assessment.targetScore, level4Objectives);

  if (!existingAudit) {
    if (!dryRun) {
      await prisma.audit.create({
        data: {
          title: `${assessment.name} - Audit COBIT`,
          companyName: assessment.companyName,
          auditTypeId: auditType.id,
          mode: "AUDIT",
          startDate: new Date(),
          status: "IN_PROGRESS",
          description,
          assignments: {
            create: {
              auditorId: assessment.auditorId,
              auditeeId: assessment.auditeeId,
            },
          },
          responses: {
            createMany: {
              data: scopedQuestionIds.map((questionId) => ({
                auditeeId: assessment.auditeeId,
                questionId,
                compliance: "NA" as const,
              })),
            },
          },
        },
      });

      await prisma.user.updateMany({
        where: { id: { in: [assessment.auditorId, assessment.auditeeId] } },
        data: { assignedAudits: { increment: 1 } },
      });
    }

    return {
      createdAudit: true,
      updatedAudit: false,
      createdResponses: scopedQuestionIds.length,
      deletedResponses: 0,
      keptTouchedResponses: 0,
      skippedNoAuditType: false,
    };
  }

  const responseSync = await syncAuditResponses(existingAudit.id, existingAudit.assignments[0]?.auditeeId, scopedQuestionIds);

  if (!dryRun) {
    await prisma.audit.update({
      where: { id: existingAudit.id },
      data: {
        description,
        status: normalizeAuditStatus(existingAudit.status),
      },
    });
  }

  return {
    createdAudit: false,
    updatedAudit: true,
    ...responseSync,
    skippedNoAuditType: false,
  };
}

async function syncAuditResponses(auditId: string, auditeeId: string | undefined, scopedQuestionIds: string[]) {
  if (!auditeeId) {
    return { createdResponses: 0, deletedResponses: 0, keptTouchedResponses: 0 };
  }

  const scoped = new Set(scopedQuestionIds);
  const responses = await prisma.auditResponse.findMany({
    where: { auditId },
    select: {
      id: true,
      questionId: true,
      compliance: true,
      description: true,
      notes: true,
      attachments: true,
      submittedAt: true,
      _count: {
        select: {
          evidenceFiles: true,
          findings: true,
        },
      },
    },
  });
  const currentQuestionIds = new Set(responses.map((response) => response.questionId));
  const missingQuestionIds = scopedQuestionIds.filter((questionId) => !currentQuestionIds.has(questionId));
  const extraResponses = responses.filter((response) => !scoped.has(response.questionId));
  const deletableResponses = extraResponses.filter(isUntouchedResponse);
  const keptTouchedResponses = extraResponses.length - deletableResponses.length;

  if (!dryRun) {
    if (deletableResponses.length > 0) {
      await prisma.auditResponse.deleteMany({
        where: { id: { in: deletableResponses.map((response) => response.id) } },
      });
    }

    if (missingQuestionIds.length > 0) {
      await prisma.auditResponse.createMany({
        data: missingQuestionIds.map((questionId) => ({
          auditId,
          auditeeId,
          questionId,
          compliance: "NA" as const,
        })),
        skipDuplicates: true,
      });
    }
  }

  return {
    createdResponses: missingQuestionIds.length,
    deletedResponses: deletableResponses.length,
    keptTouchedResponses,
  };
}

function isUntouchedResponse(response: {
  compliance: string;
  description: string | null;
  notes: string | null;
  attachments: string[];
  submittedAt: Date | null;
  _count: { evidenceFiles: number; findings: number };
}) {
  return (
    response.compliance === "NA" &&
    !response.description &&
    !response.notes &&
    response.attachments.length === 0 &&
    !response.submittedAt &&
    response._count.evidenceFiles === 0 &&
    response._count.findings === 0
  );
}

function buildAuditDescription(assessmentId: string, targetScore: number | null, objectives: CobitObjective[]) {
  return [
    "Scope Audit COBIT: Design Factor Level 4",
    `Baseline COBIT: ${targetScore ?? 3}`,
    `Scope Objectives: ${objectives.join(", ")}`,
    `Design Factor Assessment ID: ${assessmentId}`,
  ].join("\n");
}

function normalizeAuditStatus(status: AuditStatus) {
  return status === "DRAFT" ? "IN_PROGRESS" : status;
}

function emptySyncResult(overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    createdAudit: false,
    updatedAudit: false,
    createdResponses: 0,
    deletedResponses: 0,
    keptTouchedResponses: 0,
    skippedNoAuditType: false,
    ...overrides,
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
