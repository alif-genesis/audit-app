import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type WriteActivityLogInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  details: string;
};

export const ALLOWED_ACTIVITY_ACTIONS = [
  "Login",
  "Create",
  "Update",
  "Delete",
  "Submit",
  "Approve",
  "Reject",
  "Upload Evidence",
  "Download Report",
] as const;

export async function writeActivityLog(input: WriteActivityLogInput) {
  const action = normalizeActivityAction(input.action);
  if (!action) {
    return;
  }

  const user = await getCurrentUser();
  const headerStore = await headers();
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;

  await prisma.activityLog.create({
    data: {
      actorId: user?.id ?? null,
      actorName: user?.name ?? "System",
      actorEmail: user?.email ?? "system@local",
      action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: input.details,
      ipAddress,
    },
  });
}

export function normalizeActivityAction(action: string): (typeof ALLOWED_ACTIVITY_ACTIONS)[number] | null {
  const normalized = action.toLowerCase();

  if (normalized.includes("login")) return "Login";
  if (normalized.includes("download") && normalized.includes("report")) return "Download Report";
  if (normalized.includes("upload") && normalized.includes("evidence")) return "Upload Evidence";
  if (normalized.includes("approve") || normalized.includes("approved")) return "Approve";
  if (normalized.includes("reject") || normalized.includes("rejected")) return "Reject";
  if (normalized.includes("submit")) return "Submit";
  if (normalized.includes("create")) return "Create";
  if (normalized.includes("update")) return "Update";
  if (normalized.includes("delete") || normalized.includes("deactivate")) return "Delete";

  return null;
}
