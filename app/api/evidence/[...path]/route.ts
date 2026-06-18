import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type EvidenceRouteProps = {
  params: Promise<{
    path: string[];
  }>;
};

const contentTypes: Record<string, string> = {
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(_request: Request, { params }: EvidenceRouteProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = (await params).path ?? [];
  const [auditId, questionId, fileName] = segments;

  if (segments.length !== 3 || !auditId || !questionId || !fileName || fileName.includes("..")) {
    return NextResponse.json({ error: "Invalid evidence path" }, { status: 400 });
  }

  const downloadPath = `/api/evidence/${auditId}/${questionId}/${fileName}`;
  const evidenceFile = await prisma.evidenceFile.findFirst({
    where: {
      auditId,
      questionId,
      downloadPath,
      ...(currentUser.role === "ADMIN"
        ? {}
        : {
            auditResponse: {
              audit: {
                assignments: {
                  some: {
                    OR: [{ auditeeId: currentUser.id }, { auditorId: currentUser.id }],
                  },
                },
              },
            },
          }),
    },
    select: { storagePath: true, mimeType: true },
  });
  const legacyResponse = evidenceFile
    ? null
    : await prisma.auditResponse.findFirst({
        where: {
          auditId,
          questionId,
          attachments: { has: downloadPath },
          ...(currentUser.role === "ADMIN"
            ? {}
            : {
                audit: {
                  assignments: {
                    some: {
                      OR: [{ auditeeId: currentUser.id }, { auditorId: currentUser.id }],
                    },
                  },
                },
              }),
        },
        select: { id: true },
      });

  if (!evidenceFile && !legacyResponse) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  const filePath = evidenceFile
    ? path.join(/* turbopackIgnore: true */ process.cwd(), evidenceFile.storagePath)
    : path.join(process.cwd(), "storage", "audit-evidence", auditId, questionId, fileName);
  const bytes = await readFile(filePath);
  const extension = path.extname(fileName).toLowerCase();

  return new NextResponse(bytes, {
    headers: {
      "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
      "Content-Type": evidenceFile?.mimeType ?? contentTypes[extension] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
