"use server";

import { revalidatePath } from "next/cache";
import { ApprovalDecision, ApprovalTargetType, AuditStatus, CapaStatus, DesignFactorAssessmentStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveAdmin, getCurrentUser } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";
import { ensureCapaForIsoAudit } from "@/lib/capa";

export async function transitionAuditApprovalAction(formData: FormData) {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return;
  }

  const auditId = String(formData.get("auditId") || "").trim();
  const decision = String(formData.get("decision") || "").trim() as ApprovalDecision;
  const note = String(formData.get("note") || "").trim();

  if (!auditId || !Object.values(ApprovalDecision).includes(decision)) {
    return;
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      responses: { select: { id: true, submittedAt: true } },
      findings: { select: { responseId: true, submittedAt: true } },
    },
  });

  if (!audit) {
    return;
  }

  const submittedResponses = audit.responses.filter((response) => response.submittedAt);
  const submittedFindings = new Set(
    audit.findings.filter((finding) => finding.submittedAt && finding.responseId).map((finding) => finding.responseId),
  );
  const isComplete =
    submittedResponses.length > 0 &&
    submittedResponses.every((response) => submittedFindings.has(response.id));
  const fromStatus = audit.status;
  const now = new Date();
  let toStatus: AuditStatus | null = null;
  const updateData: Record<string, unknown> = {};

  if (
    decision === ApprovalDecision.REVIEW &&
    isComplete &&
    (fromStatus === AuditStatus.IN_PROGRESS || fromStatus === AuditStatus.COMPLETED)
  ) {
    toStatus = AuditStatus.REVIEWED;
    updateData.reviewedAt = now;
    updateData.reviewedById = currentUser.id;
  } else if (decision === ApprovalDecision.APPROVE && fromStatus === AuditStatus.REVIEWED) {
    toStatus = AuditStatus.APPROVED;
    updateData.approvedAt = now;
    updateData.approvedById = currentUser.id;
  } else if (decision === ApprovalDecision.REJECT && (fromStatus === AuditStatus.REVIEWED || fromStatus === AuditStatus.APPROVED)) {
    toStatus = AuditStatus.IN_PROGRESS;
    updateData.reviewedAt = null;
    updateData.reviewedById = null;
    updateData.approvedAt = null;
    updateData.approvedById = null;
  }

  if (!toStatus) {
    return;
  }

  await prisma.$transaction([
    prisma.audit.update({
      where: { id: auditId },
      data: {
        status: toStatus,
        approvalNote: note || null,
        ...updateData,
      },
    }),
    ...(decision === ApprovalDecision.REJECT
      ? [
          prisma.auditFinding.updateMany({
            where: { auditId },
            data: { submittedAt: null },
          }),
        ]
      : []),
    prisma.auditApprovalLog.create({
      data: {
        targetType: ApprovalTargetType.AUDIT,
        auditId,
        actorId: currentUser.id,
        decision,
        fromStatus,
        toStatus,
        note: note || null,
      },
    }),
  ]);

  await writeActivityLog({
    action: `Audit ${decision}`,
    entity: "Audit",
    entityId: auditId,
    details: `Admin ${currentUser.name} mengubah status audit dari ${fromStatus} ke ${toStatus}.`,
  });

  if (decision === ApprovalDecision.REVIEW || decision === ApprovalDecision.APPROVE) {
    await ensureCapaForIsoAudit(auditId);
  }

  revalidatePath(`/dashboard/audits/${auditId}/summary`);
  revalidatePath("/dashboard/audits");
  revalidatePath("/dashboard/cobit-audits");
  revalidatePath("/dashboard/capa");
}

export async function transitionDesignFactorApprovalAction(formData: FormData) {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return;
  }

  const assessmentId = String(formData.get("assessmentId") || "").trim();
  const decision = String(formData.get("decision") || "").trim() as ApprovalDecision;
  const note = String(formData.get("note") || "").trim();

  if (!assessmentId || !Object.values(ApprovalDecision).includes(decision)) {
    return;
  }

  const assessment = await prisma.designFactorAssessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, status: true },
  });

  if (!assessment) {
    return;
  }

  const fromStatus = assessment.status;
  const now = new Date();
  let toStatus: DesignFactorAssessmentStatus | null = null;
  const updateData: Record<string, unknown> = {};

  if (decision === ApprovalDecision.REVIEW && fromStatus === DesignFactorAssessmentStatus.SUBMITTED) {
    toStatus = DesignFactorAssessmentStatus.REVIEWED;
    updateData.reviewedAt = now;
    updateData.reviewedById = currentUser.id;
  } else if (decision === ApprovalDecision.APPROVE && fromStatus === DesignFactorAssessmentStatus.REVIEWED) {
    toStatus = DesignFactorAssessmentStatus.APPROVED;
    updateData.approvedAt = now;
    updateData.approvedById = currentUser.id;
  } else if (
    decision === ApprovalDecision.REJECT &&
    (fromStatus === DesignFactorAssessmentStatus.REVIEWED || fromStatus === DesignFactorAssessmentStatus.APPROVED)
  ) {
    toStatus = DesignFactorAssessmentStatus.IN_PROGRESS;
    Object.assign(updateData, auditorResubmissionReset());
    updateData.approvedAt = null;
    updateData.approvedById = null;
  }

  if (!toStatus) {
    return;
  }

  await prisma.$transaction([
    prisma.designFactorAssessment.update({
      where: { id: assessmentId },
      data: {
        status: toStatus,
        approvalNote: note || null,
        ...updateData,
      },
    }),
    prisma.auditApprovalLog.create({
      data: {
        targetType: ApprovalTargetType.DESIGN_FACTOR,
        designFactorId: assessmentId,
        actorId: currentUser.id,
        decision,
        fromStatus,
        toStatus,
        note: note || null,
      },
    }),
  ]);

  await writeActivityLog({
    action: `Design Factor ${decision}`,
    entity: "DesignFactorAssessment",
    entityId: assessmentId,
    details: `Admin ${currentUser.name} mengubah status Design Factor dari ${fromStatus} ke ${toStatus}.`,
  });

  revalidatePath(`/dashboard/design-factors/${assessmentId}`);
  revalidatePath("/dashboard/design-factors");
}

