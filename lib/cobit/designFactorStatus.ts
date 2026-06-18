import { prisma } from "@/lib/prisma";

const submissionFields = [
  "df01AuditeeSubmittedAt",
  "df01AuditorSubmittedAt",
  "df02AuditeeSubmittedAt",
  "df02AuditorSubmittedAt",
  "df03AuditeeSubmittedAt",
  "df03AuditorSubmittedAt",
  "df04AuditeeSubmittedAt",
  "df04AuditorSubmittedAt",
  "df05AuditeeSubmittedAt",
  "df05AuditorSubmittedAt",
  "df06AuditeeSubmittedAt",
  "df06AuditorSubmittedAt",
  "df07AuditeeSubmittedAt",
  "df07AuditorSubmittedAt",
  "df08AuditeeSubmittedAt",
  "df08AuditorSubmittedAt",
  "df09AuditeeSubmittedAt",
  "df09AuditorSubmittedAt",
  "df10AuditeeSubmittedAt",
  "df10AuditorSubmittedAt",
] as const;

export async function syncCompletedDesignFactorAssessments() {
  const completedSubmissionWhere = Object.fromEntries(
    submissionFields.map((field) => [field, { not: null }]),
  );

  await prisma.designFactorAssessment.updateMany({
    where: {
      status: "IN_PROGRESS",
      OR: [
        { submittedAt: { not: null } },
        completedSubmissionWhere,
      ],
    },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  const stuckAssessments = await prisma.designFactorAssessment.findMany({
    where: { status: "IN_PROGRESS" },
    select: { id: true },
  });

  for (const assessment of stuckAssessments) {
    const generatedAudit = await prisma.audit.findFirst({
      where: {
        description: { contains: `Design Factor Assessment ID: ${assessment.id}` },
      },
      select: { id: true },
    });

    if (generatedAudit) {
      await prisma.designFactorAssessment.update({
        where: { id: assessment.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });
    }
  }
}
