"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import {
  calculateDf01Results,
  calculateDf02Results,
  calculateDf03Results,
  calculateDf04Results,
  calculateDf05Results,
  calculateDf06Results,
  calculateDf07Results,
  calculateDf08Results,
  calculateDf09Results,
  calculateDf10Results,
  defaultDf01Rows,
  defaultDf02Rows,
  defaultDf03Rows,
  defaultDf04Rows,
  defaultDf05Rows,
  defaultDf06Rows,
  defaultDf07Rows,
  defaultDf08Rows,
  defaultDf09Rows,
  defaultDf10Rows,
  type Df01InputRow,
  type Df02InputRow,
  type Df03InputRow,
  type Df04InputRow,
  type Df05InputRow,
  type Df06InputRow,
  type Df07InputRow,
  type Df08InputRow,
  type Df09InputRow,
  type Df10InputRow,
} from "@/lib/cobit/designFactorMatrix";
import { prisma } from "@/lib/prisma";
import { getActiveAdmin, getCurrentUser } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";
import {
  buildDesignFactorSummaryRows,
  isCobitFramework,
  questionMatchesObjective,
} from "@/lib/cobit/auditScope";

export type DesignFactorFormState = {
  toast?: {
    type: "success" | "error";
    message: string;
  };
  savedKey?: string;
};

function parseNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  return raw ? new Date(raw) : null;
}

function parseFilledFields(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed)
      ? parsed
          .map((item) => String(item))
          .filter((item) => /^[A-Za-z0-9_]+[.][A-Za-z]+$/.test(item))
      : [];
  } catch {
    return [];
  }
}

async function assertAssignedUser(userId: string, role: "AUDITOR" | "AUDITEE") {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  return Boolean(user?.isActive && user.role === role);
}

export async function createDesignFactorAssessmentAction(
  _previousState: DesignFactorFormState,
  formData: FormData,
): Promise<DesignFactorFormState> {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const name = String(formData.get("name") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const auditorId = String(formData.get("auditorId") || "").trim();
  const auditeeId = String(formData.get("auditeeId") || "").trim();
  const targetScore = parseNumber(formData.get("targetScore"));
  const startDate = parseDate(formData.get("startDate"));
  const dueDate = parseDate(formData.get("dueDate"));
  const description = String(formData.get("description") || "").trim();

  if (!name || !companyName || !auditorId || !auditeeId || !startDate) {
    return {
      toast: {
        type: "error",
        message: "Assessment Name, Company, Auditor, Auditee, dan Start Date wajib diisi.",
      },
    };
  }

  if (targetScore !== null && (targetScore < 1 || targetScore > 5)) {
    return { toast: { type: "error", message: "Baseline harus 1-5." } };
  }

  const company = await prisma.company.findUnique({ where: { name: companyName } });
  const auditorValid = await assertAssignedUser(auditorId, "AUDITOR");
  const auditeeValid = await assertAssignedUser(auditeeId, "AUDITEE");

  if (!company || !auditorValid || !auditeeValid) {
    return {
      toast: {
        type: "error",
        message: "Company, auditor, atau auditee tidak valid.",
      },
    };
  }

  try {
    const defaultRows = defaultDf01Rows();
    const defaultDf02 = defaultDf02Rows();
    const defaultDf03 = defaultDf03Rows();
    const defaultDf04 = defaultDf04Rows();
    const defaultDf05 = defaultDf05Rows();
    const defaultDf06 = defaultDf06Rows();
    const defaultDf07 = defaultDf07Rows();
    const defaultDf08 = defaultDf08Rows();
    const defaultDf09 = defaultDf09Rows();
    const defaultDf10 = defaultDf10Rows();
    const defaultResults = calculateDf01Results(defaultRows);

    const assessment = await prisma.designFactorAssessment.create({
      data: {
        name,
        companyName,
        auditorId,
        auditeeId,
        targetScore,
        startDate,
        dueDate,
        description: description || null,
        df01Input: {
          create: rowsToDf01Data(defaultRows),
        },
        df02Input: {
          create: rowsToDf02Data(defaultDf02),
        },
        df03Input: {
          create: rowsToDf03Data(defaultDf03),
        },
        df04Input: {
          create: rowsToDf04Data(defaultDf04),
        },
        df05Input: {
          create: rowsToDf05Data(defaultDf05),
        },
        df06Input: {
          create: rowsToDf06Data(defaultDf06),
        },
        df07Input: {
          create: rowsToDf07Data(defaultDf07),
        },
        df08Input: {
          create: rowsToDf08Data(defaultDf08),
        },
        df09Input: {
          create: rowsToDf09Data(defaultDf09),
        },
        df10Input: {
          create: rowsToDf10Data(defaultDf10),
        },
        objectiveResults: {
          create: defaultResults.map((result) => ({
            objective: result.objective,
            score: result.score,
            baselineScore: result.baselineScore,
            relativeImportance: result.relativeImportance,
          })),
        },
      },
    });

    await prisma.user.updateMany({
      where: { id: { in: [auditorId, auditeeId] } },
      data: { assignedAudits: { increment: 1 } },
    });

    await writeActivityLog({
      action: "Create Design Factor Assessment",
      entity: "DesignFactorAssessment",
      entityId: assessment.id,
      details: `Admin membuat Design Factor "${name}" untuk ${companyName}.`,
    });

    revalidatePath("/dashboard/design-factors");
    revalidatePath("/dashboard");

    return { toast: { type: "success", message: "Assessment Design Factor berhasil dibuat." } };
  } catch (error) {
    console.error("Error creating design factor assessment:", error);
    return { toast: { type: "error", message: "Terjadi kesalahan saat membuat assessment." } };
  }
}

export async function updateDesignFactorAssessmentAction(
  _previousState: DesignFactorFormState,
  formData: FormData,
): Promise<DesignFactorFormState> {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const auditorId = String(formData.get("auditorId") || "").trim();
  const auditeeId = String(formData.get("auditeeId") || "").trim();
  const targetScore = parseNumber(formData.get("targetScore"));
  const startDate = parseDate(formData.get("startDate"));
  const dueDate = parseDate(formData.get("dueDate"));
  const description = String(formData.get("description") || "").trim();

  if (!id || !name || !auditorId || !auditeeId || !startDate) {
    return { toast: { type: "error", message: "Data assessment belum lengkap." } };
  }

  if (targetScore !== null && (targetScore < 1 || targetScore > 5)) {
    return { toast: { type: "error", message: "Baseline harus 1-5." } };
  }

  const assessment = await prisma.designFactorAssessment.findUnique({ where: { id } });
  if (!assessment) {
    return { toast: { type: "error", message: "Assessment tidak ditemukan." } };
  }

  const auditorValid = await assertAssignedUser(auditorId, "AUDITOR");
  const auditeeValid = await assertAssignedUser(auditeeId, "AUDITEE");
  if (!auditorValid || !auditeeValid) {
    return { toast: { type: "error", message: "Auditor atau auditee tidak valid." } };
  }

  try {
    await prisma.designFactorAssessment.update({
      where: { id },
      data: {
        name,
        auditorId,
        auditeeId,
        targetScore,
        startDate,
        dueDate,
        description: description || null,
      },
    });

    const decrementIds = [assessment.auditorId, assessment.auditeeId].filter(
      (userId) => userId !== auditorId && userId !== auditeeId,
    );
    const incrementIds = [auditorId, auditeeId].filter(
      (userId) => userId !== assessment.auditorId && userId !== assessment.auditeeId,
    );

    if (decrementIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: decrementIds }, assignedAudits: { gt: 0 } },
        data: { assignedAudits: { decrement: 1 } },
      });
    }

    if (incrementIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: incrementIds } },
        data: { assignedAudits: { increment: 1 } },
      });
    }

    await writeActivityLog({
      action: "Update Design Factor Assessment",
      entity: "DesignFactorAssessment",
      entityId: id,
      details: `Admin memperbarui Design Factor "${name}".`,
    });

    revalidatePath("/dashboard/design-factors");
    revalidatePath(`/dashboard/design-factors/${id}`);

    return { toast: { type: "success", message: "Assessment berhasil diperbarui." } };
  } catch (error) {
    console.error("Error updating design factor assessment:", error);
    return { toast: { type: "error", message: "Terjadi kesalahan saat memperbarui assessment." } };
  }
}

