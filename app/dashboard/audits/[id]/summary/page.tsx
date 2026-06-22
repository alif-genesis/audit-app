import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Paperclip } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AdminShell } from "@/components/admin-shell";
import { AutoRefreshPage } from "@/components/auto-refresh-page";
import { syncCobitAuditResponses } from "@/lib/cobit/auditSync";
import { buildCobitAuditSummary, buildCobitAuditorResponseData, getCobitRating, type CobitAuditSummary } from "@/lib/cobit/capabilityAudit";
import { DownloadAuditReportButton } from "./download-audit-report-button";
import { transitionAuditApprovalAction } from "../../../workflow-actions";

type AuditSummaryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AuditSummaryPage({
  params,
}: AuditSummaryPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const { id } = await params;

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      auditType: {
        include: {
          _count: {
            select: { questions: true },
          },
        },
      },
      assignments: {
        include: {
          auditor: { select: { name: true } },
          auditee: { select: { name: true } },
        },
      },
    },
  });

  if (!audit) {
    redirect("/dashboard/audits");
  }

  const assignment = audit.assignments[0];
  const canView =
    currentUser.role === "ADMIN" ||
    assignment?.auditeeId === currentUser.id ||
    assignment?.auditorId === currentUser.id;

  if (!canView) {
    redirect("/dashboard");
  }

  const isCobit = `${audit.auditType.name} ${audit.auditType.isoStandard}`.toUpperCase().includes("COBIT");
  if (isCobit) {
    await syncCobitAuditResponses(id);
  }

  // Get all responses for this audit
  const responses = await prisma.auditResponse.findMany({
    where: { auditId: id },
    include: {
      question: {
        select: {
          clause: true,
          id: true,
          title: true,
          question: true,
        },
      },
    },
  });

  // Get all findings for this audit
  const findings = await prisma.auditFinding.findMany({
    where: { auditId: id },
  });

  const findingMap = new Map(findings.map((f) => [f.responseId, f]));
  const isAdmin = currentUser.role === "ADMIN";
  const cobitSummary = isCobit
    ? buildCobitAuditSummary(
        responses.map((response) => response.question),
        buildCobitAuditorResponseData(responses, findings),
        audit.description,
      )
    : null;

  const totalQuestions = responses.length || audit.auditType._count.questions;
  const answeredCount = responses.filter((response) => response.submittedAt).length;
  const submittedFindings = findings.filter((finding) => finding.submittedAt);
  const reviewedCount = submittedFindings.length;
  const fulfilledCount = submittedFindings.filter((finding) => finding.level === "PASS").length;
  const unfulfilledCount = submittedFindings.filter((finding) => finding.level !== "PASS").length;
  const gapComply = responses.filter((response) => response.submittedAt && response.compliance === "COMPLY").length;
  const gapNotComply = responses.filter((response) => response.submittedAt && response.compliance === "NOT_COMPLY").length;
  const passCount = submittedFindings.filter((finding) => finding.level === "PASS").length;
  const majorCount = submittedFindings.filter((finding) => finding.level === "MAJOR").length;
  const minorCount = submittedFindings.filter((finding) => finding.level === "MINOR").length;
  const ofiCount = submittedFindings.filter((finding) => finding.level === "OFI").length;
  const goodCount = audit.mode === "GAP_ASSESSMENT" ? gapComply : passCount;
  const compliancePercentage = isCobit && cobitSummary
    ? cobitSummary.overallScore
    : totalQuestions > 0
      ? Math.round((goodCount / totalQuestions) * 100)
      : 0;
  const chartItems =
    audit.mode === "GAP_ASSESSMENT"
      ? [
          { label: "Comply", value: gapComply, className: "good" },
          { label: "Not Comply", value: gapNotComply, className: "bad" },
          { label: "Belum Dijawab", value: Math.max(totalQuestions - answeredCount, 0), className: "neutral" },
        ]
      : isCobit
        ? [
            { label: "Terpenuhi", value: fulfilledCount, className: "good" },
            { label: "Tidak Terpenuhi", value: unfulfilledCount, className: "bad" },
            { label: "Belum Direview", value: Math.max(totalQuestions - reviewedCount, 0), className: "neutral" },
          ]
        : [
            { label: "Pass", value: passCount, className: "good" },
            { label: "OFI", value: ofiCount, className: "info" },
            { label: "Minor", value: minorCount, className: "warn" },
            { label: "Major", value: majorCount, className: "bad" },
          ];
  const isAuditComplete =
    totalQuestions > 0 && answeredCount >= totalQuestions && reviewedCount >= totalQuestions;
  const evidenceRows = responses.filter((response) => response.attachments.length > 0);
  const evidenceCount = evidenceRows.reduce((total, response) => total + response.attachments.length, 0);
  const displayStatus = isAuditComplete ? "COMPLETED" : audit.status;
  const statusLabel =
    displayStatus === "IN_PROGRESS"
      ? "Sedang Berjalan"
      : displayStatus === "COMPLETED"
        ? "Selesai"
        : displayStatus;
  const auditModeLabel =
    audit.mode === "GAP_ASSESSMENT" ? "Gap Assessment" : "Audit Internal";
  const chartTotal = Math.max(
    chartItems.reduce((sum, chartItem) => sum + chartItem.value, 0),
    1,
  );
  const pieSegments = chartItems.reduce(
    (segments, item) => {
      const previous = segments.at(-1)?.end ?? 0;
      const percent = (item.value / chartTotal) * 100;
      return [
        ...segments,
        {
          ...item,
          start: previous,
          end: previous + percent,
        },
      ];
    },
    [] as Array<(typeof chartItems)[number] & { start: number; end: number }>,
  );
  const pieGradient = pieSegments.length
    ? pieSegments
        .map(
          (segment) =>
            `${getChartColor(segment.className)} ${segment.start}% ${segment.end}%`,
        )
        .join(", ")
    : "#e9eff8 0 100%";

  return (
    <AdminShell active={isCobit ? "cobit-audits" : "audits"}>
      <AutoRefreshPage />
      <section className="company-detail-header">
        <div className="company-title-block">
          <Link
            className="icon-link"
            href={isCobit ? "/dashboard/cobit-audits" : "/dashboard/audits"}
            aria-label="Kembali"
          >
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <div>
            <h1>{audit.title}</h1>
            <p>Ringkasan Hasil Audit - {audit.companyName}</p>
          </div>
        </div>
        <div className="detail-actions">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#667895" }}>
                Status
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "850",
                  color: "#1c57df",
                }}
              >
                {displayStatus === "IN_PROGRESS"
                  ? "Sedang Berjalan"
                  : displayStatus === "COMPLETED"
                    ? "Selesai"
                    : displayStatus}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#667895" }}>
                Compliance
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "16px",
                  fontWeight: "850",
                  color:
                    compliancePercentage >= 80
                      ? "#0f9f55"
                      : compliancePercentage >= 50
                        ? "#f5a623"
                        : "#d32f2f",
                }}
              >
                {compliancePercentage}%
              </p>
            </div>
          </div>
        </div>
      </section>

      {cobitSummary ? (
        <CobitSummarySection summary={cobitSummary} companyName={audit.companyName} />
      ) : null}

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Informasi Audit</h2>
          </div>
        </div>

        <div className="audit-info-grid">
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: "900",
                color: "#667895",
                textTransform: "uppercase",
              }}
            >
              Framework
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "16px",
                fontWeight: "850",
                color: "#1c1c1c",
              }}
            >
              {audit.auditType.name}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: "900",
                color: "#667895",
                textTransform: "uppercase",
              }}
            >
              Mode
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "16px",
                fontWeight: "850",
                color: "#1c1c1c",
              }}
            >
              {audit.mode === "GAP_ASSESSMENT"
                ? "Gap Assessment"
                : "Audit Internal"}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: "900",
                color: "#667895",
                textTransform: "uppercase",
              }}
            >
              Auditor
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "16px",
                fontWeight: "850",
                color: "#1c57df",
              }}
            >
              {assignment?.auditor?.name}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: "900",
                color: "#667895",
                textTransform: "uppercase",
              }}
            >
              Auditee
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "16px",
                fontWeight: "850",
                color: "#1c57df",
              }}
            >
              {assignment?.auditee?.name}
            </p>
          </div>
        </div>
      </section>

      {isAdmin ? (
        <ApprovalPanel
          auditId={audit.id}
          status={audit.status}
          isAuditComplete={isAuditComplete}
        />
      ) : null}

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>
              {audit.mode === "GAP_ASSESSMENT"
                ? "Statistik Gap Assessment"
                : "Statistik Audit"}
            </h2>
            <p>
              {audit.mode === "GAP_ASSESSMENT"
                ? "Ringkasan Comply dan Not Comply berdasarkan jawaban auditee."
                : isCobit
                  ? "Ringkasan capability yang terpenuhi dan tidak terpenuhi berdasarkan penilaian auditor."
                  : "Ringkasan level temuan berdasarkan penilaian auditor."}
            </p>
          </div>
          <DownloadAuditReportButton
            auditTitle={audit.title}
            companyName={audit.companyName}
            auditTypeName={audit.auditType.name}
            auditModeLabel={auditModeLabel}
            auditorName={assignment?.auditor?.name}
            auditeeName={assignment?.auditee?.name}
            statusLabel={statusLabel}
            compliancePercentage={compliancePercentage}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
            reviewedCount={reviewedCount}
            chartItems={chartItems.map((item) => ({ label: item.label, value: item.value }))}
            detailRows={responses.map((response) => {
              const finding = findingMap.get(response.id);
              const isCompliant = response.compliance === "COMPLY" && finding?.level === "PASS";
              const auditorAssessment = isCobit
                ? finding
                  ? finding.level === "PASS"
                    ? "Terpenuhi"
                    : "Tidak Terpenuhi"
                  : "Pending"
                : finding
                  ? finding.level
                  : "Pending";
              return [
                response.question.clause,
                response.question.question,
                response.compliance === "NA" ? "Belum dijawab" : response.compliance,
                auditorAssessment,
                isCobit ? auditorAssessment : isCompliant ? "Comply" : "Review",
              ];
            })}
          />
        </div>

        <div className="summary-dashboard">
          <div className="score-card">
            <span>Compliance Score</span>
            <strong>{compliancePercentage}%</strong>
            <p>{answeredCount} Dari {totalQuestions} Pertanyaan Dijawab</p>
          </div>
          <div className="score-card">
            <span>Review Auditor</span>
            <strong>{reviewedCount}</strong>
            <p>Penilaian Auditor Sudah Masuk</p>
          </div>
          <div className="chart-panel">
            {chartItems.map((item) => {
              const width = Math.max((item.value / chartTotal) * 100, item.value ? 8 : 0);
              return (
                <div className="chart-row" key={item.label}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="chart-track">
                    <span className={`chart-fill ${item.className}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="summary-pie-card">
            <div className="summary-pie" style={{ background: `conic-gradient(${pieGradient})` }}>
              <span>{compliancePercentage}%</span>
            </div>
            <div className="summary-pie-legend">
              {chartItems.map((item) => (
                <span key={item.label}>
                  <i className={`legend-dot ${item.className}`} />
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Detail Compliance Per Question</h2>
            <p>Jawaban auditee dan penilaian auditor</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="user-table" style={{ fontSize: "14px" }}>
            <thead>
              <tr>
                <th>Klausul</th>
                <th>Question</th>
                <th>Auditee Answer</th>
                <th>Evidence</th>
                <th>Auditor Assessment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => {
                const finding = findingMap.get(response.id);
                const isCompliant =
                  response.compliance === "COMPLY" && finding?.level === "PASS";

                return (
                  <tr key={response.id}>
                    <td>
                      <strong>{response.question.clause}</strong>
                    </td>
                    <td style={{ fontSize: "13px" }}>
                      {response.question.question}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "850",
                          background:
                            response.compliance === "COMPLY"
                              ? "#e6f4ea"
                              : "#fff3e0",
                          color:
                            response.compliance === "COMPLY"
                              ? "#0f9f55"
                              : "#f5a623",
                        }}
                      >
                        {response.compliance === "NA"
                          ? "Belum dijawab"
                          : response.compliance}
                      </span>
                    </td>
                    <td>
                      <EvidenceLinks attachments={response.attachments} compact />
                    </td>
                    <td>
                      {finding ? (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "850",
                            background:
                              finding.level === "PASS"
                                ? "#e6f4ea"
                                : finding.level === "MAJOR"
                                  ? "#ffebee"
                                  : "#fff3e0",
                            color:
                              finding.level === "PASS"
                                ? "#0f9f55"
                                : finding.level === "MAJOR"
                                  ? "#d32f2f"
                                  : "#f5a623",
                          }}
                        >
                          {audit.mode === "GAP_ASSESSMENT"
                            ? finding.level === "PASS"
                              ? "Comply"
                              : "Not Comply"
                            : finding.level}
                        </span>
                      ) : (
                        <span style={{ color: "#667895", fontSize: "12px" }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td>
                      {isCompliant ? (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "850",
                            background: "#e6f4ea",
                            color: "#0f9f55",
                          }}
                        >
                          Comply
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "850",
                            background: "#fff3e0",
                            color: "#f5a623",
                          }}
                        >
                          Review
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Evidence Management</h2>
            <p>File pendukung yang diupload auditee dan dapat direview oleh admin maupun auditor.</p>
          </div>
          <span className="evidence-count-badge">{evidenceCount} File</span>
        </div>

        {evidenceRows.length > 0 ? (
          <div className="evidence-summary-grid">
            {evidenceRows.map((response) => (
              <article className="evidence-summary-card" key={response.id}>
                <div>
                  <span>{response.question.clause}</span>
                  <strong>{response.question.title || response.question.question}</strong>
                </div>
                <EvidenceLinks attachments={response.attachments} />
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state-inline">
            Belum ada file evidence yang diupload untuk audit ini.
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function EvidenceLinks({
  attachments,
  compact = false,
}: {
  attachments: string[];
  compact?: boolean;
}) {
  if (attachments.length === 0) {
    return <span className="empty-evidence-text">Tidak ada</span>;
  }

  return (
    <div className={compact ? "evidence-link-list compact" : "evidence-link-list"}>
      {attachments.map((attachment) => (
        <a href={attachment} key={attachment} rel="noreferrer" target="_blank">
          <Paperclip size={14} aria-hidden="true" />
          <span>{getEvidenceFileName(attachment)}</span>
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function ApprovalPanel({
  auditId,
  status,
  isAuditComplete,
}: {
  auditId: string;
  status: string;
  isAuditComplete: boolean;
}) {
  const actions =
    status === "REVIEWED"
      ? [
          { decision: "APPROVE", label: "Approve Audit" },
          { decision: "REJECT", label: "Kembalikan ke Auditor" },
        ]
      : isAuditComplete && status !== "APPROVED"
          ? [{ decision: "REVIEW", label: "Mark Reviewed" }]
          : [];

  return (
    <section className="users-panel approval-panel">
      <div className="section-heading">
        <div>
          <h2>Approval Workflow</h2>
          <p>Jika dikembalikan, auditor perlu review dan submit ulang tanpa mengulang jawaban auditee.</p>
        </div>
      </div>
      {actions.length > 0 ? (
        <div className="approval-actions">
          {actions.map((action) => (
            <form action={transitionAuditApprovalAction} key={action.decision}>
              <input name="auditId" type="hidden" value={auditId} />
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
            ? "Menunggu review dan submit final dari auditor."
            : "Tidak ada aksi approval lanjutan untuk status ini."}
        </div>
      )}
    </section>
  );
}

function getEvidenceFileName(path: string) {
  const fileName = decodeURIComponent(path.split("/").pop() || path);
  return fileName.replace(/^\d+-/, "");
}

function getChartColor(className: string) {
  if (className === "good") {
    return "#2aa45c";
  }
  if (className === "info") {
    return "#2c7be5";
  }
  if (className === "warn") {
    return "#f5a623";
  }
  if (className === "bad") {
    return "#df3f4c";
  }
  return "#d9e4f2";
}

function CobitSummarySection({
  summary,
  companyName,
}: {
  summary: CobitAuditSummary;
  companyName: string;
}) {
  const adoptedObjectives = summary.objectives.length;
  const adoptedDomains = summary.domains.filter((domain) => domain.objectiveCount > 0).length;
  const topObjectives = [...summary.objectives]
    .sort((a, b) => b.achievedLevel - a.achievedLevel || b.averageScore - a.averageScore)
    .slice(0, 8);

  return (
    <>
      <section className="df-summary-shell">
        <div className="section-heading">
          <div>
            <h2>Summary Capability COBIT</h2>
            <p>Hasil capability berdasarkan jawaban Ya/Tidak auditee untuk {companyName}.</p>
          </div>
        </div>

        <div className="df-summary-cards">
          <article className="df-summary-card level-card">
            <span>Overall Capability</span>
            <strong>{summary.overallCapability.toFixed(2)}</strong>
          </article>
          <article className="df-summary-card">
            <span>Baseline</span>
            <strong>{summary.baseline}</strong>
          </article>
          <article className="df-summary-card">
            <span>Overall Score</span>
            <strong>{summary.overallScore}%</strong>
            <small>Rata-rata domain aktif</small>
          </article>
          <article className="df-summary-card">
            <span>Jawaban Auditee</span>
            <strong>{summary.answered}/{summary.total}</strong>
          </article>
          <article className="df-summary-card">
            <span>Domain Diadopsi</span>
            <strong>{adoptedObjectives} objective</strong>
          </article>
          <article className="df-summary-card">
            <span>Area COBIT</span>
            <strong>{adoptedDomains} area</strong>
          </article>
        </div>

        <div className="df-summary-grid chart-wide-grid">
          <article className="users-panel df-summary-panel">
            <div className="section-heading">
              <div>
                <h2>Domain Spider Chart</h2>
                <p>Capability actual dibandingkan baseline.</p>
              </div>
            </div>
            <CobitSpiderChart summary={summary} />
          </article>

          <article className="users-panel df-summary-panel">
            <div className="section-heading">
              <div>
                <h2>Capability Per Domain</h2>
                <p>Rata-rata achieved level setiap domain.</p>
              </div>
            </div>
            <div className="objective-bar-chart">
              {summary.domains.map((domain) => (
                <div className="objective-bar-row" key={domain.domain}>
                  <span>{domain.domain}</span>
                  <div className="objective-bar-track">
                    <i style={{ width: `${Math.min(100, (domain.achievedLevel / 5) * 100)}%` }} />
                    <b>{domain.achievedLevel.toFixed(2)}</b>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Capability Level Achievement</h2>
            <p>Nilai F, L, P, N dihitung dari rata-rata pertanyaan per level. Level tanpa pertanyaan ditandai N/A.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="user-table cobit-capability-table">
            <thead>
              <tr>
                <th>Process</th>
                {[1, 2, 3, 4, 5].map((level) => (
                  <th key={level}>Level {level}</th>
                ))}
                <th>Capability Level Achieved</th>
              </tr>
            </thead>
            <tbody>
              {summary.objectives.map((objective) => (
                <tr key={objective.objective}>
                  <td>
                    <strong>{objective.objective}</strong>
                    <span>{objective.title}</span>
                  </td>
                  {objective.levels.map((level) => (
                    <td key={level.level}>
                      <strong>{level.rating}</strong>
                      <span>{level.applicable ? `${level.percentage}% (${level.yes}/${level.total})` : "N/A"}</span>
                      {level.applicable ? <span>Y: {level.yes} / N: {level.no}</span> : null}
                    </td>
                  ))}
                  <td>
                    <strong>{objective.achievedLevel}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cobit-level-average-wrap">
          <table className="user-table cobit-level-average-table">
            <thead>
              <tr>
                <th>Process</th>
                <th>Rata-rata Semua Level</th>
              </tr>
            </thead>
            <tbody>
              {summary.objectives.map((objective) => (
                <tr key={`${objective.objective}-level-average`}>
                  <td>{objective.objective}</td>
                  <td>
                    <strong>{objective.total > 0 ? getCobitRating(objective.averageScore) : "N/A"}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Top Capability Objectives</h2>
            <p>Objective dengan achievement tertinggi sebagai ringkasan cepat.</p>
          </div>
        </div>
        <div className="domain-detail-grid">
          {topObjectives.map((objective) => (
            <article className="domain-metric" key={objective.objective}>
              <span>{objective.objective}</span>
              <strong>Level {objective.achievedLevel}</strong>
              <p>{objective.averageScore}% - {getCobitRating(objective.averageScore)}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function CobitSpiderChart({ summary }: { summary: CobitAuditSummary }) {
  const size = 260;
  const center = size / 2;
  const radius = 92;
  const domains = summary.domains;
  const actualPoints = domains.map((domain, index) =>
    polarPoint(index, domains.length, (domain.achievedLevel / 5) * radius, center),
  );
  const baselinePoints = domains.map((_, index) =>
    polarPoint(index, domains.length, (summary.baseline / 5) * radius, center),
  );

  return (
    <div className="objective-radar-wrap cobit-spider-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="COBIT capability spider chart">
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => {
          const points = domains.map((_, index) => polarPoint(index, domains.length, radius * scale, center));
          return (
            <polygon
              fill="none"
              key={scale}
              points={points.map(pointToString).join(" ")}
              stroke="#dce7f5"
              strokeWidth="1"
            />
          );
        })}
        {domains.map((domain, index) => {
          const end = polarPoint(index, domains.length, radius, center);
          const label = polarPoint(index, domains.length, radius + 22, center);
          return (
            <g key={domain.domain}>
              <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="#e4ecf6" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">
                {domain.domain}
              </text>
            </g>
          );
        })}
        <polygon fill="rgba(28, 87, 223, 0.16)" points={actualPoints.map(pointToString).join(" ")} stroke="#1c57df" strokeWidth="2" />
        <polygon fill="rgba(236, 72, 153, 0.08)" points={baselinePoints.map(pointToString).join(" ")} stroke="#ec4899" strokeWidth="2" />
      </svg>
      <div className="df-radar-legend">
        <span><i /> Actual Capability</span>
        <span><i className="baseline" /> Baseline</span>
      </div>
    </div>
  );
}

function polarPoint(index: number, total: number, radius: number, center: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function pointToString(point: { x: number; y: number }) {
  return `${point.x},${point.y}`;
}
