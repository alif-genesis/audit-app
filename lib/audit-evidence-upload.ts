import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export type EvidenceUploadResult = { paths: string[] } | { error: string };

export const MAX_EVIDENCE_FILES = 5;

export async function saveSupportingFiles({
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
  const maxFileBytes = 10 * 1024 * 1024;
  const maxTotalBytes = MAX_EVIDENCE_FILES * maxFileBytes;
  const allowedExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"]);

  if (files.length > MAX_EVIDENCE_FILES) {
    return { error: "Maksimal 5 file evidence untuk setiap pertanyaan." };
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > maxTotalBytes) {
    return { error: "Total ukuran evidence maksimal 50 MB untuk 5 file." };
  }

  for (const file of files) {
    const extension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      return { error: "Format evidence harus PDF, image, Word, Excel, CSV, atau TXT." };
    }
    if (file.size > maxFileBytes) {
      return { error: `File "${file.name}" melebihi 10 MB. Ukuran maksimal adalah 10 MB per file, total maksimal 50 MB.` };
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

  const uploadRoot = path.join(process.cwd(), "storage", "audit-evidence", auditId, questionId);
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
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["application/zip", "application/x-zip-compressed"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["application/zip", "application/x-zip-compressed"],
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
