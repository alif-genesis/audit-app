import { prisma } from "@/lib/prisma";

export async function ensureCapaForIsoAudit(auditId: string) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      auditType: true,
      assignments: { select: { auditeeId: true } },
    },
  });

  if (!audit) {
    return 0;
  }

  const isCobit = `${audit.auditType.name} ${audit.auditType.isoStandard}`.toUpperCase().includes("COBIT");
  const ownerId = audit.assignments[0]?.auditeeId;
  if (isCobit || audit.mode !== "AUDIT" || !ownerId) {
    return 0;
  }

  const capaFindings = await prisma.auditFinding.findMany({
    where: {
      auditId,
      level: { in: ["MINOR", "MAJOR"] },
      submittedAt: { not: null },
      capaActions: { none: {} },
    },
    select: { id: true },
  });

  if (capaFindings.length === 0) {
    return 0;
  }

  await prisma.capaAction.createMany({
    data: capaFindings.map((finding) => ({
      findingId: finding.id,
      ownerId,
    })),
  });

  return capaFindings.length;
}
