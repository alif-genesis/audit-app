"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveAdmin } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";

export type CompanyFormState = {
  toast?: {
    type: "success" | "error";
    message: string;
  };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensureAdmin() {
  return Boolean(await getActiveAdmin());
}

function readCompanyForm(formData: FormData) {
  return {
    id: String(formData.get("id") || ""),
    name: String(formData.get("name") || "").trim(),
    code: String(formData.get("code") || "").trim().toUpperCase(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    phone: String(formData.get("phone") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    description: String(formData.get("description") || "").trim(),
  };
}

function validateCompanyInput(input: ReturnType<typeof readCompanyForm>) {
  if (!input.name) {
    return "Nama perusahaan wajib diisi.";
  }

  if (input.email && !emailPattern.test(input.email)) {
    return "Format email perusahaan harus valid.";
  }

  return null;
}

export async function createCompanyAction(
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  if (!(await ensureAdmin())) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const input = readCompanyForm(formData);
  const validationError = validateCompanyInput(input);

  if (validationError) {
    return { toast: { type: "error", message: validationError } };
  }

  const duplicate = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { equals: input.name, mode: "insensitive" } },
        ...(input.code ? [{ code: input.code }] : []),
      ],
    },
    select: { id: true },
  });

  if (duplicate) {
    return {
      toast: {
        type: "error",
        message: "Nama atau kode perusahaan sudah terdaftar.",
      },
    };
  }

  const company = await prisma.company.create({
    data: {
      name: input.name,
      code: input.code || null,
      email: input.email || null,
      phone: input.phone || null,
      website: null,
      industry: null,
      taxId: null,
      address: input.address || null,
      description: input.description || null,
    },
  });

  await writeActivityLog({
    action: "Create Company",
    entity: "Company",
    entityId: company.id,
    details: `Admin menambahkan perusahaan ${company.name}.`,
  });

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/logs");

  return { toast: { type: "success", message: "Perusahaan berhasil ditambahkan." } };
}

export async function updateCompanyAction(
  _previousState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  if (!(await ensureAdmin())) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const input = readCompanyForm(formData);
  const validationError = validateCompanyInput(input);

  if (!input.id || validationError) {
    return {
      toast: {
        type: "error",
        message: validationError ?? "Data perusahaan tidak ditemukan.",
      },
    };
  }

  const duplicate = await prisma.company.findFirst({
    where: {
      NOT: { id: input.id },
      OR: [
        { name: { equals: input.name, mode: "insensitive" } },
        ...(input.code ? [{ code: input.code }] : []),
      ],
    },
    select: { id: true },
  });

  if (duplicate) {
    return {
      toast: {
        type: "error",
        message: "Nama atau kode perusahaan sudah digunakan.",
      },
    };
  }

  const company = await prisma.company.update({
    where: { id: input.id },
    data: {
      name: input.name,
      code: input.code || null,
      email: input.email || null,
      phone: input.phone || null,
      website: null,
      industry: null,
      taxId: null,
      address: input.address || null,
      description: input.description || null,
    },
  });

  await writeActivityLog({
    action: "Update Company",
    entity: "Company",
    entityId: company.id,
    details: `Admin memperbarui perusahaan ${company.name}.`,
  });

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/logs");

  return { toast: { type: "success", message: "Perusahaan berhasil diperbarui." } };
}

export async function deleteCompanyAction(formData: FormData) {
  if (!(await ensureAdmin())) {
    return;
  }

  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!company) {
    return;
  }

  const usageCount = await prisma.audit.count({ where: { companyName: company.name } });
  const designFactorUsageCount = await prisma.designFactorAssessment.count({
    where: { companyName: company.name },
  });

  if (usageCount > 0 || designFactorUsageCount > 0) {
    return;
  }

  await prisma.company.delete({
    where: { id },
  });

  await writeActivityLog({
    action: "Delete Company",
    entity: "Company",
    entityId: company.id,
    details: `Admin menghapus perusahaan ${company.name}.`,
  });

  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/logs");
}
