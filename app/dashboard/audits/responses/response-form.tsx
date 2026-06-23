"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, Plus } from "lucide-react";
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

type LiveResponse = {
  questionId: string;
  compliance: string;
  description: string;
  attachments: string[];
  evidenceFiles?: EvidenceItem[];
  submittedAt: string | null;
  updatedAt: string;
};

type EvidenceItem = {
  path: string;
  name: string;
  size?: number;
  uploadedAt?: string;
};

type PendingEvidenceItem = {
  key: string;
  name: string;
  size: number;
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
  const autoSaveTimersRef = useRef<Record<string, number>>({});
  const fileQuestionIdsRef = useRef<Set<string>>(new Set());
  const [touchedQuestionIds, setTouchedQuestionIds] = useState<Set<string>>(() => new Set());
  const [fileQuestionIds, setFileQuestionIds] = useState<Set<string>>(() => new Set());
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<Record<string, PendingEvidenceItem[]>>({});
  const [liveResponses, setLiveResponses] = useState<Record<string, LiveResponse>>(() =>
    Object.fromEntries(
      questions.map((question) => {
        const response = responses.get(question.id);
        return [
          question.id,
          {
            questionId: question.id,
            compliance: response?.compliance || "NA",
            description: response?.description || "",
            attachments: response?.attachments ?? [],
            evidenceFiles: (response?.attachments ?? []).map((path) => ({
              path,
              name: getEvidenceFileName(path),
            })),
            submittedAt: response?.submittedAt?.toISOString() ?? null,
            updatedAt: response?.updatedAt?.toISOString() ?? "",
          },
        ];
      }),
    ),
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
  const allVisibleSubmitted = questions.length > 0 && questions.every((question) => liveResponses[question.id]?.submittedAt);
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
      setTouchedQuestionIds(new Set());
      setFileQuestionIds(new Set());
      setPendingEvidenceFiles({});
      fileQuestionIdsRef.current = new Set();
    }
  }, [state.toast]);

  useEffect(() => {
    let cancelled = false;

    const fetchLatestResponses = async () => {
      try {
        const response = await fetch(`/api/audits/${audit.id}/responses`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { responses?: LiveResponse[] };
        if (cancelled || !Array.isArray(data.responses)) {
          return;
        }

        setLiveResponses(
          Object.fromEntries(data.responses.map((item) => [item.questionId, item])),
        );
        setResponseDrafts((current) => {
          const next = { ...current };
          for (const item of data.responses ?? []) {
            if (touchedQuestionIds.has(item.questionId)) {
              continue;
            }
            next[item.questionId] = {
              questionId: item.questionId,
              compliance: item.compliance || "NA",
              description: item.description || "",
            };
          }
          return next;
        });
      } catch {
        // Live updates are best-effort; saving still uses server validation.
      }
    };

    const interval = window.setInterval(fetchLatestResponses, 1500);
    void fetchLatestResponses();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [audit.id, touchedQuestionIds]);

  useEffect(() => {
    return () => {
      Object.values(autoSaveTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

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
    setTouchedQuestionIds((current) => {
      const next = new Set(current);
      next.add(questionId);
      return next;
    });
    setResponseDrafts((current) => {
      const previous = current[questionId] ?? {
        questionId,
        compliance: "NA",
        description: "",
      };
      const nextDraft = {
        ...previous,
        ...patch,
      };
      scheduleAutoSave(nextDraft);
      return {
        ...current,
        [questionId]: nextDraft,
      };
    });
  };

  const scheduleAutoSave = (draft: ResponseDraft) => {
    window.clearTimeout(autoSaveTimersRef.current[draft.questionId]);
    autoSaveTimersRef.current[draft.questionId] = window.setTimeout(() => {
      void saveLiveResponse(draft);
    }, 650);
  };

  const saveLiveResponse = async (draft: ResponseDraft) => {
    try {
      const response = await fetch(`/api/audits/${audit.id}/responses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { response?: LiveResponse };
      if (!data.response) {
        return;
      }

      setLiveResponses((current) => ({
        ...current,
        [data.response!.questionId]: data.response!,
      }));
      setTouchedQuestionIds((current) => {
        if (fileQuestionIdsRef.current.has(draft.questionId)) {
          return current;
        }

        const next = new Set(current);
        next.delete(draft.questionId);
        if (next.size === 0 && fileQuestionIdsRef.current.size === 0) {
          setHasUnsavedChanges(false);
        }
        return next;
      });
    } catch {
      // Manual Save Sementara remains available if a live save fails.
    }
  };

  const uploadEvidenceFiles = async (questionId: string, files: File[], draft: ResponseDraft) => {
    if (files.length === 0) {
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.set("questionId", questionId);
    uploadFormData.set("compliance", draft.compliance);
    uploadFormData.set("description", draft.description);
    files.forEach((file) => uploadFormData.append("files", file));

    try {
      const response = await fetch(`/api/audits/${audit.id}/responses`, {
        method: "POST",
        body: uploadFormData,
      });
      const data = (await response.json().catch(() => null)) as { response?: LiveResponse; error?: string } | null;

      if (!response.ok || !data?.response) {
        setClientToast({
          type: "error",
          message: data?.error ?? "File evidence gagal disimpan.",
          id: Date.now(),
        });
        setPendingEvidenceFiles((current) => {
          const next = { ...current };
          delete next[questionId];
          return next;
        });
        return;
      }

      setLiveResponses((current) => ({
        ...current,
        [data.response!.questionId]: data.response!,
      }));
      setResponseDrafts((current) => ({
        ...current,
        [data.response!.questionId]: {
          questionId: data.response!.questionId,
          compliance: data.response!.compliance || "NA",
          description: data.response!.description || "",
        },
      }));
      setPendingEvidenceFiles((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
      setTouchedQuestionIds((current) => {
        const next = new Set(current);
        next.delete(questionId);
        if (next.size === 0) {
          setHasUnsavedChanges(false);
        }
        return next;
      });
      setFileQuestionIds((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
      fileQuestionIdsRef.current.delete(questionId);
      setClientToast({
        type: "success",
        message: "File evidence berhasil disimpan.",
        id: Date.now(),
      });
    } catch {
      setClientToast({
        type: "error",
        message: "File evidence gagal disimpan.",
        id: Date.now(),
      });
      setPendingEvidenceFiles((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
    }
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
        {[...new Set([...touchedQuestionIds, ...fileQuestionIds])].map((questionId) => (
          <input
            key={`response-payload-${questionId}`}
            name="responses[]"
            type="hidden"
            value={JSON.stringify(responseDrafts[questionId])}
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
                          <CobitCapabilityScoreCard
                            rating={level.rating}
                            applicable={level.applicable}
                            percentage={level.percentage}
                            yes={level.yes}
                            no={level.no}
                            total={level.total}
                          />
                        </td>
                      ))}
                      <td>
                        <span className="cobit-achieved-level-card">
                          <span>Level</span>
                          <strong>{activeObjectiveSummary.achievedLevel}</strong>
                        </span>
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
          const response = liveResponses[question.id];
          const draft = responseDrafts[question.id] ?? {
            questionId: question.id,
            compliance: "NA",
            description: "",
          };
          const cobitParts = parseCobitClause(question.clause);

          const isAnswered = isDraftComplete(draft, isCobit);

          return (
            <div key={question.id} className={`question-card ${isAnswered ? "answered" : "pending"}`}>
              <div className="question-header">
                <div>
                  <h3 className="question-main-text">{question.question}</h3>
                  <div className="question-meta-line">
                    <span className="question-number">
                      Q{index + 1} - {isCobit ? `${cobitParts.objective || question.clause} Level ${cobitParts.level || "-"}` : `Klausul ${question.clause}`}
                    </span>
                  </div>
                </div>
                {isAnswered ? (
                  <span className="status-badge done">Sudah Dijawab</span>
                ) : (
                  <span className="status-badge pending">Belum Dijawab</span>
                )}
              </div>

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
                  <small className="field-hint">Maksimal 5 file aktif per pertanyaan. Ukuran maksimal 10 MB per file, sehingga total maksimal 50 MB. Jika sudah 5 file, upload berikutnya menggantikan file paling lama.</small>
                  <input
                    className="evidence-file-input"
                    name={`supportingFiles-${question.id}`}
                    type="file"
                    multiple
                    onChange={(event) => {
                      const selectedFiles = Array.from(event.currentTarget.files ?? []);
                      if (selectedFiles.length === 0) {
                        return;
                      }
                      const currentDraft = responseDrafts[question.id] ?? draft;
                      setHasUnsavedChanges(true);
                      fileQuestionIdsRef.current = new Set(fileQuestionIdsRef.current).add(question.id);
                      setPendingEvidenceFiles((current) => ({
                        ...current,
                        [question.id]: selectedFiles.map((file) => ({
                          key: `${file.name}-${file.size}-${file.lastModified}`,
                          name: file.name,
                          size: file.size,
                        })),
                      }));
                      setFileQuestionIds((current) => {
                        const next = new Set(current);
                        next.add(question.id);
                        return next;
                      });
                      setTouchedQuestionIds((current) => {
                        const next = new Set(current);
                        next.add(question.id);
                        return next;
                      });
                      hideCurrentToast();
                      void uploadEvidenceFiles(question.id, selectedFiles, currentDraft);
                    }}
                  />
                  <EvidenceUploadTable
                    evidenceFiles={response?.evidenceFiles}
                    attachments={response?.attachments ?? []}
                    pendingFiles={pendingEvidenceFiles[question.id] ?? []}
                  />
                </label>
              </div>
            </div>
          );
        })}

      </form>
    </>
  );
}

function EvidenceUploadTable({
  evidenceFiles,
  attachments,
  pendingFiles,
}: {
  evidenceFiles?: EvidenceItem[];
  attachments: string[];
  pendingFiles: PendingEvidenceItem[];
}) {
  const rows: EvidenceItem[] =
    evidenceFiles && evidenceFiles.length > 0
      ? evidenceFiles
      : attachments.map((path) => ({
          path,
          name: getEvidenceFileName(path),
        }));

  if (rows.length === 0 && pendingFiles.length === 0) {
    return <small className="field-hint">Belum ada file evidence tersimpan.</small>;
  }

  return (
    <div className="evidence-upload-table-wrap">
      <table className="evidence-upload-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama File</th>
            <th>Ukuran</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {pendingFiles.map((file, index) => (
            <tr className="evidence-pending-row" key={`pending-${file.key}`}>
              <td>{index + 1}</td>
              <td>{file.name}</td>
              <td>{formatFileSize(file.size)}</td>
              <td>
                <span className="evidence-pending-badge">Menyimpan</span>
              </td>
            </tr>
          ))}
          {rows.map((file, index) => (
            <tr key={file.path}>
              <td>{pendingFiles.length + index + 1}</td>
              <td>{file.name}</td>
              <td>{typeof file.size === "number" ? formatFileSize(file.size) : "-"}</td>
              <td>
                <a href={file.path} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} aria-hidden="true" />
                  Buka
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CobitCapabilityScoreCard({
  rating,
  applicable,
  percentage,
  yes,
  no,
  total,
}: {
  rating: string;
  applicable: boolean;
  percentage: number;
  yes: number;
  no: number;
  total: number;
}) {
  const normalizedRating = applicable ? rating.toUpperCase() : "N/A";
  const className = normalizedRating === "N/A" ? "na" : normalizedRating.toLowerCase();

  return (
    <span className={`cobit-capability-score-card ${className}`}>
      <span className="cobit-capability-rating">{normalizedRating}</span>
      <span className="cobit-capability-score-detail">
        <strong>{applicable ? `${percentage}%` : "N/A"}</strong>
        <span>{applicable ? `${yes}/${total} terpenuhi` : "Tidak berlaku"}</span>
      </span>
      {applicable ? <span className="cobit-capability-yn">Y: {yes} / N: {no}</span> : null}
    </span>
  );
}

function getEvidenceFileName(path: string) {
  const rawName = path.split("/").pop() || "Evidence";
  return rawName.replace(/^\d+-/, "");
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
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
            <span className={`cobit-average-rating-card ${averageRating === "N/A" ? "na" : averageRating.toLowerCase()}`}>
              <span>Rating</span>
              <strong>{averageRating}</strong>
            </span>
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
