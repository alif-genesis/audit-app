"use server";

import { revalidatePath } from "next/cache";
import { AuditMode, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveAdmin } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";
import {
  buildDesignFactorSummaryRows,
  cobitBumn24Objectives,
  isCobitFramework,
  questionMatchesObjective,
  type CobitAuditScope,
} from "@/lib/cobit/auditScope";
import { cobitObjectives, type CobitObjective } from "@/lib/cobit/designFactorMatrix";

export type AuditFormState = {
  toast?: {
    type: "success" | "error";
    message: string;
  };
};

export async function createAuditAction(
  _previousState: AuditFormState,
  formData: FormData,
): Promise<AuditFormState> {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const title = String(formData.get("title") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const auditTypeId = String(formData.get("auditTypeId") || "").trim();
  const mode = String(formData.get("mode") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const auditorId = String(formData.get("auditorId") || "").trim();
  const auditeeId = String(formData.get("auditeeId") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const cobitScope = String(formData.get("cobitScope") || "").trim() as CobitAuditScope | "";
  const designFactorAssessmentId = String(formData.get("designFactorAssessmentId") || "").trim();
  const cobitBaselineRaw = String(formData.get("cobitBaseline") || "").trim();

  if (!title || !companyName || !auditTypeId || !mode || !startDate || !auditeeId || !auditorId) {
    return {
      toast: {
        type: "error",
        message: "Judul, perusahaan, framework, mode, tanggal mulai, auditor, dan auditee wajib diisi.",
      },
    };
  }

  if (!Object.values(AuditMode).includes(mode as AuditMode)) {
    return {
      toast: {
        type: "error",
        message: "Audit mode tidak valid.",
      },
    };
  }

  const company = await prisma.company.findUnique({
    where: { name: companyName },
  });

  if (!company) {
    return {
      toast: {
        type: "error",
        message: "Perusahaan tidak ditemukan.",
      },
    };
  }

  const auditType = await prisma.auditType.findUnique({
    where: { id: auditTypeId },
  });

  if (!auditType) {
    return {
      toast: {
        type: "error",
        message: "Framework audit tidak ditemukan.",
      },
    };
  }

  const auditee = await prisma.user.findFirst({
    where: { id: auditeeId, role: UserRole.AUDITEE, isActive: true },
  });

  if (!auditee) {
    return {
      toast: {
        type: "error",
        message: "Auditee tidak ditemukan atau tidak aktif.",
      },
    };
  }

  const auditor = await prisma.user.findFirst({
    where: { id: auditorId, role: UserRole.AUDITOR, isActive: true },
  });

  if (!auditor) {
    return {
      toast: {
        type: "error",
        message: "Auditor tidak ditemukan atau tidak aktif.",
      },
    };
  }

  if (auditee.companyName && auditee.companyName !== companyName) {
    return {
      toast: {
        type: "error",
        message: "Auditee harus berasal dari perusahaan yang sama dengan audit.",
      },
    };
  }

  const isCobit = isCobitFramework(auditType);
  if (isCobit && !["ALL_40", "BUMN_24", "DESIGN_FACTOR"].includes(cobitScope)) {
    return {
      toast: {
        type: "error",
        message: "Scope Audit COBIT wajib dipilih.",
      },
    };
  }

  const cobitBaseline = Number(cobitBaselineRaw || 3);
  if (isCobit && (!Number.isFinite(cobitBaseline) || cobitBaseline < 0 || cobitBaseline > 5)) {
    return {
      toast: {
        type: "error",
        message: "Baseline COBIT harus 0-5.",
      },
    };
  }

  try {
    const questions = await prisma.auditQuestion.findMany({
      where: { auditTypeId },
      orderBy: { sortOrder: "asc" },
    });
    const directScopeObjectives = getDirectCobitScopeObjectives(cobitScope);
    const scopedQuestions = isCobit
      ? questions.filter((question) =>
          directScopeObjectives.length > 0 ? questionMatchesObjective(question.clause, directScopeObjectives) : false,
        )
      : questions;
    const designFactorScope =
      isCobit && cobitScope === "DESIGN_FACTOR"
        ? await getDesignFactorScopedQuestions({
            designFactorAssessmentId,
            companyName,
            questions,
          })
        : null;

    const finalQuestions =
      isCobit && cobitScope === "DESIGN_FACTOR" ? designFactorScope?.questions ?? [] : scopedQuestions;
    const finalObjectives =
      isCobit && cobitScope === "DESIGN_FACTOR" ? designFactorScope?.objectives ?? [] : directScopeObjectives;

    if (isCobit && finalQuestions.length === 0) {
      return {
        toast: {
          type: "error",
          message: "Tidak ada pertanyaan COBIT yang cocok dengan scope pilihan. Pastikan klausul template memakai kode EDM/APO/BAI/DSS/MEA, misalnya APO12.",
        },
      };
    }

    const audit = await prisma.audit.create({
      data: {
        title,
        companyName,
        auditTypeId,
        mode: mode as AuditMode,
        startDate: new Date(startDate),
        description: isCobit
          ? [
              description,
              `Scope Audit COBIT: ${formatCobitScope(cobitScope)}`,
              `Baseline COBIT: ${cobitBaseline}`,
              finalObjectives.length > 0 ? `Scope Objectives: ${finalObjectives.join(", ")}` : "",
              cobitScope === "DESIGN_FACTOR" && designFactorAssessmentId
                ? `Design Factor Assessment ID: ${designFactorAssessmentId}`
                : "",
            ].filter(Boolean).join("\n")
          : description || null,
        status: "IN_PROGRESS",
      },
    });

    // Create assignment
    const assignment = await prisma.auditAssignment.create({
      data: {
        auditId: audit.id,
        auditorId,
        auditeeId,
      },
    });

    // Increment assigned counts for users
    await prisma.user.updateMany({
      where: { id: { in: [auditorId, auditeeId] } },
      data: { assignedAudits: { increment: 1 } },
    });

    if (finalQuestions.length > 0) {
      await prisma.auditResponse.createMany({
        data: finalQuestions.map((q) => ({
          auditId: audit.id,
          auditeeId,
          questionId: q.id,
          compliance: "NA",
        })),
      });
    }

    await writeActivityLog({
      action: "Create Audit",
      entity: "Audit",
      entityId: audit.id,
      details: `Admin membuat audit "${title}" untuk ${companyName} menggunakan ${auditType.name}${isCobit ? ` (${formatCobitScope(cobitScope)}, ${finalQuestions.length} pertanyaan)` : ""}.`,
    });

    revalidatePath("/dashboard/audits");
    revalidatePath("/dashboard/cobit-audits");
    revalidatePath("/dashboard");

    return {
      toast: {
        type: "success",
        message: "Audit berhasil dibuat.",
      },
    };
  } catch (error) {
    console.error("Error creating audit:", error);
    return {
      toast: {
        type: "error",
        message: "Terjadi kesalahan saat membuat audit.",
      },
    };
  }
}

async function getDesignFactorScopedQuestions<T extends { clause: string }>({
  designFactorAssessmentId,
  companyName,
  questions,
}: {
  designFactorAssessmentId: string;
  companyName: string;
  questions: T[];
}): Promise<{ questions: T[]; objectives: CobitObjective[] }> {
  if (!designFactorAssessmentId) {
    return { questions: [], objectives: [] };
  }

  const assessment = await prisma.designFactorAssessment.findFirst({
    where: {
      id: designFactorAssessmentId,
      companyName,
      status: { in: ["SUBMITTED", "REVIEWED", "APPROVED"] },
    },
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

  if (!assessment) {
    return { questions: [], objectives: [] };
  }

  const level4Objectives = buildDesignFactorSummaryRows(assessment)
    .filter((row) => row.suggestedCapability === 4)
    .map((row) => row.objective);

  if (level4Objectives.length === 0) {
    return { questions: [], objectives: [] };
  }

  return {
    questions: questions.filter((question) => questionMatchesObjective(question.clause, level4Objectives)),
    objectives: level4Objectives,
  };
}

function getDirectCobitScopeObjectives(scope: CobitAuditScope | "") {
  if (scope === "ALL_40") return [...cobitObjectives];
  if (scope === "BUMN_24") return cobitBumn24Objectives;
  return [] satisfies CobitObjective[];
}

function formatCobitScope(scope: CobitAuditScope | "") {
  if (scope === "ALL_40") return "Seluruh Domain";
  if (scope === "BUMN_24") return "24 Domain BUMN";
  if (scope === "DESIGN_FACTOR") return "Design Factor Level 4";
  return "COBIT";
}

export async function updateAuditAction(
  _previousState: AuditFormState,
  formData: FormData,
): Promise<AuditFormState> {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const mode = String(formData.get("mode") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const auditorId = String(formData.get("auditorId") || "").trim();
  const auditeeId = String(formData.get("auditeeId") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!id || !title || !mode || !startDate || !auditeeId) {
    return {
      toast: {
        type: "error",
        message: "Data audit belum lengkap.",
      },
    };
  }

  const audit = await prisma.audit.findUnique({ where: { id } });
  if (!audit) {
    return { toast: { type: "error", message: "Audit tidak ditemukan." } };
  }

  const auditee = await prisma.user.findFirst({
    where: { id: auditeeId, role: UserRole.AUDITEE, isActive: true },
  });
  const auditor = auditorId
    ? await prisma.user.findFirst({
        where: { id: auditorId, role: UserRole.AUDITOR, isActive: true },
      })
    : null;

  if (!auditee || !auditor) {
    return { toast: { type: "error", message: "Auditor dan auditee harus aktif dan sesuai role." } };
  }

  if (auditee.companyName && auditee.companyName !== audit.companyName) {
    return { toast: { type: "error", message: "Auditee harus berasal dari perusahaan audit yang sama." } };
  }

  try {
    await prisma.audit.update({
      where: { id },
      data: {
        title,
        mode: mode as AuditMode,
        startDate: new Date(startDate),
        description: description || null,
      },
    });

    // Find existing assignment for this audit
    const existingAssignment = await prisma.auditAssignment.findFirst({ where: { auditId: id } });

    if (!existingAssignment) {
      // If none exists, create new and increment counts
      await prisma.auditAssignment.create({
        data: { auditId: id, auditorId: auditorId || null, auditeeId },
      });
      await prisma.user.updateMany({
        where: { id: { in: [auditorId || "", auditeeId] } },
        data: { assignedAudits: { increment: 1 } },
      });
    } else {
      // Adjust counts if auditor or auditee changed
      const oldAuditor = existingAssignment.auditorId;
      const oldAuditee = existingAssignment.auditeeId;

      // Decrement old auditor if changed and present
      if (oldAuditor && oldAuditor !== auditorId) {
        await prisma.user.updateMany({
          where: { id: oldAuditor, assignedAudits: { gt: 0 } },
          data: { assignedAudits: { decrement: 1 } },
        });
      }

      // Decrement old auditee if changed
      if (oldAuditee && oldAuditee !== auditeeId) {
        await prisma.user.updateMany({
          where: { id: oldAuditee, assignedAudits: { gt: 0 } },
          data: { assignedAudits: { decrement: 1 } },
        });
        await prisma.auditResponse.updateMany({
          where: {
            auditId: id,
            auditeeId: oldAuditee,
          },
          data: {
            auditeeId,
            submittedAt: null,
          },
        });
      }

      // Update assignment record
      await prisma.auditAssignment.update({
        where: { id: existingAssignment.id },
        data: { auditorId: auditorId || null, auditeeId },
      });

      // Increment new auditor if changed
      if (auditorId && auditorId !== oldAuditor) {
        await prisma.user.update({ where: { id: auditorId }, data: { assignedAudits: { increment: 1 } } });
      }

      // Increment new auditee if changed
      if (auditeeId && auditeeId !== oldAuditee) {
        await prisma.user.update({ where: { id: auditeeId }, data: { assignedAudits: { increment: 1 } } });
      }
    }

    // If audit was still draft, mark as in-progress now that assignments exist
    const updatedAudit = await prisma.audit.findUnique({ where: { id } });
    if (updatedAudit && updatedAudit.status === "DRAFT") {
      await prisma.audit.update({ where: { id }, data: { status: "IN_PROGRESS" } });
    }

    await writeActivityLog({
      action: "Update Audit",
      entity: "Audit",
      entityId: id,
      details: `Admin memperbarui audit "${title}".`,
    });

    revalidatePath("/dashboard/audits");
    revalidatePath("/dashboard/cobit-audits");

    return { toast: { type: "success", message: "Audit berhasil diperbarui." } };
  } catch (error) {
    console.error("Error updating audit:", error);
    return {
      toast: {
        type: "error",
        message: "Terjadi kesalahan saat memperbarui audit.",
      },
    };
  }
}

export async function deleteAuditAction(formData: FormData) {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return;
  }

  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  try {
    const audit = await prisma.audit.findUnique({
      where: { id },
      select: {
        title: true,
        assignments: {
          select: { auditorId: true, auditeeId: true },
        },
      },
    });

    if (audit) {
      await prisma.$transaction(async (tx) => {
        await tx.audit.delete({ where: { id } });
        const assignedUserIds = audit.assignments.flatMap((assignment) =>
          [assignment.auditorId, assignment.auditeeId].filter((userId): userId is string => Boolean(userId)),
        );
        if (assignedUserIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: assignedUserIds }, assignedAudits: { gt: 0 } },
            data: { assignedAudits: { decrement: 1 } },
          });
        }
      });

      await writeActivityLog({
        action: "Delete Audit",
        entity: "Audit",
        entityId: id,
        details: `Admin menghapus audit "${audit.title}".`,
      });
    }

    revalidatePath("/dashboard/audits");
    revalidatePath("/dashboard/cobit-audits");
  } catch (error) {
    console.error("Error deleting audit:", error);
  }
}
