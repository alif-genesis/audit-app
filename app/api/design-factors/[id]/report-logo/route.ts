import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });

  const { id } = await params;
  const assessment = await prisma.designFactorAssessment.findUnique({
    where: { id },
    select: { id: true, name: true, auditorId: true, auditeeId: true, reportContent: true },
  });
  if (!assessment || (currentUser.role !== "ADMIN" && assessment.auditorId !== currentUser.id && assessment.auditeeId !== currentUser.id)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses ke report ini." }, { status: 403 });
  }

  const formData = await request.formData();
  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) return NextResponse.json({ error: "Pilih file logo terlebih dahulu." }, { status: 400 });
  const extension = allowedTypes.get(logo.type);
  if (!extension) return NextResponse.json({ error: "Logo harus berformat PNG, JPG, atau WebP." }, { status: 400 });
  if (logo.size > MAX_LOGO_SIZE) return NextResponse.json({ error: "Ukuran logo maksimal 2 MB." }, { status: 400 });

  const bytes = Buffer.from(await logo.arrayBuffer());
  if (!hasValidSignature(bytes, extension)) return NextResponse.json({ error: "Isi file logo tidak sesuai formatnya." }, { status: 400 });

  const directory = path.join(process.cwd(), "public", "uploads", "design-factor-logos", id);
  await mkdir(directory, { recursive: true });
  const fileName = `company-logo-${Date.now()}.${extension}`;
  await writeFile(path.join(directory, fileName), bytes);
  const logoUrl = `/uploads/design-factor-logos/${id}/${fileName}`;
  const existing = assessment.reportContent && typeof assessment.reportContent === "object" && !Array.isArray(assessment.reportContent)
    ? assessment.reportContent as Prisma.JsonObject
    : {};
  await prisma.designFactorAssessment.update({
    where: { id },
    data: { reportContent: { ...existing, companyLogoPath: logoUrl } },
  });
  await writeActivityLog({
    action: "Upload Design Factor Report Logo",
    entity: "DesignFactorAssessment",
    entityId: id,
    details: `${currentUser.name} mengunggah logo perusahaan untuk report "${assessment.name}".`,
  });

  return NextResponse.json({ logoUrl });
}

function hasValidSignature(bytes: Buffer, extension: string) {
  if (extension === "png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (extension === "jpg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "webp") return bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}
