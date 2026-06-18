import { prisma } from "@/lib/prisma";
import {
  buildDesignFactorSummaryRows,
  cobitBumn24Objectives,
  isCobitFramework,
  questionMatchesObjective,
} from "@/lib/cobit/auditScope";
import { cobitObjectives, type CobitObjective } from "@/lib/cobit/designFactorMatrix";

const OBJECTIVE_PATTERN = /\b(EDM|APO|BAI|DSS|MEA)\s*0?(\d{1,2})\b/gi;

export async function syncCobitAuditResponses(auditId: string) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      auditType: true,
      assignments: { select: { auditeeId: true } },
    },
  });

  if (!audit || !isCobitFramework(audit.auditType)) {
    return { created: 0, deleted: 0, total: 0 };
  }

  const auditeeId = audit.assignments[0]?.auditeeId;
  if (!auditeeId) {
    return { created: 0, deleted: 0, total: 0 };
  }

  const objectives = await resolveCobitAuditObjectives(audit.description);
  if (objectives.length === 0) {
    return { created: 0, deleted: 0, total: 0 };
  }

  const questions = await prisma.auditQuestion.findMany({
    where: { auditTypeId: audit.auditTypeId },
    select: { id: true, clause: true },
  });
  const scopedQuestionIds = new Set(
    questions
      .filter((question) => questionMatchesObjective(question.clause, objectives))
      .map((question) => question.id),
  );

  if (scopedQuestionIds.size === 0) {
    return { created: 0, deleted: 0, total: 0 };
  }

  const currentResponses = await prisma.auditResponse.findMany({
    where: { auditId },
    select: { id: true, questionId: true },
  });
  const currentQuestionIds = new Set(currentResponses.map((response) => response.questionId));
  const extraQuestionIds = currentResponses
    .filter((response) => !scopedQuestionIds.has(response.questionId))
    .map((response) => response.questionId);
  const missingQuestionIds = [...scopedQuestionIds].filter((questionId) => !currentQuestionIds.has(questionId));

  if (extraQuestionIds.length > 0) {
    await prisma.auditResponse.deleteMany({
      where: {
        auditId,
        questionId: { in: extraQuestionIds },
      },
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

  return {
    created: missingQuestionIds.length,
    deleted: extraQuestionIds.length,
    total: scopedQuestionIds.size,
  };
}

async function resolveCobitAuditObjectives(description: string | null): Promise<CobitObjective[]> {
  const text = String(description ?? "");
  const explicitObjectives = parseObjectivesFromLine(text, "Scope Objectives");
  if (explicitObjectives.length > 0) {
    return explicitObjectives;
  }

  const assessmentId = text.match(/Design Factor Assessment ID:\s*([^\n]+)/i)?.[1]?.trim();
  if (assessmentId) {
    const assessment = await prisma.designFactorAssessment.findUnique({
      where: { id: assessmentId },
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
    });

    if (assessment) {
      return buildDesignFactorSummaryRows(assessment)
        .filter((row) => row.suggestedCapability === 4)
        .map((row) => row.objective);
    }
  }

  if (/24\s*Domain\s*BUMN/i.test(text)) {
    return cobitBumn24Objectives;
  }

  return [...cobitObjectives];
}

function parseObjectivesFromLine(text: string, label: string) {
  const line = text
    .split(/\r?\n/)
    .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  if (!line) return [];

  return parseObjectives(line);
}

function parseObjectives(text: string) {
  const objectives = new Set<CobitObjective>();
  for (const match of text.matchAll(OBJECTIVE_PATTERN)) {
    const objective = `${match[1].toUpperCase()}${match[2].padStart(2, "0")}` as CobitObjective;
    if (cobitObjectives.includes(objective)) {
      objectives.add(objective);
    }
  }

  return [...objectives];
}
