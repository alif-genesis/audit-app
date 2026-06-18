import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CapaStatus, FindingLevel, UserRole } from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ensureCapaForIsoAudit } from "@/lib/capa";
import { updateCapaStatusAction } from "../../workflow-actions";

const statusLabels: Record<CapaStatus, string> = {
  OPEN: "Menunggu CAPA",
  IN_PROGRESS: "Dalam Proses",
  VERIFICATION: "Menunggu Konfirmasi Auditor",
  CLOSED: "Dikonfirmasi",
  REJECTED: "Perlu Revisi",
};

type CapaAuditPageProps = {
  params: Promise<{ auditId: string }>;
};

export default async function CapaAuditPage({ params }: CapaAuditPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const { auditId } = await params;
  let audit: Awaited<ReturnType<typeof getCapaAudit>>;
  try {
    await ensureCapaForIsoAudit(auditId);
    audit = await getCapaAudit(auditId, currentUser);
  } catch (error) {
    console.error("Error loading CAPA detail:", error);
    return (
      <AdminShell active="capa">
        <section className="company-detail-header">
          <div className="company-title-block">
            <Link className="icon-link" href="/dashboard/capa" aria-label="Kembali">
              <ArrowLeft size={22} aria-hidden="true" />
            </Link>
            <div>
              <h1>CAPA</h1>
              <p>Database CAPA belum siap dibuka.</p>
            </div>
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

  if (!audit || audit.mode !== "AUDIT") {
    redirect("/dashboard/capa");
  }

  const assignment = audit.assignments[0];
  const hasAccess =
    currentUser.role === UserRole.ADMIN ||
    assignment?.auditorId === currentUser.id ||
    assignment?.auditeeId === currentUser.id;
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const canReview = currentUser.role === UserRole.ADMIN || assignment?.auditorId === currentUser.id;

  return (
    <AdminShell active="capa">
      <section className="company-detail-header">
        <div className="company-title-block">
          <Link className="icon-link" href="/dashboard/capa" aria-label="Kembali">
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <div>
            <h1>{audit.title}</h1>
            <p>{audit.companyName} - CAPA ISO</p>
          </div>
        </div>
      </section>

      <section className="audit-context-card">
        <div>
          <span>Framework</span>
          <strong>{audit.auditType.isoStandard || audit.auditType.name}</strong>
        </div>
        <div>
          <span>Auditor</span>
          <strong>{assignment?.auditor?.name ?? "-"}</strong>
        </div>
        <div>
          <span>Auditee</span>
          <strong>{assignment?.auditee?.name ?? "-"}</strong>
        </div>
        <div>
          <span>Total CAPA</span>
          <strong>{audit.findings.flatMap((finding) => finding.capaActions).length}</strong>
        </div>
      </section>

      <section className="users-panel">
        <div className="section-heading compact-heading">
          <div>
            <h2>Form CAPA</h2>
            <p>Auditee mengisi root cause dan corrective action; auditor mengonfirmasi setelah submit.</p>
          </div>
        </div>

        {audit.findings.length === 0 ? (
          <div className="empty-state">
            <h3>Belum ada CAPA</h3>
            <p>CAPA akan muncul setelah auditor submit finding ISO Minor atau Major.</p>
          </div>
        ) : (
          <div className="capa-list">
            {audit.findings.flatMap((finding) =>
              finding.capaActions.map((capa) => {
                const isOwner = capa.ownerId === currentUser.id;
                const fillableStatuses: CapaStatus[] = [CapaStatus.OPEN, CapaStatus.IN_PROGRESS, CapaStatus.REJECTED];
                const canFill = isOwner && fillableStatuses.includes(capa.status);
                const canConfirm = canReview && capa.status === CapaStatus.VERIFICATION;

                return (
                  <article className="capa-card" key={capa.id}>
                    <div className="capa-card-header">
                      <div>
                        <span className={`status-pill ${finding.level === FindingLevel.MAJOR ? "danger" : "warning"}`}>
                          {finding.level}
                        </span>
                        <h3>{finding.response?.question.clause ?? "Finding audit"}</h3>
                        <p>{finding.response?.question.title || "Pertanyaan audit"}</p>
                      </div>
                      <span className="status-pill">{statusLabels[capa.status]}</span>
                    </div>

                    <div className="capa-content-grid">
                      <div>
                        <strong>Pertanyaan Audit</strong>
                        <p>
                          {finding.response?.question.question || "Pertanyaan audit tidak tersedia."}
                          {finding.response?.question.requirement ? ` Requirement: ${finding.response.question.requirement}` : ""}
                        </p>
                      </div>
                      <div>
                        <strong>Kenapa menjadi {finding.level}</strong>
                        <p>{finding.description || "Auditor belum mengisi deskripsi temuan."}</p>
                      </div>
                      <div>
                        <strong>Jawaban Auditee</strong>
                        <p>{formatCompliance(finding.response?.compliance)} - {finding.response?.description || "Tidak ada deskripsi jawaban."}</p>
                      </div>
                    </div>

                    <div className="capa-meta-grid">
                      <MetaItem label="PIC Auditee" value={capa.owner.name} />
                      <MetaItem label="Due Date" value={formatDate(capa.dueDate)} />
                      <MetaItem label="Auditor Confirm" value={capa.verifiedBy?.name ?? "-"} />
                    </div>

                    <div className="capa-content-grid">
                      <div>
                        <strong>Root Cause</strong>
                        <p>{capa.rootCause || "Belum diisi auditee."}</p>
                      </div>
                      <div>
                        <strong>Corrective Action</strong>
                        <p>{capa.correctiveAction || "Belum diisi auditee."}</p>
                      </div>
                      <div>
                        <strong>Evidence / Catatan</strong>
                        <p>{capa.evidenceNotes || "-"}</p>
                      </div>
                    </div>

                    {canFill ? (
                      <form className="capa-form" action={updateCapaStatusAction}>
                        <input name="capaId" type="hidden" value={capa.id} />
                        <input name="status" type="hidden" value="VERIFICATION" />
                        <label>
                          <span>Root Cause</span>
                          <textarea name="rootCause" defaultValue={capa.rootCause ?? ""} required />
                        </label>
                        <label>
                          <span>Corrective Action</span>
                          <textarea name="correctiveAction" defaultValue={capa.correctiveAction ?? ""} required />
                        </label>
                        <label>
                          <span>Due Date</span>
                          <input name="dueDate" type="date" defaultValue={toDateInput(capa.dueDate)} required />
                        </label>
                        <label>
                          <span>Evidence / Catatan Implementasi</span>
                          <textarea name="evidenceNotes" defaultValue={capa.evidenceNotes ?? ""} />
                        </label>
                        <button className="primary-button" type="submit">
                          Submit CAPA
                        </button>
                      </form>
                    ) : null}

                    {canConfirm ? (
                      <div className="capa-review-actions">
                        <form action={updateCapaStatusAction}>
                          <input name="capaId" type="hidden" value={capa.id} />
                          <input name="status" type="hidden" value="CLOSED" />
                          <label>
                            <span>Catatan Konfirmasi</span>
                            <textarea name="verificationNotes" defaultValue={capa.verificationNotes ?? ""} />
                          </label>
                          <button className="primary-button" type="submit">
                            Confirm CAPA
                          </button>
                        </form>
                        <form action={updateCapaStatusAction}>
                          <input name="capaId" type="hidden" value={capa.id} />
                          <input name="status" type="hidden" value="REJECTED" />
                          <label>
                            <span>Alasan Revisi</span>
                            <textarea name="verificationNotes" defaultValue={capa.verificationNotes ?? ""} required />
                          </label>
                          <button className="secondary-button" type="submit">
                            Reject
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                );
              }),
            )}
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function getCapaAudit(auditId: string, currentUser: { id: string; role: UserRole }) {
  return prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      auditType: true,
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
          response: {
            include: {
              question: true,
            },
          },
          capaActions: {
            include: {
              owner: { select: { id: true, name: true, email: true } },
              verifiedBy: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCompliance(value?: string) {
  if (value === "COMPLY") return "Comply";
  if (value === "NOT_COMPLY") return "Not Comply";
  if (value === "PARTIAL") return "Partial";
  return "Belum ada jawaban";
}

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function toDateInput(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}
