"use server";

import { revalidatePath } from "next/cache";
import { ComplianceStatus, FindingLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";
import { ensureCapaForIsoAudit } from "@/lib/capa";

export type FindingFormState = {
  toast?: {
    type: "success" | "error";
    message: string;
    id?: number;
  };
};

function withToastId(state: FindingFormState): FindingFormState {
  return state.toast ? { toast: { ...state.toast, id: Date.now() } } : state;
}

export async function submitAuditFindingsAction(
  _previousState: FindingFormState,
  formData: FormData,
): Promise<FindingFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return withToastId({ toast: { type: "error", message: "Anda harus login terlebih dahulu." } });
  }

  const auditId = String(formData.get("auditId") || "").trim();
  const findings = formData.getAll("findings[]");
  const intent = String(formData.get("intent") || "submit");
  const isSubmit = intent === "submit";

  if (!auditId) {
    return withToastId({
      toast: {
        type: "error",
        message: "Audit ID wajib diisi.",
      },
    });
  }

  try {
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        auditType: true,
        assignments: {
          where: { auditorId: currentUser.id },
        },
      },
    });

    if (!audit || audit.assignments.length === 0) {
        return withToastId({
          toast: {
            type: "error",
            message: "Audit tidak ditemukan atau Anda bukan auditor untuk audit ini.",
          },
        });
    }
    const isCobit = `${audit.auditType.name} ${audit.auditType.isoStandard}`.toUpperCase().includes("COBIT");

    if (!isSubmit && findings.length === 0) {
      return withToastId({
        toast: {
          type: "success",
          message: "Tidak ada perubahan penilaian baru untuk disimpan.",
        },
      });
    }

    // Parse findings and create/update
    let findingData: Array<{
      responseId: string;
      compliance: ComplianceStatus;
      level: FindingLevel;
      description: string;
    }>;

    try {
      findingData = findings.map((f: any) => {
        const { responseId, level, compliance, description } = JSON.parse(f);
        const parsedCompliance = String(compliance || "");
        return {
          responseId,
          compliance: parsedCompliance as ComplianceStatus,
          level: (isCobit ? (parsedCompliance === "COMPLY" ? "PASS" : "MAJOR") : level) as FindingLevel,
          description: String(description || "").trim(),
        };
      });
    } catch {
      return withToastId({ toast: { type: "error", message: "Format penilaian tidak valid." } });
    }

    const invalid = findingData.some(
      (finding) =>
        !finding.responseId ||
        !["PASS", "OFI", "MINOR", "MAJOR"].includes(finding.level) ||
        (isCobit && !["COMPLY", "NOT_COMPLY"].includes(finding.compliance)),
    );

    if (invalid) {
      return withToastId({
        toast: {
          type: "error",
          message: "Semua penilaian wajib memiliki level yang valid.",
        },
      });
    }

    const submittedResponses = await prisma.auditResponse.count({
      where: {
        auditId,
        submittedAt: { not: null },
      },
    });
    const submittedFindings = await prisma.auditFinding.count({
      where: {
        auditId,
        submittedAt: { not: null },
      },
    });

    if (isSubmit && submittedResponses > 0 && submittedFindings >= submittedResponses) {
      return withToastId({ toast: { type: "error", message: "Penilaian auditor sudah final dan tidak bisa diubah atau disubmit ulang." } });
    }

    if (isSubmit) {
      const submittedResponseRows = await prisma.auditResponse.findMany({
        where: {
          auditId,
          submittedAt: { not: null },
        },
        include: {
          question: {
            select: {
              clause: true,
            },
          },
        },
        orderBy: {
          question: {
            sortOrder: "asc",
          },
        },
      });
      const savedFindings = await prisma.auditFinding.findMany({
        where: { auditId },
      });
      const savedFindingMap = new Map(savedFindings.map((finding) => [finding.responseId, finding]));
      const draftMap = new Map(findingData.map((finding) => [finding.responseId, finding]));

      for (const response of submittedResponseRows) {
        const savedFinding = savedFindingMap.get(response.id);
        if (!savedFinding) {
          return withToastId({
            toast: {
              type: "error",
              message: `Penilaian auditor masih kosong di ${response.question.clause}. Simpan dulu sebelum submit final.`,
            },
          });
        }

        const draft = draftMap.get(response.id);
        const savedDescription = savedFinding.description ?? "";
        if (
          draft &&
          (savedFinding.level !== draft.level ||
            savedDescription !== draft.description ||
            (isCobit && response.compliance !== draft.compliance))
        ) {
          return withToastId({
            toast: {
              type: "error",
              message: "Ada perubahan penilaian yang belum disimpan. Klik Simpan Sementara dulu sebelum Submit Final.",
            },
          });
        }
      }
    }

    // Create findings
    for (const finding of findingData) {
      const response = await prisma.auditResponse.findFirst({
        where: {
          id: finding.responseId,
          auditId,
          submittedAt: { not: null },
        },
      });

      if (!response) {
        return withToastId({ toast: { type: "error", message: "Response audit tidak valid atau belum disubmit auditee." } });
      }

      if (response) {
        if (isCobit) {
          await prisma.auditResponse.update({
            where: { id: response.id },
            data: {
              compliance: finding.compliance,
            },
          });
        }

        const existingFinding = await prisma.auditFinding.findFirst({
          where: {
            auditId: response.auditId,
            responseId: finding.responseId,
          },
        });

        if (existingFinding) {
          await prisma.auditFinding.update({
            where: { id: existingFinding.id },
            data: {
              level: finding.level,
              description: finding.description || null,
              submittedAt: isSubmit && !isCobit ? new Date() : existingFinding.submittedAt,
            },
          });
        } else {
          await prisma.auditFinding.create({
            data: {
              auditId: response.auditId,
              responseId: finding.responseId,
              level: finding.level,
              description: finding.description || null,
              submittedAt: isSubmit && !isCobit ? new Date() : null,
            },
          });
        }
      }
    }

    if (isSubmit && isCobit) {
      const reviewRows = await prisma.auditResponse.findMany({
        where: {
          auditId,
          submittedAt: { not: null },
        },
        include: {
          question: {
            select: {
              clause: true,
            },
          },
        },
        orderBy: {
          question: {
            sortOrder: "asc",
          },
        },
      });
      const reviewFindings = await prisma.auditFinding.findMany({
        where: { auditId },
      });
      const findingMap = new Map(reviewFindings.map((finding) => [finding.responseId, finding]));
      const incompleteReview = reviewRows.find((response) => {
        const finding = findingMap.get(response.id);
        return !finding;
      });

      if (incompleteReview) {
        return withToastId({
          toast: {
            type: "error",
            message: `Penilaian auditor masih kosong di ${incompleteReview.question.clause}. Simpan dan lengkapi dulu sebelum submit final.`,
          },
        });
      }

      await prisma.auditFinding.updateMany({
        where: { auditId },
        data: { submittedAt: new Date() },
      });
    }

    if (isSubmit && !isCobit) {
      await prisma.auditFinding.updateMany({
        where: { auditId },
        data: { submittedAt: new Date() },
      });

      await ensureCapaForIsoAudit(auditId);
    }

    await writeActivityLog({
      action: isSubmit ? "Submit Findings" : "Save Findings",
      entity: "Audit",
      entityId: auditId,
      details: `Auditor ${currentUser.name} ${isSubmit ? "submit" : "menyimpan sementara"} penilaian untuk audit.`,
    });

    revalidatePath(`/dashboard/audits/findings/${auditId}`);
    revalidatePath(`/dashboard/audits/${auditId}/summary`);
    revalidatePath("/dashboard/cobit-audits");
    revalidatePath("/dashboard/audits");
    revalidatePath("/dashboard/capa");
    revalidatePath("/dashboard");

    return withToastId({
      toast: {
        type: "success",
        message: isSubmit
          ? "Penilaian berhasil disubmit."
          : "Penilaian sementara berhasil disimpan.",
      },
    });
  } catch (error) {
    console.error("Error submitting findings:", error);
    return withToastId({
      toast: {
        type: "error",
        message: "Terjadi kesalahan saat menyimpan penilaian.",
      },
    });
  }
}
