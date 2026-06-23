import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ComplianceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { MAX_EVIDENCE_FILES, saveSupportingFiles } from "@/lib/audit-evidence-upload";

type RouteContext = {
  params: Promise<{
    auditId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await context.params;

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: {
      id: true,
      assignments: {
        select: {
          auditorId: true,
          auditeeId: true,
        },
      },
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canAccess =
    currentUser.role === "ADMIN" ||
    audit.assignments.some(
      (assignment) =>
        assignment.auditeeId === currentUser.id || assignment.auditorId === currentUser.id,
    );

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auditeeId =
    currentUser.role === "AUDITEE"
      ? currentUser.id
      : audit.assignments[0]?.auditeeId;

  if (!auditeeId) {
    return NextResponse.json({ responses: [] });
  }

  const responses = await prisma.auditResponse.findMany({
    where: {
      auditId,
      auditeeId,
    },
    select: {
      questionId: true,
      compliance: true,
      description: true,
      attachments: true,
      submittedAt: true,
      updatedAt: true,
      evidenceFiles: {
        where: { isActive: true },
        orderBy: { version: "asc" },
        select: {
          downloadPath: true,
          originalName: true,
          fileSize: true,
          createdAt: true,
        },
      },
      question: {
        select: {
          sortOrder: true,
        },
      },
    },
    orderBy: {
      question: {
        sortOrder: "asc",
      },
    },
  });

  return NextResponse.json({
    responses: responses.map((response) => ({
      questionId: response.questionId,
      compliance: response.compliance,
      description: response.description ?? "",
      attachments: response.attachments,
      evidenceFiles: response.evidenceFiles.map((file) => ({
        path: file.downloadPath,
        name: file.originalName,
        size: file.fileSize,
        uploadedAt: file.createdAt.toISOString(),
      })),
      submittedAt: response.submittedAt?.toISOString() ?? null,
      updatedAt: response.updatedAt.toISOString(),
    })),
    updatedAt: responses.reduce<string | null>((latest, response) => {
      const value = response.updatedAt.toISOString();
      return !latest || value > latest ? value : latest;
    }, null),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await context.params;
  const body = await request.json().catch(() => null);
  const questionId = String(body?.questionId || "").trim();
  const compliance = String(body?.compliance || "NA") as ComplianceStatus;
  const description = String(body?.description || "");

  if (!questionId || !["NA", "COMPLY", "NOT_COMPLY"].includes(compliance)) {
    return NextResponse.json({ error: "Invalid response payload" }, { status: 400 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: {
      id: true,
      assignments: {
        where: { auditeeId: currentUser.id },
        select: { auditeeId: true },
      },
    },
  });

  if (!audit || audit.assignments.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.auditResponse.findUnique({
    where: {
      auditId_auditeeId_questionId: {
        auditId,
        auditeeId: currentUser.id,
        questionId,
      },
    },
    select: {
      submittedAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  if (existing.submittedAt) {
    return NextResponse.json({ error: "Response already final" }, { status: 409 });
  }

  const response = await prisma.auditResponse.update({
    where: {
      auditId_auditeeId_questionId: {
        auditId,
        auditeeId: currentUser.id,
        questionId,
      },
    },
    data: {
      compliance,
      description: description.trim(),
    },
    select: {
      questionId: true,
      compliance: true,
      description: true,
      attachments: true,
      submittedAt: true,
      updatedAt: true,
      evidenceFiles: {
        where: { isActive: true },
        orderBy: { version: "asc" },
        select: {
          downloadPath: true,
          originalName: true,
          fileSize: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    response: {
      questionId: response.questionId,
      compliance: response.compliance,
      description: response.description ?? "",
      attachments: response.attachments,
      evidenceFiles: response.evidenceFiles.map((file) => ({
        path: file.downloadPath,
        name: file.originalName,
        size: file.fileSize,
        uploadedAt: file.createdAt.toISOString(),
      })),
      submittedAt: response.submittedAt?.toISOString() ?? null,
      updatedAt: response.updatedAt.toISOString(),
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await context.params;
  const formData = await request.formData().catch(() => null);
  const questionId = String(formData?.get("questionId") || "").trim();
  const compliance = String(formData?.get("compliance") || "NA") as ComplianceStatus;
  const description = String(formData?.get("description") || "");
  const files = (formData?.getAll("files") ?? []).filter((file): file is File => file instanceof File && file.size > 0);

  if (!questionId || !["NA", "COMPLY", "NOT_COMPLY"].includes(compliance)) {
    return NextResponse.json({ error: "Invalid response payload" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "Tidak ada file evidence yang dipilih." }, { status: 400 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: {
      id: true,
      assignments: {
        where: { auditeeId: currentUser.id },
        select: { auditeeId: true },
      },
    },
  });

  if (!audit || audit.assignments.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.auditResponse.findUnique({
    where: {
      auditId_auditeeId_questionId: {
        auditId,
        auditeeId: currentUser.id,
        questionId,
      },
    },
    select: {
      submittedAt: true,
      attachments: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  if (existing.submittedAt) {
    return NextResponse.json({ error: "Response already final" }, { status: 409 });
  }

  const uploadedFiles = await saveSupportingFiles({
    auditId,
    questionId,
    auditeeId: currentUser.id,
    uploadedById: currentUser.id,
    files,
  });

  if ("error" in uploadedFiles) {
    return NextResponse.json({ error: uploadedFiles.error }, { status: 400 });
  }

  const mergedAttachments = [...existing.attachments, ...uploadedFiles.paths];
  const activeAttachments = mergedAttachments.slice(-MAX_EVIDENCE_FILES);
  const replacedAttachments = mergedAttachments.slice(0, Math.max(0, mergedAttachments.length - MAX_EVIDENCE_FILES));

  if (replacedAttachments.length > 0) {
    await prisma.evidenceFile.updateMany({
      where: {
        auditId,
        questionId,
        downloadPath: { in: replacedAttachments },
      },
      data: { isActive: false },
    });
  }

  const response = await prisma.auditResponse.update({
    where: {
      auditId_auditeeId_questionId: {
        auditId,
        auditeeId: currentUser.id,
        questionId,
      },
    },
    data: {
      compliance,
      description: description.trim(),
      attachments: activeAttachments,
    },
    select: {
      questionId: true,
      compliance: true,
      description: true,
      attachments: true,
      submittedAt: true,
      updatedAt: true,
      evidenceFiles: {
        where: { isActive: true },
        orderBy: { version: "asc" },
        select: {
          downloadPath: true,
          originalName: true,
          fileSize: true,
          createdAt: true,
        },
      },
    },
  });

  revalidatePath(`/dashboard/audits/responses/${auditId}`);
  revalidatePath(`/dashboard/audits/${auditId}/summary`);

  return NextResponse.json({
    response: {
      questionId: response.questionId,
      compliance: response.compliance,
      description: response.description ?? "",
      attachments: response.attachments,
      evidenceFiles: response.evidenceFiles.map((file) => ({
        path: file.downloadPath,
        name: file.originalName,
        size: file.fileSize,
        uploadedAt: file.createdAt.toISOString(),
      })),
      submittedAt: response.submittedAt?.toISOString() ?? null,
      updatedAt: response.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await context.params;
  const body = await request.json().catch(() => null);
  const questionId = String(body?.questionId || "").trim();
  const path = String(body?.path || "").trim();

  if (!questionId || !path) {
    return NextResponse.json({ error: "Invalid evidence payload" }, { status: 400 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: {
      id: true,
      assignments: {
        where: { auditeeId: currentUser.id },
        select: { auditeeId: true },
      },
    },
  });

  if (!audit || audit.assignments.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.auditResponse.findUnique({
    where: {
      auditId_auditeeId_questionId: {
        auditId,
        auditeeId: currentUser.id,
        questionId,
      },
    },
    select: {
      submittedAt: true,
      attachments: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  if (existing.submittedAt) {
    return NextResponse.json({ error: "Response already final" }, { status: 409 });
  }

  const evidenceFile = await prisma.evidenceFile.findFirst({
    where: {
      auditId,
      questionId,
      uploadedById: currentUser.id,
      downloadPath: path,
      isActive: true,
    },
    select: { id: true },
  });

  if (!evidenceFile && !existing.attachments.includes(path)) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  if (evidenceFile) {
    await prisma.evidenceFile.update({
      where: { id: evidenceFile.id },
      data: { isActive: false },
    });
  }

  const response = await prisma.auditResponse.update({
    where: {
      auditId_auditeeId_questionId: {
        auditId,
        auditeeId: currentUser.id,
        questionId,
      },
    },
    data: {
      attachments: existing.attachments.filter((attachment) => attachment !== path),
    },
    select: {
      questionId: true,
      compliance: true,
      description: true,
      attachments: true,
      submittedAt: true,
      updatedAt: true,
      evidenceFiles: {
        where: { isActive: true },
        orderBy: { version: "asc" },
        select: {
          downloadPath: true,
          originalName: true,
          fileSize: true,
          createdAt: true,
        },
      },
    },
  });

  revalidatePath(`/dashboard/audits/responses/${auditId}`);
  revalidatePath(`/dashboard/audits/${auditId}/summary`);

  return NextResponse.json({
    response: {
      questionId: response.questionId,
      compliance: response.compliance,
      description: response.description ?? "",
      attachments: response.attachments,
      evidenceFiles: response.evidenceFiles.map((file) => ({
        path: file.downloadPath,
        name: file.originalName,
        size: file.fileSize,
        uploadedAt: file.createdAt.toISOString(),
      })),
      submittedAt: response.submittedAt?.toISOString() ?? null,
      updatedAt: response.updatedAt.toISOString(),
    },
  });
}
