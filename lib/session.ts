import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "audit_admin_session";
const SESSION_VERSION = "v1";

function getSessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.DATABASE_URL || "development-session-secret";
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = `${SESSION_VERSION}.${userId}`;
  return `${payload}.${signSessionPayload(payload)}`;
}

function readUserIdFromSessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [version, userId, signature] = parts;
  if (version !== SESSION_VERSION || !userId || !signature) {
    return null;
  }

  const payload = `${version}.${userId}`;
  const expected = signSessionPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer) ? userId : null;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = sessionToken ? readUserIdFromSessionToken(sessionToken) : null;

  if (!userId) {
    return null;
  }

  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyName: true,
        isActive: true,
      },
    });
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return Boolean(user?.isActive);
}

export async function isAdmin() {
  const user = await getCurrentUser();
  return Boolean(user?.isActive && user.role === UserRole.ADMIN);
}

export async function getActiveAdmin() {
  const user = await getCurrentUser();
  return user?.isActive && user.role === UserRole.ADMIN ? user : null;
}
