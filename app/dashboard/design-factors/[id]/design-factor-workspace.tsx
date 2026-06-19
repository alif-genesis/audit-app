"use client";

import type { Dispatch, SetStateAction } from "react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Download, Save, Send } from "lucide-react";
import { Toast } from "@/components/toast";
import {
  calculateDf01Results,
  calculateDf02Results,
  calculateDf03Results,
  calculateDf04Results,
  calculateDf05Results,
  calculateDf06Results,
  calculateDf07Results,
  calculateDf08Results,
  calculateDf09Results,
  calculateDf10Results,
  cobitObjectives,
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
  enterpriseStrategyArchetypes,
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
  type ObjectiveCalculation,
} from "@/lib/cobit/designFactorMatrix";
import { downloadSimpleReportPdf } from "@/lib/report-pdf";
import { saveDf01AssessmentAction, type DesignFactorFormState } from "../actions";

type UserSide = "AUDITEE" | "AUDITOR" | "ADMIN" | "NONE";
type ActiveFactor = "DF01" | "DF02" | "DF03" | "DF04" | "DF05" | "DF06" | "DF07" | "DF08" | "DF09" | "DF10";
type ActiveTab = ActiveFactor | "SUMMARY";
type InputRow = Df01InputRow | Df02InputRow | Df04InputRow | Df05InputRow | Df06InputRow | Df07InputRow | Df08InputRow | Df09InputRow | Df10InputRow;
type ChartRow = InputRow | { key: string; label: string; importance: number; baseline: number };
type SaveState = Record<string, boolean | string[]>;

type SubmitState = {
  df01AuditeeSubmitted: boolean;
  df01AuditorSubmitted: boolean;
  df02AuditeeSubmitted: boolean;
  df02AuditorSubmitted: boolean;
  df03AuditeeSubmitted: boolean;
  df03AuditorSubmitted: boolean;
  df04AuditeeSubmitted: boolean;
  df04AuditorSubmitted: boolean;
  df05AuditeeSubmitted: boolean;
  df05AuditorSubmitted: boolean;
  df06AuditeeSubmitted: boolean;
  df06AuditorSubmitted: boolean;
  df07AuditeeSubmitted: boolean;
  df07AuditorSubmitted: boolean;
  df08AuditeeSubmitted: boolean;
  df08AuditorSubmitted: boolean;
  df09AuditeeSubmitted: boolean;
  df09AuditorSubmitted: boolean;
  df10AuditeeSubmitted: boolean;
  df10AuditorSubmitted: boolean;
};

type DesignFactorWorkspaceProps = {
  assessmentId: string;
  assessmentStatus: string;
  companyName: string;
  initialRows: Df01InputRow[];
  initialDf02Rows: Df02InputRow[];
  initialDf03Rows: Df03InputRow[];
  initialDf04Rows: Df04InputRow[];
  initialDf05Rows: Df05InputRow[];
  initialDf06Rows: Df06InputRow[];
  initialDf07Rows: Df07InputRow[];
  initialDf08Rows: Df08InputRow[];
  initialDf09Rows: Df09InputRow[];
  initialDf10Rows: Df10InputRow[];
  userSide: UserSide;
  submitState: SubmitState;
  saveState: SaveState;
  canEdit: boolean;
};

const initialState: DesignFactorFormState = {};
const tabs: ActiveTab[] = ["DF01", "DF02", "DF03", "DF04", "DF05", "DF06", "DF07", "DF08", "DF09", "DF10", "SUMMARY"];
const factorLabels: Record<ActiveFactor, string> = {
  DF01: "DF1 Enterprise Strategy",
  DF02: "DF2 Enterprise Goals",
  DF03: "DF3 Risk Profile",
  DF04: "DF4 IT Related Issues",
  DF05: "DF5 Threat Landscape",
  DF06: "DF6 Compliance Requirements",
  DF07: "DF7 Role of IT",
  DF08: "DF8 Sourcing Model",
  DF09: "DF9 IT Implementation Methods",
  DF10: "DF10 Technology Adoption Strategy",
};
const objectiveNames: Record<string, string> = {
  EDM01: "Ensured Governance Framework Setting and Maintenance",
  EDM02: "Ensured Benefits Delivery",
  EDM03: "Ensured Risk Optimization",
  EDM04: "Ensured Resource Optimization",
  EDM05: "Ensured Stakeholder Engagement",
  APO01: "Managed I&T Management Framework",
  APO02: "Managed Strategy",
  APO03: "Managed Enterprise Architecture",
  APO04: "Managed Innovation",
  APO05: "Managed Portfolio",
  APO06: "Managed Budget and Costs",
  APO07: "Managed Human Resources",
  APO08: "Managed Relationships",
  APO09: "Managed Service Agreements",
  APO10: "Managed Vendors",
  APO11: "Managed Quality",
  APO12: "Managed Risk",
  APO13: "Managed Security",
  APO14: "Managed Data",
  BAI01: "Managed Programs",
  BAI02: "Managed Requirements Definition",
  BAI03: "Managed Solutions Identification and Build",
  BAI04: "Managed Availability and Capacity",
  BAI05: "Managed Organizational Change",
  BAI06: "Managed IT Changes",
  BAI07: "Managed IT Change Acceptance and Transitioning",
  BAI08: "Managed Knowledge",
  BAI09: "Managed Assets",
  BAI10: "Managed Configuration",
  BAI11: "Managed Projects",
  DSS01: "Managed Operations",
  DSS02: "Managed Service Requests and Incidents",
  DSS03: "Managed Problems",
  DSS04: "Managed Continuity",
  DSS05: "Managed Security Services",
  DSS06: "Managed Business Process Controls",
  MEA01: "Managed Performance and Conformance Monitoring",
  MEA02: "Managed System of Internal Control",
  MEA03: "Managed Compliance With External Requirements",
  MEA04: "Managed Assurance",
};

