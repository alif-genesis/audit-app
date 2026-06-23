"use server";

import { revalidatePath } from "next/cache";
import { ComplianceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";

export type ResponseFormState = {
  toast?: {
    type: "success" | "error";
    message: string;
    id?: number;
  };
};

function withToastId(state: ResponseFormState): ResponseFormState {
  return state.toast ? { toast: { ...state.toast, id: Date.now() } } : state;
}

export async function submitAuditResponseAction(
  _previousState: ResponseFormState,
  formData: FormData,
): Promise<ResponseFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return withToastId({ toast: { type: "error", message: "Anda harus login terlebih dahulu." } });
  }

  const auditId = String(formData.get("auditId") || "").trim();
  const responses = formData.getAll("responses[]");
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
          where: { auditeeId: currentUser.id },
        },
      },
    });

    if (!audit || audit.assignments.length === 0) {
      return withToastId({
        toast: {
          type: "error",
          message: "Audit tidak ditemukan atau Anda bukan auditee untuk audit ini.",
        },
      });
    }
    const isCobit = `${audit.auditType.name} ${audit.auditType.isoStandard}`.toUpperCase().includes("COBIT");
    const alreadySubmitted = await prisma.auditResponse.count({
      where: {
        auditId,
        auditeeId: currentUser.id,
        submittedAt: null,
      },
    });

    if (alreadySubmitted === 0) {
      return withToastId({ toast: { type: "error", message: "Jawaban audit sudah final dan tidak bisa diubah atau disubmit ulang." } });
    }

    if (!isSubmit && responses.length === 0) {
      return withToastId({
        toast: {
          type: "success",
          message: "Tidak ada perubahan baru.",
        },
      });
    }

    let responseUpdates: Array<{
      auditId: string;
      auditeeId: string;
      questionId: string;
      compliance: ComplianceStatus;
      description: string;
    }>;

    try {
      responseUpdates = responses.map((resp: any) => {
        const { questionId, compliance, description } = JSON.parse(resp);
        return {
          auditId,
          auditeeId: currentUser.id,
          questionId,
          compliance: String(compliance || "NA") as ComplianceStatus,
          description: String(description || "").trim(),
        };
      });
    } catch {
      return withToastId({ toast: { type: "error", message: "Format jawaban audit tidak valid." } });
    }

    const incomplete = responseUpdates.some(
      (response) =>
        !response.questionId ||
        (isSubmit && !["COMPLY", "NOT_COMPLY"].includes(response.compliance)),
    );

    if (incomplete) {
      return withToastId({
        toast: {
          type: "error",
          message: "Semua pertanyaan wajib dipilih statusnya.",
        },
      });
    }

    const savedResponsesForDiff = await prisma.auditResponse.findMany({
      where: {
        auditId,
        auditeeId: currentUser.id,
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
    const savedMapForDiff = new Map(savedResponsesForDiff.map((response) => [response.questionId, response]));
    const hasResponseChanges = responseUpdates.some((response) => {
      const saved = savedMapForDiff.get(response.questionId);
      return !saved || saved.compliance !== response.compliance || (saved.description ?? "") !== response.description;
    });

    if (!isSubmit && !hasResponseChanges) {
      return withToastId({
        toast: {
          type: "success",
          message: "Tidak ada perubahan baru.",
        },
      });
    }

    if (isSubmit) {
      const savedResponses = savedResponsesForDiff;
      const missingDescription = !isCobit
        ? savedResponses.find((response) => response.compliance !== "NA" && !response.description?.trim())
        : null;
      if (missingDescription) {
        return withToastId({
          toast: {
            type: "error",
            message: `Belum mengisi deskripsi di ${missingDescription.question.clause}.`,
          },
        });
      }

      const incompleteResponse = savedResponses.find((response) => response.compliance === "NA");
      if (incompleteResponse) {
        return withToastId({
          toast: {
            type: "error",
            message: `Masih ada jawaban kosong di ${incompleteResponse.question.clause}. Simpan dan lengkapi dulu sebelum submit final.`,
          },
        });
      }
    }

    // Save only rows that were changed in this browser session.
    for (const resp of isSubmit ? [] : responseUpdates) {
      await prisma.auditResponse.update({
        where: {
          auditId_auditeeId_questionId: {
            auditId: resp.auditId,
            auditeeId: resp.auditeeId,
            questionId: resp.questionId,
          },
        },
        data: {
          compliance: resp.compliance,
          description: resp.description,
        },
      });
    }

    if (isSubmit) {
      await prisma.auditResponse.updateMany({
        where: {
          auditId,
          auditeeId: currentUser.id,
        },
        data: {
          submittedAt: new Date(),
        },
      });
    }

    await writeActivityLog({
      action: isSubmit ? "Submit Responses" : "Save Responses",
      entity: "Audit",
      entityId: auditId,
      details: `Auditee ${currentUser.name} ${isSubmit ? "submit" : "menyimpan sementara"} jawaban untuk audit.`,
    });

    revalidatePath(`/dashboard/audits/responses/${auditId}`);
    revalidatePath(`/dashboard/audits/${auditId}/summary`);
    revalidatePath("/dashboard/cobit-audits");
    revalidatePath("/dashboard/audits");
    revalidatePath("/dashboard");

    return withToastId({
      toast: {
        type: "success",
        message: isSubmit
          ? "Jawaban Anda berhasil disubmit."
          : "Jawaban sementara berhasil disimpan.",
      },
    });
  } catch (error) {
    console.error("Error submitting responses:", error);
    return withToastId({
      toast: {
        type: "error",
        message: "Terjadi kesalahan saat menyimpan jawaban.",
      },
    });
  }
}
