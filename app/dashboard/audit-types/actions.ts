"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveAdmin } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";
import { parseXlsxRows } from "@/lib/xlsx";
import { normalizeCobitObjective } from "@/lib/cobit/auditScope";

export type AuditTypeState = {
  toast?: {
    type: "success" | "error";
    message: string;
  };
};

async function ensureAdmin() {
  return Boolean(await getActiveAdmin());
}

export async function createAuditTypeAction(formData: FormData) {
  if (!(await ensureAdmin())) {
    redirect("/dashboard");
  }

  const name = String(formData.get("name") || "").trim();
  const isoStandard = String(formData.get("isoStandard") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name || !isoStandard) {
    redirect("/dashboard/audit-types?error=missing");
  }

  const auditType = await prisma.auditType.create({
    data: {
      name,
      isoStandard,
      description: description || null,
    },
  });

  await writeActivityLog({
    action: "Create Audit Framework",
    entity: "AuditType",
    entityId: auditType.id,
    details: `Admin membuat framework audit ${auditType.name}.`,
  });

  redirect(`/dashboard/audit-types/${auditType.id}`);
}

export async function updateAuditTypeAction(
  _previousState: AuditTypeState,
  formData: FormData,
): Promise<AuditTypeState> {
  if (!(await ensureAdmin())) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const isoStandard = String(formData.get("isoStandard") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!id || !name || !isoStandard) {
    return { toast: { type: "error", message: "Nama dan standar ISO wajib diisi." } };
  }

  await prisma.auditType.update({
    where: { id },
    data: {
      name,
      isoStandard,
      description: description || null,
    },
  });

  await writeActivityLog({
    action: "Update Audit Framework",
    entity: "AuditType",
    entityId: id,
    details: `Admin memperbarui framework audit ${name}.`,
  });

  revalidatePath(`/dashboard/audit-types/${id}`);
  revalidatePath("/dashboard/audit-types");

  return { toast: { type: "success", message: "Detail framework audit berhasil disimpan." } };
}

export async function deleteAuditTypeAction(formData: FormData) {
  if (!(await ensureAdmin())) {
    return;
  }

  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const auditType = await prisma.auditType.findUnique({
    where: { id },
    select: { name: true, _count: { select: { audits: true } } },
  });

  if (!auditType || auditType._count.audits > 0) {
    return;
  }

  await prisma.auditType.delete({
    where: { id },
  });

  await writeActivityLog({
    action: "Delete Audit Framework",
    entity: "AuditType",
    entityId: id,
    details: `Admin menghapus framework audit ${auditType?.name ?? id}.`,
  });

  revalidatePath("/dashboard/audit-types");
}

export async function addAuditQuestionAction(
  _previousState: AuditTypeState,
  formData: FormData,
): Promise<AuditTypeState> {
  if (!(await ensureAdmin())) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const auditTypeId = String(formData.get("auditTypeId") || "");
  const domain = String(formData.get("domain") || "").trim().toUpperCase();
  const objectiveId = String(formData.get("objectiveId") || "").trim().toUpperCase();
  const level = String(formData.get("level") || "").trim();
  const clauseInput = String(formData.get("clause") || "").trim();
  const clause = objectiveId && level ? `${objectiveId}.L${level}` : clauseInput;
  const title = String(formData.get("title") || "").trim();
  const requirement = String(formData.get("requirement") || "").trim();
  const question = String(formData.get("question") || "").trim();

  if (!auditTypeId || !clause || !question) {
    return { toast: { type: "error", message: "Klausul dan pertanyaan wajib diisi." } };
  }

  const isCobitType = await isCobitAuditType(auditTypeId);
  const duplicateClause = isCobitType
    ? null
    : await prisma.auditQuestion.findFirst({
        where: {
          auditTypeId,
          clause: { equals: clause, mode: "insensitive" },
        },
        select: { id: true },
      });

  if (duplicateClause) {
    return { toast: { type: "error", message: "Klausul pertanyaan sudah ada di framework ini." } };
  }

  const count = await prisma.auditQuestion.count({
    where: { auditTypeId },
  });

  await prisma.auditQuestion.create({
    data: {
      auditTypeId,
      clause,
      title: title || null,
      requirement: requirement || null,
      question,
      sortOrder: count + 1,
    },
  });

  await writeActivityLog({
    action: "Add Audit Question",
    entity: "AuditQuestion",
    entityId: auditTypeId,
    details: `Admin menambahkan pertanyaan klausul ${clause}.`,
  });

  revalidatePath(`/dashboard/audit-types/${auditTypeId}`);
  revalidatePath("/dashboard/audit-types");

  return { toast: { type: "success", message: "Pertanyaan audit berhasil ditambahkan." } };
}