export async function deleteDesignFactorAssessmentAction(formData: FormData) {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return;
  }

  const id = String(formData.get("id") || "").trim();
  if (!id) {
    return;
  }

  try {
    const assessment = await prisma.designFactorAssessment.findUnique({
      where: { id },
      select: { name: true, auditorId: true, auditeeId: true },
    });

    if (!assessment) {
      return;
    }

    await prisma.designFactorAssessment.delete({ where: { id } });
    await prisma.user.updateMany({
      where: { id: { in: [assessment.auditorId, assessment.auditeeId] }, assignedAudits: { gt: 0 } },
      data: { assignedAudits: { decrement: 1 } },
    });

    await writeActivityLog({
      action: "Delete Design Factor Assessment",
      entity: "DesignFactorAssessment",
      entityId: id,
      details: `Admin menghapus Design Factor "${assessment.name}".`,
    });

    revalidatePath("/dashboard/design-factors");
  } catch (error) {
    console.error("Error deleting design factor assessment:", error);
  }
}

export async function saveDf01AssessmentAction(
  _previousState: DesignFactorFormState,
  formData: FormData,
): Promise<DesignFactorFormState> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return { toast: { type: "error", message: "Anda harus login terlebih dahulu." } };
  }

  const assessmentId = String(formData.get("assessmentId") || "").trim();
  const rowsRaw = String(formData.get("df01Rows") || "[]");
  const filledFields = parseFilledFields(formData.get("filledFields"));
  const intent = String(formData.get("intent") || "save");

  if (!assessmentId) {
    return { toast: { type: "error", message: "Assessment tidak valid." } };
  }

  const assessment = await prisma.designFactorAssessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      auditeeId: true,
      auditorId: true,
      name: true,
      df01AuditeeSubmittedAt: true,
      df01AuditorSubmittedAt: true,
      df02AuditeeSubmittedAt: true,
      df02AuditorSubmittedAt: true,
      df03AuditeeSubmittedAt: true,
      df03AuditorSubmittedAt: true,
      df04AuditeeSubmittedAt: true,
      df04AuditorSubmittedAt: true,
      df05AuditeeSubmittedAt: true,
      df05AuditorSubmittedAt: true,
      df06AuditeeSubmittedAt: true,
      df06AuditorSubmittedAt: true,
      df07AuditeeSubmittedAt: true,
      df07AuditorSubmittedAt: true,
      df08AuditeeSubmittedAt: true,
      df08AuditorSubmittedAt: true,
      df09AuditeeSubmittedAt: true,
      df09AuditorSubmittedAt: true,
      df10AuditeeSubmittedAt: true,
      df10AuditorSubmittedAt: true,
      savedState: true,
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
    return { toast: { type: "error", message: "Assessment tidak ditemukan." } };
  }

  const designFactor = String(formData.get("designFactor") || "DF01");
  const actorSide =
    assessment.auditeeId === currentUser.id
      ? "AUDITEE"
      : assessment.auditorId === currentUser.id
        ? "AUDITOR"
        : currentUser.role === "ADMIN"
          ? "ADMIN"
          : null;

  if (!actorSide) {
    return { toast: { type: "error", message: "Anda tidak memiliki akses ke assessment ini." } };
  }

  if (
    designFactor !== "DF01" &&
    designFactor !== "DF02" &&
    designFactor !== "DF03" &&
    designFactor !== "DF04" &&
    designFactor !== "DF05" &&
    designFactor !== "DF06" &&
    designFactor !== "DF07" &&
    designFactor !== "DF08" &&
    designFactor !== "DF09" &&
    designFactor !== "DF10"
  ) {
    return { toast: { type: "error", message: "Design Factor belum tersedia." } };
  }

  const isSubmitAll = intent === "submitAll";
  const isSubmit = intent === "submit" || isSubmitAll;
  if (isSubmit && actorSide === "ADMIN") {
    return { toast: { type: "error", message: "Submit hanya bisa dilakukan oleh auditee atau auditor yang ditugaskan." } };
  }

  if (isSubmitAll && DESIGN_FACTORS.every((factor) => isAlreadySubmitted(assessment, factor, actorSide))) {
    return { toast: { type: "error", message: `${actorSide === "AUDITEE" ? "Auditee" : "Auditor"} sudah submit final Design Factor.` } };
  }

  if (!isSubmitAll && actorSide !== "ADMIN" && isAlreadySubmitted(assessment, designFactor, actorSide)) {
    return { toast: { type: "error", message: `${actorSide === "AUDITEE" ? "Auditee" : "Auditor"} sudah submit ${designFactor}, data tidak bisa diubah.` } };
  }

  let rows: unknown[];
  try {
    const parsedRows = JSON.parse(rowsRaw);
    rows = Array.isArray(parsedRows) ? parsedRows : [];
  } catch {
    return { toast: { type: "error", message: `Format input ${designFactor} tidak valid.` } };
  }

  const normalizedRows =
    designFactor === "DF10"
      ? normalizeDf10Rows(rows as Df10InputRow[], assessment.df10Input, actorSide)
      : designFactor === "DF09"
      ? normalizeDf09Rows(rows as Df09InputRow[], assessment.df09Input, actorSide)
      : designFactor === "DF08"
      ? normalizeDf08Rows(rows as Df08InputRow[], assessment.df08Input, actorSide)
      : designFactor === "DF07"
      ? normalizeDf07Rows(rows as Df07InputRow[], assessment.df07Input, actorSide)
      : designFactor === "DF06"
      ? normalizeDf06Rows(rows as Df06InputRow[], assessment.df06Input, actorSide)
      : designFactor === "DF05"
      ? normalizeDf05Rows(rows as Df05InputRow[], assessment.df05Input, actorSide)
      : designFactor === "DF03"
      ? normalizeDf03Rows(rows as Df03InputRow[], assessment.df03Input, actorSide)
      : designFactor === "DF04"
      ? normalizeDf04Rows(rows as Df04InputRow[], assessment.df04Input, actorSide)
      : designFactor === "DF02"
      ? normalizeDf02Rows(rows as Df02InputRow[], assessment.df02Input, actorSide)
      : normalizeDf01Rows(rows as Df01InputRow[], assessment.df01Input, actorSide);

  if (isSubmitAll) {
    const rowsByFactor = getSubmissionRowsByFactor(assessment, designFactor, normalizedRows, actorSide);
    const unsavedFactor = DESIGN_FACTORS.find((factor) => !isSavedForSubmission(assessment, factor, actorSide));
    if (unsavedFactor) {
      return {
        toast: {
          type: "error",
          message: `${actorSide === "AUDITEE" ? "Auditee" : "Auditor"} wajib menyimpan ${unsavedFactor} sebelum submit final.`,
        },
      };
    }

    const unfilledFactor = DESIGN_FACTORS.find((factor) =>
      !hasSavedRequiredFields(assessment, factor, rowsByFactor[factor], actorSide),
    );
    if (unfilledFactor) {
      return {
        toast: {
          type: "error",
          message: `${actorSide === "AUDITEE" ? "Auditee" : "Auditor"} wajib mengisi dan menyimpan semua field ${unfilledFactor} sebelum submit final.`,
        },
      };
    }

    const incompleteFactor = DESIGN_FACTORS.find((factor) =>
      Boolean(validateSubmissionRows(factor, rowsByFactor[factor], actorSide)),
    );
    if (incompleteFactor) {
      return {
        toast: {
          type: "error",
          message: `${actorSide === "AUDITEE" ? "Auditee" : "Auditor"} wajib melengkapi dan menyimpan semua isian sebelum submit final. Masih kosong di ${incompleteFactor}.`,
        },
      };
    }
  } else if (isSubmit) {
    const validationMessage = validateSubmissionRows(designFactor, normalizedRows, actorSide);
    if (validationMessage) {
      return { toast: { type: "error", message: validationMessage } };
    }
  }

  const results =
    designFactor === "DF10"
      ? calculateDf10Results(normalizedRows as Df10InputRow[])
      : designFactor === "DF09"
      ? calculateDf09Results(normalizedRows as Df09InputRow[])
      : designFactor === "DF08"
      ? calculateDf08Results(normalizedRows as Df08InputRow[])
      : designFactor === "DF07"
      ? calculateDf07Results(normalizedRows as Df07InputRow[])
      : designFactor === "DF06"
      ? calculateDf06Results(normalizedRows as Df06InputRow[])
      : designFactor === "DF05"
      ? calculateDf05Results(normalizedRows as Df05InputRow[])
      : designFactor === "DF03"
      ? calculateDf03Results(normalizedRows as Df03InputRow[])
      : designFactor === "DF04"
      ? calculateDf04Results(normalizedRows as Df04InputRow[])
      : designFactor === "DF02"
      ? calculateDf02Results(normalizedRows as Df02InputRow[])
      : calculateDf01Results(normalizedRows as Df01InputRow[]);

  try {
    await prisma.$transaction(async (tx) => {
      if (designFactor === "DF10") {
        await tx.designFactorDf10Input.upsert({
          where: { assessmentId },
          update: rowsToDf10Data(normalizedRows as Df10InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf10Data(normalizedRows as Df10InputRow[]),
          },
        });
      } else if (designFactor === "DF09") {
        await tx.designFactorDf09Input.upsert({
          where: { assessmentId },
          update: rowsToDf09Data(normalizedRows as Df09InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf09Data(normalizedRows as Df09InputRow[]),
          },
        });
      } else if (designFactor === "DF08") {
        await tx.designFactorDf08Input.upsert({
          where: { assessmentId },
          update: rowsToDf08Data(normalizedRows as Df08InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf08Data(normalizedRows as Df08InputRow[]),
          },
        });
      } else if (designFactor === "DF07") {
        await tx.designFactorDf07Input.upsert({
          where: { assessmentId },
          update: rowsToDf07Data(normalizedRows as Df07InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf07Data(normalizedRows as Df07InputRow[]),
          },
        });
      } else if (designFactor === "DF06") {
        await tx.designFactorDf06Input.upsert({
          where: { assessmentId },
          update: rowsToDf06Data(normalizedRows as Df06InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf06Data(normalizedRows as Df06InputRow[]),
          },
        });
      } else if (designFactor === "DF05") {
        await tx.designFactorDf05Input.upsert({
          where: { assessmentId },
          update: rowsToDf05Data(normalizedRows as Df05InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf05Data(normalizedRows as Df05InputRow[]),
          },
        });
      } else if (designFactor === "DF03") {
        await tx.designFactorDf03Input.upsert({
          where: { assessmentId },
          update: rowsToDf03Data(normalizedRows as Df03InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf03Data(normalizedRows as Df03InputRow[]),
          },
        });
      } else if (designFactor === "DF04") {
        await tx.designFactorDf04Input.upsert({
          where: { assessmentId },
          update: rowsToDf04Data(normalizedRows as Df04InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf04Data(normalizedRows as Df04InputRow[]),
          },
        });
      } else if (designFactor === "DF02") {
        await tx.designFactorDf02Input.upsert({
          where: { assessmentId },
          update: rowsToDf02Data(normalizedRows as Df02InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf02Data(normalizedRows as Df02InputRow[]),
          },
        });
      } else {
        await tx.designFactorDf01Input.upsert({
          where: { assessmentId },
          update: rowsToDf01Data(normalizedRows as Df01InputRow[]),
          create: {
            assessmentId,
            ...rowsToDf01Data(normalizedRows as Df01InputRow[]),
          },
        });
      }

      for (const result of results) {
        await tx.designFactorObjectiveResult.upsert({
          where: {
            assessmentId_objective: {
              assessmentId,
              objective: result.objective,
            },
          },
          update: {
            score: result.score,
            baselineScore: result.baselineScore,
            relativeImportance: result.relativeImportance,
          },
          create: {
            assessmentId,
            objective: result.objective,
            score: result.score,
            baselineScore: result.baselineScore,
            relativeImportance: result.relativeImportance,
          },
        });
      }

      await tx.designFactorAssessment.update({
        where: { id: assessmentId },
        data: {
          ...(isSubmitAll
            ? buildAllSubmissionUpdate(assessment, actorSide)
            : buildSubmissionUpdate(assessment, designFactor, actorSide, isSubmit)),
          ...buildSavedStateUpdate(assessment.savedState, designFactor, actorSide, isSubmitAll, filledFields),
        },
      });
    });

    if (isSubmit && actorSide !== "ADMIN") {
      await ensureCobitAuditFromSubmittedDesignFactor(assessmentId);
    }

    await writeActivityLog({
      action: isSubmitAll ? "Submit Final Design Factor" : isSubmit ? `Submit Design Factor ${designFactor}` : `Save Design Factor ${designFactor}`,
      entity: "DesignFactorAssessment",
      entityId: assessmentId,
      details: `${currentUser.name} ${isSubmitAll ? "submit final" : isSubmit ? "submit" : "menyimpan"} ${designFactor} untuk "${assessment.name}".`,
    });

    revalidatePath(`/dashboard/design-factors/${assessmentId}`);
    revalidatePath("/dashboard/design-factors");
    revalidatePath("/dashboard/cobit-audits");
    revalidatePath("/dashboard");

    return {
      toast: {
        type: "success",
        message: isSubmitAll ? "Design Factor berhasil disubmit final." : isSubmit ? `${designFactor} berhasil disubmit.` : `${designFactor} berhasil disimpan.`,
      },
      savedKey: actorSide === "AUDITEE" || actorSide === "AUDITOR" ? buildSavedStateKey(designFactor, actorSide) : undefined,
    };
  } catch (error) {
    console.error(`Error saving ${designFactor} assessment:`, error);
    return { toast: { type: "error", message: `Terjadi kesalahan saat menyimpan ${designFactor}.` } };
  }
}

