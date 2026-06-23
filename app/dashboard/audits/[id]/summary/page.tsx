import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Paperclip } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AdminShell } from "@/components/admin-shell";
import { AutoRefreshPage } from "@/components/auto-refresh-page";
import { syncCobitAuditResponses } from "@/lib/cobit/auditSync";
import { buildCobitAuditSummary, buildCobitAuditorResponseData, COBIT_LEVELS, type CobitAuditSummary } from "@/lib/cobit/capabilityAudit";
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
  const evidenceGroups = groupEvidenceRowsByObjective(evidenceRows, isCobit);
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
        <CobitSummarySection
          summary={cobitSummary}
          companyName={audit.companyName}
          auditDescription={audit.description}
        />
      ) : null}

      {isAdmin ? (
        <ApprovalPanel
          auditId={audit.id}
          status={audit.status}
          isAuditComplete={isAuditComplete}
        />
      ) : null}

      {!isCobit ? (
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
      ) : null}

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Detail Compliance Per Question</h2>
            <p>Jawaban auditee dan penilaian auditor</p>
          </div>
        </div>

        <div className={isCobit ? "table-wrap compact-scroll-table" : "table-wrap"}>
          <table className={`user-table ${isCobit ? "compact-compliance-table" : ""}`} style={{ fontSize: isCobit ? "12px" : "14px" }}>
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

        {evidenceGroups.length > 0 ? (
          <div className="evidence-domain-grid">
            {evidenceGroups.map((group) => (
              <article className="evidence-domain-card" key={group.domain}>
                <div className="evidence-domain-head">
                  <div>
                    <strong>{group.domain}</strong>
                  </div>
                  <b>{group.fileCount} File</b>
                </div>
                <div className="evidence-summary-list">
                  {group.rows.map((response) => (
                    <div className="evidence-summary-card" key={response.id}>
                      <div>
                        <span>{formatEvidenceClause(response.question.clause, isCobit)}</span>
                      </div>
                      <EvidenceLinks attachments={response.attachments} />
                    </div>
                  ))}
                </div>
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

type EvidenceSummaryRow = {
  id: string;
  attachments: string[];
  question: {
    clause: string;
    title: string | null;
    question: string;
  };
};

function groupEvidenceRowsByObjective(rows: EvidenceSummaryRow[], isCobit: boolean) {
  const groups = new Map<string, { domain: string; title: string; rows: EvidenceSummaryRow[]; fileCount: number }>();

  rows.forEach((row) => {
    const objective = getEvidenceObjective(row.question.clause, isCobit);
    const existing = groups.get(objective.key) ?? {
      domain: objective.key,
      title: row.question.title || objective.title,
      rows: [],
      fileCount: 0,
    };

    existing.rows.push(row);
    existing.fileCount += row.attachments.length;
    groups.set(objective.key, existing);
  });

  return Array.from(groups.values()).sort((a, b) => getEvidenceObjectiveOrder(a.domain) - getEvidenceObjectiveOrder(b.domain));
}

function getEvidenceObjective(clause: string, isCobit: boolean) {
  if (isCobit) {
    const match = clause.toUpperCase().match(/^(EDM|APO|BAI|DSS|MEA)\s*0?(\d{1,2})/);
    if (match) {
      const objective = `${match[1]}${match[2].padStart(2, "0")}`;
      return {
        key: objective,
        title: `Objective ${objective}`,
      };
    }
  }

  return {
    key: "KLAUSUL",
    title: "Klausul Audit",
  };
}

function formatEvidenceClause(clause: string, isCobit: boolean) {
  if (!isCobit) {
    return clause;
  }

  return getEvidenceObjective(clause, true).key;
}

function getEvidenceObjectiveOrder(objective: string) {
  const match = objective.match(/^(EDM|APO|BAI|DSS|MEA)(\d{2})$/);
  if (!match) {
    return 9999;
  }

  const domainOrder = ["EDM", "APO", "BAI", "DSS", "MEA"].indexOf(match[1]);
  return domainOrder * 100 + Number(match[2]);
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
  auditDescription,
}: {
  summary: CobitAuditSummary;
  companyName: string;
  auditDescription: string | null;
}) {
  const processCount = summary.objectives.length;
  const maturityScore = Number(summary.overallCapability.toFixed(1));
  const maturityLabel = getMaturityLabel(maturityScore);
  const baseline = summary.baseline;
  const allScore = averageLevel(summary.objectives);
  const scoreRows = getCobitMaturityScoreRows({
    description: auditDescription,
    processCount,
    score: allScore,
    baseline,
  });
  const scopeSource = getCobitScopeSource(auditDescription, processCount);

  return (
    <section className="cobit-maturity-section users-panel">
      <h2 className="cobit-maturity-headline">
        Skor <em>IT Maturity</em> {companyName} dari {processCount} proses adalah{" "}
        <strong>{formatDecimal(maturityScore)} ({maturityLabel})</strong>
      </h2>

      <div className="cobit-maturity-grid">
        <article className="cobit-maturity-radar-card">
          <h3>Capability Level</h3>
          <CobitMaturityRadar summary={summary} />
        </article>

        <aside className="cobit-maturity-side">
          <table className="cobit-maturity-score-table">
            <caption>Skor Kematangan TI {companyName} tahun 2025</caption>
            <thead>
              <tr>
                <th></th>
                <th>Hasil</th>
                <th>Target</th>
                <th><em>Gap</em></th>
              </tr>
            </thead>
            <tbody>
              {scoreRows.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}</th>
                  <td>{formatDecimal(row.score)}</td>
                  <td>{formatDecimal(row.baseline)}</td>
                  <td>{formatGap(row.score - row.baseline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cobit-maturity-source-note">
            Sumber hasil: {scopeSource}
          </p>

          <div className="cobit-maturity-result-card">
            <h3>Skor kematangan TI dari {processCount} proses</h3>
            <div>
              <strong>{formatDecimal(maturityScore)}</strong>
              <span>({maturityLabel})</span>
              <p>{getMaturityDescription(maturityScore)}</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="section-heading cobit-level-detail-heading">
        <div>
          <h2>Detail skor level setiap proses</h2>
          <p>Skor level diambil dari capability level achieved per objective.</p>
        </div>
      </div>
      <div className="table-wrap cobit-process-score-scroll">
        <table className="user-table cobit-process-score-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>No</th>
              <th>Kode</th>
              <th>Level 1</th>
              <th>Level 2</th>
              <th>Level 3</th>
              <th>Level 4</th>
              <th>Level 5</th>
              <th>Skor Level</th>
            </tr>
          </thead>
          <tbody>
            {summary.objectives.map((objective, index) => (
              <tr key={objective.objective}>
                <td>{getCobitDomainTitle(objective.domain || objective.objective.slice(0, 3))}</td>
                <td>{index + 1}</td>
                <td><strong>{objective.objective}</strong></td>
                {COBIT_LEVELS.map((levelNumber) => {
                  const level = objective.levels.find((item) => item.level === levelNumber);

                  return (
                    <td key={levelNumber}>
                      {level?.applicable ? (
                        <CapabilityLevelScore rating={level.rating} percentage={level.percentage} />
                      ) : (
                        <CapabilityLevelScore rating="N/A" />
                      )}
                    </td>
                  );
                })}
                <td><strong>{objective.achievedLevel}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CapabilityLevelScore({ rating, percentage }: { rating: string; percentage?: number }) {
  const normalizedRating = rating.toUpperCase();
  const className = normalizedRating === "N/A" ? "na" : normalizedRating.toLowerCase();

  return (
    <span className={`cobit-level-score ${className}`}>
      <span className="cobit-level-rating">{normalizedRating}</span>
      {percentage !== undefined ? <span className="cobit-level-value">{percentage}%</span> : null}
    </span>
  );
}

function getCobitDomainTitle(domain: string) {
  if (domain === "EDM") return "Evaluate, Direct and Monitor (EDM)";
  if (domain === "APO") return "Align, Plan and Organize (APO)";
  if (domain === "BAI") return "Build, Acquire and Implement (BAI)";
  if (domain === "DSS") return "Deliver, Service and Support (DSS)";
  return "Monitor, Evaluate and Assess (MEA)";
}

function getCobitMaturityScoreRows({
  description,
  processCount,
  score,
  baseline,
}: {
  description: string | null;
  processCount: number;
  score: number;
  baseline: number;
}) {
  const scopeLabel = getCobitScopeLabelFromDescription(description, processCount);

  return [
    {
      label: `${scopeLabel} (${processCount} proses)`,
      score,
      baseline,
    },
  ];
}

function getCobitScopeSource(description: string | null, processCount: number) {
  const scopeLabel = getCobitScopeLabelFromDescription(description, processCount);
  const designFactorId = String(description ?? "").match(/Design Factor Assessment ID:\s*([^\n]+)/i)?.[1]?.trim();

  if (designFactorId) {
    return `${scopeLabel}, dari Design Factor Assessment ${designFactorId}`;
  }

  return scopeLabel;
}

function getCobitScopeLabelFromDescription(description: string | null, processCount: number) {
  const match = String(description ?? "").match(/Scope Audit COBIT:\s*(.+)/i);
  if (match?.[1]) {
    return match[1].trim();
  }
  if (processCount <= 24) return "24 Domain BUMN";
  if (processCount >= 39) return "Seluruh Domain COBIT";
  return "Scope Audit COBIT";
}

function CobitMaturityRadar({ summary }: { summary: CobitAuditSummary }) {
  const size = 720;
  const center = size / 2;
  const radius = 260;
  const labelRadius = radius + 44;
  const maxLevel = 5;
  const objectives = summary.objectives;
  const actualPoints = objectives.map((objective, index) =>
    polarPoint(index, objectives.length, (objective.achievedLevel / maxLevel) * radius, center),
  );
  const targetPoints = objectives.map((_, index) =>
    polarPoint(index, objectives.length, (summary.baseline / maxLevel) * radius, center),
  );

  return (
    <div className="cobit-maturity-radar-wrap">
      <div className="cobit-maturity-radar-legend">
        <span><i className="baseline" />Baseline/Target</span>
        <span><i className="actual" />Skor Level</span>
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="COBIT capability level radar">
        {[1, 2, 3, 4, 5].map((level) => {
          const ringRadius = (level / maxLevel) * radius;
          const points = objectives.map((_, index) => polarPoint(index, objectives.length, ringRadius, center));
          return (
            <g key={level}>
              <polygon fill="none" points={points.map(pointToString).join(" ")} stroke="#d9dde2" strokeWidth="1" />
              <text x={center - 8} y={center - ringRadius + 5} textAnchor="end">{level}</text>
            </g>
          );
        })}
        {objectives.map((objective, index) => {
          const end = polarPoint(index, objectives.length, radius, center);
          const label = polarPoint(index, objectives.length, labelRadius, center);
          return (
            <g key={objective.objective}>
              <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="#edf1f6" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">
                {objective.objective}
              </text>
            </g>
          );
        })}
        <polygon fill="rgba(111, 181, 29, 0.12)" points={actualPoints.map(pointToString).join(" ")} stroke="#6fb51d" strokeWidth="3" />
        {actualPoints.map((point, index) => <circle key={`actual-${index}`} cx={point.x} cy={point.y} r="4" fill="#6fb51d" />)}
        <polygon fill="none" points={targetPoints.map(pointToString).join(" ")} stroke="#d34848" strokeWidth="3.5" />
        {targetPoints.map((point, index) => <circle key={`target-${index}`} cx={point.x} cy={point.y} r="4" fill="#d34848" />)}
      </svg>
    </div>
  );
}

function averageLevel(objectives: CobitAuditSummary["objectives"]) {
  if (objectives.length === 0) {
    return 0;
  }

  return Number((objectives.reduce((sum, objective) => sum + objective.achievedLevel, 0) / objectives.length).toFixed(2));
}

function formatDecimal(value: number) {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

function formatGap(value: number) {
  const formatted = formatDecimal(Math.abs(Number(value.toFixed(2))));
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

function getMaturityLabel(score: number) {
  if (score >= 5) return "Optimizing";
  if (score >= 4) return "Quantitatively Managed";
  if (score >= 3) return "Defined";
  if (score >= 2) return "Managed";
  if (score >= 1) return "Initial";
  return "Incomplete";
}

function getMaturityDescription(score: number) {
  if (score >= 4) return "Process is measured and controlled across the enterprise.";
  if (score >= 3) return "Enterprise wide standards provide guidance across the enterprise.";
  if (score >= 2) return "Process is planned, monitored, and repeatable.";
  if (score >= 1) return "Process is performed but still ad hoc.";
  return "Process capability is not yet established.";
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