export function DesignFactorWorkspace({
  assessmentId,
  assessmentStatus,
  companyName,
  initialRows,
  initialDf02Rows,
  initialDf03Rows,
  initialDf04Rows,
  initialDf05Rows,
  initialDf06Rows,
  initialDf07Rows,
  initialDf08Rows,
  initialDf09Rows,
  initialDf10Rows,
  userSide,
  submitState,
  saveState: initialSaveState,
  canEdit,
}: DesignFactorWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("DF01");
  const [visitedFactors, setVisitedFactors] = useState<ActiveFactor[]>(["DF01"]);
  const [selectedObjective, setSelectedObjective] = useState<string>("APO12");
  const [df01Rows, setDf01Rows] = useState(initialRows.length ? initialRows : defaultDf01Rows());
  const [df02Rows, setDf02Rows] = useState(initialDf02Rows.length ? initialDf02Rows : defaultDf02Rows());
  const [df03Rows, setDf03Rows] = useState(initialDf03Rows.length ? initialDf03Rows : defaultDf03Rows());
  const [df04Rows, setDf04Rows] = useState(initialDf04Rows.length ? initialDf04Rows : defaultDf04Rows());
  const [df05Rows, setDf05Rows] = useState(initialDf05Rows.length ? initialDf05Rows : defaultDf05Rows());
  const [df06Rows, setDf06Rows] = useState(initialDf06Rows.length ? initialDf06Rows : defaultDf06Rows());
  const [df07Rows, setDf07Rows] = useState(initialDf07Rows.length ? initialDf07Rows : defaultDf07Rows());
  const [df08Rows, setDf08Rows] = useState(initialDf08Rows.length ? initialDf08Rows : defaultDf08Rows());
  const [df09Rows, setDf09Rows] = useState(initialDf09Rows.length ? initialDf09Rows : defaultDf09Rows());
  const [df10Rows, setDf10Rows] = useState(initialDf10Rows.length ? initialDf10Rows : defaultDf10Rows());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(initialSaveState);
  const [touchedFields, setTouchedFields] = useState<string[]>([]);
  const [state, formAction] = useActionState(saveDf01AssessmentAction, initialState);
  const activeFactor: ActiveFactor = activeTab === "SUMMARY" ? "DF01" : activeTab;
  const visitedStorageKey = `design-factor:${assessmentId}:visited-factors`;

  useEffect(() => {
    const stored = window.localStorage.getItem(visitedStorageKey);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setVisitedFactors(parsed.filter((item): item is ActiveFactor => tabs.includes(item as ActiveTab) && item !== "SUMMARY"));
      }
    } catch {
      window.localStorage.removeItem(visitedStorageKey);
    }
  }, [visitedStorageKey]);

  useEffect(() => {
    if (activeTab === "SUMMARY") {
      return;
    }

    setVisitedFactors((current) => {
      if (current.includes(activeTab)) {
        return current;
      }
      const next = [...current, activeTab];
      window.localStorage.setItem(visitedStorageKey, JSON.stringify(next));
      return next;
    });
  }, [activeTab, visitedStorageKey]);

  useEffect(() => {
    if (state.toast?.type === "success") {
      setHasUnsavedChanges(false);
    }
    if (state.savedKey) {
      setSaveState((current) => ({ ...current, [state.savedKey as string]: true }));
    }
  }, [state.savedKey, state.toast]);
  const allSubmitted = tabs
    .filter((tab): tab is ActiveFactor => tab !== "SUMMARY")
    .every((factor) => {
      const prefix = factor.toLowerCase();
      return (
        submitState[`${prefix}AuditeeSubmitted` as keyof SubmitState] &&
        submitState[`${prefix}AuditorSubmitted` as keyof SubmitState]
      );
    });

  const activeRows =
    activeFactor === "DF10"
      ? df10Rows
      : activeFactor === "DF09"
      ? df09Rows
      : activeFactor === "DF08"
      ? df08Rows
      : activeFactor === "DF07"
      ? df07Rows
      : activeFactor === "DF06"
      ? df06Rows
      : activeFactor === "DF05"
      ? df05Rows
      : activeFactor === "DF03"
      ? df03Rows
      : activeFactor === "DF04"
      ? df04Rows
      : activeFactor === "DF02"
      ? df02Rows
      : df01Rows;
  const results = useMemo(
    () =>
      activeFactor === "DF10"
        ? calculateDf10Results(df10Rows)
        : activeFactor === "DF09"
        ? calculateDf09Results(df09Rows)
        : activeFactor === "DF08"
        ? calculateDf08Results(df08Rows)
        : activeFactor === "DF07"
        ? calculateDf07Results(df07Rows)
        : activeFactor === "DF06"
        ? calculateDf06Results(df06Rows)
        : activeFactor === "DF05"
          ? calculateDf05Results(df05Rows)
          : activeFactor === "DF03"
          ? calculateDf03Results(df03Rows)
          : activeFactor === "DF04"
          ? calculateDf04Results(df04Rows)
          : activeFactor === "DF02"
          ? calculateDf02Results(df02Rows)
          : calculateDf01Results(df01Rows),
    [activeFactor, df01Rows, df02Rows, df03Rows, df04Rows, df05Rows, df06Rows, df07Rows, df08Rows, df09Rows, df10Rows],
  );
  const summaryRows = useMemo(
    () =>
      buildSummaryRows({
        DF01: calculateDf01Results(df01Rows),
        DF02: calculateDf02Results(df02Rows),
        DF03: calculateDf03Results(df03Rows),
        DF04: calculateDf04Results(df04Rows),
        DF05: calculateDf05Results(df05Rows),
        DF06: calculateDf06Results(df06Rows),
        DF07: calculateDf07Results(df07Rows),
        DF08: calculateDf08Results(df08Rows),
        DF09: calculateDf09Results(df09Rows),
        DF10: calculateDf10Results(df10Rows),
      }),
    [df01Rows, df02Rows, df03Rows, df04Rows, df05Rows, df06Rows, df07Rows, df08Rows, df09Rows, df10Rows],
  );
  const auditeeSubmitted =
    activeFactor === "DF10"
      ? submitState.df10AuditeeSubmitted
      : activeFactor === "DF09"
      ? submitState.df09AuditeeSubmitted
      : activeFactor === "DF08"
      ? submitState.df08AuditeeSubmitted
      : activeFactor === "DF07"
      ? submitState.df07AuditeeSubmitted
      : activeFactor === "DF06"
      ? submitState.df06AuditeeSubmitted
      : activeFactor === "DF05"
        ? submitState.df05AuditeeSubmitted
        : activeFactor === "DF03"
        ? submitState.df03AuditeeSubmitted
        : activeFactor === "DF04"
        ? submitState.df04AuditeeSubmitted
        : activeFactor === "DF02"
        ? submitState.df02AuditeeSubmitted
        : submitState.df01AuditeeSubmitted;
  const auditorSubmitted =
    activeFactor === "DF10"
      ? submitState.df10AuditorSubmitted
      : activeFactor === "DF09"
      ? submitState.df09AuditorSubmitted
      : activeFactor === "DF08"
      ? submitState.df08AuditorSubmitted
      : activeFactor === "DF07"
      ? submitState.df07AuditorSubmitted
      : activeFactor === "DF06"
      ? submitState.df06AuditorSubmitted
      : activeFactor === "DF05"
        ? submitState.df05AuditorSubmitted
        : activeFactor === "DF03"
        ? submitState.df03AuditorSubmitted
        : activeFactor === "DF04"
        ? submitState.df04AuditorSubmitted
        : activeFactor === "DF02"
        ? submitState.df02AuditorSubmitted
        : submitState.df01AuditorSubmitted;
  const currentSideSubmitted =
    userSide === "AUDITEE" ? auditeeSubmitted : userSide === "AUDITOR" ? auditorSubmitted : false;
  const isAvailable =
    activeFactor === "DF01" ||
    activeFactor === "DF02" ||
    activeFactor === "DF03" ||
    activeFactor === "DF04" ||
    activeFactor === "DF05" ||
    activeFactor === "DF06" ||
    activeFactor === "DF07" ||
    activeFactor === "DF08" ||
    activeFactor === "DF09" ||
    activeFactor === "DF10";
  const canEditImportance = canEdit && isAvailable && userSide === "AUDITEE" && !auditeeSubmitted;
  const canEditBaseline = canEdit && isAvailable && userSide === "AUDITOR" && !auditorSubmitted;
  const canSubmit = isAvailable && (userSide === "AUDITEE" || userSide === "AUDITOR") && !currentSideSubmitted;
  const currentFactorSaved = isFactorSaved(activeFactor, userSide, saveState);
  const barRows =
    activeFactor === "DF03"
      ? df03Rows.map((row) => ({
          key: row.key,
          label: row.label,
          importance: row.impact * row.likelihood,
          baseline: row.baseline,
        }))
      : (activeRows as InputRow[]);

  const updateRow = (key: string, field: "importance" | "baseline", value: string) => {
    if ((field === "importance" && !canEditImportance) || (field === "baseline" && !canEditBaseline)) {
      return;
    }

    setHasUnsavedChanges(true);
    markFactorUnsaved(activeFactor, userSide, setSaveState);
    markFieldTouched(activeFactor, key, field, setTouchedFields);
    const isPercentageFactor =
      activeFactor === "DF05" ||
      activeFactor === "DF06" ||
      activeFactor === "DF08" ||
      activeFactor === "DF09" ||
      activeFactor === "DF10";
    const isThreePointFactor = activeFactor === "DF04";
    const max = isPercentageFactor ? 100 : isThreePointFactor ? 3 : 5;
    const min = 0;
    const numericValue = Math.min(max, Math.max(min, Number(value || min)));
    if (activeFactor === "DF10") {
      setDf10Rows((currentRows) =>
        currentRows.map((row) =>
          row.key === key
            ? {
                ...row,
                [field]: numericValue,
              }
            : row,
        ),
      );
      return;
    }

    if (activeFactor === "DF09") {
      setDf09Rows((currentRows) =>
        currentRows.map((row) =>
          row.key === key
            ? {
                ...row,
                [field]: numericValue,
              }
            : row,
        ),
      );
      return;
    }

    if (activeFactor === "DF08") {
      setDf08Rows((currentRows) =>
        currentRows.map((row) =>
          row.key === key
            ? {
                ...row,
                [field]: numericValue,
              }
            : row,
        ),
      );
      return;
    }

    if (activeFactor === "DF07") {
      setDf07Rows((currentRows) =>
        currentRows.map((row) =>
          row.key === key
            ? {
                ...row,
                [field]: numericValue,
              }
            : row,
        ),
      );
      return;
    }

    if (activeFactor === "DF06") {
      setDf06Rows((currentRows) =>
        currentRows.map((row) =>
          row.key === key
            ? {
                ...row,
                [field]: numericValue,
              }
            : row,
        ),
      );
      return;
    }

    if (activeFactor === "DF05") {
      setDf05Rows((currentRows) =>
        currentRows.map((row) =>
          row.key === key
            ? {
                ...row,
                [field]: numericValue,
              }
            : row,
        ),
      );
      return;
    }

    if (activeFactor === "DF04") {
      setDf04Rows((currentRows) =>
        currentRows.map((row) =>
          row.key === key
            ? {
                ...row,
                [field]: numericValue,
              }
            : row,
        ),
      );
      return;
    }

    if (activeFactor === "DF02") {
      setDf02Rows((currentRows) =>
        currentRows.map((row) =>
          row.key === key
            ? {
                ...row,
                [field]: numericValue,
              }
            : row,
        ),
      );
      return;
    }

    setDf01Rows((currentRows) =>
      currentRows.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]: numericValue,
            }
          : row,
      ),
    );
  };

  const updateDf03Row = (key: string, field: "impact" | "likelihood" | "baseline", value: string) => {
    if ((field === "baseline" && !canEditBaseline) || (field !== "baseline" && !canEditImportance)) {
      return;
    }

    setHasUnsavedChanges(true);
    markFactorUnsaved(activeFactor, userSide, setSaveState);
    markFieldTouched(activeFactor, key, field, setTouchedFields);
    const max = field === "baseline" ? 25 : 5;
    const min = 0;
    const numericValue = Math.min(max, Math.max(min, Number(value || min)));

    setDf03Rows((currentRows) =>
      currentRows.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]: numericValue,
            }
          : row,
      ),
    );
  };

  const validateActiveSubmit = () => {
    if (userSide !== "AUDITEE" && userSide !== "AUDITOR") {
      return "Submit hanya bisa dilakukan oleh auditee atau auditor yang ditugaskan.";
    }

    const allRowsByFactor: Record<ActiveFactor, Array<Record<string, unknown>>> = {
      DF01: df01Rows,
      DF02: df02Rows,
      DF03: df03Rows,
      DF04: df04Rows,
      DF05: df05Rows,
      DF06: df06Rows,
      DF07: df07Rows,
      DF08: df08Rows,
      DF09: df09Rows,
      DF10: df10Rows,
    };
    const incompleteFactor = tabs
      .filter((tab): tab is ActiveFactor => tab !== "SUMMARY")
      .find((factor) => {
        if (!isFactorReadyForSubmit(factor, userSide, saveState, submitState)) {
          return true;
        }

        const requiredFields =
          userSide === "AUDITEE"
            ? factor === "DF03"
              ? ["impact", "likelihood"]
              : ["importance"]
            : ["baseline"];
        return (
          !hasValidSubmissionValues(factor, userSide, allRowsByFactor[factor], requiredFields) ||
          !isSavedFieldSetComplete(factor, userSide, saveState, allRowsByFactor[factor], requiredFields)
        );
      });

    if (incompleteFactor) {
      return `${userSide === "AUDITEE" ? "Auditee" : "Auditor"} wajib melengkapi dan menyimpan semua isian sebelum submit final. Masih kosong di ${incompleteFactor}.`;
    }

    return null;
  };

  return (
    <>
      <Toast type={state.toast?.type} message={state.toast?.message} />

      <div className="df-tabs" role="tablist" aria-label="Design Factors">
        {tabs.map((tab) => (
          <button
            className={`df-tab ${activeTab === tab ? "active" : ""} ${
              tab !== "SUMMARY" && isFactorSaved(tab, userSide, saveState) ? "saved" : ""
            }`}
            key={tab}
            type="button"
            aria-selected={activeTab === tab}
            onClick={() => {
              if (
                hasUnsavedChanges &&
                !window.confirm("Ada jawaban Design Factor yang belum disimpan. Simpan dulu sebelum pindah halaman agar tidak hilang. Tetap pindah?")
              ) {
                return;
              }
              setActiveTab(tab);
            }}
          >
            {tab === "SUMMARY" ? "Summary" : tab}
          </button>
        ))}
      </div>

      {activeTab === "SUMMARY" ? (
        <DesignFactorSummaryDashboard
          assessmentStatus={assessmentStatus}
          companyName={companyName}
          isReady={allSubmitted}
          rows={summaryRows}
          selectedObjective={selectedObjective}
          onSelectObjective={setSelectedObjective}
        />
      ) : !isAvailable ? (
        <section className="users-panel df-coming-soon">
          <div>
            <h2>{activeFactor}</h2>
            <p>Coming soon.</p>
          </div>
        </section>
      ) : (
        <form action={formAction} className="df-workspace-form">
          <input name="assessmentId" type="hidden" value={assessmentId} />
          <input name="designFactor" type="hidden" value={activeFactor} />
          <input name="df01Rows" type="hidden" value={JSON.stringify(activeRows)} />
          <input name="filledFields" type="hidden" value={JSON.stringify(getActiveTouchedFields(activeFactor, touchedFields))} />

          <section className="users-panel df-panel">
            <div className="section-heading">
              <div>
                <h2>{getFactorTitle(activeFactor)}</h2>
                <p>
                  {activeFactor === "DF03"
                    ? "Auditee mengisi Impact dan Likelihood, auditor mengisi Baseline risk score."
                    : activeFactor === "DF02"
                    ? "Auditee mengisi Enterprise Goal, auditor mengisi Baseline untuk perhitungan EG ke AG ke Objective."
                    : activeFactor === "DF04"
                    ? "Auditee mengisi Importance issue I&T, auditor mengisi Baseline pada skala 1-3."
                    : activeFactor === "DF05" || activeFactor === "DF06" || activeFactor === "DF08" || activeFactor === "DF09" || activeFactor === "DF10"
                    ? "Auditee mengisi Importance, auditor mengisi Baseline dalam persentase."
                    : activeFactor === "DF07"
                      ? "Auditee mengisi Importance, auditor mengisi Baseline untuk Role of IT."
                    : "Auditee mengisi Importance, auditor mengisi Baseline untuk archetype strategi enterprise."}
                </p>
              </div>
              <div className="df-header-actions">
                <div className="df-submit-status">
                  <span className={auditeeSubmitted ? "done" : ""}>Auditee {auditeeSubmitted ? "submitted" : "open"}</span>
                  <span className={auditorSubmitted ? "done" : ""}>Auditor {auditorSubmitted ? "submitted" : "open"}</span>
                </div>
                {userSide === "AUDITEE" || userSide === "AUDITOR" ? (
                  <div className="submit-split-actions df-top-actions">
                    <DfSubmitButton
                      disabled={!canEditImportance && !canEditBaseline}
                      intent="save"
                      label={currentFactorSaved ? "Saved" : "Save Assessment"}
                      pendingLabel="Menyimpan..."
                      saved={currentFactorSaved}
                    />
                    <DfSubmitButton
                      disabled={!canSubmit}
                      intent="submitAll"
                      label="Submit Final"
                      pendingLabel="Submit..."
                      confirmMessage={`Anda yakin submit final Design Factor? Setelah submit, ${userSide === "AUDITEE" ? "auditee" : "auditor"} tidak bisa submit ulang.`}
                      validateBeforeConfirm={validateActiveSubmit}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="table-wrap df-input-wrap">
              {activeFactor === "DF03" ? (
                <table className="user-table df-input-table">
                  <thead>
                    <tr>
                      <th>Risk Scenario Category</th>
                      <th>Impact (1-5)</th>
                      <th>Likelihood (1-5)</th>
                      <th>Risk Rating</th>
                      <th>Baseline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {df03Rows.map((row) => {
                      const riskScore = row.impact * row.likelihood;
                      const riskLevel = getRiskLevel(riskScore);
                      return (
                        <tr key={row.key}>
                          <td>
                            <strong>{row.label}</strong>
                          </td>
                          <td>
                            <input
                              aria-label={`${row.label} impact`}
                              className="df-number-input"
                              type="number"
                              min="0"
                              max="5"
                              step="1"
                              value={row.impact}
                              disabled={!canEditImportance}
                              onChange={(event) => updateDf03Row(row.key, "impact", event.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              aria-label={`${row.label} likelihood`}
                              className="df-number-input"
                              type="number"
                              min="0"
                              max="5"
                              step="1"
                              value={row.likelihood}
                              disabled={!canEditImportance}
                              onChange={(event) => updateDf03Row(row.key, "likelihood", event.target.value)}
                            />
                          </td>
                          <td>
                            <span className={`df-risk-pill ${riskLevel.className}`}>
                              <i className="df-risk-dot" aria-hidden="true" />
                              {riskScore}
                            </span>
                          </td>
                          <td>
                            <input
                              aria-label={`${row.label} baseline`}
                              className="df-number-input"
                              type="number"
                              min="0"
                              max="25"
                              step="1"
                              value={row.baseline}
                              disabled={!canEditBaseline}
                              onChange={(event) => updateDf03Row(row.key, "baseline", event.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="user-table df-input-table">
                  <thead>
                    <tr>
                      <th>
                        {activeFactor === "DF01"
                          ? "Enterprise Strategy Archetype"
                          : activeFactor === "DF02"
                          ? "Enterprise Goal"
                          : activeFactor === "DF04"
                          ? "IT-Related Issue"
                          : "Value"}
                      </th>
                      <th>{getImportanceHeader(activeFactor)}</th>
                      {activeFactor === "DF04" ? <th>Issue Rating</th> : null}
                      <th>{getBaselineHeader(activeFactor)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeRows as InputRow[]).map((row) => {
                      const issueLevel = getIssueLevel(row.importance);
                      return (
                        <tr key={row.key}>
                          <td>
                            <strong>{row.label}</strong>
                          </td>
                          <td>
                            <input
                              aria-label={`${row.label} importance`}
                              className="df-number-input"
                              type="number"
                              min="0"
                              max={activeFactor === "DF05" || activeFactor === "DF06" || activeFactor === "DF08" || activeFactor === "DF09" || activeFactor === "DF10" ? "100" : activeFactor === "DF04" ? "3" : "5"}
                              step="1"
                              value={row.importance}
                              disabled={!canEditImportance}
                              onChange={(event) => updateRow(row.key, "importance", event.target.value)}
                            />
                          </td>
                          {activeFactor === "DF04" ? (
                            <td>
                              <span className={`df-risk-pill ${issueLevel.className}`}>
                                <i className="df-risk-dot" aria-hidden="true" />
                                {issueLevel.label}
                              </span>
                            </td>
                          ) : null}
                          <td>
                            <input
                              aria-label={`${row.label} baseline`}
                              className="df-number-input"
                              type="number"
                              min="0"
                              max={activeFactor === "DF05" || activeFactor === "DF06" || activeFactor === "DF08" || activeFactor === "DF09" || activeFactor === "DF10" ? "100" : activeFactor === "DF04" ? "3" : "5"}
                              step="1"
                              value={row.baseline}
                              disabled={!canEditBaseline}
                              onChange={(event) => updateRow(row.key, "baseline", event.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {activeFactor === "DF03" ? (
              <RiskLegend
                title="Risk Rating Legend"
                items={[
                  { label: "1-3 Low Risk", className: "low" },
                  { label: "4-8 Normal Risk", className: "normal" },
                  { label: "9-14 High Risk", className: "high" },
                  { label: "15-25 Very High Risk", className: "very-high" },
                ]}
              />
            ) : null}
            {activeFactor === "DF04" ? (
              <RiskLegend
                title="Issue Rating Legend"
                items={[
                  { label: "1 Low issue", className: "normal" },
                  { label: "2 Medium issue", className: "high" },
                  { label: "3 High issue", className: "very-high" },
                ]}
              />
            ) : null}
          </section>

          <section className="df-chart-grid">
            <article className="standards-panel df-chart-card">
              <div className="section-heading compact-heading">
                <h2>Importance Bar</h2>
              </div>
              <HorizontalBarChart
                rows={barRows}
                max={
                  activeFactor === "DF03"
                    ? 25
                    : activeFactor === "DF04"
                    ? 3
                    : activeFactor === "DF05" || activeFactor === "DF06" || activeFactor === "DF08" || activeFactor === "DF09" || activeFactor === "DF10"
                    ? 100
                    : 5
                }
                suffix={activeFactor === "DF05" || activeFactor === "DF06" || activeFactor === "DF08" || activeFactor === "DF09" || activeFactor === "DF10" ? "%" : ""}
              />
            </article>
            <article className="standards-panel df-chart-card">
              <div className="section-heading compact-heading">
                <h2>{activeFactor === "DF01" ? "Strategy Radar" : "Objectives Importance"}</h2>
              </div>
              {activeFactor === "DF01" ? (
                <InputRadar rows={activeRows as InputRow[]} max={5} />
              ) : (
                <FullObjectiveImportanceRadar results={results} activeFactor={activeFactor} />
              )}
            </article>
            <article className="standards-panel df-chart-card">
              <div className="section-heading compact-heading">
                <h2>G/M Objectives Radar</h2>
              </div>
              <ObjectiveRadar results={results} />
            </article>
          </section>

          <section className="users-panel df-panel">
            <div className="section-heading">
              <div>
                <h2>Hasil Perhitungan Objectives</h2>
                <p>Score, Baseline Score, dan Relative Importance untuk seluruh domain COBIT.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="user-table df-result-table">
                <thead>
                  <tr>
                    <th>Objective</th>
                    <th>Score</th>
                    <th>Baseline Score</th>
                    <th>Relative Importance</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.objective}>
                      <td>
                        <strong>{result.objective}</strong>
                      </td>
                      <td>{formatNumber(result.score)}</td>
                      <td>{formatNumber(result.baselineScore)}</td>
                      <td>
                        <span className={result.relativeImportance >= 0 ? "ri-positive" : "ri-negative"}>
                          {formatNumber(result.relativeImportance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </form>
      )}
    </>
  );
}

type FactorResultMap = Record<ActiveFactor, ObjectiveCalculation[]>;
type SummaryRow = {
  objective: string;
  domainName: string;
  df: Record<ActiveFactor, number>;
  initialScope: number;
  adjustment: number;
  rawScore: number;
  priorityScore: number;
  suggestedCapability: number;
  rank: number;
};

function DesignFactorSummaryDashboard({
  assessmentStatus,
  companyName,
  isReady,
  rows,
  selectedObjective,
  onSelectObjective,
}: {
  assessmentStatus: string;
  companyName: string;
  isReady: boolean;
  rows: SummaryRow[];
  selectedObjective: string;
  onSelectObjective: (objective: string) => void;
}) {
  const sortedRows = [...rows].sort((a, b) => a.rank - b.rank);
  const highest = sortedRows[0] ?? rows[0];
  const adoptedRows = sortedRows.filter((row) => row.suggestedCapability >= 2);
  const focusRows = sortedRows.filter((row) => row.suggestedCapability === 4);
  const levelCounts = [4, 3, 2, 1].map((level) => ({
    level,
    count: rows.filter((row) => row.suggestedCapability === level).length,
  }));
  const downloadedAt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  if (!isReady && assessmentStatus !== "SUBMITTED" && assessmentStatus !== "REVIEWED" && assessmentStatus !== "APPROVED") {
    return (
      <section className="df-summary-shell">
        <article className="users-panel df-insight-panel df-insight-top">
          <strong>Summary belum tersedia</strong>
          <p>
            Summary akan muncul dan terisi setelah seluruh DF01-DF10 disubmit oleh auditee dan direview/submitted oleh auditor.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="df-summary-shell">
      <div className="section-heading">
        <div>
          <h2>Summary Dashboard - COBIT 2019 Design Factors</h2>
          <p>Prioritas domain COBIT berdasarkan hasil perhitungan DF01-DF10.</p>
        </div>
        <button
          className="primary-button report-download-button"
          type="button"
          onClick={() =>
            downloadSimpleReportPdf(
              {
                title: "LAPORAN PENILAIAN COBIT 2019",
                subtitle: "CAPABILITY & DESIGN FACTOR ASSESSMENT",
                downloadedAt,
                summaryTitle: "RINGKASAN",
                summaryText: `Laporan ini menyajikan ringkasan hasil Design Factors COBIT 2019 untuk ${companyName}. Hasil ini digunakan untuk menentukan area tata kelola dan manajemen I&T yang perlu menjadi prioritas organisasi.`,
                totalLabel: "DOMAIN DIADOPSI LEVEL 2-4",
                totalValue: String(adoptedRows.length),
                stats: [
                  { label: "Total Objective", value: String(rows.length) },
                  { label: "Diadopsi", value: String(adoptedRows.length) },
                  { label: "Level 4", value: String(levelCounts.find((item) => item.level === 4)?.count ?? 0) },
                  { label: "Level 3", value: String(levelCounts.find((item) => item.level === 3)?.count ?? 0) },
                  { label: "Level 2", value: String(levelCounts.find((item) => item.level === 2)?.count ?? 0) },
                ],
                sectionTitle: "DOMAIN DIADOPSI LEVEL 2-4",
                bars: adoptedRows.map((row) => ({
                  label: row.objective,
                  value: row.priorityScore,
                })),
                note: "Domain dengan Suggested Capability Level 2, 3, dan 4 diadopsi dalam scope audit Design Factor. Domain Level 1 dikecualikan dari scope audit.",
                tables: [
                  {
                    title: "Level Distribution",
                    columns: ["Level", "Jumlah Domain"],
                    rows: levelCounts.map((item) => [`Level ${item.level}`, `${item.count} domain`]),
                  },
                  {
                    title: "Initial Summary - Governance and Management Objectives",
                    columns: ["Domain", "Domain Name", "Initial Scope"],
                    rows: sortedRows.map((row) => [row.objective, row.domainName, formatNumber(row.initialScope)]),
                  },
                  {
                    title: "Governance and Management Objectives Importance",
                    columns: ["Domain", "Domain Name", "Priority", "Capability", "Rank"],
                    rows: sortedRows.map((row) => [
                      row.objective,
                      row.domainName,
                      String(row.priorityScore),
                      `Level ${row.suggestedCapability}`,
                      `#${row.rank}`,
                    ]),
                  },
                  {
                    title: "Governance Objectives Priority Table",
                    columns: ["Domain", "Initial", "Raw", "Priority", "Capability"],
                    rows: sortedRows.map((row) => [
                      row.objective,
                      formatNumber(row.initialScope),
                      formatNumber(row.rawScore),
                      String(row.priorityScore),
                      `Level ${row.suggestedCapability}`,
                    ]),
                  },
                  {
                    title: "Trace Contribution DF1-DF5",
                    columns: ["Domain", "DF1", "DF2", "DF3", "DF4", "DF5"],
                    rows: sortedRows.map((row) => [
                      row.objective,
                      formatNumber(row.df.DF01),
                      formatNumber(row.df.DF02),
                      formatNumber(row.df.DF03),
                      formatNumber(row.df.DF04),
                      formatNumber(row.df.DF05),
                    ]),
                  },
                  {
                    title: "Trace Contribution DF6-DF10",
                    columns: ["Domain", "DF6", "DF7", "DF8", "DF9", "DF10"],
                    rows: sortedRows.map((row) => [
                      row.objective,
                      formatNumber(row.df.DF06),
                      formatNumber(row.df.DF07),
                      formatNumber(row.df.DF08),
                      formatNumber(row.df.DF09),
                      formatNumber(row.df.DF10),
                    ]),
                  },
                ],
              },
              `laporan-cobit-design-factor-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
            )
          }
        >
          <Download size={16} aria-hidden="true" />
          Download Report
        </button>
      </div>

      <article className="users-panel df-insight-panel df-insight-top">
        <strong>Automated Insight</strong>
        <p>
          Berdasarkan hasil Design Factors COBIT 2019 untuk {companyName}, terdapat <b>{adoptedRows.length} domain diadopsi</b> dengan Suggested Capability Level 2, 3, dan 4. Domain ini masuk scope audit COBIT, gap assessment, dan roadmap peningkatan tata kelola TI; hanya domain Level 1 yang dikecualikan dari scope adopsi.
        </p>
        {adoptedRows.length > 0 ? (
          <div className="focus-chip-list">
            {adoptedRows.slice(0, 24).map((row) => (
              <button key={row.objective} type="button" onClick={() => onSelectObjective(row.objective)}>
                {row.objective}
              </button>
            ))}
          </div>
        ) : null}
      </article>

      <div className="df-summary-cards">
        <SummaryCard label="Total Governance & Management Objectives" value={String(rows.length)} />
        <SummaryCard label="Domain Diadopsi Level 2-4" value={`${adoptedRows.length} domain`} />
        <SummaryCard label="Area Fokus Level 4" value={`${focusRows.length} domain`} />
        <article className="df-summary-card level-card">
          <span>Level Distribution</span>
          {levelCounts.map((item) => (
            <strong key={item.level}>Level {item.level}: {item.count} domain</strong>
          ))}
        </article>
      </div>

      <div className="df-summary-grid chart-wide-grid">
        <article className="users-panel df-summary-panel">
          <div className="section-heading compact-heading">
            <h2>Initial Summary - Governance and Management Objectives</h2>
          </div>
          <ObjectiveDivergingBarChart rows={rows} valueKey="initialScope" onSelectObjective={onSelectObjective} />
        </article>

        <article className="users-panel df-summary-panel">
          <div className="section-heading compact-heading">
            <h2>Governance and Management Objectives Importance (All Design Factors)</h2>
          </div>
          <ObjectiveImportanceChart rows={rows} onSelectObjective={onSelectObjective} />
        </article>
      </div>

      <div className="df-summary-grid priority-full-grid">
        <article className="users-panel df-summary-panel">
          <div className="section-heading compact-heading">
            <h2>Domain Diadopsi Level 2-4</h2>
            <p>Domain dengan Suggested Capability Level 2, 3, dan 4.</p>
          </div>
          <div className="priority-bars">
            {adoptedRows.length > 0 ? (
              adoptedRows.map((row) => (
                <button key={row.objective} type="button" onClick={() => onSelectObjective(row.objective)}>
                  <span>{row.objective}</span>
                  <div className="chart-track">
                    <i className={getPriorityClass(row.priorityScore)} style={{ width: `${row.priorityScore}%` }} />
                  </div>
                  <strong>{row.priorityScore}</strong>
                </button>
              ))
            ) : (
              <p className="empty-focus-note">Belum ada domain yang masuk Level 2, 3, atau 4.</p>
            )}
          </div>
        </article>
      </div>

      <article className="users-panel df-summary-panel">
        <div className="section-heading">
          <div>
            <h2>Governance Objectives Priority Table</h2>
            <p>Klik domain untuk melihat trace kontribusi Design Factor.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="user-table df-summary-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Domain Name</th>
                <th>DF1</th>
                <th>DF2</th>
                <th>DF3</th>
                <th>DF4</th>
                <th>Initial Scope</th>
                <th>DF5</th>
                <th>DF6</th>
                <th>DF7</th>
                <th>DF8</th>
                <th>DF9</th>
                <th>DF10</th>
                <th>Raw Score</th>
                <th>Priority Score</th>
                <th>Suggested Capability</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.objective} onClick={() => onSelectObjective(row.objective)}>
                  <td><strong>{row.objective}</strong></td>
                  <td>{row.domainName}</td>
                  <td>{formatNumber(row.df.DF01)}</td>
                  <td>{formatNumber(row.df.DF02)}</td>
                  <td>{formatNumber(row.df.DF03)}</td>
                  <td>{formatNumber(row.df.DF04)}</td>
                  <td>{formatNumber(row.initialScope)}</td>
                  <td>{formatNumber(row.df.DF05)}</td>
                  <td>{formatNumber(row.df.DF06)}</td>
                  <td>{formatNumber(row.df.DF07)}</td>
                  <td>{formatNumber(row.df.DF08)}</td>
                  <td>{formatNumber(row.df.DF09)}</td>
                  <td>{formatNumber(row.df.DF10)}</td>
                  <td>{formatNumber(row.rawScore)}</td>
                  <td><span className={`priority-pill ${getPriorityClass(row.priorityScore)}`}>{row.priorityScore}</span></td>
                  <td>Level {row.suggestedCapability}</td>
                  <td>#{row.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="df-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ObjectiveDivergingBarChart({
  rows,
  valueKey,
  onSelectObjective,
}: {
  rows: SummaryRow[];
  valueKey: "initialScope" | "rawScore";
  onSelectObjective: (objective: string) => void;
}) {
  return (
    <div className="objective-bar-chart diverging-chart">
      <div className="bar-axis diverging-axis">
        <span>-100</span>
        <span>-50</span>
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      {rows.map((row) => {
        const value = row[valueKey];
        const displayValue = Math.max(-100, Math.min(100, value));
        const width = (Math.abs(displayValue) / 100) * 50;
        const style =
          displayValue >= 0
            ? { left: "50%", width: `${width}%` }
            : { left: `${50 - width}%`, width: `${width}%` };

        return (
          <button className="objective-bar-row" key={row.objective} type="button" onClick={() => onSelectObjective(row.objective)}>
            <span>{row.objective} - {row.domainName}</span>
            <div className="objective-bar-track">
              <i className={displayValue >= 0 ? "positive" : "negative"} style={style} />
              <b style={displayValue >= 0 ? { left: `calc(50% + ${width}% - 34px)` } : { left: `calc(${50 - width}% + 8px)` }}>
                {formatNumber(value)}
              </b>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ObjectiveImportanceChart({
  rows,
  onSelectObjective,
}: {
  rows: SummaryRow[];
  onSelectObjective: (objective: string) => void;
}) {
  return (
    <div className="objective-bar-chart importance-chart">
      <div className="bar-axis importance-axis">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      {rows.map((row) => {
        const labelPosition = Math.max(row.priorityScore, 6);

        return (
          <button className="objective-bar-row" key={row.objective} type="button" onClick={() => onSelectObjective(row.objective)}>
            <span>{row.objective} - {row.domainName}</span>
            <div className="objective-bar-track">
              <i className={getPriorityClass(row.priorityScore)} style={{ left: 0, width: `${row.priorityScore}%` }} />
              <b style={{ left: `calc(${labelPosition}% - 34px)` }}>{row.priorityScore}</b>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RiskLegend({ title, items }: { title: string; items: Array<{ label: string; className: string }> }) {
  return (
    <div className="df-risk-legend">
      <strong>{title}</strong>
      {items.map((item) => (
        <span className={`df-risk-pill ${item.className}`} key={item.label}>
          <i className="df-risk-dot" aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function buildSummaryRows(results: FactorResultMap): SummaryRow[] {
  const rawRows = cobitObjectives.map((objective) => {
    const df = Object.fromEntries(
      tabs
        .filter((tab): tab is ActiveFactor => tab !== "SUMMARY")
        .map((factor) => [
          factor,
          results[factor].find((result) => result.objective === objective)?.relativeImportance ?? 0,
        ]),
    ) as Record<ActiveFactor, number>;
    const initialScope = df.DF01 + df.DF02 + df.DF03 + df.DF04;
    const adjustment = 0;
    const rawScore =
      initialScope + df.DF05 + df.DF06 + df.DF07 + df.DF08 + df.DF09 + df.DF10 + adjustment;

    return {
      objective,
      domainName: objectiveNames[objective] ?? objective,
      df,
      initialScope,
      adjustment,
      rawScore,
    };
  });
  const maxScore = Math.max(...rawRows.map((row) => row.rawScore), 1);
  const withPriority = rawRows.map((row) => {
    const priorityScore = Math.max(0, Math.round(Math.trunc((row.rawScore / maxScore) * 100) / 5) * 5);
    return {
      ...row,
      priorityScore,
      suggestedCapability: getSuggestedCapability(priorityScore),
    };
  });
  const sorted = [...withPriority].sort((a, b) => b.priorityScore - a.priorityScore || a.objective.localeCompare(b.objective));
  const ranks = new Map(sorted.map((row, index) => [row.objective, index + 1]));

  return withPriority.map((row) => ({
    ...row,
    rank: ranks.get(row.objective) ?? 0,
  }));
}

function getSuggestedCapability(priority: number) {
  if (priority >= 75) {
    return 4;
  }
  if (priority >= 50) {
    return 3;
  }
  if (priority >= 25) {
    return 2;
  }
  return 1;
}

function getPriorityClass(priority: number) {
  if (priority >= 90) {
    return "priority-very-high";
  }
  if (priority >= 75) {
    return "priority-high";
  }
  if (priority >= 50) {
    return "priority-medium";
  }
  if (priority >= 25) {
    return "priority-low";
  }
  return "priority-critical";
}

function getCapabilityColor(level: number) {
  if (level === 4) {
    return "#126b3a";
  }
  if (level === 3) {
    return "#2aa45c";
  }
  if (level === 2) {
    return "#f3c14f";
  }
  return "#ef6c35";
}

function HorizontalBarChart({ rows, max, suffix }: { rows: ChartRow[]; max: number; suffix: string }) {
  return (
    <div className="df-bars">
      {rows.map((row) => (
        <div className="df-bar-row" key={row.key}>
          <div>
            <span>{row.label}</span>
            <strong>
              {row.importance}
              {suffix}
            </strong>
          </div>
          <div className="chart-track">
            <span className="chart-fill info" style={{ width: `${(row.importance / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InputRadar({ rows, max }: { rows: InputRow[]; max: number }) {
  const importancePoints = rows.map((row, index) => radarPoint(index, rows.length, (row.importance / max) * 82));
  const baselinePoints = rows.map((row, index) => radarPoint(index, rows.length, (row.baseline / max) * 82));

  return (
    <div className="radar-wrap">
      <svg viewBox="0 0 220 220" role="img" aria-label="Input radar chart">
        <RadarGrid sides={rows.length} />
        <polygon points={baselinePoints.map(pointToString).join(" ")} fill="rgba(111, 181, 29, 0.16)" stroke="#6fb51d" strokeWidth="3" />
        <polygon points={importancePoints.map(pointToString).join(" ")} fill="rgba(21, 101, 216, 0.18)" stroke="#1565d8" strokeWidth="3" />
        {rows.map((row, index) => {
          const labelPoint = radarPoint(index, rows.length, 100);
          const label =
            row.key === "High" || row.key === "Normal" || row.key === "Low"
              ? row.key
              : enterpriseStrategyArchetypes[index].key.slice(0, 4).toUpperCase();
          return (
            <text key={row.key} x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          );
        })}
      </svg>
      <RadarLegend />
    </div>
  );
}

function ObjectiveRadar({ results }: { results: ObjectiveCalculation[] }) {
  const domainData = ["EDM", "APO", "BAI", "DSS", "MEA"].map((domain) => {
    const domainResults = results.filter((result) => result.objective.startsWith(domain));
    const score =
      domainResults.reduce((sum, result) => sum + result.score, 0) / Math.max(domainResults.length, 1);
    const baseline =
      domainResults.reduce((sum, result) => sum + result.baselineScore, 0) / Math.max(domainResults.length, 1);
    return { domain, score, baseline };
  });
  const maxValue = Math.max(...domainData.flatMap((item) => [item.score, item.baseline]), 1);
  const scorePoints = domainData.map((item, index) => radarPoint(index, domainData.length, (item.score / maxValue) * 82));
  const baselinePoints = domainData.map((item, index) => radarPoint(index, domainData.length, (item.baseline / maxValue) * 82));

  return (
    <div className="radar-wrap">
      <svg viewBox="0 0 220 220" role="img" aria-label="Governance and management objectives radar chart">
        <RadarGrid sides={domainData.length} />
        <polygon points={baselinePoints.map(pointToString).join(" ")} fill="rgba(111, 181, 29, 0.16)" stroke="#6fb51d" strokeWidth="3" />
        <polygon points={scorePoints.map(pointToString).join(" ")} fill="rgba(21, 101, 216, 0.18)" stroke="#1565d8" strokeWidth="3" />
        {domainData.map((item, index) => {
          const labelPoint = radarPoint(index, domainData.length, 100);
          return (
            <text key={item.domain} x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle">
              {item.domain}
            </text>
          );
        })}
      </svg>
      <RadarLegend />
    </div>
  );
}

function FullObjectiveImportanceRadar({
  results,
  activeFactor,
}: {
  results: ObjectiveCalculation[];
  activeFactor: ActiveFactor;
}) {
  const size = 560;
  const center = size / 2;
  const maxRadius = 214;
  const points = results.map((result, index) => {
    const value = Math.max(-100, Math.min(100, result.relativeImportance));
    return polarPoint(index, results.length, ((value + 100) / 200) * maxRadius, center);
  });

  return (
    <div className="objective-radar-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${activeFactor} objective importance radar chart`}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <circle
            key={tick}
            cx={center}
            cy={center}
            r={((tick + 100) / 200) * maxRadius}
            fill="none"
            stroke="#d2d8e2"
            strokeWidth="1"
          />
        ))}
        {results.map((result, index) => {
          const edge = polarPoint(index, results.length, maxRadius, center);
          const label = polarPoint(index, results.length, maxRadius + 28, center);
          return (
            <g key={result.objective}>
              <line x1={center} y1={center} x2={edge.x} y2={edge.y} stroke="#d2d8e2" strokeWidth="1" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle">
                {result.objective}
              </text>
            </g>
          );
        })}
        <polygon points={points.map(pointToString).join(" ")} fill="rgba(226, 135, 214, 0.32)" stroke="#c957b9" strokeWidth="2" />
        {[-100, -75, -50, -25, 0, 25, 50, 75, 100].map((tick) => (
          <text
            className={tick < 0 ? "negative-tick" : ""}
            key={tick}
            x={center}
            y={center - ((tick + 100) / 200) * maxRadius}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {tick}
          </text>
        ))}
      </svg>
    </div>
  );
}

function RadarLegend() {
  return (
    <div className="df-radar-legend">
      <span><i className="legend-dot info" />Importance</span>
      <span><i className="legend-dot good" />Baseline</span>
    </div>
  );
}

function RadarGrid({ sides }: { sides: number }) {
  return (
    <>
      {[0.25, 0.5, 0.75, 1].map((scale) => {
        const points = Array.from({ length: sides }, (_, index) => radarPoint(index, sides, 82 * scale));
        return (
          <polygon
            key={scale}
            points={points.map(pointToString).join(" ")}
            fill="none"
            stroke="#d8e2ef"
            strokeWidth="1"
          />
        );
      })}
      {Array.from({ length: sides }, (_, index) => {
        const point = radarPoint(index, sides, 82);
        return <line key={index} x1="110" y1="110" x2={point.x} y2={point.y} stroke="#e4ecf6" />;
      })}
    </>
  );
}

function radarPoint(index: number, total: number, radius: number) {
  return polarPoint(index, total, radius, 110);
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

function getFactorTitle(activeFactor: ActiveFactor) {
  if (activeFactor === "DF02") {
    return "DF02 - Enterprise Goals";
  }
  if (activeFactor === "DF03") {
    return "DF03 - Risk Profile";
  }
  if (activeFactor === "DF04") {
    return "DF04 - I&T-Related Issues";
  }
  if (activeFactor === "DF05") {
    return "DF05 - Threat Landscape";
  }
  if (activeFactor === "DF06") {
    return "DF06 - Compliance Requirements";
  }
  if (activeFactor === "DF07") {
    return "DF07 - Role of IT";
  }
  if (activeFactor === "DF08") {
    return "DF08 - Sourcing Model for IT";
  }
  if (activeFactor === "DF09") {
    return "DF09 - IT Implementation Methods";
  }
  if (activeFactor === "DF10") {
    return "DF10 - Technology Adoption Strategy";
  }
  return "DF01 - Enterprise Strategy";
}

function isPercentageFactor(factor: ActiveFactor | string) {
  return factor === "DF05" || factor === "DF06" || factor === "DF08" || factor === "DF09" || factor === "DF10";
}

function getRiskLevel(score: number) {
  if (score >= 15) {
    return { label: "Very High Risk", className: "very-high" };
  }
  if (score >= 9) {
    return { label: "High Risk", className: "high" };
  }
  if (score >= 4) {
    return { label: "Normal Risk", className: "normal" };
  }
  return { label: "Low Risk", className: "low" };
}

function getIssueLevel(score: number) {
  if (score >= 3) {
    return { label: "High", className: "very-high" };
  }
  if (score >= 2) {
    return { label: "Medium", className: "high" };
  }
  return { label: "Low", className: "normal" };
}

function getImportanceHeader(activeFactor: ActiveFactor) {
  if (activeFactor === "DF05" || activeFactor === "DF06" || activeFactor === "DF08" || activeFactor === "DF09" || activeFactor === "DF10") {
    return "Importance (%)";
  }
  if (activeFactor === "DF04") {
    return "Importance (1-3)";
  }
  if (activeFactor === "DF02") {
    return "Importance (1-5)";
  }
  if (activeFactor === "DF07") {
    return "Importance (1-5)";
  }
  return "Importance";
}

function getBaselineHeader(activeFactor: ActiveFactor) {
  if (activeFactor === "DF05" || activeFactor === "DF06" || activeFactor === "DF08" || activeFactor === "DF09" || activeFactor === "DF10") {
    return "Baseline (%)";
  }
  return "Baseline";
}

function DfSubmitButton({
  intent,
  label,
  pendingLabel,
  disabled,
  saved,
  confirmMessage,
  validateBeforeConfirm,
}: {
  intent: "save" | "submit" | "submitAll";
  label: string;
  pendingLabel: string;
  disabled: boolean;
  saved?: boolean;
  confirmMessage?: string;
  validateBeforeConfirm?: () => string | null;
}) {
  const { pending } = useFormStatus();
  const Icon = intent === "submit" || intent === "submitAll" ? Send : Save;

  return (
    <button
      className={intent === "submit" || intent === "submitAll" ? "primary-button" : `secondary-button${saved ? " saved" : ""}`}
      name="intent"
      value={intent}
      type="submit"
      disabled={pending || disabled}
      onClick={(event) => {
        const validationMessage = validateBeforeConfirm?.();
        if (validationMessage) {
          event.preventDefault();
          window.alert(validationMessage);
          return;
        }
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      style={{ minWidth: "180px" }}
    >
      <Icon size={16} aria-hidden="true" />
      {pending ? pendingLabel : label}
    </button>
  );
}

function getSaveStateKey(factor: ActiveFactor, side: UserSide) {
  if (side !== "AUDITEE" && side !== "AUDITOR") {
    return null;
  }

  return `${factor.toLowerCase()}${side === "AUDITEE" ? "Auditee" : "Auditor"}Saved`;
}

function isFactorSaved(factor: ActiveFactor, side: UserSide, saveState: SaveState) {
  if (side === "ADMIN") {
    const auditeeKey = `${factor.toLowerCase()}AuditeeSaved`;
    const auditorKey = `${factor.toLowerCase()}AuditorSaved`;
    return Boolean(saveState[auditeeKey] || saveState[auditorKey]);
  }

  const key = getSaveStateKey(factor, side);
  return key ? Boolean(saveState[key]) : false;
}

function isFactorSubmitted(factor: ActiveFactor, side: UserSide, submitState: SubmitState) {
  if (side !== "AUDITEE" && side !== "AUDITOR") {
    return false;
  }

  const prefix = factor.toLowerCase();
  const key = `${prefix}${side === "AUDITEE" ? "Auditee" : "Auditor"}Submitted` as keyof SubmitState;
  return Boolean(submitState[key]);
}

function isFactorReadyForSubmit(
  factor: ActiveFactor,
  side: UserSide,
  saveState: SaveState,
  submitState: SubmitState,
) {
  return isFactorSaved(factor, side, saveState) || isFactorSubmitted(factor, side, submitState);
}

function getFilledFieldsKey(factor: ActiveFactor | string, side: UserSide) {
  if (side !== "AUDITEE" && side !== "AUDITOR") {
    return null;
  }

  return `${factor.toLowerCase()}${side === "AUDITEE" ? "Auditee" : "Auditor"}FilledFields`;
}

function isSavedFieldSetComplete(
  factor: ActiveFactor,
  side: UserSide,
  saveState: SaveState,
  rows: Array<Record<string, unknown>>,
  requiredFields: string[],
) {
  if (side !== "AUDITEE" && side !== "AUDITOR") {
    return false;
  }

  const key = getFilledFieldsKey(factor, side);
  const savedFields = key ? saveState[key] : null;
  if (!Array.isArray(savedFields)) {
    return true;
  }

  const saved = new Set(savedFields);
  return rows.every((row) => {
    const rowKey = String(row.key ?? "");
    if (!rowKey) {
      return false;
    }

    const savedEveryField = requiredFields.every((field) => saved.has(`${rowKey}.${field}`));
    if (savedEveryField) {
      return true;
    }

    return hasValidSubmissionValues(factor, side, [row], requiredFields);
  });
}

function hasValidSubmissionValues(
  factor: ActiveFactor,
  side: UserSide,
  rows: Array<Record<string, unknown>>,
  requiredFields: string[],
) {
  if (side !== "AUDITEE" && side !== "AUDITOR") {
    return false;
  }

  const zeroIsValid = isPercentageFactor(factor);
  return rows.every((row) =>
    requiredFields.every((field) => {
      const value = Number(row[field]);
      return Number.isFinite(value) && (zeroIsValid ? value >= 0 : value > 0);
    }),
  );
}

function markFactorUnsaved(
  factor: ActiveFactor,
  side: UserSide,
  setSaveState: Dispatch<SetStateAction<SaveState>>,
) {
  const key = getSaveStateKey(factor, side);
  if (!key) {
    return;
  }

  setSaveState((current) => ({ ...current, [key]: false }));
}

function markFieldTouched(
  factor: ActiveFactor,
  rowKey: string,
  field: string,
  setTouchedFields: Dispatch<SetStateAction<string[]>>,
) {
  const key = `${factor}.${rowKey}.${field}`;
  setTouchedFields((current) => (current.includes(key) ? current : [...current, key]));
}

function getActiveTouchedFields(factor: ActiveFactor, touchedFields: string[]) {
  const prefix = `${factor}.`;
  return touchedFields
    .filter((field) => field.startsWith(prefix))
    .map((field) => field.slice(prefix.length));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
