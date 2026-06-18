"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveAdmin } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";

export type UserFormState = {
  toast?: {
    type: "success" | "error";
    message: string;
  };
};

const roles = new Set<string>(Object.values(UserRole));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUserAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "");
  const companyName = String(formData.get("companyName") || "").trim();
  const isActive = String(formData.get("isActive") || "true") === "true";

  if (!name || !email || !password || !roles.has(role)) {
    return {
      toast: {
        type: "error",
        message: "Nama, email, password, dan role wajib diisi.",
      },
    };
  }

  if (!emailPattern.test(email)) {
    return {
      toast: {
        type: "error",
        message: "Format email harus valid, contoh: user@company.co.id.",
      },
    };
  }

  if (password.length < 6) {
    return {
      toast: {
        type: "error",
        message: "Password minimal 6 karakter.",
      },
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      toast: {
        type: "error",
        message: "Email user sudah terdaftar.",
      },
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as UserRole,
      companyName: companyName || null,
      isActive,
    },
  });

  await writeActivityLog({
    action: "Create User",
    entity: "User",
    details: `Admin membuat user ${email} dengan role ${role}.`,
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/logs");

  return {
    toast: {
      type: "success",
      message: "User baru berhasil ditambahkan.",
    },
  };
}

export async function updateUserAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return { toast: { type: "error", message: "Akses hanya untuk Admin." } };
  }

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "");
  const companyName = String(formData.get("companyName") || "").trim();
  const isActive = String(formData.get("isActive") || "true") === "true";

  if (!id || !name || !emailPattern.test(email) || !roles.has(role)) {
    return {
      toast: {
        type: "error",
        message: "Data user belum lengkap atau email tidak valid.",
      },
    };
  }

  if (id === currentUser.id && (role !== UserRole.ADMIN || !isActive)) {
    return {
      toast: {
        type: "error",
        message: "Admin tidak bisa menurunkan role atau menonaktifkan akun sendiri.",
      },
    };
  }

  // Prevent ADMIN from being deactivated
  if (role === UserRole.ADMIN && !isActive) {
    return {
      toast: {
        type: "error",
        message: "Admin tidak bisa dinonaktifkan. Minimal harus ada satu admin aktif.",
      },
    };
  }

  const duplicate = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id },
    },
    select: { id: true },
  });

  if (duplicate) {
    return { toast: { type: "error", message: "Email sudah digunakan user lain." } };
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role: role as UserRole,
      companyName: companyName || null,
      isActive,
    },
  });

  await writeActivityLog({
    action: "Update User",
    entity: "User",
    entityId: id,
    details: `Admin memperbarui user ${email}.`,
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/logs");

  return { toast: { type: "success", message: "User berhasil diperbarui." } };
}

export async function deleteUserAction(formData: FormData) {
  const currentUser = await getActiveAdmin();
  if (!currentUser) {
    return;
  }

  const id = String(formData.get("id") || "");

  if (!id || id === currentUser?.id) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, role: true },
  });

  if (!user || user.role === UserRole.ADMIN) {
    return;
  }

  const usageCount = await prisma.auditAssignment.count({
    where: {
      OR: [{ auditorId: id }, { auditeeId: id }],
    },
  });
  const responseCount = await prisma.auditResponse.count({ where: { auditeeId: id } });
  const designFactorCount = await prisma.designFactorAssessment.count({
    where: {
      OR: [{ auditorId: id }, { auditeeId: id }],
    },
  });

  const hasAuditHistory = usageCount > 0 || responseCount > 0 || designFactorCount > 0;

  if (hasAuditHistory) {
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    await prisma.user.delete({
      where: { id },
    });
  }

  await writeActivityLog({
    action: hasAuditHistory ? "Deactivate User" : "Delete User",
    entity: "User",
    entityId: id,
    details: hasAuditHistory
      ? `Admin menonaktifkan user ${user?.email ?? id} karena masih memiliki riwayat audit.`
      : `Admin menghapus user ${user?.email ?? id}.`,
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/logs");
}