function auditorResubmissionReset() {
  return {
    df01AuditorSubmittedAt: null,
    df02AuditorSubmittedAt: null,
    df03AuditorSubmittedAt: null,
    df04AuditorSubmittedAt: null,
    df05AuditorSubmittedAt: null,
    df06AuditorSubmittedAt: null,
    df07AuditorSubmittedAt: null,
    df08AuditorSubmittedAt: null,
    df09AuditorSubmittedAt: null,
    df10AuditorSubmittedAt: null,
    submittedAt: null,
    reviewedAt: null,
    reviewedById: null,
    approvedAt: null,
    approvedById: null,
  };
}

export async function createCapaAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.AUDITOR)) {
    return;
  }

  const findingId = String(formData.get("findingId") || "").trim();
  const ownerId = String(formData.get("ownerId") || "").trim();
  const rootCause = String(formData.get("rootCause") || "").trim();
  const correctiveAction = String(formData.get("correctiveAction") || "").trim();
  const dueDate = String(formData.get("dueDate") || "").trim();

  if (!findingId || !ownerId) {
    return;
  }

  const finding = await prisma.auditFinding.findUnique({
    where: { id: findingId },
    include: {
      audit: {
        include: {
          assignments: true,
        },
      },
    },
  });

  if (!finding) {
    return;
  }

  const canManage =
    currentUser.role === UserRole.ADMIN ||
    finding.audit.assignments.some((assignment) => assignment.auditorId === currentUser.id);

  if (!canManage) {
    return;
  }

  const owner = await prisma.user.findFirst({
    where: { id: ownerId, isActive: true },
    select: { id: true },
  });

  if (!owner) {
    return;
  }

  await prisma.capaAction.create({
    data: {
      findingId,
      ownerId,
      rootCause: rootCause || null,
      correctiveAction: correctiveAction || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  await writeActivityLog({
    action: "Create CAPA",
    entity: "AuditFinding",
    entityId: findingId,
    details: `CAPA dibuat untuk finding audit ${finding.auditId}.`,
  });

  revalidatePath(`/dashboard/audits/${finding.auditId}/summary`);
}

export async function updateCapaStatusAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return;
  }

  const capaId = String(formData.get("capaId") || "").trim();
  const status = String(formData.get("status") || "").trim() as CapaStatus;
  const rootCause = String(formData.get("rootCause") || "").trim();
  const correctiveAction = String(formData.get("correctiveAction") || "").trim();
  const dueDate = String(formData.get("dueDate") || "").trim();
  const evidenceNotes = String(formData.get("evidenceNotes") || "").trim();
  const verificationNotes = String(formData.get("verificationNotes") || "").trim();

  if (!capaId || !Object.values(CapaStatus).includes(status)) {
    return;
  }

  const capa = await prisma.capaAction.findUnique({
    where: { id: capaId },
    include: {
      finding: {
        select: {
          auditId: true,
          audit: { include: { assignments: true } },
        },
      },
    },
  });

  if (!capa) {
    return;
  }

  const isOwner = capa.ownerId === currentUser.id;
  const isReviewer =
    currentUser.role === UserRole.ADMIN ||
    capa.finding.audit.assignments.some((assignment) => assignment.auditorId === currentUser.id);

  if (!isOwner && !isReviewer) {
    return;
  }

  if ((status === CapaStatus.CLOSED || status === CapaStatus.REJECTED) && !isReviewer) {
    return;
  }

  if (status === CapaStatus.VERIFICATION) {
    if (!isOwner || !rootCause || !correctiveAction || !dueDate) {
      return;
    }
  }

  await prisma.capaAction.update({
    where: { id: capaId },
    data: {
      status,
      rootCause: rootCause || capa.rootCause,
      correctiveAction: correctiveAction || capa.correctiveAction,
      dueDate: dueDate ? new Date(dueDate) : capa.dueDate,
      evidenceNotes: evidenceNotes || capa.evidenceNotes,
      verificationNotes: verificationNotes || capa.verificationNotes,
      verifiedById: status === CapaStatus.CLOSED || status === CapaStatus.REJECTED ? currentUser.id : capa.verifiedById,
      verifiedAt: status === CapaStatus.CLOSED || status === CapaStatus.REJECTED ? new Date() : capa.verifiedAt,
      closedAt: status === CapaStatus.CLOSED ? new Date() : capa.closedAt,
    },
  });

  await writeActivityLog({
    action: `Update CAPA ${status}`,
    entity: "CapaAction",
    entityId: capaId,
    details: `Status CAPA diperbarui menjadi ${status}.`,
  });

  revalidatePath(`/dashboard/audits/${capa.finding.auditId}/summary`);
  revalidatePath("/dashboard/capa");
  revalidatePath(`/dashboard/capa/${capa.finding.auditId}`);
}
