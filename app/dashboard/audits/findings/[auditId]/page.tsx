import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { syncCobitAuditResponses } from "@/lib/cobit/auditSync";
import { AdminShell } from "@/components/admin-shell";
import { AuditFindingsForm } from "../findings-form";

type AuditFindingsPageProps = {
  params: Promise<{
    auditId: string;
  }>;
};

export default async function AuditFindingsPage({
  params,
}: AuditFindingsPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const { auditId } = await params;

  // Check if user is assigned to this audit as auditor
  const assignment = await prisma.auditAssignment.findFirst({
    where: {
      auditId,
      auditorId: currentUser.id,
    },
  });

  if (!assignment) {
    redirect("/dashboard");
  }

  // Get audit details
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      auditType: true,
      assignments: {
        include: {
          auditor: { select: { name: true } },
          auditee: { select: { name: true } },
        },
      },
    },
  });

  if (!audit) {
    redirect("/dashboard");
  }
  const isCobit = `${audit.auditType.name} ${audit.auditType.isoStandard}`.toUpperCase().includes("COBIT");
  if (isCobit) {
    await syncCobitAuditResponses(auditId);
  }

  // Get responses with findings
  const responses = await prisma.auditResponse.findMany({
    where: {
      auditId,
      submittedAt: { not: null },
    },
    include: {
      question: {
        select: {
          id: true,
          clause: true,
          title: true,
          question: true,
          requirement: true,
        },
      },
      auditee: {
        select: { name: true },
      },
    },
    orderBy: {
      question: {
        sortOrder: "asc",
      },
    },
  });

  // Get findings
  const findings = await prisma.auditFinding.findMany({
    where: { auditId },
  });

  const findingMap = new Map(
    findings
      .filter((finding) => finding.responseId)
      .map((finding) => [finding.responseId as string, finding]),
  );

  return (
    <AdminShell active={isCobit ? "cobit-audits" : "audits"}>
      <section className="company-detail-header">
        <div className="company-title-block">
          <Link className="icon-link" href={isCobit ? "/dashboard/cobit-audits" : "/dashboard/audits"} aria-label="Kembali">
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <div>
            <h1>{audit.title}</h1>
            <p>Penilaian Auditor - {audit.companyName}</p>
          </div>
        </div>
        <div className="detail-actions">
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#667895" }}>
              Auditee
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "16px",
                fontWeight: "850",
                color: "#1c57df",
              }}
            >
              {audit.assignments[0]?.auditee.name}
            </p>
          </div>
        </div>
      </section>

      <section className="audit-context-card">
        <div>
          <span>Audit</span>
          <strong>{audit.title}</strong>
        </div>
        <div>
          <span>Tipe Audit</span>
          <strong>{audit.mode === "GAP_ASSESSMENT" ? "Gap Assessment" : "Audit Internal"}</strong>
        </div>
        <div>
          <span>Framework</span>
          <strong>{audit.auditType.name}</strong>
        </div>
        <div>
          <span>Perusahaan</span>
          <strong>{audit.companyName}</strong>
        </div>
        <div>
          <span>Auditor</span>
          <strong>{audit.assignments[0]?.auditor?.name ?? "-"}</strong>
        </div>
        <div>
          <span>Auditee</span>
          <strong>{audit.assignments[0]?.auditee?.name ?? "-"}</strong>
        </div>
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Penilaian Audit</h2>
            <p>{isCobit ? "Review jawaban auditee per domain, objective, dan level capability." : "Nilai setiap jawaban auditee dengan level Major, Minor, OFI, atau Pass."}</p>
          </div>
        </div>

        {responses.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#667895",
            }}
          >
            Belum ada jawaban dari auditee.
          </div>
        ) : (
          <AuditFindingsForm audit={audit} responses={responses} findings={findingMap} />
        )}
      </section>
    </AdminShell>
  );
}
