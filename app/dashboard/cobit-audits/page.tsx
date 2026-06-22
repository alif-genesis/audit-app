import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, Radar, Search, Settings } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { AutoRefreshPage } from "@/components/auto-refresh-page";
import { CustomSelect } from "@/components/custom-select";
import { buildCobitAuditSummary, buildCobitAuditorResponseData } from "@/lib/cobit/capabilityAudit";
import { syncCobitAuditResponses } from "@/lib/cobit/auditSync";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ensureCobitAuditFromSubmittedDesignFactor } from "../design-factors/actions";
import { AddAuditDialog, DeleteAuditButton, EditAuditDialog } from "../audits/audit-dialogs";

type CobitAuditsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

export default async function CobitAuditsPage({ searchParams }: CobitAuditsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === "ADMIN";
  const params = (await searchParams) ?? {};
  const q = String(params.q || "").trim();
  const status = String(params.status || "").trim();

  if (isAdmin) {
    const submittedDesignFactors = await prisma.designFactorAssessment.findMany({
      where: { status: "SUBMITTED" },
      select: { id: true },
    });
    for (const assessment of submittedDesignFactors) {
      await ensureCobitAuditFromSubmittedDesignFactor(assessment.id);
    }
  }

  const cobitAuditWhere = {
    auditType: {
      OR: [
        { name: { contains: "COBIT", mode: "insensitive" as const } },
        { isoStandard: { contains: "COBIT", mode: "insensitive" as const } },
      ],
    },
    ...(!isAdmin
      ? {
          assignments: {
            some: {
              OR: [{ auditeeId: currentUser.id }, { auditorId: currentUser.id }],
            },
          },
        }
      : {}),
  };
  const syncCandidates = await prisma.audit.findMany({
    where: cobitAuditWhere,
    select: { id: true },
  });
  for (const audit of syncCandidates) {
    await syncCobitAuditResponses(audit.id);
  }

  const audits = await prisma.audit.findMany({
    where: {
      ...cobitAuditWhere,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status: status as any } : {}),
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
          questionId: true,
          compliance: true,
          submittedAt: true,
          question: {
            select: {
              id: true,
              clause: true,
              title: true,
            },
          },
        },
      },
      findings: {
        select: {
          responseId: true,
          level: true,
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
          OR: [
            { name: { contains: "COBIT", mode: "insensitive" } },
            { isoStandard: { contains: "COBIT", mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, isoStandard: true },
        orderBy: { name: "asc" },
      })
    : [];

  const designFactorAssessments = isAdmin
    ? await prisma.designFactorAssessment.findMany({
        where: {
          status: { in: ["SUBMITTED", "REVIEWED", "APPROVED"] },
        },
        select: {
          id: true,
          name: true,
          companyName: true,
          status: true,
        },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const users = isAdmin
    ? await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true, companyName: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <AdminShell active="cobit-audits">
      <AutoRefreshPage />
      <section className="page-header">
        <div>
          <div className="title-row">
            <img className="title-logo cobit" src="/images/cobit-logo.png" alt="COBIT Logo" />
            <h1>Audit COBIT</h1>
          </div>
          <p>Kelola audit capability COBIT berdasarkan domain EDM, APO, BAI, DSS, dan MEA.</p>
        </div>
        {isAdmin ? (
          <AddAuditDialog
            companies={companies}
            auditTypes={auditTypes}
            designFactorAssessments={designFactorAssessments}
            users={users}
            cobitOnly
          />
        ) : null}
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar Audit COBIT</h2>
            <p>Audit capability level dan domain COBIT yang sedang berjalan.</p>
          </div>
        </div>

        <AutoSubmitForm className="user-filter audit-filter" action="/dashboard/cobit-audits">
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
            <input name="q" defaultValue={q} placeholder="Cari judul atau perusahaan..." />
          </div>
        </AutoSubmitForm>

        <div className="table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Audit</th>
                <th>Perusahaan</th>
                <th>Framework</th>
                <th>Tipe Audit</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Baseline</th>
                <th>Overall</th>
                <th>Auditor</th>
                <th>Auditee</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "40px" }}>
                    <p style={{ color: "#667895" }}>Belum ada audit COBIT.</p>
                  </td>
                </tr>
              ) : (
                audits.map((audit) => {
                  const assignment = audit.assignments[0];
                  const isAssignedAuditee = assignment?.auditee?.id === currentUser.id;
                  const isAssignedAuditor = assignment?.auditor?.id === currentUser.id;
                  const submittedResponses = audit.responses.filter((response) => response.submittedAt);
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
                  const hasPendingAuditorReview = submittedResponses.some((response) => !reviewedResponses.has(response.id));
                  const cobitSummary = buildCobitAuditSummary(
                    audit.responses.map((response) => response.question),
                    buildCobitAuditorResponseData(audit.responses, audit.findings),
                    audit.description,
                  );

                  return (
                    <tr key={audit.id}>
                      <td>
                        <strong>{audit.title}</strong>
                      </td>
                      <td>{audit.companyName}</td>
                      <td>{audit.auditType.name}</td>
                      <td>{audit.mode === "GAP_ASSESSMENT" ? "Gap Assessment" : "Audit Internal"}</td>
                      <td>{getCobitScopeLabel(audit.description, totalQuestions)}</td>
                      <td>
                        <span className={`status-badge ${auditProgress.className}`}>{auditProgress.label}</span>
                      </td>
                      <td>{cobitSummary.baseline}</td>
                      <td>
                        <strong>{cobitSummary.overallCapability.toFixed(2)}</strong>
                      </td>
                      <td>{assignment?.auditor?.name || "-"}</td>
                      <td>{assignment?.auditee?.name || "-"}</td>
                      <td>
                        <div className="row-actions">
                          {isAssignedAuditee && hasPendingAuditeeResponses ? (
                            <Link className="row-action-text" href={`/dashboard/audits/responses/${audit.id}`} title="Isi jawaban COBIT">
                              <Settings size={16} aria-hidden="true" />
                              Isi
                            </Link>
                          ) : null}
                          {isAssignedAuditor && hasPendingAuditorReview ? (
                            <Link className="row-action-text" href={`/dashboard/audits/findings/${audit.id}`} title="Nilai jawaban COBIT">
                              <Settings size={16} aria-hidden="true" />
                              Nilai
                            </Link>
                          ) : isAssignedAuditor && submittedResponses.length === 0 ? (
                            <span className="row-action-note">Menunggu auditee submit</span>
                          ) : null}
                          <Link href={`/dashboard/audits/${audit.id}/summary`} title="Lihat hasil audit">
                            <Eye size={17} aria-hidden="true" />
                          </Link>
                          {isAdmin ? (
                            <>
                              <EditAuditDialog audit={audit} auditTypes={auditTypes} users={users} />
                              <DeleteAuditButton auditId={audit.id} auditTitle={audit.title} />
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

function getCobitScopeLabel(description: string | null, questionCount: number) {
  const match = String(description ?? "").match(/Scope Audit COBIT:\s*(.+)/i);
  if (match?.[1]) {
    return match[1].trim();
  }
  if (questionCount <= 24) return "24 Domain BUMN";
  if (questionCount >= 190) return "Seluruh Domain";
  return "Design Factor";
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
    return { label: "Menunggu Submit Auditee", className: "pending" };
  }

  const reviewedCount = submittedResponses.filter((response) => reviewedResponses.has(response.id)).length;

  if (reviewedCount < submittedResponses.length) {
    return { label: "Belum Dinilai Auditor", className: "review" };
  }

  return { label: "Telah Selesai", className: "done" };
}
