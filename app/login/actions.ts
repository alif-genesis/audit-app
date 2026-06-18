"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, createSessionToken, getCurrentUser, isAdmin, isAuthenticated } from "@/lib/session";
import { writeActivityLog } from "@/lib/activity-log";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return {
        error: "Email atau password admin belum sesuai.",
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return {
        error: "Email atau password admin belum sesuai.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const cookieStore = await cookies();
    const useSecureCookie =
      process.env.AUTH_COOKIE_SECURE === "true" ||
      (process.env.AUTH_COOKIE_SECURE !== "false" && process.env.APP_URL?.startsWith("https://"));

    cookieStore.set(SESSION_COOKIE, createSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: useSecureCookie,
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        action: "Login",
        entity: "User",
        entityId: user.id,
        details: `User login: ${user.email}`,
      },
    });
  } catch {
    return {
      error: "Database belum siap. Jalankan PostgreSQL, migration, dan seed admin.",
    };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await writeActivityLog({
    action: "Logout",
    entity: "User",
    details: "User logout dari aplikasi.",
  });

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}

export async function hasAdminSession() {
  return isAdmin();
}

export async function hasActiveSession() {
  return isAuthenticated();
}

export async function getSessionUser() {
  return getCurrentUser();
}

export async function userCanAccessAdminArea() {
  const user = await getCurrentUser();
  return Boolean(user?.isActive && user.role === UserRole.ADMIN);
}
