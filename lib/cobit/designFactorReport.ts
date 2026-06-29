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
  defaultDf02Rows,
  defaultDf03Rows,
  defaultDf04Rows,
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

export type ReportFactorCode = "DF01" | "DF02" | "DF03" | "DF04" | "DF05" | "DF06" | "DF07" | "DF08" | "DF09" | "DF10";
export type ReportInputRow = { key: string; label: string; value: number; baseline: number };
export type ReportSummaryRow = {
  objective: string;
  df: Record<ReportFactorCode, number>;
  initialScope: number;
  rawScore: number;
  priorityScore: number;
  suggestedCapability: number;
  rank: number;
};

export const reportFactorLabels: Record<ReportFactorCode, string> = {
  DF01: "Enterprise Strategy",
  DF02: "Enterprise Goals",
  DF03: "Risk Profile",
  DF04: "I&T-related Issues",
  DF05: "Threat Landscape",
  DF06: "Compliance Requirements",
  DF07: "Role of IT",
  DF08: "Sourcing Model",
  DF09: "IT Implementation Methods",
  DF10: "Technology Adoption Strategy",
};

type AssessmentInputs = {
  df01Input: Record<string, unknown> | null;
  df02Input: { rows: unknown } | null;
  df03Input: { rows: unknown } | null;
  df04Input: { rows: unknown } | null;
  df05Input: Record<string, unknown> | null;
  df06Input: Record<string, unknown> | null;
  df07Input: Record<string, unknown> | null;
  df08Input: Record<string, unknown> | null;
  df09Input: Record<string, unknown> | null;
  df10Input: Record<string, unknown> | null;
};

export function buildDesignFactorReportData(input: AssessmentInputs) {
  const rows = {
    DF01: fixedRows(input.df01Input, [
      ["growth", "Growth / Acquisition", "growthImportance", "growthBaseline", 1, 3],
      ["innovation", "Innovation / Differentiation", "innovationImportance", "innovationBaseline", 1, 3],
      ["cost", "Cost Leadership", "costImportance", "costBaseline", 1, 3],
      ["service", "Client Service / Stability", "serviceImportance", "serviceBaseline", 1, 3],
    ]),
    DF02: jsonRows(input.df02Input?.rows, defaultDf02Rows(), "importance"),
    DF03: riskRows(input.df03Input?.rows),
    DF04: jsonRows(input.df04Input?.rows, defaultDf04Rows(), "importance"),
    DF05: fixedRows(input.df05Input, [
      ["High", "High", "highImportance", "highBaseline", 100, 33],
      ["Normal", "Normal", "normalImportance", "normalBaseline", 100, 67],
    ]),
    DF06: fixedRows(input.df06Input, [
      ["High", "High", "highImportance", "highBaseline", 25, 0],
      ["Normal", "Normal", "normalImportance", "normalBaseline", 75, 100],
      ["Low", "Low", "lowImportance", "lowBaseline", 0, 0],
    ]),
    DF07: fixedRows(input.df07Input, [
      ["Support", "Support", "supportImportance", "supportBaseline", 1, 3],
      ["Factory", "Factory", "factoryImportance", "factoryBaseline", 1, 3],
      ["Turnaround", "Turnaround", "turnaroundImportance", "turnaroundBaseline", 2, 3],
      ["Strategic", "Strategic", "strategicImportance", "strategicBaseline", 5, 3],
    ]),
    DF08: fixedRows(input.df08Input, [
      ["Outsourcing", "Outsourcing", "outsourcingImportance", "outsourcingBaseline", 100, 33],
      ["Cloud", "Cloud", "cloudImportance", "cloudBaseline", 50, 33],
      ["Insourcing", "Insourced", "insourcingImportance", "insourcingBaseline", 20, 34],
    ]),
    DF09: fixedRows(input.df09Input, [
      ["Agile", "Agile", "agileImportance", "agileBaseline", 50, 15],
      ["DevOps", "DevOps", "devOpsImportance", "devOpsBaseline", 10, 10],
      ["Traditional", "Traditional", "traditionalImportance", "traditionalBaseline", 40, 75],
    ]),
    DF10: fixedRows(input.df10Input, [
      ["First_Mover", "First mover", "firstMoverImportance", "firstMoverBaseline", 75, 15],
      ["Follower", "Follower", "followerImportance", "followerBaseline", 15, 70],
      ["Slow_Adopter", "Slow adopter", "slowAdopterImportance", "slowAdopterBaseline", 10, 15],
    ]),
  } satisfies Record<ReportFactorCode, ReportInputRow[]>;

  const results: Record<ReportFactorCode, ObjectiveCalculation[]> = {
    DF01: calculateDf01Results(toStandard(rows.DF01) as Df01InputRow[]),
    DF02: calculateDf02Results(toStandard(rows.DF02) as Df02InputRow[]),
    DF03: calculateDf03Results(toRiskStandard(input.df03Input?.rows) as Df03InputRow[]),
    DF04: calculateDf04Results(toStandard(rows.DF04) as Df04InputRow[]),
    DF05: calculateDf05Results(toStandard(rows.DF05) as Df05InputRow[]),
    DF06: calculateDf06Results(toStandard(rows.DF06) as Df06InputRow[]),
    DF07: calculateDf07Results(toStandard(rows.DF07) as Df07InputRow[]),
    DF08: calculateDf08Results(toStandard(rows.DF08) as Df08InputRow[]),
    DF09: calculateDf09Results(toStandard(rows.DF09) as Df09InputRow[]),
    DF10: calculateDf10Results(toStandard(rows.DF10) as Df10InputRow[]),
  };

  return { factorRows: rows, summaryRows: buildSummaryRows(results) };
}

