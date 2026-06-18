"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, Paperclip, Plus } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { Toast } from "@/components/toast";
import { buildCobitAuditSummary, COBIT_DOMAINS, parseCobitClause } from "@/lib/cobit/capabilityAudit";
import { submitAuditFindingsAction, type FindingFormState } from "./actions";

type AuditFindingsFormProps = {
  audit: any;
  responses: any[];
  findings: Map<string, any>;
};

type FindingDraft = {
  responseId: string;
  compliance: string;
  level: string;
  description: string;
};

const initialState: FindingFormState = {};

export function AuditFindingsForm({
  audit,
  responses,
  findings,
}: AuditFindingsFormProps) {
  const [state, formAction] = useActionState(
    submitAuditFindingsAction,
    initialState
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [clientToast, setClientToast] = useState<FindingFormState["toast"]>();
  const [touchedFindingIds, setTouchedFindingIds] = useState<Set<string>>(() => new Set());
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "MISSING" | "REVIEWED">("ALL");

  const isGapAssessment = audit.mode === "GAP_ASSESSMENT";
  const isCobit = `${audit.auditType?.name ?? ""} ${audit.auditType?.isoStandard ?? ""}`.toUpperCase().includes("COBIT");
  const questions = useMemo(() => responses.map((response) => response.question), [responses]);
  const cobitGroups = useMemo(() => buildCobitGroups(responses), [responses]);
  const domains = COBIT_DOMAINS.filter((domain) => cobitGroups[domain]);
  const [selectedDomain, setSelectedDomain] = useState(domains[0] ?? "MEA");
  const objectives = Object.keys(cobitGroups[selectedDomain] ?? {});
  const [selectedObjective, setSelectedObjective] = useState(objectives[0] ?? "");
  const objectiveResponses =
    isCobit && selectedObjective
      ? responses.filter((response) => parseCobitClause(response.question.clause).objective === selectedObjective)
      : responses;
  const allVisibleSubmitted = objectiveResponses.length > 0 && objectiveResponses.every((response) => findings.get(response.id)?.submittedAt);
  const allSavedReviewed = responses.length > 0 && responses.every((response) => Boolean(findings.get(response.id)?.level));
  const canSubmitFinal = allSavedReviewed && !hasUnsavedChanges && !allVisibleSubmitted;
  const submitFinalLabel = allVisibleSubmitted
    ? "Sudah Final"
    : hasUnsavedChanges
      ? "Simpan Dulu"
      : allSavedReviewed
        ? "Submit Final"
        : "Lengkapi Penilaian";
  const submitUnavailableMessage = hasUnsavedChanges
    ? "Ada perubahan penilaian yang belum disimpan. Klik Simpan Sementara dulu sebelum Submit Final."
    : buildMissingFindingMessage(responses, findings, isCobit);
  const [findingDrafts, setFindingDrafts] = useState<Record<string, FindingDraft>>(() =>
    Object.fromEntries(
      responses.map((response) => {
        const finding = findings.get(response.id);
        const compliance =
          isCobit
            ? finding?.level === "PASS"
              ? "COMPLY"
              : finding?.level === "MAJOR"
                ? "NOT_COMPLY"
                : ""
            : finding?.level
              ? response.compliance
              : "";
        return [
          response.id,
          {
            responseId: response.id,
            compliance,
            level: isCobit
              ? compliance === "COMPLY"
                ? "PASS"
                : compliance === "NOT_COMPLY"
                  ? "MAJOR"
                  : ""
              : finding?.level || "",
            description: finding?.description || "",
          },
        ];
      }),
    ),
  );
  const visibleResponses = objectiveResponses.filter((response) => {
    const draft = findingDrafts[response.id];
    const hasReview = isCobit ? Boolean(draft?.compliance) : Boolean(draft?.level);

    if (reviewFilter === "MISSING") {
      return !hasReview;
    }

    if (reviewFilter === "REVIEWED") {
      return hasReview;
    }

    return true;
  });
  const responseSummaryData = useMemo(
    () =>
      responses.map((response) => ({
        questionId: response.question.id,
        compliance: isCobit ? findingDrafts[response.id]?.compliance || "NA" : response.compliance,
      })),
    [findingDrafts, isCobit, responses],
  );
  const cobitSummary = useMemo(
    () => (isCobit ? buildCobitAuditSummary(questions, responseSummaryData, audit.description) : null),
    [audit.description, isCobit, questions, responseSummaryData],
  );
  const activeObjectiveSummary = normalizeLiveCapabilitySummary(
    cobitSummary?.objectives.find((objective) => objective.objective === selectedObjective) ?? null,
  );

  const updateFindingDraft = (
    responseId: string,
    patch: Partial<{ compliance: string; level: string; description: string }>,
  ) => {
    setHasUnsavedChanges(true);
    setClientToast(undefined);
    setTouchedFindingIds((current) => {
      const next = new Set(current);
      next.add(responseId);
      return next;
    });
    setFindingDrafts((current) => {
      const previous = current[responseId] ?? {
        responseId,
        compliance: "",
        level: "",
        description: "",
      };
      return {
        ...current,
        [responseId]: {
          ...previous,
          ...patch,
        },
      };
    });
  };

  useEffect(() => {
    if (state.toast?.type === "success") {
      setHasUnsavedChanges(false);
      setTouchedFindingIds(new Set());
    }
  }, [state.toast]);

  const confirmNavigation = () => {
    if (!hasUnsavedChanges) {
      return true;
    }
    return window.confirm("Ada penilaian auditor yang belum disimpan. Simpan dulu sebelum pindah halaman agar tidak hilang. Tetap pindah?");
  };

  return (
    <>
      <Toast
        id={clientToast?.id ?? state.toast?.id}
        type={clientToast?.type ?? state.toast?.type}
        message={clientToast?.message ?? state.toast?.message}
      />

      <form action={formAction} className="audit-response-form">
        <input name="auditId" type="hidden" value={audit.id} />
        {responses.filter((response) => shouldIncludeFindingPayload(response, findingDrafts, touchedFindingIds, isCobit)).map((response) => (
          <input
            key={`finding-payload-${response.id}`}
            name="findings[]"
            type="hidden"
            value={JSON.stringify(findingDrafts[response.id])}
            readOnly
          />
        ))}

        {!isCobit ? (
          <div className="submit-split-actions df-top-actions">
            <SubmitButton intent="save" label="Simpan Sementara" pendingLabel="Menyimpan..." />
            <SubmitButton
              disabled={!canSubmitFinal}
              intent="submit"
              label={submitFinalLabel}
              pendingLabel="Submit..."
              onUnavailableClick={() => {
                setClientToast({
                  type: "error",
                  message: submitUnavailableMessage,
                  id: Date.now(),
                });
              }}
            />
          </div>
        ) : null}

        {isCobit ? (
          <div className="cobit-response-nav">
            <div className="df-tabs" role="tablist" aria-label="Domain COBIT">
              {domains.map((domain) => (
                <button
                  className={`df-tab ${selectedDomain === domain ? "active" : ""}`}
                  key={domain}
                  type="button"
                  onClick={() => {
                    if (!confirmNavigation()) return;
                    const nextObjectives = Object.keys(cobitGroups[domain] ?? {});
                    setSelectedDomain(domain);
                    setSelectedObjective(nextObjectives[0] ?? "");
                  }}
                >
                  {domain}
                </button>
              ))}
            </div>
            <div className="df-tabs cobit-objective-tabs" role="tablist" aria-label="Objective COBIT">
              {objectives.map((objective) => (
                <button
                  className={`df-tab ${selectedObjective === objective ? "active" : ""}`}
                  key={objective}
                  type="button"
                  onClick={() => {
                    if (!confirmNavigation()) return;
                    setSelectedObjective(objective);
                  }}
                >
                  {objective}
                </button>
              ))}
            </div>
            <div className="df-tabs cobit-objective-tabs" role="tablist" aria-label="Filter penilaian auditor">
              {[
                { value: "ALL", label: "Semua" },
                { value: "MISSING", label: "Belum Dinilai" },
                { value: "REVIEWED", label: "Sudah Dinilai" },
              ].map((filter) => (
                <button
                  className={`df-tab ${reviewFilter === filter.value ? "active" : ""}`}
                  key={filter.value}
                  type="button"
                  onClick={() => setReviewFilter(filter.value as "ALL" | "MISSING" | "REVIEWED")}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {activeObjectiveSummary ? (
              <div className="table-wrap cobit-capability-wrap">
                <table className="user-table cobit-capability-table">
                  <thead>
                    <tr>
                      <th>Process</th>
                      {activeObjectiveSummary.levels.map((level) => (
                        <th key={level.level}>Level {level.level}</th>
                      ))}
                      <th>Capability Level Achieved</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedObjective || "-"}</td>
                      {activeObjectiveSummary.levels.map((level) => (
                        <td key={level.level}>
                          <strong>{level.rating}</strong>
                          <span>{level.applicable ? `${level.percentage}% (${level.yes}/${level.total})` : "N/A"}</span>
                        </td>
                      ))}
                      <td>
                        <strong>{getLiveAchievedLevel(activeObjectiveSummary)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <CobitLevelAverageTable summary={activeObjectiveSummary} />
              </div>
            ) : null}
            <div className="submit-split-actions df-top-actions">
              <SubmitButton intent="save" label="Simpan Sementara" pendingLabel="Menyimpan..." />
              <SubmitButton
                disabled={!canSubmitFinal}
                intent="submit"
                label={submitFinalLabel}
                pendingLabel="Submit..."
                onUnavailableClick={() => {
                  setClientToast({
                    type: "error",
                    message: submitUnavailableMessage,
                    id: Date.now(),
                  });
                }}
              />
            </div>
          </div>
        ) : null}

        {visibleResponses.map((response, index) => {
          const finding = findings.get(response.id);
          const question = response.question;
          const cobitParts = parseCobitClause(question.clause);

          return (
            <div key={response.id} className="question-card">
              {(() => {
                const draft = findingDrafts[response.id] ?? {
                  responseId: response.id,
                  compliance: "",
                  level: "",
                  description: "",
                };

                return (
                  <>
              <div className="question-header">
                <div>
                  <h3 className="question-main-text">{question.question}</h3>
                  <div className="question-meta-line">
                    <span className="question-number">
                      Q{index + 1} - {isCobit ? `${cobitParts.objective || question.clause} Level ${cobitParts.level}` : `Klausul ${question.clause}`}
                    </span>
                    {question.title && <p className="question-context-text">{question.title}</p>}
                  </div>
                </div>
                {finding?.submittedAt ? (
                  <span className="submitted-badge">Final</span>
                ) : draft.level || draft.compliance ? (
                  <span className="submitted-badge">Sudah Dinilai</span>
                ) : (
                  <span className="status-badge pending">Belum Dinilai</span>
                )}
              </div>

              <div className="question-section">
                <strong>Jawaban Auditee:</strong>
                <p>{response.description || "Tidak ada deskripsi"}</p>
                <span style={{ display: "block", marginTop: "6px", fontSize: "13px", color: "#667895" }}>
                  Status: {response.compliance === "COMPLY" ? "Ya" : response.compliance === "NOT_COMPLY" ? "Tidak" : "Belum dijawab"}
                </span>
              </div>

              <EvidenceLinks attachments={response.attachments ?? []} title="Evidence Auditee" />

              <div className="response-fields" id={`finding-fields-${response.id}`}>
                <label>
                  <span>
                    {isCobit
                      ? "Penilaian Auditor"
                      : isGapAssessment
                      ? "Hasil (Comply / Not Comply)"
                      : "Level Temuan"}
                  </span>
                  <CustomSelect
                    name={`finding-select-${response.id}`}
                    value={isCobit ? draft.compliance : draft.level}
                    onValueChange={(value) => {
                      updateFindingDraft(response.id, {
                        compliance: isCobit ? value : response.compliance,
                        level: isCobit
                          ? value === "COMPLY"
                            ? "PASS"
                            : value === "NOT_COMPLY"
                              ? "MAJOR"
                              : ""
                          : value,
                      });
                    }}
                    options={
                      isCobit
                        ? [
                            { value: "", label: "Pilih" },
                            { value: "COMPLY", label: "Ya" },
                            { value: "NOT_COMPLY", label: "Tidak" },
                          ]
                        : isGapAssessment
                          ? [
                              { value: "", label: "Pilih" },
                              { value: "PASS", label: "Comply" },
                              { value: "MAJOR", label: "Not Comply" },
                            ]
                          : [
                              { value: "", label: "Pilih" },
                              { value: "PASS", label: "Pass" },
                              { value: "OFI", label: "OFI (Opportunity For Improvement)" },
                              { value: "MINOR", label: "Minor" },
                              { value: "MAJOR", label: "Major" },
                            ]
                    }
                  />
                </label>

                <label className="full-field">
                  <span>{isCobit ? "Deskripsi Auditor" : "Catatan / Rekomendasi (Opsional)"}</span>
                  <textarea
                    value={draft.description}
                    placeholder="Catatan atau rekomendasi untuk perbaikan..."
                    onChange={(e) => {
                      updateFindingDraft(response.id, { description: e.target.value });
                    }}
                  />
                </label>
              </div>
                  </>
                );
              })()}
            </div>
          );
        })}

      </form>
    </>
  );
}

function EvidenceLinks({
  attachments,
  title,
}: {
  attachments: string[];
  title: string;
}) {
  return (
    <div className="question-section evidence-section">
      <strong>
        <Paperclip size={15} aria-hidden="true" />
        {title}
      </strong>
      {attachments.length > 0 ? (
        <div className="evidence-link-list">
          {attachments.map((attachment) => (
            <a href={attachment} key={attachment} rel="noreferrer" target="_blank">
              <span>{getEvidenceFileName(attachment)}</span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : (
        <p className="empty-evidence-text">Belum ada file evidence yang diupload auditee.</p>
      )}
    </div>
  );
}

function getEvidenceFileName(path: string) {
  const fileName = decodeURIComponent(path.split("/").pop() || path);
  return fileName.replace(/^\d+-/, "");
}

function buildCobitGroups(responses: any[]) {
  return responses.reduce<Record<string, Record<string, any[]>>>((groups, response) => {
    const parts = parseCobitClause(response.question.clause);
    const domain = parts.domain || "MEA";
    const objective = parts.objective || response.question.clause;
    groups[domain] ??= {};
    groups[domain][objective] ??= [];
    groups[domain][objective].push(response);
    return groups;
  }, {});
}

function buildMissingFindingMessage(responses: any[], findings: Map<string, any>, isCobit: boolean) {
  const missing = responses
    .filter((response) => !findings.get(response.id)?.level)
    .map((response) => {
      const question = response.question;
      const parts = parseCobitClause(question.clause);
      return isCobit
        ? `${parts.objective || question.clause} Level ${parts.level}`
        : `Klausul ${question.clause}`;
    });

  if (missing.length === 0) {
    return "Penilaian belum siap untuk Submit Final. Klik Simpan Sementara dulu.";
  }

  const preview = missing.slice(0, 6).join(", ");
  const suffix = missing.length > 6 ? `, dan ${missing.length - 6} lainnya` : "";
  return `Belum dinilai/disimpan: ${preview}${suffix}.`;
}

function normalizeLiveCapabilitySummary(summary: ReturnType<typeof buildCobitAuditSummary>["objectives"][number] | null) {
  if (!summary) {
    return null;
  }

  return {
    ...summary,
    achievedLevel: getLiveAchievedLevel(summary),
  };
}

function getLiveAchievedLevel(summary: ReturnType<typeof buildCobitAuditSummary>["objectives"][number]) {
  let achievedLevel = 0;

  for (const level of summary.levels.filter((item) => item.applicable)) {
    if (level.percentage <= 50) {
      break;
    }

    achievedLevel = level.level;
  }

  return achievedLevel;
}

function CobitLevelAverageTable({
  summary,
}: {
  summary: ReturnType<typeof buildCobitAuditSummary>["objectives"][number];
}) {
  const averageRating = summary.total > 0 ? getCobitAverageRating(summary.averageScore) : "N/A";

  return (
    <table className="user-table cobit-level-average-table">
      <thead>
        <tr>
          <th>Process</th>
          <th>Rata-rata Semua Level</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{summary.objective}</td>
          <td>
            <strong>{averageRating}</strong>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function getCobitAverageRating(percentage: number) {
  if (percentage > 85) return "F";
  if (percentage > 50) return "L";
  if (percentage > 15) return "P";
  return "N";
}

function shouldIncludeFindingPayload(
  response: any,
  findingDrafts: Record<string, FindingDraft>,
  touchedFindingIds: Set<string>,
  isCobit: boolean,
) {
  if (touchedFindingIds.has(response.id)) {
    return true;
  }

  if (!isCobit) {
    return false;
  }

  const draft = findingDrafts[response.id];
  return Boolean(draft?.compliance || draft?.level || draft?.description);
}

function SubmitButton({
  intent,
  label,
  pendingLabel,
  disabled = false,
  onUnavailableClick,
}: {
  intent: "save" | "submit";
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  onUnavailableClick?: () => void;
}) {
  const { pending } = useFormStatus();
  const unavailable = disabled && Boolean(onUnavailableClick);

  return (
    <button
      className={intent === "submit" ? "primary-button" : "secondary-button"}
      name="intent"
      value={intent}
      type={unavailable ? "button" : "submit"}
      disabled={pending || (disabled && !unavailable)}
      onClick={unavailable ? onUnavailableClick : undefined}
      style={{ minWidth: "160px" }}
    >
      <Plus size={16} aria-hidden="true" />
      {pending ? pendingLabel : label}
    </button>
  );
}
