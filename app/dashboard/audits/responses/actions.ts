"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
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

type EvidenceUploadResult = { paths: string[] } | { error: string };

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

  if (!auditId || responses.length === 0) {
    return withToastId({
      toast: {
        type: "error",
        message: "Audit ID dan jawaban wajib diisi.",
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

    const isSubmit = intent === "submit";
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
    const hasFileUploads = responseUpdates.some((response) =>
      formData
        .getAll(`supportingFiles-${response.questionId}`)
        .some((file) => file instanceof File && file.size > 0),
    );
    const hasResponseChanges = responseUpdates.some((response) => {
      const saved = savedMapForDiff.get(response.questionId);
      return !saved || saved.compliance !== response.compliance || (saved.description ?? "") !== response.description;
    });

    if (!isSubmit && !hasResponseChanges && !hasFileUploads) {
      return withToastId({
        toast: {
          type: "success",
          message: "Tidak ada perubahan baru.",
        },
      });
    }

    if (isSubmit) {
      const savedResponses = savedResponsesForDiff;
      const savedMap = new Map(savedResponses.map((response) => [response.questionId, response]));
      const missingDescription = !isCobit
        ? responseUpdates.find((response) => response.compliance !== "NA" && response.description.trim().length === 0)
        : null;
      if (missingDescription) {
        const clause = savedMap.get(missingDescription.questionId)?.question.clause ?? "pertanyaan ini";
        return withToastId({
          toast: {
            type: "error",
            message: `Belum mengisi deskripsi di ${clause}.`,
          },
        });
      }

      const unsavedChange = responseUpdates.find((response) => {
        const saved = savedMap.get(response.questionId);
        return !saved || saved.compliance !== response.compliance || (saved.description ?? "") !== response.description;
      });
      if (unsavedChange) {
        return withToastId({
          toast: {
            type: "error",
            message: "Ada perubahan yang belum disimpan. Klik Simpan Sementara dulu sebelum Submit Final.",
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

    // Batch update responses
    for (const resp of responseUpdates) {
      const files = formData
        .getAll(`supportingFiles-${resp.questionId}`)
        .filter((file): file is File => file instanceof File && file.size > 0);
      const uploadedFiles =
        files.length > 0
          ? await saveSupportingFiles({
              auditId,
              questionId: resp.questionId,
              auditeeId: currentUser.id,
              uploadedById: currentUser.id,
              files,
            })
          : null;

      if (uploadedFiles && "error" in uploadedFiles) {
        return withToastId({ toast: { type: "error", message: uploadedFiles.error } });
      }

      const existingResponse = uploadedFiles
        ? await prisma.auditResponse.findUnique({
            where: {
              auditId_auditeeId_questionId: {
                auditId: resp.auditId,
                auditeeId: resp.auditeeId,
                questionId: resp.questionId,
              },
            },
            select: { attachments: true },
          })
        : null;

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
          ...(uploadedFiles ? { attachments: [...(existingResponse?.attachments ?? []), ...uploadedFiles.paths] } : {}),
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

async function saveSupportingFiles({
  auditId,
  questionId,
  auditeeId,
  uploadedById,
  files,
}: {
  auditId: string;
  questionId: string;
  auditeeId: string;
  uploadedById: string;
  files: File[];
}): Promise<EvidenceUploadResult> {
  const maxFiles = 5;
  const maxFileBytes = 10 * 1024 * 1024;
  const allowedExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"]);

  if (files.length > maxFiles) {
    return { error: "Maksimal 5 file evidence untuk setiap pertanyaan." };
  }

  for (const file of files) {
    const extension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      return { error: "Format evidence harus PDF, image, Word, Excel, CSV, atau TXT." };
    }
    if (file.size > maxFileBytes) {
      return { error: "Ukuran setiap file evidence maksimal 10 MB." };
    }
  }

  const response = await prisma.auditResponse.findUnique({
    where: {
      auditId_auditeeId_questionId: {
        auditId,
        auditeeId,
        questionId,
      },
    },
    select: {
      id: true,
      evidenceFiles: {
        orderBy: { version: "desc" },
        take: 1,
        select: { version: true },
      },
    },
  });

  if (!response) {
    return { error: "Response audit tidak ditemukan untuk evidence ini." };
  }

  const uploadRoot = path.join(
    process.cwd(),
    "storage",
    "audit-evidence",
    auditId,
    questionId,
  );

  await mkdir(uploadRoot, { recursive: true });

  const storedPaths: string[] = [];
  let nextVersion = (response.evidenceFiles[0]?.version ?? 0) + 1;

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadRoot, fileName);
    const bytes = Buffer.from(await file.arrayBuffer());
    const validation = validateEvidenceBytes(file, bytes);

    if ("error" in validation) {
      return validation;
    }

    await writeFile(filePath, bytes);
    const downloadPath = `/api/evidence/${auditId}/${questionId}/${fileName}`;
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");

    await prisma.evidenceFile.create({
      data: {
        auditResponseId: response.id,
        auditId,
        questionId,
        uploadedById,
        originalName: file.name,
        storedName: fileName,
        storagePath: path.relative(process.cwd(), filePath),
        downloadPath,
        mimeType: validation.mimeType,
        fileSize: file.size,
        checksumSha256,
        version: nextVersion,
      },
    });

    nextVersion += 1;
    storedPaths.push(downloadPath);
  }

  return { paths: storedPaths };
}

function validateEvidenceBytes(file: File, bytes: Buffer): { mimeType: string } | { error: string } {
  const extension = path.extname(file.name).toLowerCase();
  const detectedMime = detectMimeFromMagicBytes(bytes, extension);

  if (!detectedMime) {
    return { error: "File evidence tidak lolos validasi signature. Pastikan file tidak rusak dan formatnya sesuai ekstensi." };
  }

  const declaredMime = file.type.toLowerCase();
  if (declaredMime && declaredMime !== "application/octet-stream" && !mimeTypesCompatible(declaredMime, detectedMime)) {
    return { error: "MIME type evidence tidak sesuai dengan isi file." };
  }

  const scanResult = scanEvidenceBuffer(bytes, detectedMime);
  if (scanResult) {
    return { error: scanResult };
  }

  return { mimeType: detectedMime };
}

function detectMimeFromMagicBytes(bytes: Buffer, extension: string) {
  if (bytes.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
    return extension === ".pdf" ? "application/pdf" : null;
  }
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return extension === ".png" ? "image/png" : null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : null;
  }
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return extension === ".webp" ? "image/webp" : null;
  }
  if (bytes.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) {
    if (extension === ".doc") return "application/msword";
    if (extension === ".xls") return "application/vnd.ms-excel";
    return null;
  }
  if (bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (extension === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return null;
  }
  if ((extension === ".txt" || extension === ".csv") && isPlainText(bytes)) {
    return extension === ".csv" ? "text/csv" : "text/plain";
  }
  return null;
}

function isPlainText(bytes: Buffer) {
  if (bytes.includes(0)) {
    return false;
  }

  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  return sample.every((byte) => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 128);
}

function mimeTypesCompatible(declaredMime: string, detectedMime: string) {
  if (declaredMime === detectedMime) {
    return true;
  }

  const aliases: Record<string, string[]> = {
    "text/csv": ["application/vnd.ms-excel", "text/plain"],
    "text/plain": ["text/csv"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      "application/zip",
      "application/x-zip-compressed",
    ],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      "application/zip",
      "application/x-zip-compressed",
    ],
  };

  return aliases[detectedMime]?.includes(declaredMime) ?? false;
}

function scanEvidenceBuffer(bytes: Buffer, mimeType: string) {
  const sample = bytes.subarray(0, Math.min(bytes.length, 512 * 1024)).toString("utf8").toLowerCase();

  if (sample.includes("<script") || sample.includes("javascript:") || sample.includes("<html")) {
    return "Evidence berisi konten HTML/JavaScript aktif yang tidak diizinkan.";
  }

  if (
    mimeType.includes("officedocument") &&
    (sample.includes("vbaproject.bin") || sample.includes("macros/") || sample.includes("activex"))
  ) {
    return "Evidence Office terindikasi mengandung macro/active content.";
  }

  return null;
}
