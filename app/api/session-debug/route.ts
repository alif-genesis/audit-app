import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, getActiveAdmin } from "@/lib/session";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getActiveAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  return NextResponse.json({
    cookieName: SESSION_COOKIE,
    hasCookie: Boolean(sessionCookie?.value),
    cookiePreview: sessionCookie?.value ? `${sessionCookie.value.slice(0, 6)}...` : null,
    userFound: Boolean(user),
    userRole: user?.role ?? null,
    userActive: user?.isActive ?? null,
    appUrl: process.env.APP_URL ?? null,
    authCookieSecure: process.env.AUTH_COOKIE_SECURE ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
