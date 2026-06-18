"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import type { Audit, AuditQuestion, AuditResponse } from "@prisma/client";
import { CustomSelect } from "@/components/custom-select";
import { Toast } from "@/components/toast";
import { buildCobitAuditSummary, COBIT_DOMAINS, parseCobitClause } from "@/lib/cobit/capabilityAudit";
import { submitAuditResponseAction, type ResponseFormState } from "./actions";

type AuditResponseFormProps = {
  audit: any;
  initialFilter?: string;
  questions: AuditQuestion[];
  responses: Map<string, AuditResponse>;
};

type ResponseDraft = {
  questionId: string;
  compliance: string;
  description: string;
};

const initialState: ResponseFormState = {};

export function AuditResponseForm({
  audit,
  initialFilter = "all",
  questions,
  responses,
}: AuditResponseFormProps) {
  const [state, formAction] = useActionState(
    submitAuditResponseAction,
    initialState
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [clientToast, setClientToast] = useState<ResponseFormState["toast"]>();
  const [hiddenStateToastKey, setHiddenStateToastKey] = useState<string | number | null>(null);
  const [questionFilter, setQuestionFilter] = useState<"all" | "pending" | "submitted">(
    initialFilter === "pending" || initialFilter === "submitted" ? initialFilter : "all",
  );
  const [responseDrafts, setResponseDrafts] = useState<Record<string, ResponseDraft>>(() =>
    Object.fromEntries(
      questions.map((question) => {
        const response = responses.get(question.id);
        return [
          question.id,
          {
            questionId: question.id,
            compliance: response?.compliance || "NA",
            description: response?.description || "",
          },
        ];
      }),
    ),
  );

  const isGapAssessment = audit.mode === "GAP_ASSESSMENT";
  const isCobit = `${audit.auditType?.name ?? ""} ${audit.auditType?.isoStandard ?? ""}`.toUpperCase().includes("COBIT");
  const cobitGroups = useMemo(() => buildCobitGroups(questions), [questions]);
  const domains = COBIT_DOMAINS.filter((domain) => cobitGroups[domain]);
  const [selectedDomain, setSelectedDomain] = useState(domains[0] ?? "MEA");
  const objectives = Object.keys(cobitGroups[selectedDomain] ?? {});
  const [selectedObjective, setSelectedObjective] = useState(objectives[0] ?? "");
  const objectiveQuestions =
    isCobit && selectedObjective
      ? questions.filter((question) => parseCobitClause(question.clause).objective === selectedObjective)
      : questions;
  const cobitSummary = useMemo(
    () => (isCobit ? buildCobitAuditSummary(questions, Object.values(responseDrafts), audit.description) : null),
    [audit.description, isCobit, questions, responseDrafts],
  );
  const activeObjectiveSummary = cobitSummary?.objectives.find((objective) => objective.objective === selectedObjective) ?? null;
  const allVisibleSubmitted = questions.length > 0 && questions.every((question) => responses.get(question.id)?.submittedAt);
  const allSavedAnswered = questions.length > 0 && questions.every((question) => isDraftComplete(responseDrafts[question.id], isCobit));
  const canSubmitFinal = allSavedAnswered && !hasUnsavedChanges && !allVisibleSubmitted;
  const submitFinalLabel = allVisibleSubmitted
    ? "Sudah Final"
    : hasUnsavedChanges
      ? "Simpan Dulu"
      : allSavedAnswered
        ? "Submit Final"
        : "Lengkapi Jawaban";
  const submitUnavailableMessage = hasUnsavedChanges
    ? "Ada perubahan jawaban yang belum disimpan. Klik Simpan Sementara dulu sebelum Submit Final."
    : buildMissingResponseMessage(questions, responseDrafts, isCobit);
  const visibleQuestions = objectiveQuestions.filter((question) => {
    const complete = isDraftComplete(responseDrafts[question.id], isCobit);

    if (questionFilter === "pending") {
      return !complete;
    }

    if (questionFilter === "submitted") {
      return complete;
    }

    return true;
  });
  const visibleToast = clientToast ?? getVisibleStateToast(state.toast, hiddenStateToastKey);

  useEffect(() => {
    if (state.toast?.type === "success") {
      setHasUnsavedChanges(false);
    }
  }, [state.toast]);

  const hideCurrentToast = () => {
    const key = state.toast?.id ?? state.toast?.message;
    if (key) {
      setHiddenStateToastKey(key);
    }
    setClientToast(undefined);
  };

  const updateResponseDraft = (questionId: string, patch: Partial<ResponseDraft>) => {
    setHasUnsavedChanges(true);
    hideCurrentToast();
    setResponseDrafts((current) => {
      const previous = current[questionId] ?? {
        questionId,
        compliance: "NA",
        description: "",
      };
      return {
        ...current,
        [questionId]: {
          ...previous,
          ...patch,
        },
      };
    });
  };

  const confirmNavigation = () => {
    if (!hasUnsavedChanges) {
      return true;
    }
    return window.confirm("Ada jawaban yang belum disimpan. Simpan dulu sebelum pindah halaman agar tidak hilang. Tetap pindah?");
  };

  return (
    <>
      <Toast
        id={visibleToast?.id}
        type={visibleToast?.type}
        message={visibleToast?.message}
      />

      <form action={formAction} className="audit-response-form">
        <input name="auditId" type="hidden" value={audit.id} />
        {questions.map((question) => (
          <input
            key={`response-payload-${question.id}`}
            name="responses[]"
            type="hidden"
            value={JSON.stringify(responseDrafts[question.id])}
            readOnly
          />
        ))}

        <div className="user-filter audit-filter compact-filter">
          <CustomSelect
            name="question-filter"
            value={questionFilter}
            ariaLabel="Filter pertanyaan"
            onValueChange={(value) => setQuestionFilter(value as "all" | "pending" | "submitted")}
            options={[
              { value: "all", label: "Semua Pertanyaan" },
              { value: "pending", label: "Belum Dijawab" },
              { value: "submitted", label: "Sudah Dijawab" },
            ]}
          />
        </div>

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
                        <strong>{activeObjectiveSummary.achievedLevel}</strong>
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

        {visibleQuestions.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#667895",
            }}
          >
            Tidak ada pertanyaan yang sesuai dengan filter.
          </div>
        ) : visibleQuestions.map((question, index) => {
          const response = responses.get(question.id);
          const draft = responseDrafts[question.id] ?? {
            questionId: question.id,
            compliance: "NA",
            description: "",
          };
          const cobitParts = parseCobitClause(question.clause);

          return (
            <div key={question.id} className="question-card">
              <div className="question-header">
                <div>
                  <h3 className="question-main-text">{question.question}</h3>
                  <div className="question-meta-line">
                    <span className="question-number">
                      Q{index + 1} - {isCobit ? `${cobitParts.objective || question.clause} Level ${cobitParts.level || "-"}` : `Klausul ${question.clause}`}
                    </span>
                    {question.title && <p className="question-context-text">{question.title}</p>}
                  </div>
                </div>
                {isDraftComplete(draft, isCobit) ? (
                  <span className="submitted-badge">Sudah Dijawab</span>
                ) : (
                  <span className="status-badge pending">Belum Dijawab</span>
                )}
              </div>

              {question.requirement && (
                <div className="question-section">
                  <strong>Prasyarat Standar:</strong>
                  <p>{question.requirement}</p>
                </div>
              )}

              <div className="response-fields" id={`response-fields-${question.id}`}>
                <label>
                  <span>
                    {isGapAssessment
                      ? "Status Implementasi"
                      : isCobit
                        ? "Is Activity Performed?"
                      : "Tingkat Kesesuaian"}
                  </span>
                  <CustomSelect
                    name={`compliance-${question.id}`}
                    value={draft.compliance}
                    onValueChange={(value) => {
                      updateResponseDraft(question.id, { compliance: value });
                    }}
                    options={
                      isCobit
                        ? [
                            { value: "NA", label: "-- Pilih --" },
                            { value: "COMPLY", label: "Ya" },
                            { value: "NOT_COMPLY", label: "Tidak" },
                          ]
                        : isGapAssessment
                          ? [
                              { value: "NA", label: "-- Pilih --" },
                              { value: "COMPLY", label: "Sudah Menerapkan" },
                              { value: "NOT_COMPLY", label: "Belum Menerapkan" },
                            ]
                          : [
                              { value: "NA", label: "-- Pilih --" },
                              { value: "COMPLY", label: "Memenuhi" },
                              { value: "NOT_COMPLY", label: "Tidak Memenuhi" },
                            ]
                    }
                  />
                </label>

                <label className="full-field">
                  <span>Deskripsi / Catatan</span>
                  <textarea
                    value={draft.description}
                    placeholder="Jelaskan jawaban Anda..."
                    onChange={(e) => {
                      updateResponseDraft(question.id, { description: e.target.value });
                    }}
                  />
                </label>
                <label className="full-field">
                  <span>File Pendukung</span>
                  <input
                    name={`supportingFiles-${question.id}`}
                    type="file"
                    multiple
                    onChange={() => {
                      setHasUnsavedChanges(true);
                      hideCurrentToast();
                    }}
                  />
                  {response?.attachments?.length ? (
                    <small>File tersimpan: {response.attachments.join(", ")}</small>
                  ) : null}
                </label>
              </div>
            </div>
          );
        })}

      </form>
    </>
  );
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

