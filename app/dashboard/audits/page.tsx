import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, Search, Settings } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { AutoRefreshPage } from "@/components/auto-refresh-page";
import { CustomSelect } from "@/components/custom-select";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  AddAuditDialog,
  DeleteAuditButton,
  EditAuditDialog,
} from "./audit-dialogs";

type AuditsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

export default async function AuditsPage({ searchParams }: AuditsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === "ADMIN";
  const params = (await searchParams) ?? {};
  const q = String(params.q || "").trim();
  const status = String(params.status || "").trim();

  const audits = await prisma.audit.findMany({
    where: {
      NOT: {
        auditType: {
          OR: [
            { name: { contains: "COBIT", mode: "insensitive" } },
            { isoStandard: { contains: "COBIT", mode: "insensitive" } },
          ],
        },
      },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status: status as any } : {}),
      ...(!isAdmin
        ? {
            assignments: {
              some: {
                OR: [
                  { auditeeId: currentUser.id },
                  { auditorId: currentUser.id },
                ],
              },
            },
          }
        : {}),
    },
    include: {
      auditType: {
        select: {
          name: true,
          isoStandard: true,
          _count: {
            select: { questions: true },
          },
        },
      },
      assignments: {
        include: {
          auditor: { select: { id: true, name: true } },
          auditee: { select: { id: true, name: true } },
        },
      },
      responses: {
        select: {
          id: true,
          auditeeId: true,
          submittedAt: true,
        },
      },
      findings: {
        select: {
          responseId: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const companies = isAdmin
    ? await prisma.company.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const auditTypes = isAdmin
    ? await prisma.auditType.findMany({
        where: {
          NOT: {
            OR: [
              { name: { contains: "COBIT", mode: "insensitive" } },
              { isoStandard: { contains: "COBIT", mode: "insensitive" } },
            ],
          },
        },
        select: { id: true, name: true, isoStandard: true },
        orderBy: { name: "asc" },
      })
    : [];

  const designFactorAssessments: Array<{ id: string; name: string; companyName: string; status: string }> = [];

  const users = isAdmin
    ? await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true, companyName: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <AdminShell active="audits">
      <AutoRefreshPage />
      <section className="page-header">
        <div>
          <div className="title-row">
            <img className="title-logo" src="/images/iso-logo.svg" alt="ISO Logo" />
            <h1>Audit</h1>
          </div>
          <p>Kelola program audit ISO perusahaan Anda.</p>
        </div>
        {isAdmin ? (
          <AddAuditDialog
            companies={companies}
            auditTypes={auditTypes}
            designFactorAssessments={designFactorAssessments}
            users={users}
          />
        ) : null}
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar Audit</h2>
            <p>Kelola semua program audit yang sedang berjalan atau telah selesai.</p>
          </div>
        </div>

        <AutoSubmitForm className="user-filter audit-filter" action="/dashboard/audits">
          <CustomSelect
            name="status"
            defaultValue={status ?? ""}
            ariaLabel="Filter status"
            options={[
              { value: "", label: "Semua Status" },
              { value: "DRAFT", label: "Draft" },
              { value: "IN_PROGRESS", label: "Sedang Berjalan" },
              { value: "COMPLETED", label: "Selesai" },
              { value: "REVIEWED", label: "Ditinjau" },
              { value: "APPROVED", label: "Disetujui" },
            ]}
          />

          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari judul atau perusahaan..."
            />
          </div>
        </AutoSubmitForm>

        <div className="table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Audit</th>
                <th>Perusahaan</th>
                <th>Framework</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Auditor</th>
                <th>Auditee</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px" }}>
                    <p style={{ color: "#667895" }}>Belum ada audit. Buat audit baru untuk memulai.</p>
                  </td>
                </tr>
              ) : (
                audits.map((audit) => {
                  const assignment = audit.assignments[0];
                  const isAssignedAuditee = assignment?.auditee?.id === currentUser.id;
                  const isAssignedAuditor = assignment?.auditor?.id === currentUser.id;
                  const submittedResponses = audit.responses.filter(
                    (response) => response.submittedAt,
                  );
                  const reviewedResponses = new Set(
                    audit.findings
                      .filter((finding) => finding.submittedAt && finding.responseId)
                      .map((finding) => finding.responseId),
                  );
                  const auditProgress = getAuditProgress({
                    responses: audit.responses,
                    totalQuestions: audit.responses.length || audit.auditType._count.questions,
                    reviewedResponses,
                  });
                  const totalQuestions = audit.responses.length || audit.auditType._count.questions;
                  const hasPendingAuditeeResponses =
                    totalQuestions > 0 &&
                    audit.responses.some(
                      (response) => response.auditeeId === currentUser.id && !response.submittedAt,
                    );
                  const hasPendingAuditorReview =
                    submittedResponses.some((response) => !reviewedResponses.has(response.id));

                  return (
                    <tr key={audit.id}>
                      <td>
                        <strong>{audit.title}</strong>
                      </td>
                      <td>{audit.companyName}</td>
                      <td>{audit.auditType.name}</td>
                      <td>{audit.mode === "GAP_ASSESSMENT" ? "Gap Assessment" : "Audit Internal"}</td>
                      <td>
                        <span className={`status-badge ${auditProgress.className}`}>
                          {auditProgress.label}
                        </span>
                      </td>
                      <td>{assignment?.auditor?.name || "-"}</td>
                      <td>{assignment?.auditee?.name || "-"}</td>
                      <td>
                        <div className="row-actions">
                          {isAssignedAuditee && hasPendingAuditeeResponses ? (
                            <Link
                              aria-label="Isi audit"
                              className="row-action-text"
                              href={`/dashboard/audits/responses/${audit.id}`}
                              title="Isi jawaban audit"
                            >
                              <Settings size={16} aria-hidden="true" />
                              Isi
                            </Link>
                          ) : null}
                          {isAssignedAuditor && hasPendingAuditorReview ? (
                            <Link
                              aria-label="Nilai audit"
                              className="row-action-text"
                              href={`/dashboard/audits/findings/${audit.id}`}
                              title="Nilai jawaban auditee"
                            >
                              <Settings size={16} aria-hidden="true" />
                              Nilai
                            </Link>
                          ) : null}
                          <Link
                            aria-label="Lihat audit"
                            href={`/dashboard/audits/${audit.id}/summary`}
                            title="Lihat hasil audit"
                          >
                            <Eye size={17} aria-hidden="true" />
                          </Link>
                          {isAdmin ? (
                            <>
                              <EditAuditDialog
                                audit={audit}
                                auditTypes={auditTypes}
                                users={users}
                              />
                              <DeleteAuditButton
                                auditId={audit.id}
                                auditTitle={audit.title}
                              />
                            </>
                          ) : null}
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

function getAuditProgress({
  responses,
  totalQuestions,
  reviewedResponses,
}: {
  responses: Array<{ id: string; submittedAt: Date | null }>;
  totalQuestions: number;
  reviewedResponses: Set<string | null>;
}) {
  const submittedResponses = responses.filter((response) => response.submittedAt);

  if (totalQuestions === 0 || submittedResponses.length < totalQuestions) {
    return {
      label: "Belum Diisi Auditee",
      className: "pending",
    };
  }

  const reviewedCount = submittedResponses.filter((response) =>
    reviewedResponses.has(response.id),
  ).length;

  if (reviewedCount < submittedResponses.length) {
    return {
      label: "Belum Dinilai Auditor",
      className: "review",
    };
  }

  return {
    label: "Telah Selesai",
    className: "done",
  };
}