function toStandard(rows: ReportInputRow[]) {
  return rows.map((row) => ({ key: row.key, label: row.label, importance: row.value, baseline: row.baseline }));
}

function fixedRows(source: Record<string, unknown> | null, definitions: Array<[string, string, string, string, number, number]>): ReportInputRow[] {
  return definitions.map(([key, label, valueKey, baselineKey, valueFallback, baselineFallback]) => ({
    key,
    label,
    value: numeric(source?.[valueKey], valueFallback),
    baseline: numeric(source?.[baselineKey], baselineFallback),
  }));
}

function jsonRows<T extends { key: string; label: string; importance: number; baseline: number }>(raw: unknown, defaults: T[], valueKey: "importance") {
  const incoming = Array.isArray(raw) ? raw : [];
  return defaults.map((fallback) => {
    const found = incoming.find((item) => item && typeof item === "object" && (item as { key?: unknown }).key === fallback.key) as Record<string, unknown> | undefined;
    return { key: fallback.key, label: fallback.label, value: numeric(found?.[valueKey], fallback.importance), baseline: numeric(found?.baseline, fallback.baseline) };
  });
}

function riskRows(raw: unknown): ReportInputRow[] {
  return toRiskStandard(raw).map((row) => ({ key: row.key, label: row.label, value: row.impact * row.likelihood, baseline: row.baseline }));
}

function toRiskStandard(raw: unknown) {
  const incoming = Array.isArray(raw) ? raw : [];
  return defaultDf03Rows().map((fallback) => {
    const found = incoming.find((item) => item && typeof item === "object" && (item as { key?: unknown }).key === fallback.key) as Record<string, unknown> | undefined;
    return { ...fallback, impact: numeric(found?.impact, fallback.impact), likelihood: numeric(found?.likelihood, fallback.likelihood), baseline: numeric(found?.baseline, fallback.baseline) };
  });
}

function buildSummaryRows(results: Record<ReportFactorCode, ObjectiveCalculation[]>): ReportSummaryRow[] {
  const factorCodes = Object.keys(reportFactorLabels) as ReportFactorCode[];
  const rawRows = cobitObjectives.map((objective) => {
    const df = Object.fromEntries(factorCodes.map((factor) => [factor, results[factor].find((row) => row.objective === objective)?.relativeImportance ?? 0])) as Record<ReportFactorCode, number>;
    const initial = df.DF01 + df.DF02 + df.DF03 + df.DF04;
    return { objective, df, initial, raw: initial + df.DF05 + df.DF06 + df.DF07 + df.DF08 + df.DF09 + df.DF10 };
  });
  const maxInitial = Math.max(...rawRows.map((row) => row.initial), 1);
  const maxRaw = Math.max(...rawRows.map((row) => row.raw), 1);
  const scored = rawRows.map((row) => ({ ...row, initialScope: roundedScore(row.initial, maxInitial), priorityScore: roundedScore(row.raw, maxRaw) }));
  const sorted = [...scored].sort((a, b) => b.priorityScore - a.priorityScore || a.objective.localeCompare(b.objective));
  const ranks = new Map(sorted.map((row, index) => [row.objective, index + 1]));
  return scored.map((row) => ({ objective: row.objective, df: row.df, initialScope: row.initialScope, rawScore: row.raw, priorityScore: row.priorityScore, suggestedCapability: row.priorityScore >= 75 ? 4 : row.priorityScore >= 50 ? 3 : row.priorityScore >= 25 ? 2 : 1, rank: ranks.get(row.objective) ?? 0 }));
}

function roundedScore(value: number, max: number) {
  return Math.max(0, Math.round(Math.trunc((value / max) * 100) / 5) * 5);
}

function numeric(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