function buildCobitGroups(questions: AuditQuestion[]) {
  return questions.reduce<Record<string, Record<string, AuditQuestion[]>>>((groups, question) => {
    const parts = parseCobitClause(question.clause);
    const domain = parts.domain || "MEA";
    const objective = parts.objective || question.clause;
    groups[domain] ??= {};
    groups[domain][objective] ??= [];
    groups[domain][objective].push(question);
    return groups;
  }, {});
}

function buildMissingResponseMessage(
  questions: AuditQuestion[],
  responseDrafts: Record<string, ResponseDraft>,
  isCobit: boolean,
) {
  const missing = questions
    .filter((question) => {
      return !isDraftComplete(responseDrafts[question.id], isCobit);
    })
    .map((question) => {
      const parts = parseCobitClause(question.clause);
      return isCobit
        ? `${parts.objective || question.clause} Level ${parts.level || "-"}`
        : `Klausul ${question.clause}`;
    });

  if (missing.length === 0) {
    return "Jawaban belum siap untuk Submit Final. Klik Simpan Sementara dulu.";
  }

  const preview = missing.slice(0, 6).join(", ");
  const suffix = missing.length > 6 ? `, dan ${missing.length - 6} lainnya` : "";
  return `Belum dijawab/disimpan: ${preview}${suffix}.`;
}

function isDraftComplete(draft: ResponseDraft | undefined, isCobit: boolean) {
  if (!draft || draft.compliance === "NA") {
    return false;
  }

  if (isCobit) {
    return true;
  }

  return draft.description.trim().length > 0;
}

function getVisibleStateToast(
  toast: ResponseFormState["toast"] | undefined,
  hiddenKey: string | number | null,
) {
  const key = toast?.id ?? toast?.message;
  if (!toast || (key && key === hiddenKey)) {
    return undefined;
  }

  return toast;
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