export async function ensureCobitAuditFromSubmittedDesignFactor(assessmentId: string) {
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

  if (!assessment || assessment.status !== "SUBMITTED") {
    return;
  }

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
    select: { id: true },
  });

  if (existingAudit) {
    return;
  }

  const auditType = await prisma.auditType.findFirst({
    where: {
      OR: [
        { name: { contains: "COBIT", mode: "insensitive" } },
        { isoStandard: { contains: "COBIT", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!auditType || !isCobitFramework(auditType)) {
    return;
  }

  const level4Objectives = buildDesignFactorSummaryRows(assessment)
    .filter((row) => row.suggestedCapability === 4)
    .map((row) => row.objective);

  if (level4Objectives.length === 0) {
    return;
  }

  const questions = await prisma.auditQuestion.findMany({
    where: { auditTypeId: auditType.id },
    orderBy: { sortOrder: "asc" },
  });
  const scopedQuestions = questions.filter((question) => questionMatchesObjective(question.clause, level4Objectives));

  if (scopedQuestions.length === 0) {
    return;
  }

  const audit = await prisma.audit.create({
    data: {
      title: `${assessment.name} - Audit COBIT`,
      companyName: assessment.companyName,
      auditTypeId: auditType.id,
      mode: "AUDIT",
      startDate: new Date(),
      status: "IN_PROGRESS",
      description: [
        "Scope Audit COBIT: Design Factor Level 4",
        `Baseline COBIT: ${assessment.targetScore ?? 3}`,
        `Scope Objectives: ${level4Objectives.join(", ")}`,
        `Design Factor Assessment ID: ${assessment.id}`,
      ].join("\n"),
      assignments: {
        create: {
          auditorId: assessment.auditorId,
          auditeeId: assessment.auditeeId,
        },
      },
      responses: {
        createMany: {
          data: scopedQuestions.map((question) => ({
            auditeeId: assessment.auditeeId,
            questionId: question.id,
            compliance: "NA",
          })),
        },
      },
    },
  });

  await prisma.user.updateMany({
    where: { id: { in: [assessment.auditorId, assessment.auditeeId] } },
    data: { assignedAudits: { increment: 1 } },
  });

  await writeActivityLog({
    action: "Create Audit",
    entity: "Audit",
    entityId: audit.id,
    details: `Audit COBIT otomatis dibuat dari Design Factor "${assessment.name}" (${scopedQuestions.length} pertanyaan).`,
  });
}

type SubmissionSide = "AUDITEE" | "AUDITOR" | "ADMIN";

type SubmissionState = {
  df01AuditeeSubmittedAt: Date | null;
  df01AuditorSubmittedAt: Date | null;
  df02AuditeeSubmittedAt: Date | null;
  df02AuditorSubmittedAt: Date | null;
  df03AuditeeSubmittedAt: Date | null;
  df03AuditorSubmittedAt: Date | null;
  df04AuditeeSubmittedAt: Date | null;
  df04AuditorSubmittedAt: Date | null;
  df05AuditeeSubmittedAt: Date | null;
  df05AuditorSubmittedAt: Date | null;
  df06AuditeeSubmittedAt: Date | null;
  df06AuditorSubmittedAt: Date | null;
  df07AuditeeSubmittedAt: Date | null;
  df07AuditorSubmittedAt: Date | null;
  df08AuditeeSubmittedAt: Date | null;
  df08AuditorSubmittedAt: Date | null;
  df09AuditeeSubmittedAt: Date | null;
  df09AuditorSubmittedAt: Date | null;
  df10AuditeeSubmittedAt: Date | null;
  df10AuditorSubmittedAt: Date | null;
};

function normalizeDf01Rows(
  rows: Df01InputRow[],
  existingInput: ReturnType<typeof rowsToDf01Data> | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf01InputData(existingInput) : defaultDf01Rows();

  return defaultDf01Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizeScale(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizeScale(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf02Rows(
  rows: Df02InputRow[],
  existingInput: { rows: unknown } | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf02InputData(existingInput) : defaultDf02Rows();

  return defaultDf02Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizeScale(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizeScale(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf03Rows(
  rows: Df03InputRow[],
  existingInput: { rows: unknown } | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf03InputData(existingInput) : defaultDf03Rows();

  return defaultDf03Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      impact:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizeRiskScale(incoming?.impact, previous.impact)
          : previous.impact,
      likelihood:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizeRiskScale(incoming?.likelihood, previous.likelihood)
          : previous.likelihood,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizeRiskScore(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf04Rows(
  rows: Df04InputRow[],
  existingInput: { rows: unknown } | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf04InputData(existingInput) : defaultDf04Rows();

  return defaultDf04Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizeThreePointScale(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizeThreePointScale(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf05Rows(
  rows: Df05InputRow[],
  existingInput: ReturnType<typeof rowsToDf05Data> | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf05InputData(existingInput) : defaultDf05Rows();

  return defaultDf05Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf06Rows(
  rows: Df06InputRow[],
  existingInput: ReturnType<typeof rowsToDf06Data> | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf06InputData(existingInput) : defaultDf06Rows();

  return defaultDf06Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf07Rows(
  rows: Df07InputRow[],
  existingInput: ReturnType<typeof rowsToDf07Data> | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf07InputData(existingInput) : defaultDf07Rows();

  return defaultDf07Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizeScale(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizeScale(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf08Rows(
  rows: Df08InputRow[],
  existingInput: ReturnType<typeof rowsToDf08Data> | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf08InputData(existingInput) : defaultDf08Rows();

  return defaultDf08Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf09Rows(
  rows: Df09InputRow[],
  existingInput: ReturnType<typeof rowsToDf09Data> | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf09InputData(existingInput) : defaultDf09Rows();

  return defaultDf09Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeDf10Rows(
  rows: Df10InputRow[],
  existingInput: ReturnType<typeof rowsToDf10Data> | null,
  actorSide: SubmissionSide,
) {
  const existing = existingInput ? mapDf10InputData(existingInput) : defaultDf10Rows();

  return defaultDf10Rows().map((defaultRow) => {
    const incoming = rows.find((row) => row.key === defaultRow.key);
    const previous = existing.find((row) => row.key === defaultRow.key) ?? defaultRow;
    return {
      ...defaultRow,
      importance:
        actorSide === "AUDITEE" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.importance, previous.importance)
          : previous.importance,
      baseline:
        actorSide === "AUDITOR" || actorSide === "ADMIN"
          ? normalizePercentage(incoming?.baseline, previous.baseline)
          : previous.baseline,
    };
  });
}

function normalizeScale(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(5, Math.max(0, parsed));
}

function normalizePercentage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, parsed));
}

function normalizeRiskScale(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(5, Math.max(0, parsed));
}

function normalizeRiskScore(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(25, Math.max(0, parsed));
}

function normalizeThreePointScale(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(3, Math.max(0, parsed));
}

function isAlreadySubmitted(assessment: SubmissionState, designFactor: string, actorSide: SubmissionSide) {
  if (actorSide === "ADMIN") {
    return false;
  }

  const key = `${designFactor.toLowerCase()}${actorSide === "AUDITEE" ? "Auditee" : "Auditor"}SubmittedAt`;
  return Boolean(assessment[key as keyof SubmissionState]);
}

function isSavedForSubmission(
  assessment: SubmissionState & { savedState?: unknown },
  designFactor: string,
  actorSide: SubmissionSide,
) {
  if (actorSide === "ADMIN") {
    return true;
  }

  if (isAlreadySubmitted(assessment, designFactor, actorSide)) {
    return true;
  }

  const savedState = readSavedState(assessment.savedState);
  return Boolean(savedState[buildSavedStateKey(designFactor, actorSide)]);
}

function hasSavedRequiredFields(
  assessment: SubmissionState & { savedState?: unknown },
  designFactor: string,
  rows: unknown,
  actorSide: SubmissionSide,
) {
  if (actorSide === "ADMIN" || isAlreadySubmitted(assessment, designFactor, actorSide)) {
    return true;
  }

  const savedState = readSavedState(assessment.savedState);
  const savedFields = savedState[buildFilledFieldsKey(designFactor, actorSide)];
  if (!Array.isArray(savedFields)) {
    return true;
  }

  const rowList = Array.isArray(rows) ? rows : [];
  const requiredFields =
    actorSide === "AUDITEE"
      ? designFactor === "DF03"
        ? ["impact", "likelihood"]
        : ["importance"]
      : ["baseline"];
  const saved = new Set(savedFields);

  return rowList.every((row) => {
    if (!row || typeof row !== "object") {
      return false;
    }

    const rowKey = String((row as Record<string, unknown>).key ?? "");
    if (!rowKey) {
      return false;
    }

    const savedEveryField = requiredFields.every((field) => saved.has(`${rowKey}.${field}`));
    if (savedEveryField) {
      return true;
    }

    return hasValidSubmissionValues(designFactor, [row], actorSide);
  });
}

function buildSubmissionUpdate(
  assessment: SubmissionState,
  designFactor: string,
  actorSide: SubmissionSide,
  isSubmit: boolean,
) {
  if (!isSubmit || actorSide === "ADMIN") {
    return {};
  }

  const now = new Date();
  const update =
    designFactor === "DF10"
      ? {
          df10AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df10AuditeeSubmittedAt,
          df10AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df10AuditorSubmittedAt,
        }
      : designFactor === "DF09"
      ? {
          df09AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df09AuditeeSubmittedAt,
          df09AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df09AuditorSubmittedAt,
        }
      : designFactor === "DF08"
      ? {
          df08AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df08AuditeeSubmittedAt,
          df08AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df08AuditorSubmittedAt,
        }
      : designFactor === "DF07"
      ? {
          df07AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df07AuditeeSubmittedAt,
          df07AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df07AuditorSubmittedAt,
        }
      : designFactor === "DF06"
      ? {
          df06AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df06AuditeeSubmittedAt,
          df06AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df06AuditorSubmittedAt,
        }
      : designFactor === "DF05"
      ? {
          df05AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df05AuditeeSubmittedAt,
          df05AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df05AuditorSubmittedAt,
        }
      : designFactor === "DF03"
      ? {
          df03AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df03AuditeeSubmittedAt,
          df03AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df03AuditorSubmittedAt,
        }
      : designFactor === "DF02"
      ? {
          df02AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df02AuditeeSubmittedAt,
          df02AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df02AuditorSubmittedAt,
        }
      : designFactor === "DF04"
      ? {
          df04AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df04AuditeeSubmittedAt,
          df04AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df04AuditorSubmittedAt,
        }
      : {
          df01AuditeeSubmittedAt: actorSide === "AUDITEE" ? now : assessment.df01AuditeeSubmittedAt,
          df01AuditorSubmittedAt: actorSide === "AUDITOR" ? now : assessment.df01AuditorSubmittedAt,
        };
  const merged = { ...assessment, ...update };
  const isComplete = DESIGN_FACTORS.every((factor) =>
    Boolean(
      merged[`${factor.toLowerCase()}AuditeeSubmittedAt` as keyof SubmissionState] &&
        merged[`${factor.toLowerCase()}AuditorSubmittedAt` as keyof SubmissionState],
    ),
  );

  return {
    ...update,
    status: isComplete ? ("SUBMITTED" as const) : ("IN_PROGRESS" as const),
    submittedAt: isComplete ? now : undefined,
  };
}

const DESIGN_FACTORS = ["DF01", "DF02", "DF03", "DF04", "DF05", "DF06", "DF07", "DF08", "DF09", "DF10"] as const;

function readSavedState(savedState: unknown) {
  if (!savedState || typeof savedState !== "object" || Array.isArray(savedState)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(savedState as Record<string, unknown>).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(String) : Boolean(value),
    ]),
  ) as Record<string, boolean | string[]>;
}

function buildSavedStateKey(designFactor: string, actorSide: SubmissionSide) {
  return `${designFactor.toLowerCase()}${actorSide === "AUDITEE" ? "Auditee" : "Auditor"}Saved`;
}

function buildFilledFieldsKey(designFactor: string, actorSide: SubmissionSide) {
  return `${designFactor.toLowerCase()}${actorSide === "AUDITEE" ? "Auditee" : "Auditor"}FilledFields`;
}

function buildSavedStateUpdate(
  savedState: unknown,
  designFactor: string,
  actorSide: SubmissionSide,
  isSubmitAll: boolean,
  filledFields: string[],
) {
  if (actorSide === "ADMIN") {
    return {};
  }

  const nextState = readSavedState(savedState);
  const filledFieldsKey = buildFilledFieldsKey(designFactor, actorSide);
  const existingFields = Array.isArray(nextState[filledFieldsKey]) ? nextState[filledFieldsKey] : [];
  nextState[filledFieldsKey] = Array.from(new Set([...existingFields, ...filledFields]));

  if (isSubmitAll) {
    for (const factor of DESIGN_FACTORS) {
      nextState[buildSavedStateKey(factor, actorSide)] = true;
    }
  } else {
    nextState[buildSavedStateKey(designFactor, actorSide)] = true;
  }

  return { savedState: nextState as Prisma.InputJsonObject };
}

function buildAllSubmissionUpdate(assessment: SubmissionState, actorSide: SubmissionSide) {
  if (actorSide === "ADMIN") {
    return {};
  }

  const now = new Date();
  const suffix = actorSide === "AUDITEE" ? "AuditeeSubmittedAt" : "AuditorSubmittedAt";
  const update = Object.fromEntries(
    DESIGN_FACTORS.map((factor) => [`${factor.toLowerCase()}${suffix}`, now]),
  ) as Partial<SubmissionState>;
  const merged = { ...assessment, ...update };
  const isComplete = DESIGN_FACTORS.every((factor) =>
    Boolean(
      merged[`${factor.toLowerCase()}AuditeeSubmittedAt` as keyof SubmissionState] &&
        merged[`${factor.toLowerCase()}AuditorSubmittedAt` as keyof SubmissionState],
    ),
  );

  return {
    ...update,
    status: isComplete ? ("SUBMITTED" as const) : ("IN_PROGRESS" as const),
    submittedAt: isComplete ? now : undefined,
  };
}

function getSubmissionRowsByFactor(
  assessment: {
    df01Input: unknown;
    df02Input: { rows: unknown } | null;
    df03Input: { rows: unknown } | null;
    df04Input: { rows: unknown } | null;
    df05Input: unknown;
    df06Input: unknown;
    df07Input: unknown;
    df08Input: unknown;
    df09Input: unknown;
    df10Input: unknown;
  },
  activeFactor: string,
  activeRows: unknown[],
  actorSide: SubmissionSide,
) {
  return {
    DF01: activeFactor === "DF01" ? activeRows : normalizeDf01Rows([], assessment.df01Input as ReturnType<typeof rowsToDf01Data> | null, actorSide),
    DF02: activeFactor === "DF02" ? activeRows : normalizeDf02Rows([], assessment.df02Input, actorSide),
    DF03: activeFactor === "DF03" ? activeRows : normalizeDf03Rows([], assessment.df03Input, actorSide),
    DF04: activeFactor === "DF04" ? activeRows : normalizeDf04Rows([], assessment.df04Input, actorSide),
    DF05: activeFactor === "DF05" ? activeRows : normalizeDf05Rows([], assessment.df05Input as ReturnType<typeof rowsToDf05Data> | null, actorSide),
    DF06: activeFactor === "DF06" ? activeRows : normalizeDf06Rows([], assessment.df06Input as ReturnType<typeof rowsToDf06Data> | null, actorSide),
    DF07: activeFactor === "DF07" ? activeRows : normalizeDf07Rows([], assessment.df07Input as ReturnType<typeof rowsToDf07Data> | null, actorSide),
    DF08: activeFactor === "DF08" ? activeRows : normalizeDf08Rows([], assessment.df08Input as ReturnType<typeof rowsToDf08Data> | null, actorSide),
    DF09: activeFactor === "DF09" ? activeRows : normalizeDf09Rows([], assessment.df09Input as ReturnType<typeof rowsToDf09Data> | null, actorSide),
    DF10: activeFactor === "DF10" ? activeRows : normalizeDf10Rows([], assessment.df10Input as ReturnType<typeof rowsToDf10Data> | null, actorSide),
  } as Record<(typeof DESIGN_FACTORS)[number], unknown[]>;
}

function validateSubmissionRows(designFactor: string, rows: unknown, actorSide: SubmissionSide) {
  if (actorSide === "ADMIN") {
    return "Submit hanya bisa dilakukan oleh auditee atau auditor yang ditugaskan.";
  }

  const rowList = Array.isArray(rows) ? rows : [];
  if (rowList.length === 0) {
    return `${designFactor} belum memiliki data untuk disubmit.`;
  }

  const requiredFields =
    actorSide === "AUDITEE"
      ? designFactor === "DF03"
        ? ["impact", "likelihood"]
        : ["importance"]
      : ["baseline"];
  const zeroIsValid = isPercentageDesignFactor(designFactor);

  const incompleteRow = rowList.find((row) => !hasValidSubmissionValues(designFactor, [row], actorSide));

  if (incompleteRow) {
    return `${actorSide === "AUDITEE" ? "Auditee" : "Auditor"} wajib melengkapi semua isian ${designFactor} sebelum submit.`;
  }

  return null;
}

function hasValidSubmissionValues(designFactor: string, rows: unknown[], actorSide: SubmissionSide) {
  const requiredFields =
    actorSide === "AUDITEE"
      ? designFactor === "DF03"
        ? ["impact", "likelihood"]
        : ["importance"]
      : ["baseline"];
  const zeroIsValid = isPercentageDesignFactor(designFactor);

  return rows.every((row) => {
    if (!row || typeof row !== "object") {
      return false;
    }

    return requiredFields.every((field) => {
      const value = Number((row as Record<string, unknown>)[field]);
      return Number.isFinite(value) && (zeroIsValid ? value >= 0 : value > 0);
    });
  });
}

function isPercentageDesignFactor(designFactor: string) {
  return designFactor === "DF05" || designFactor === "DF06" || designFactor === "DF08" || designFactor === "DF09" || designFactor === "DF10";
}

function rowsToDf01Data(rows: Df01InputRow[]) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    growthImportance: byKey.get("growth")?.importance ?? 0,
    growthBaseline: byKey.get("growth")?.baseline ?? 3,
    innovationImportance: byKey.get("innovation")?.importance ?? 0,
    innovationBaseline: byKey.get("innovation")?.baseline ?? 3,
    costImportance: byKey.get("cost")?.importance ?? 0,
    costBaseline: byKey.get("cost")?.baseline ?? 3,
    serviceImportance: byKey.get("service")?.importance ?? 0,
    serviceBaseline: byKey.get("service")?.baseline ?? 3,
  };
}

function rowsToDf02Data(rows: Df02InputRow[]) {
  return {
    rows: rows.map((row) => ({
      key: row.key,
      label: row.label,
      importance: normalizeScale(row.importance, 0),
      baseline: normalizeScale(row.baseline, 3),
    })),
  };
}

function rowsToDf03Data(rows: Df03InputRow[]) {
  return {
    rows: rows.map((row) => ({
      key: row.key,
      label: row.label,
      impact: normalizeRiskScale(row.impact, 0),
      likelihood: normalizeRiskScale(row.likelihood, 0),
      baseline: normalizeRiskScore(row.baseline, 3),
    })),
  };
}

function rowsToDf04Data(rows: Df04InputRow[]) {
  return {
    rows: rows.map((row) => ({
      key: row.key,
      label: row.label,
      importance: normalizeThreePointScale(row.importance, 0),
      baseline: normalizeThreePointScale(row.baseline, 3),
    })),
  };
}

function rowsToDf05Data(rows: Df05InputRow[]) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    highImportance: byKey.get("High")?.importance ?? 0,
    highBaseline: byKey.get("High")?.baseline ?? 30,
    normalImportance: byKey.get("Normal")?.importance ?? 0,
    normalBaseline: byKey.get("Normal")?.baseline ?? 30,
  };
}

function rowsToDf06Data(rows: Df06InputRow[]) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    highImportance: byKey.get("High")?.importance ?? 0,
    highBaseline: byKey.get("High")?.baseline ?? 30,
    normalImportance: byKey.get("Normal")?.importance ?? 0,
    normalBaseline: byKey.get("Normal")?.baseline ?? 30,
    lowImportance: byKey.get("Low")?.importance ?? 0,
    lowBaseline: byKey.get("Low")?.baseline ?? 30,
  };
}

function rowsToDf07Data(rows: Df07InputRow[]) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    supportImportance: byKey.get("Support")?.importance ?? 0,
    supportBaseline: byKey.get("Support")?.baseline ?? 3,
    factoryImportance: byKey.get("Factory")?.importance ?? 0,
    factoryBaseline: byKey.get("Factory")?.baseline ?? 3,
    turnaroundImportance: byKey.get("Turnaround")?.importance ?? 0,
    turnaroundBaseline: byKey.get("Turnaround")?.baseline ?? 3,
    strategicImportance: byKey.get("Strategic")?.importance ?? 0,
    strategicBaseline: byKey.get("Strategic")?.baseline ?? 3,
  };
}

function rowsToDf08Data(rows: Df08InputRow[]) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    outsourcingImportance: byKey.get("Outsourcing")?.importance ?? 0,
    outsourcingBaseline: byKey.get("Outsourcing")?.baseline ?? 30,
    cloudImportance: byKey.get("Cloud")?.importance ?? 0,
    cloudBaseline: byKey.get("Cloud")?.baseline ?? 30,
    insourcingImportance: byKey.get("Insourcing")?.importance ?? 0,
    insourcingBaseline: byKey.get("Insourcing")?.baseline ?? 30,
  };
}

function rowsToDf09Data(rows: Df09InputRow[]) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    agileImportance: byKey.get("Agile")?.importance ?? 0,
    agileBaseline: byKey.get("Agile")?.baseline ?? 30,
    devOpsImportance: byKey.get("DevOps")?.importance ?? 0,
    devOpsBaseline: byKey.get("DevOps")?.baseline ?? 30,
    traditionalImportance: byKey.get("Traditional")?.importance ?? 0,
    traditionalBaseline: byKey.get("Traditional")?.baseline ?? 30,
  };
}

function rowsToDf10Data(rows: Df10InputRow[]) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return {
    firstMoverImportance: byKey.get("First_Mover")?.importance ?? 0,
    firstMoverBaseline: byKey.get("First_Mover")?.baseline ?? 30,
    followerImportance: byKey.get("Follower")?.importance ?? 0,
    followerBaseline: byKey.get("Follower")?.baseline ?? 30,
    slowAdopterImportance: byKey.get("Slow_Adopter")?.importance ?? 0,
    slowAdopterBaseline: byKey.get("Slow_Adopter")?.baseline ?? 30,
  };
}

function mapDf01InputData(input: ReturnType<typeof rowsToDf01Data>): Df01InputRow[] {
  return [
    {
      key: "growth",
      label: "Growth/Acquisition",
      importance: input.growthImportance,
      baseline: input.growthBaseline,
    },
    {
      key: "innovation",
      label: "Innovation/Differentiation",
      importance: input.innovationImportance,
      baseline: input.innovationBaseline,
    },
    {
      key: "cost",
      label: "Cost Leadership",
      importance: input.costImportance,
      baseline: input.costBaseline,
    },
    {
      key: "service",
      label: "Client Service/Stability",
      importance: input.serviceImportance,
      baseline: input.serviceBaseline,
    },
  ];
}

function mapDf02InputData(input: { rows: unknown }): Df02InputRow[] {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  return defaultDf02Rows().map((defaultRow) => {
    const incoming = rows.find(
      (row): row is Partial<Df02InputRow> =>
        Boolean(row) && typeof row === "object" && "key" in row && row.key === defaultRow.key,
    );

    return {
      ...defaultRow,
      importance: normalizeScale(incoming?.importance, defaultRow.importance),
      baseline: normalizeScale(incoming?.baseline, defaultRow.baseline),
    };
  });
}

function mapDf03InputData(input: { rows: unknown }): Df03InputRow[] {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  return defaultDf03Rows().map((defaultRow) => {
    const incoming = rows.find(
      (row): row is Partial<Df03InputRow> =>
        Boolean(row) && typeof row === "object" && "key" in row && row.key === defaultRow.key,
    );

    return {
      ...defaultRow,
      impact: normalizeRiskScale(incoming?.impact, defaultRow.impact),
      likelihood: normalizeRiskScale(incoming?.likelihood, defaultRow.likelihood),
      baseline: normalizeRiskScore(incoming?.baseline, defaultRow.baseline),
    };
  });
}

function mapDf04InputData(input: { rows: unknown }): Df04InputRow[] {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  return defaultDf04Rows().map((defaultRow) => {
    const incoming = rows.find(
      (row): row is Partial<Df04InputRow> =>
        Boolean(row) && typeof row === "object" && "key" in row && row.key === defaultRow.key,
    );

    return {
      ...defaultRow,
      importance: normalizeThreePointScale(incoming?.importance, defaultRow.importance),
      baseline: normalizeThreePointScale(incoming?.baseline, defaultRow.baseline),
    };
  });
}

function mapDf05InputData(input: ReturnType<typeof rowsToDf05Data>): Df05InputRow[] {
  return [
    {
      key: "High",
      label: "High",
      importance: input.highImportance,
      baseline: normalizeLegacyPercentageBaseline(input.highBaseline),
    },
    {
      key: "Normal",
      label: "Normal",
      importance: input.normalImportance,
      baseline: normalizeLegacyPercentageBaseline(input.normalBaseline),
    },
  ];
}

function mapDf06InputData(input: ReturnType<typeof rowsToDf06Data>): Df06InputRow[] {
  return [
    {
      key: "High",
      label: "High",
      importance: input.highImportance,
      baseline: normalizeLegacyPercentageBaseline(input.highBaseline),
    },
    {
      key: "Normal",
      label: "Normal",
      importance: input.normalImportance,
      baseline: normalizeLegacyPercentageBaseline(input.normalBaseline),
    },
    {
      key: "Low",
      label: "Low",
      importance: input.lowImportance,
      baseline: normalizeLegacyPercentageBaseline(input.lowBaseline),
    },
  ];
}

function mapDf07InputData(input: ReturnType<typeof rowsToDf07Data>): Df07InputRow[] {
  return [
    {
      key: "Support",
      label: "Support",
      importance: input.supportImportance,
      baseline: input.supportBaseline,
    },
    {
      key: "Factory",
      label: "Factory",
      importance: input.factoryImportance,
      baseline: input.factoryBaseline,
    },
    {
      key: "Turnaround",
      label: "Turnaround",
      importance: input.turnaroundImportance,
      baseline: input.turnaroundBaseline,
    },
    {
      key: "Strategic",
      label: "Strategic",
      importance: input.strategicImportance,
      baseline: input.strategicBaseline,
    },
  ];
}

function mapDf08InputData(input: ReturnType<typeof rowsToDf08Data>): Df08InputRow[] {
  return [
    {
      key: "Outsourcing",
      label: "Outsourcing",
      importance: input.outsourcingImportance,
      baseline: normalizeLegacyPercentageBaseline(input.outsourcingBaseline),
    },
    {
      key: "Cloud",
      label: "Cloud",
      importance: input.cloudImportance,
      baseline: normalizeLegacyPercentageBaseline(input.cloudBaseline),
    },
    {
      key: "Insourcing",
      label: "Insourced",
      importance: input.insourcingImportance,
      baseline: normalizeLegacyPercentageBaseline(input.insourcingBaseline),
    },
  ];
}

function mapDf09InputData(input: ReturnType<typeof rowsToDf09Data>): Df09InputRow[] {
  return [
    {
      key: "Agile",
      label: "Agile",
      importance: input.agileImportance,
      baseline: normalizeLegacyPercentageBaseline(input.agileBaseline),
    },
    {
      key: "DevOps",
      label: "DevOps",
      importance: input.devOpsImportance,
      baseline: normalizeLegacyPercentageBaseline(input.devOpsBaseline),
    },
    {
      key: "Traditional",
      label: "Traditional",
      importance: input.traditionalImportance,
      baseline: normalizeLegacyPercentageBaseline(input.traditionalBaseline),
    },
  ];
}

function mapDf10InputData(input: ReturnType<typeof rowsToDf10Data>): Df10InputRow[] {
  return [
    {
      key: "First_Mover",
      label: "First mover",
      importance: input.firstMoverImportance,
      baseline: normalizeLegacyPercentageBaseline(input.firstMoverBaseline),
    },
    {
      key: "Follower",
      label: "Follower",
      importance: input.followerImportance,
      baseline: normalizeLegacyPercentageBaseline(input.followerBaseline),
    },
    {
      key: "Slow_Adopter",
      label: "Slow adopter",
      importance: input.slowAdopterImportance,
      baseline: normalizeLegacyPercentageBaseline(input.slowAdopterBaseline),
    },
  ];
}

function normalizeLegacyPercentageBaseline(value: number) {
  return value === 3 ? 30 : value;
}
