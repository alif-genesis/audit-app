import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildDesignFactorReportData } from "@/lib/cobit/designFactorReport";
import { DesignFactorReportDeck } from "./report-deck";

export default async function DesignFactorReportPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) redirect("/login");

  const { id } = await params;
  const assessment = await prisma.designFactorAssessment.findUnique({
    where: { id },
    include: {
      auditor: { select: { name: true } },
      auditee: { select: { name: true } },
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
  if (!assessment) redirect("/dashboard/design-factors");
  if (currentUser.role !== "ADMIN" && assessment.auditorId !== currentUser.id && assessment.auditeeId !== currentUser.id) {
    redirect("/dashboard");
  }

  const reportData = buildDesignFactorReportData(assessment);
  const storedContent =
    assessment.reportContent && typeof assessment.reportContent === "object" && !Array.isArray(assessment.reportContent)
      ? (assessment.reportContent as Record<string, unknown>)
      : {};
  const content = Object.fromEntries(Object.entries(storedContent).map(([key, value]) => [key, String(value ?? "")]));
  if (content.companyLogoPath) {
    content.companyLogoPath = `/api/design-factors/${assessment.id}/report-logo`;
  }

  return (
    <DesignFactorReportDeck
      assessment={{
        id: assessment.id,
        name: assessment.name,
        companyName: assessment.companyName,
        description: assessment.description,
        status: assessment.status,
        targetScore: assessment.targetScore,
        startDate: assessment.startDate.toISOString(),
        dueDate: assessment.dueDate?.toISOString() ?? null,
        updatedAt: assessment.updatedAt.toISOString(),
        auditorName: assessment.auditor.name,
        auditeeName: assessment.auditee.name,
      }}
      factorRows={reportData.factorRows}
      summaryRows={reportData.summaryRows}
      storedContent={content}
    />
  );
}
