import { NextResponse } from "next/server";
import { ComplianceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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
