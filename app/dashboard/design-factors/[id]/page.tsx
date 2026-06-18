import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import {
  defaultDf01Rows,
  defaultDf02Rows,
  defaultDf03Rows,
  defaultDf04Rows,
  defaultDf05Rows,
  defaultDf06Rows,
  defaultDf07Rows,
  defaultDf08Rows,
  defaultDf09Rows,
  defaultDf10Rows,
  type Df01InputRow,
  type Df02InputRow,
  type Df03InputRow,
  type Df04InputRow,
  type Df05InputRow,
  type Df06InputRow,
  type Df07InputRow,
  type Df08InputRow,
  type Df09InputRow,
  type Df10InputRow,
} from "@/lib/cobit/designFactorMatrix";
import { syncCompletedDesignFactorAssessments } from "@/lib/cobit/designFactorStatus";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { transitionDesignFactorApprovalAction } from "../../workflow-actions";
import { DesignFactorWorkspace } from "./design-factor-workspace";

type DesignFactorDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DesignFactorDetailPage({ params }: DesignFactorDetailPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const { id } = await params;
  await syncCompletedDesignFactorAssessments();

  const assessment = await prisma.designFactorAssessment.findUnique({
    where: { id },
    include: {
      auditor: { select: { id: true, name: true } },
      auditee: { select: { id: true, name: true } },
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
  });

  if (!assessment) {
    redirect("/dashboard/design-factors");
  }

  const hasAccess =
    currentUser.role === "ADMIN" ||
    assessment.auditeeId === currentUser.id ||
    assessment.auditorId === currentUser.id;

  if (!hasAccess) {
    redirect("/dashboard");
  }
  const isAdmin = currentUser.role === "ADMIN";

  const canEdit =
    (assessment.auditeeId === currentUser.id || assessment.auditorId === currentUser.id) &&
    assessment.status !== "SUBMITTED" &&
    assessment.status !== "REVIEWED" &&
    assessment.status !== "APPROVED";
  const initialRows = assessment.df01Input ? mapDf01Input(assessment.df01Input) : defaultDf01Rows();
  const initialDf02Rows = assessment.df02Input ? mapDf02Input(assessment.df02Input) : defaultDf02Rows();
  const initialDf03Rows = assessment.df03Input ? mapDf03Input(assessment.df03Input) : defaultDf03Rows();
  const initialDf04Rows = assessment.df04Input ? mapDf04Input(assessment.df04Input) : defaultDf04Rows();
  const initialDf05Rows = assessment.df05Input ? mapDf05Input(assessment.df05Input) : defaultDf05Rows();
  const initialDf06Rows = assessment.df06Input ? mapDf06Input(assessment.df06Input) : defaultDf06Rows();
  const initialDf07Rows = assessment.df07Input ? mapDf07Input(assessment.df07Input) : defaultDf07Rows();
  const initialDf08Rows = assessment.df08Input ? mapDf08Input(assessment.df08Input) : defaultDf08Rows();
  const initialDf09Rows = assessment.df09Input ? mapDf09Input(assessment.df09Input) : defaultDf09Rows();
  const initialDf10Rows = assessment.df10Input ? mapDf10Input(assessment.df10Input) : defaultDf10Rows();
  const userSide =
    assessment.auditeeId === currentUser.id
      ? "AUDITEE"
      : assessment.auditorId === currentUser.id
        ? "AUDITOR"
        : currentUser.role === "ADMIN"
          ? "ADMIN"
          : "NONE";

  return (
    <AdminShell active="design-factors">
      <section className="company-detail-header">
        <div className="company-title-block">
          <Link className="icon-link" href="/dashboard/design-factors" aria-label="Kembali">
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <div>
            <h1>{assessment.name}</h1>
            <p>{assessment.companyName}</p>
          </div>
        </div>
        <div className="detail-actions">
          <span className={`status-badge ${getStatusClass(assessment.status)}`}>{formatStatus(assessment.status)}</span>
        </div>
      </section>

      <section className="audit-context-card">
        <div>
          <span>Assessment</span>
          <strong>{assessment.name}</strong>
        </div>
        <div>
          <span>Company</span>
          <strong>{assessment.companyName}</strong>
        </div>
        <div>
          <span>Tipe Assessment</span>
          <strong>COBIT Design Factor</strong>
        </div>
        <div>
          <span>Auditor</span>
          <strong>{assessment.auditor.name}</strong>
        </div>
        <div>
          <span>Auditee</span>
          <strong>{assessment.auditee.name}</strong>
        </div>
        <div>
          <span>Baseline</span>
          <strong>{assessment.targetScore ?? "-"}</strong>
        </div>
        <div>
          <span>Due Date</span>
          <strong>{assessment.dueDate ? formatDate(assessment.dueDate) : "-"}</strong>
        </div>
      </section>

      {isAdmin ? (
        <DesignFactorApprovalPanel
          assessmentId={assessment.id}
          status={assessment.status}
        />
      ) : null}

      <DesignFactorWorkspace
        assessmentId={assessment.id}
        assessmentStatus={assessment.status}
        companyName={assessment.companyName}
        initialRows={initialRows}
        initialDf02Rows={initialDf02Rows}
        initialDf03Rows={initialDf03Rows}
        initialDf04Rows={initialDf04Rows}
        initialDf05Rows={initialDf05Rows}
        initialDf06Rows={initialDf06Rows}
        initialDf07Rows={initialDf07Rows}
        initialDf08Rows={initialDf08Rows}
        initialDf09Rows={initialDf09Rows}
        initialDf10Rows={initialDf10Rows}
        userSide={userSide}
        submitState={{
          df01AuditeeSubmitted: Boolean(assessment.df01AuditeeSubmittedAt),
          df01AuditorSubmitted: Boolean(assessment.df01AuditorSubmittedAt),
          df02AuditeeSubmitted: Boolean(assessment.df02AuditeeSubmittedAt),
          df02AuditorSubmitted: Boolean(assessment.df02AuditorSubmittedAt),
          df03AuditeeSubmitted: Boolean(assessment.df03AuditeeSubmittedAt),
          df03AuditorSubmitted: Boolean(assessment.df03AuditorSubmittedAt),
          df04AuditeeSubmitted: Boolean(assessment.df04AuditeeSubmittedAt),
          df04AuditorSubmitted: Boolean(assessment.df04AuditorSubmittedAt),
          df05AuditeeSubmitted: Boolean(assessment.df05AuditeeSubmittedAt),
          df05AuditorSubmitted: Boolean(assessment.df05AuditorSubmittedAt),
          df06AuditeeSubmitted: Boolean(assessment.df06AuditeeSubmittedAt),
          df06AuditorSubmitted: Boolean(assessment.df06AuditorSubmittedAt),
          df07AuditeeSubmitted: Boolean(assessment.df07AuditeeSubmittedAt),
          df07AuditorSubmitted: Boolean(assessment.df07AuditorSubmittedAt),
          df08AuditeeSubmitted: Boolean(assessment.df08AuditeeSubmittedAt),
          df08AuditorSubmitted: Boolean(assessment.df08AuditorSubmittedAt),
          df09AuditeeSubmitted: Boolean(assessment.df09AuditeeSubmittedAt),
          df09AuditorSubmitted: Boolean(assessment.df09AuditorSubmittedAt),
          df10AuditeeSubmitted: Boolean(assessment.df10AuditeeSubmittedAt),
          df10AuditorSubmitted: Boolean(assessment.df10AuditorSubmittedAt),
        }}
        saveState={parseDesignFactorSaveState(assessment.savedState)}
        canEdit={canEdit}
      />
    </AdminShell>
  );
}

function parseDesignFactorSaveState(savedState: unknown) {
  if (!savedState || typeof savedState !== "object" || Array.isArray(savedState)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(savedState as Record<string, unknown>).map(([key, value]) => [key, Boolean(value)]),
  );
}

function DesignFactorApprovalPanel({
  assessmentId,
  status,
}: {
  assessmentId: string;
  status: string;
}) {
  const actions =
    status === "SUBMITTED"
      ? [{ decision: "REVIEW", label: "Mark Reviewed" }]
      : status === "REVIEWED"
        ? [
            { decision: "APPROVE", label: "Approve" },
            { decision: "REJECT", label: "Kembalikan ke Auditor" },
          ]
        : [];

  return (
    <section className="users-panel approval-panel">
      <div className="section-heading">
        <div>
          <h2>Approval Workflow</h2>
          <p>Jika dikembalikan, hanya auditor yang perlu mengisi ulang dan submit final.</p>
        </div>
      </div>
      {actions.length > 0 ? (
        <div className="approval-actions">
          {actions.map((action) => (
            <form action={transitionDesignFactorApprovalAction} key={action.decision}>
              <input name="assessmentId" type="hidden" value={assessmentId} />
              <input name="decision" type="hidden" value={action.decision} />
              <input name="note" placeholder="Catatan approval" />
              <button className="primary-button" type="submit">
                {action.label}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <div className="empty-state-inline">
          {status === "IN_PROGRESS"
            ? "Menunggu pengisian dan submit final dari auditor."
            : "Tidak ada aksi approval lanjutan untuk status ini."}
        </div>
      )}
    </section>
  );
}

function mapDf01Input(input: {
  growthImportance: number;
  growthBaseline: number;
  innovationImportance: number;
  innovationBaseline: number;
  costImportance: number;
  costBaseline: number;
  serviceImportance: number;
  serviceBaseline: number;
}): Df01InputRow[] {
  return [
    {
      key: "growth",
      label: "Growth/Acquisition",
      importance: input.growthImportance,
      baseline: input.growthBaseline,
    },
    {
      key: "innovation",
      label: "Innovation/Differentiation",
      importance: input.innovationImportance,
      baseline: input.innovationBaseline,
    },
    {
      key: "cost",
      label: "Cost Leadership",
      importance: input.costImportance,
      baseline: input.costBaseline,
    },
    {
      key: "service",
      label: "Client Service/Stability",
      importance: input.serviceImportance,
      baseline: input.serviceBaseline,
    },
  ];
}

function mapDf02Input(input: { rows: unknown }): Df02InputRow[] {
  const rows = Array.isArray(input.rows) ? input.rows : [];

  return defaultDf02Rows().map((defaultRow) => {
    const incoming = rows.find(
      (row): row is Partial<Df02InputRow> =>
        Boolean(row) && typeof row === "object" && "key" in row && row.key === defaultRow.key,
    );

    return {
      ...defaultRow,
      importance: clampNumber(incoming?.importance, defaultRow.importance, 0, 5),
      baseline: clampNumber(incoming?.baseline, defaultRow.baseline, 0, 5),
    };
  });
}

function mapDf03Input(input: { rows: unknown }): Df03InputRow[] {
  const rows = Array.isArray(input.rows) ? input.rows : [];

  return defaultDf03Rows().map((defaultRow) => {
    const incoming = rows.find(
      (row): row is Partial<Df03InputRow> =>
        Boolean(row) && typeof row === "object" && "key" in row && row.key === defaultRow.key,
    );

    return {
      ...defaultRow,
      impact: clampNumber(incoming?.impact, defaultRow.impact, 0, 5),
      likelihood: clampNumber(incoming?.likelihood, defaultRow.likelihood, 0, 5),
      baseline: clampNumber(incoming?.baseline, defaultRow.baseline, 0, 25),
    };
  });
}

function mapDf04Input(input: { rows: unknown }): Df04InputRow[] {
  const rows = Array.isArray(input.rows) ? input.rows : [];

  return defaultDf04Rows().map((defaultRow) => {
    const incoming = rows.find(
      (row): row is Partial<Df04InputRow> =>
        Boolean(row) && typeof row === "object" && "key" in row && row.key === defaultRow.key,
    );

    return {
      ...defaultRow,
      importance: clampNumber(incoming?.importance, defaultRow.importance, 0, 3),
      baseline: clampNumber(incoming?.baseline, defaultRow.baseline, 0, 3),
    };
  });
}

function mapDf05Input(input: {
  highImportance: number;
  highBaseline: number;
  normalImportance: number;
  normalBaseline: number;
}): Df05InputRow[] {
  return [
    {
      key: "High",
      label: "High",
      importance: input.highImportance,
      baseline: normalizeLegacyPercentageBaseline(input.highBaseline),
    },
    {
      key: "Normal",
      label: "Normal",
      importance: input.normalImportance,
      baseline: normalizeLegacyPercentageBaseline(input.normalBaseline),
    },
  ];
}

function mapDf06Input(input: {
  highImportance: number;
  highBaseline: number;
  normalImportance: number;
  normalBaseline: number;
  lowImportance: number;
  lowBaseline: number;
}): Df06InputRow[] {
  return [
    {
      key: "High",
      label: "High",
      importance: input.highImportance,
      baseline: normalizeLegacyPercentageBaseline(input.highBaseline),
    },
    {
      key: "Normal",
      label: "Normal",
      importance: input.normalImportance,
      baseline: normalizeLegacyPercentageBaseline(input.normalBaseline),
    },
    {
      key: "Low",
      label: "Low",
      importance: input.lowImportance,
      baseline: normalizeLegacyPercentageBaseline(input.lowBaseline),
    },
  ];
}

function mapDf07Input(input: {
  supportImportance: number;
  supportBaseline: number;
  factoryImportance: number;
  factoryBaseline: number;
  turnaroundImportance: number;
  turnaroundBaseline: number;
  strategicImportance: number;
  strategicBaseline: number;
}): Df07InputRow[] {
  return [
    {
      key: "Support",
      label: "Support",
      importance: input.supportImportance,
      baseline: input.supportBaseline,
    },
    {
      key: "Factory",
      label: "Factory",
      importance: input.factoryImportance,
      baseline: input.factoryBaseline,
    },
    {
      key: "Turnaround",
      label: "Turnaround",
      importance: input.turnaroundImportance,
      baseline: input.turnaroundBaseline,
    },
    {
      key: "Strategic",
      label: "Strategic",
      importance: input.strategicImportance,
      baseline: input.strategicBaseline,
    },
  ];
}

function mapDf08Input(input: {
  outsourcingImportance: number;
  outsourcingBaseline: number;
  cloudImportance: number;
  cloudBaseline: number;
  insourcingImportance: number;
  insourcingBaseline: number;
}): Df08InputRow[] {
  return [
    {
      key: "Outsourcing",
      label: "Outsourcing",
      importance: input.outsourcingImportance,
      baseline: normalizeLegacyPercentageBaseline(input.outsourcingBaseline),
    },
    {
      key: "Cloud",
      label: "Cloud",
      importance: input.cloudImportance,
      baseline: normalizeLegacyPercentageBaseline(input.cloudBaseline),
    },
    {
      key: "Insourcing",
      label: "Insourced",
      importance: input.insourcingImportance,
      baseline: normalizeLegacyPercentageBaseline(input.insourcingBaseline),
    },
  ];
}

function mapDf09Input(input: {
  agileImportance: number;
  agileBaseline: number;
  devOpsImportance: number;
  devOpsBaseline: number;
  traditionalImportance: number;
  traditionalBaseline: number;
}): Df09InputRow[] {
  return [
    {
      key: "Agile",
      label: "Agile",
      importance: input.agileImportance,
      baseline: normalizeLegacyPercentageBaseline(input.agileBaseline),
    },
    {
      key: "DevOps",
      label: "DevOps",
      importance: input.devOpsImportance,
      baseline: normalizeLegacyPercentageBaseline(input.devOpsBaseline),
    },
    {
      key: "Traditional",
      label: "Traditional",
      importance: input.traditionalImportance,
      baseline: normalizeLegacyPercentageBaseline(input.traditionalBaseline),
    },
  ];
}

function mapDf10Input(input: {
  firstMoverImportance: number;
  firstMoverBaseline: number;
  followerImportance: number;
  followerBaseline: number;
  slowAdopterImportance: number;
  slowAdopterBaseline: number;
}): Df10InputRow[] {
  return [
    {
      key: "First_Mover",
      label: "First mover",
      importance: input.firstMoverImportance,
      baseline: normalizeLegacyPercentageBaseline(input.firstMoverBaseline),
    },
    {
      key: "Follower",
      label: "Follower",
      importance: input.followerImportance,
      baseline: normalizeLegacyPercentageBaseline(input.followerBaseline),
    },
    {
      key: "Slow_Adopter",
      label: "Slow adopter",
      importance: input.slowAdopterImportance,
      baseline: normalizeLegacyPercentageBaseline(input.slowAdopterBaseline),
    },
  ];
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function normalizeLegacyPercentageBaseline(value: number) {
  return value === 3 ? 30 : value;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