export async function uploadAuditQuestionsAction(
  _previousState: AuditTypeState,
  formData: FormData,
): Promise<AuditTypeState> {
  if (!(await ensureAdmin())) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const auditTypeId = String(formData.get("auditTypeId") || "");
  const domainGroup = String(formData.get("domainGroup") || "").trim().toUpperCase();
  const file = formData.get("file");

  if (!auditTypeId || !(file instanceof File) || file.size === 0) {
    return { toast: { type: "error", message: "Pilih file template terlebih dahulu." } };
  }

  const fileName = file.name.toLowerCase();
  const allowedExtensions = [".xlsx", ".csv", ".tsv", ".txt"];
  const maxUploadBytes = 2 * 1024 * 1024;

  if (!allowedExtensions.some((extension) => fileName.endsWith(extension))) {
    return { toast: { type: "error", message: "Format template harus XLSX, CSV, TSV, atau TXT." } };
  }

  if (file.size > maxUploadBytes) {
    return { toast: { type: "error", message: "Ukuran template maksimal 2 MB." } };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: ReturnType<typeof parseTemplateRows>;

  try {
    rows = file.name.toLowerCase().endsWith(".xlsx")
      ? parseTemplateRows(parseXlsxRows(buffer))
      : parseDelimitedRows(buffer.toString("utf8"));
  } catch {
    return {
      toast: {
        type: "error",
        message: "File template tidak dapat dibaca. Gunakan template XLSX dari aplikasi.",
      },
    };
  }

  if (rows.length === 0) {
    return { toast: { type: "error", message: "Template tidak berisi pertanyaan." } };
  }

  const isCobitUpload = isCobitDomainGroup(domainGroup);
  const filteredRows = isCobitUpload
    ? rows.filter((row) => normalizeCobitObjective(row.clause).startsWith(domainGroup))
    : rows;

  if (!isCobitUpload) {
    const seenClauses = new Set<string>();
    const duplicateUploadedClause = filteredRows.find((row) => {
      const normalized = row.clause.toUpperCase();
      if (seenClauses.has(normalized)) {
        return true;
      }
      seenClauses.add(normalized);
      return false;
    });

    if (duplicateUploadedClause) {
      return { toast: { type: "error", message: `Template memiliki klausul duplikat: ${duplicateUploadedClause.clause}.` } };
    }

    const uploadedClauses = filteredRows.map((row) => row.clause);
    const existingClause = await prisma.auditQuestion.findFirst({
      where: {
        auditTypeId,
        clause: { in: uploadedClauses },
      },
      select: { clause: true },
    });

    if (existingClause) {
      return { toast: { type: "error", message: `Klausul ${existingClause.clause} sudah ada di framework ini.` } };
    }
  }

  if (filteredRows.length === 0) {
    return {
      toast: {
        type: "error",
        message: `Template tidak memiliki klausul ${domainGroup}. Isi kolom klausul dengan format seperti ${domainGroup}01.`,
      },
    };
  }

  const existingCount = await prisma.auditQuestion.count({
    where: { auditTypeId },
  });

  if (isCobitUpload) {
    await prisma.auditQuestion.deleteMany({
      where: {
        auditTypeId,
        clause: { startsWith: domainGroup },
      },
    });
  }

  const nextSortOrder = isCobitUpload
    ? await prisma.auditQuestion.count({ where: { auditTypeId } })
    : existingCount;

  await prisma.auditQuestion.createMany({
    data: filteredRows.map((row, index) => ({
      auditTypeId,
      clause: row.clause,
      title: row.title || null,
      requirement: row.requirement || null,
      question: row.question,
      sortOrder: nextSortOrder + index + 1,
    })),
  });

  await writeActivityLog({
    action: "Upload Audit Questions",
    entity: "AuditQuestion",
    entityId: auditTypeId,
    details: `Admin upload ${filteredRows.length} pertanyaan audit${domainGroup ? ` domain ${domainGroup}` : ""} dari template.`,
  });

  revalidatePath(`/dashboard/audit-types/${auditTypeId}`);
  revalidatePath("/dashboard/audit-types");

  return { toast: { type: "success", message: `${filteredRows.length} pertanyaan berhasil diupload.` } };
}

function isCobitDomainGroup(value: string) {
  return ["EDM", "APO", "BAI", "DSS", "MEA"].includes(value);
}

export async function deleteAuditQuestionAction(formData: FormData) {
  if (!(await ensureAdmin())) {
    return;
  }

  const id = String(formData.get("id") || "");
  const auditTypeId = String(formData.get("auditTypeId") || "");

  if (!id || !auditTypeId) {
    return;
  }

  await prisma.auditQuestion.delete({
    where: { id },
  });

  await writeActivityLog({
    action: "Delete Audit Question",
    entity: "AuditQuestion",
    entityId: id,
    details: "Admin menghapus pertanyaan audit.",
  });

  revalidatePath(`/dashboard/audit-types/${auditTypeId}`);
  revalidatePath("/dashboard/audit-types");
}

export async function updateAuditQuestionAction(
  _previousState: AuditTypeState,
  formData: FormData,
): Promise<AuditTypeState> {
  if (!(await ensureAdmin())) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const id = String(formData.get("id") || "");
  const auditTypeId = String(formData.get("auditTypeId") || "");
  const clause = String(formData.get("clause") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const requirement = String(formData.get("requirement") || "").trim();
  const question = String(formData.get("question") || "").trim();

  if (!id || !auditTypeId || !clause || !question) {
    return {
      toast: {
        type: "error",
        message: "Klausul dan panduan pertanyaan wajib diisi.",
      },
    };
  }

  const isCobitType = await isCobitAuditType(auditTypeId);
  const duplicateClause = isCobitType
    ? null
    : await prisma.auditQuestion.findFirst({
        where: {
          auditTypeId,
          clause: { equals: clause, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true },
      });

  if (duplicateClause) {
    return { toast: { type: "error", message: "Klausul pertanyaan sudah digunakan di framework ini." } };
  }

  await prisma.auditQuestion.update({
    where: { id },
    data: {
      clause,
      title: title || null,
      requirement: requirement || null,
      question,
    },
  });

  await writeActivityLog({
    action: "Update Audit Question",
    entity: "AuditQuestion",
    entityId: id,
    details: `Admin memperbarui pertanyaan audit klausul ${clause}.`,
  });

  revalidatePath(`/dashboard/audit-types/${auditTypeId}`);
  revalidatePath("/dashboard/audit-types");

  return { toast: { type: "success", message: "Pertanyaan audit berhasil diperbarui." } };
}

function parseDelimitedRows(content: string) {
  const lines = content
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[0], delimiter).map((header) =>
    header.trim().toLowerCase(),
  );

  const clauseIndex = headers.findIndex((header) => ["klausul", "clause"].includes(header));
  const objectiveIndex = headers.findIndex((header) => ["objective_id", "objective", "domain_id"].includes(header));
  const levelIndex = headers.findIndex((header) => ["level", "capability_level"].includes(header));
  const titleIndex = headers.findIndex((header) => ["judul", "title"].includes(header));
  const requirementIndex = headers.findIndex((header) =>
    ["prasyarat", "requirement", "standar"].includes(header),
  );
  const questionIndex = headers.findIndex((header) =>
    ["pertanyaan", "question", "panduan"].includes(header),
  );

  if ((clauseIndex === -1 && objectiveIndex === -1) || questionIndex === -1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => splitLine(line, delimiter))
    .map((columns) => ({
      clause: getTemplateClause(columns, clauseIndex, objectiveIndex, levelIndex),
      title: titleIndex >= 0 ? columns[titleIndex]?.trim() || "" : "",
      requirement:
        requirementIndex >= 0 ? columns[requirementIndex]?.trim() || "" : "",
      question: columns[questionIndex]?.trim() || "",
    }))
    .filter((row) => row.clause && row.question);
}

function parseTemplateRows(rows: string[][]) {
  if (rows.length <= 1) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const clauseIndex = headers.findIndex((header) => ["klausul", "clause"].includes(header));
  const objectiveIndex = headers.findIndex((header) => ["objective_id", "objective", "domain_id"].includes(header));
  const levelIndex = headers.findIndex((header) => ["level", "capability_level"].includes(header));
  const titleIndex = headers.findIndex((header) => ["judul", "title"].includes(header));
  const requirementIndex = headers.findIndex((header) =>
    ["prasyarat", "requirement", "standar"].includes(header),
  );
  const questionIndex = headers.findIndex((header) =>
    ["pertanyaan", "question", "panduan"].includes(header),
  );

  if ((clauseIndex === -1 && objectiveIndex === -1) || questionIndex === -1) {
    return [];
  }

  return rows
    .slice(1)
    .map((columns) => ({
      clause: getTemplateClause(columns, clauseIndex, objectiveIndex, levelIndex),
      title: titleIndex >= 0 ? columns[titleIndex]?.trim() || "" : "",
      requirement:
        requirementIndex >= 0 ? columns[requirementIndex]?.trim() || "" : "",
      question: columns[questionIndex]?.trim() || "",
    }))
    .filter((row) => row.clause && row.question);
}

function getTemplateClause(columns: string[], clauseIndex: number, objectiveIndex: number, levelIndex: number) {
  const clause = clauseIndex >= 0 ? columns[clauseIndex]?.trim() || "" : "";
  if (clause) {
    return clause;
  }

  const objective = objectiveIndex >= 0 ? normalizeCobitObjective(columns[objectiveIndex] || "") : "";
  const level = levelIndex >= 0 ? String(columns[levelIndex] || "").replace(/[^0-9]/g, "") : "";
  return objective && level ? `${objective}.L${level}` : objective;
}

async function isCobitAuditType(auditTypeId: string) {
  const auditType = await prisma.auditType.findUnique({
    where: { id: auditTypeId },
    select: { name: true, isoStandard: true },
  });

  return `${auditType?.name ?? ""} ${auditType?.isoStandard ?? ""}`.toUpperCase().includes("COBIT");
}

function splitLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}
