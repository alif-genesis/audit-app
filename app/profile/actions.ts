"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";

export type ProfileState = {
  toast?: {
    type: "success" | "error";
    message: string;
  };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateProfileAction(
  _previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.isActive) {
    return { toast: { type: "error", message: "Session tidak ditemukan." } };
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const companyName = String(formData.get("companyName") || "").trim();

  if (!name || !emailPattern.test(email)) {
    return {
      toast: {
        type: "error",
        message: "Nama wajib diisi dan format email harus valid.",
      },
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: currentUser.id },
    },
    select: { id: true },
  });

  if (existingUser) {
    return { toast: { type: "error", message: "Email sudah digunakan user lain." } };
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      name,
      email,
      companyName: companyName || null,
    },
  });

  await writeActivityLog({
    action: "Update Profile",
    entity: "User",
    entityId: currentUser.id,
    details: `User memperbarui profil: ${email}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/users");

  return { toast: { type: "success", message: "Profil berhasil diperbarui." } };
}

export async function changePasswordAction(
  _previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.isActive) {
    return { toast: { type: "error", message: "Session tidak ditemukan." } };
  }

  const oldPassword = String(formData.get("oldPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");

  if (newPassword.length < 6) {
    return { toast: { type: "error", message: "Password baru minimal 6 karakter." } };
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { passwordHash: true },
  });

  if (!user || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
    return { toast: { type: "error", message: "Password lama belum sesuai." } };
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
    },
  });

  await writeActivityLog({
    action: "Change Password",
    entity: "User",
    entityId: currentUser.id,
    details: "User mengganti password profil.",
  });

  return { toast: { type: "success", message: "Password berhasil diganti." } };
}
