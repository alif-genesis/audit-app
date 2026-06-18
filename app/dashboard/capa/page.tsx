import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Eye, Settings } from "lucide-react";
import { CapaStatus, FindingLevel, UserRole } from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ensureCapaForIsoAudit } from "@/lib/capa";

const statusLabels: Record<CapaStatus, string> = {
  OPEN: "Menunggu CAPA",
  IN_PROGRESS: "Dalam Proses",
  VERIFICATION: "Menunggu Konfirmasi",
  CLOSED: "Dikonfirmasi",
  REJECTED: "Perlu Revisi",
};

export default async function CapaPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const capaReady = await syncIsoCapa(currentUser);
  if (!capaReady) {
    return (
      <AdminShell active="capa">
        <section className="page-header">
          <div>
            <h1>CAPA</h1>
            <p>Corrective Action Preventive Action untuk temuan ISO Minor dan Major.</p>
          </div>
        </section>
        <section className="users-panel">
          <div className="empty-state">
            <h3>CAPA belum siap dibuka</h3>
            <p>Database CAPA belum terbentuk. Jalankan migration Prisma lalu refresh halaman ini.</p>
          </div>
        </section>
      </AdminShell>
    );
  }

  const audits = await prisma.audit.findMany({
    where: {
      mode: "AUDIT",
      auditType: isoAuditTypeWhere(),
      findings: {
        some: {
          level: { in: [FindingLevel.MINOR, FindingLevel.MAJOR] },
          submittedAt: { not: null },
          capaActions: {
            some: currentUser.role === UserRole.AUDITEE ? { ownerId: currentUser.id } : {},
          },
        },
      },
      ...assignmentWhere(currentUser),
    },
    select: {
      id: true,
      title: true,
      companyName: true,
      updatedAt: true,
      auditType: { select: { name: true, isoStandard: true } },
      assignments: {
        include: {
          auditor: { select: { id: true, name: true } },
          auditee: { select: { id: true, name: true } },
        },
      },
      findings: {
        where: {
          level: { in: [FindingLevel.MINOR, FindingLevel.MAJOR] },
          submittedAt: { not: null },
          capaActions: {
            some: currentUser.role === UserRole.AUDITEE ? { ownerId: currentUser.id } : {},
          },
        },
        include: {
          capaActions: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AdminShell active="capa">
      <section className="page-header">
        <div>
          <h1>CAPA</h1>
          <p>Corrective Action Preventive Action untuk temuan ISO Minor dan Major.</p>
        </div>
      </section>

      <section className="users-panel">
        <div className="section-heading compact-heading">
          <div>
            <h2>Daftar CAPA Per Audit</h2>
            <p>Pilih audit ISO, lalu isi atau konfirmasi CAPA per temuan.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Audit</th>
                <th>Framework</th>
                <th>Auditor</th>
                <th>Auditee</th>
                <th>Temuan CAPA</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "#667895" }}>Belum ada CAPA. CAPA muncul setelah finding ISO Minor/Major disubmit auditor.</p>
                  </td>
                </tr>
              ) : (
                audits.map((audit) => {
                  const assignment = audit.assignments[0];
                  const actions = audit.findings.flatMap((finding) => finding.capaActions);
                  const counts = countCapaStatuses(actions);
                  const fillableStatuses: CapaStatus[] = [CapaStatus.OPEN, CapaStatus.IN_PROGRESS, CapaStatus.REJECTED];
                  const needsAuditee = actions.some(
                    (action) =>
                      action.ownerId === currentUser.id &&
                      fillableStatuses.includes(action.status),
                  );
                  const needsReview =
                    currentUser.role !== UserRole.AUDITEE &&
                    actions.some((action) => action.status === CapaStatus.VERIFICATION);
                  const actionLabel = needsAuditee ? "Isi" : needsReview ? "Konfirmasi" : "Lihat";

                  return (
                    <tr key={audit.id}>
                      <td>
                        <strong>{audit.title}</strong>
                        <span>{audit.companyName}</span>
                      </td>
                      <td>{audit.auditType.isoStandard || audit.auditType.name}</td>
                      <td>{assignment?.auditor?.name ?? "-"}</td>
                      <td>{assignment?.auditee?.name ?? "-"}</td>
                      <td>
                        <strong>{actions.length}</strong>
                        <span>{audit.findings.length} temuan Minor/Major</span>
                      </td>
                      <td>
                        <span className={`status-badge ${getAggregateStatusClass(counts)}`}>
                          {formatAggregateStatus(counts)}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link className="row-action-text" href={`/dashboard/capa/${audit.id}`} title={`${actionLabel} CAPA`}>
                            {actionLabel === "Lihat" ? <Eye size={16} aria-hidden="true" /> : <Settings size={16} aria-hidden="true" />}
                            {actionLabel}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

async function syncIsoCapa(currentUser: { id: string; role: UserRole }) {
  try {
    const candidateAudits = await prisma.audit.findMany({
      where: {
        mode: "AUDIT",
        auditType: isoAuditTypeWhere(),
        findings: {
          some: {
            level: { in: [FindingLevel.MINOR, FindingLevel.MAJOR] },
            submittedAt: { not: null },
            capaActions: { none: {} },
          },
        },
        ...assignmentWhere(currentUser),
      },
      select: { id: true },
    });

    for (const audit of candidateAudits) {
      await ensureCapaForIsoAudit(audit.id);
    }
    return true;
  } catch (error) {
    console.error("Error loading CAPA:", error);
    return false;
  }
}

function isoAuditTypeWhere() {
  return {
    NOT: [
      { name: { contains: "COBIT", mode: "insensitive" as const } },
      { isoStandard: { contains: "COBIT", mode: "insensitive" as const } },
    ],
  };
}

function assignmentWhere(currentUser: { id: string; role: UserRole }) {
  if (currentUser.role === UserRole.AUDITOR) {
    return { assignments: { some: { auditorId: currentUser.id } } };
  }
  if (currentUser.role === UserRole.AUDITEE) {
    return { assignments: { some: { auditeeId: currentUser.id } } };
  }
  return {};
}

function countCapaStatuses(actions: Array<{ status: CapaStatus }>) {
  return actions.reduce(
    (counts, action) => ({ ...counts, [action.status]: counts[action.status] + 1 }),
    {
      OPEN: 0,
      IN_PROGRESS: 0,
      VERIFICATION: 0,
      CLOSED: 0,
      REJECTED: 0,
    } satisfies Record<CapaStatus, number>,
  );
}

function formatAggregateStatus(counts: Record<CapaStatus, number>) {
  if (counts.REJECTED > 0) return `${counts.REJECTED} Perlu Revisi`;
  if (counts.VERIFICATION > 0) return `${counts.VERIFICATION} Menunggu Konfirmasi`;
  if (counts.OPEN + counts.IN_PROGRESS > 0) return `${counts.OPEN + counts.IN_PROGRESS} Menunggu CAPA`;
  return "Selesai";
}

function getAggregateStatusClass(counts: Record<CapaStatus, number>) {
  if (counts.REJECTED > 0) return "rejected";
  if (counts.VERIFICATION > 0) return "review";
  if (counts.OPEN + counts.IN_PROGRESS > 0) return "pending";
  return "done";
}

export { statusLabels };
