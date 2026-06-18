import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, Search, Settings } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { CustomSelect } from "@/components/custom-select";
import { buildDesignFactorSummaryRows } from "@/lib/cobit/auditScope";
import { syncCompletedDesignFactorAssessments } from "@/lib/cobit/designFactorStatus";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  AddDesignFactorDialog,
  DeleteDesignFactorButton,
  EditDesignFactorDialog,
} from "./design-factor-dialogs";

type DesignFactorsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
};
const designFactors = ["df01", "df02", "df03", "df04", "df05", "df06", "df07", "df08", "df09", "df10"] as const;

export default async function DesignFactorsPage({ searchParams }: DesignFactorsPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === "ADMIN";
  const params = (await searchParams) ?? {};
  const q = String(params.q || "").trim();
  const status = String(params.status || "").trim();

  await syncCompletedDesignFactorAssessments();

  const assessments = await prisma.designFactorAssessment.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status: status as any } : {}),
      ...(!isAdmin
        ? {
            OR: [
              { auditeeId: currentUser.id },
              { auditorId: currentUser.id },
            ],
          }
        : {}),
    },
    include: {
      auditor: { select: { id: true, name: true } },
      auditee: { select: { id: true, name: true } },
      objectiveResults: { select: { relativeImportance: true } },
      df01Input: true,
      df02Input: true,
      df03Input: true,
      df04Input: true,
      df05Input: true,
      df06Input: true,
      df07Input: true,
      df08Input: true,
      df09Input: true,
      df10Input: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const companies = isAdmin
    ? await prisma.company.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
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
    <AdminShell active="design-factors">
      <section className="page-header">
        <div>
          <div className="title-row">
            <img className="title-logo cobit" src="/images/cobit-logo.png" alt="COBIT Logo" />
            <h1>Design Factors (COBIT 2019)</h1>
          </div>
          <p>Kelola assessment Design Factors dan assignment auditor serta auditee.</p>
        </div>
        {isAdmin ? <AddDesignFactorDialog companies={companies} users={users} /> : null}
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar Assessment</h2>
            <p>Assessment yang tersedia sesuai role dan assignment pengguna.</p>
          </div>
        </div>

        <AutoSubmitForm className="user-filter audit-filter" action="/dashboard/design-factors">
          <CustomSelect
            name="status"
            defaultValue={status}
            ariaLabel="Filter status"
            options={[
              { value: "", label: "Semua Status" },
              { value: "DRAFT", label: "Draft" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "SUBMITTED", label: "Submitted" },
              { value: "REVIEWED", label: "Reviewed" },
              { value: "APPROVED", label: "Approved" },
            ]}
          />

          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Cari assessment atau company..." />
          </div>
        </AutoSubmitForm>

        <div className="table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Company</th>
                <th>Status</th>
                <th>Target</th>
                <th>Auditor</th>
                <th>Auditee</th>
                <th>Due Date</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {assessments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px" }}>
                    <p style={{ color: "#667895" }}>Belum ada assessment Design Factor.</p>
                  </td>
                </tr>
              ) : (
                assessments.map((assessment) => {
                  const focusCount = buildDesignFactorSummaryRows(assessment).filter(
                    (result) => result.suggestedCapability === 4,
                  ).length;
                  const isAssignedAuditee = assessment.auditeeId === currentUser.id;
                  const isAssignedAuditor = assessment.auditorId === currentUser.id;
                  const auditeeFullySubmitted = isSideFullySubmitted(assessment, "Auditee");
                  const auditorFullySubmitted = isSideFullySubmitted(assessment, "Auditor");
                  const canAuditeeFill = isAssignedAuditee && !auditeeFullySubmitted && !["SUBMITTED", "REVIEWED", "APPROVED"].includes(assessment.status);
                  const needsAuditorReview =
                    isAssignedAuditor &&
                    !auditorFullySubmitted &&
                    !["SUBMITTED", "REVIEWED", "APPROVED"].includes(assessment.status);

                  return (
                    <tr key={assessment.id}>
                      <td>
                        <strong>{assessment.name}</strong>
                        <span>Jumlah Fokus: {focusCount} Level 4</span>
                      </td>
                      <td>{assessment.companyName}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(assessment.status)}`}>
                          {statusLabels[assessment.status] ?? assessment.status}
                        </span>
                      </td>
                      <td>{assessment.targetScore ?? "-"}</td>
                      <td>{assessment.auditor.name}</td>
                      <td>{assessment.auditee.name}</td>
                      <td>{assessment.dueDate ? formatDate(assessment.dueDate) : "-"}</td>
                      <td>
                        <div className="row-actions">
                          {canAuditeeFill ? (
                            <Link
                              className="row-action-text"
                              href={`/dashboard/design-factors/${assessment.id}`}
                              title="Isi assessment"
                            >
                              <Settings size={16} aria-hidden="true" />
                              Isi
                            </Link>
                          ) : null}
                          {needsAuditorReview ? (
                            <Link
                              className="row-action-text"
                              href={`/dashboard/design-factors/${assessment.id}`}
                              title="Review assessment"
                            >
                              <Settings size={16} aria-hidden="true" />
                              Review
                            </Link>
                          ) : null}
                          <Link
                            aria-label="Lihat assessment"
                            href={`/dashboard/design-factors/${assessment.id}`}
                            title="Lihat assessment"
                          >
                            <Eye size={17} aria-hidden="true" />
                          </Link>
                          {isAdmin ? (
                            <>
                              <EditDesignFactorDialog assessment={assessment} users={users} />
                              <DeleteDesignFactorButton
                                assessmentId={assessment.id}
                                assessmentName={assessment.name}
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusClass(status: string) {
  if (status === "SUBMITTED" || status === "REVIEWED") {
    return "review";
  }
  if (status === "APPROVED") {
    return "done";
  }
  return "pending";
}

function isSideFullySubmitted(
  assessment: Record<string, unknown>,
  side: "Auditee" | "Auditor",
) {
  return designFactors.every((factor) => Boolean(assessment[`${factor}${side}SubmittedAt`]));
}
