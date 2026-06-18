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
  type CobitObjective,
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
} from "./designFactorMatrix";

export type CobitAuditScope = "ALL_40" | "BUMN_24" | "DESIGN_FACTOR";

export const cobitBumn24Objectives: CobitObjective[] = [
  "EDM01",
  "EDM02",
  "APO01",
  "APO02",
  "APO03",
  "APO05",
  "APO06",
  "APO09",
  "APO10",
  "APO12",
  "APO13",
  "APO14",
  "BAI02",
  "BAI03",
  "BAI04",
  "BAI06",
  "BAI07",
  "BAI09",
  "BAI11",
  "DSS01",
  "DSS02",
  "DSS04",
  "DSS05",
  "MEA01",
];

export const cobitObjectiveNames: Record<CobitObjective, string> = {
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

type DesignFactorAssessmentInput = {
  df01Input?: unknown;
  df02Input?: { rows: unknown } | null;
  df03Input?: { rows: unknown } | null;
  df04Input?: { rows: unknown } | null;
  df05Input?: unknown;
  df06Input?: unknown;
  df07Input?: unknown;
  df08Input?: unknown;
  df09Input?: unknown;
  df10Input?: unknown;
};

type FactorKey = "DF01" | "DF02" | "DF03" | "DF04" | "DF05" | "DF06" | "DF07" | "DF08" | "DF09" | "DF10";

export type CobitSummaryRow = {
  objective: CobitObjective;
  domainName: string;
  priorityScore: number;
  suggestedCapability: number;
  rank: number;
};

export function isCobitFramework(auditType: { name: string; isoStandard?: string | null }) {
  const text = `${auditType.name} ${auditType.isoStandard ?? ""}`.toUpperCase();
  return text.includes("COBIT");
}

export function normalizeCobitObjective(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function extractCobitObjective(value: string): CobitObjective | null {
  const normalized = normalizeCobitObjective(value);
  const match = normalized.match(/(EDM|APO|BAI|DSS|MEA)0?(\d{1,2})/);
  if (!match) return null;

  const objective = `${match[1]}${match[2].padStart(2, "0")}` as CobitObjective;
  return cobitObjectives.includes(objective) ? objective : null;
}

export function questionMatchesObjective(clause: string, objectives: readonly CobitObjective[]) {
  const objective = extractCobitObjective(clause);
  return Boolean(objective && objectives.includes(objective));
}

export function buildDesignFactorSummaryRows(assessment: DesignFactorAssessmentInput): CobitSummaryRow[] {
  const results: Record<FactorKey, ObjectiveCalculation[]> = {
    DF01: calculateDf01Results(mapDf01Input(assessment.df01Input)),
    DF02: calculateDf02Results(mapJsonRows<Df02InputRow>(assessment.df02Input, defaultDf02Rows(), 0, 5)),
    DF03: calculateDf03Results(mapRiskRows(assessment.df03Input)),
    DF04: calculateDf04Results(mapJsonRows<Df04InputRow>(assessment.df04Input, defaultDf04Rows(), 0, 3)),
    DF05: calculateDf05Results(mapDf05Input(assessment.df05Input)),
    DF06: calculateDf06Results(mapDf06Input(assessment.df06Input)),
    DF07: calculateDf07Results(mapDf07Input(assessment.df07Input)),
    DF08: calculateDf08Results(mapDf08Input(assessment.df08Input)),
    DF09: calculateDf09Results(mapDf09Input(assessment.df09Input)),
    DF10: calculateDf10Results(mapDf10Input(assessment.df10Input)),
  };

  const rawRows = cobitObjectives.map((objective) => {
    const df = Object.fromEntries(
      (Object.keys(results) as FactorKey[]).map((factor) => [
        factor,
        results[factor].find((result) => result.objective === objective)?.relativeImportance ?? 0,
      ]),
    ) as Record<FactorKey, number>;
    const rawScore = df.DF01 + df.DF02 + df.DF03 + df.DF04 + df.DF05 + df.DF06 + df.DF07 + df.DF08 + df.DF09 + df.DF10;
    return { objective, rawScore };
  });

  const maxScore = Math.max(...rawRows.map((row) => row.rawScore), 1);
  const withPriority = rawRows.map((row) => {
    const priorityScore = Math.max(0, Math.round(Math.trunc((row.rawScore / maxScore) * 100) / 5) * 5);
    return {
      objective: row.objective,
      domainName: cobitObjectiveNames[row.objective],
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
  if (priority >= 75) return 4;
  if (priority >= 50) return 3;
  if (priority >= 25) return 2;
  return 1;
}

function mapDf01Input(input: unknown): Df01InputRow[] {
  const data = input as Partial<{
    growthImportance: number;
    growthBaseline: number;
    innovationImportance: number;
    innovationBaseline: number;
    costImportance: number;
    costBaseline: number;
    serviceImportance: number;
    serviceBaseline: number;
  }> | null;

  if (!data) return defaultDf01Rows();

  return [
    { key: "growth", label: "Growth/Acquisition", importance: numberOr(data.growthImportance, 0), baseline: numberOr(data.growthBaseline, 3) },
    { key: "innovation", label: "Innovation/Differentiation", importance: numberOr(data.innovationImportance, 0), baseline: numberOr(data.innovationBaseline, 3) },
    { key: "cost", label: "Cost Leadership", importance: numberOr(data.costImportance, 0), baseline: numberOr(data.costBaseline, 3) },
    { key: "service", label: "Client Service/Stability", importance: numberOr(data.serviceImportance, 0), baseline: numberOr(data.serviceBaseline, 3) },
  ];
}

function mapJsonRows<T extends { key: string; importance: number; baseline: number }>(
  input: { rows: unknown } | null | undefined,
  defaults: T[],
  min: number,
  max: number,
): T[] {
  const rows = Array.isArray(input?.rows) ? input.rows : [];
  return defaults.map((defaultRow) => {
    const incoming = rows.find(
      (row): row is Partial<T> => Boolean(row) && typeof row === "object" && "key" in row && row.key === defaultRow.key,
    );
    return {
      ...defaultRow,
      importance: clampNumber(incoming?.importance, defaultRow.importance, min, max),
      baseline: clampNumber(incoming?.baseline, defaultRow.baseline, min, max),
    };
  });
}

function mapRiskRows(input: { rows: unknown } | null | undefined): Df03InputRow[] {
  const rows = Array.isArray(input?.rows) ? input.rows : [];
  return defaultDf03Rows().map((defaultRow) => {
    const incoming = rows.find(
      (row): row is Partial<Df03InputRow> => Boolean(row) && typeof row === "object" && "key" in row && row.key === defaultRow.key,
    );
    return {
      ...defaultRow,
      impact: clampNumber(incoming?.impact, defaultRow.impact, 0, 5),
      likelihood: clampNumber(incoming?.likelihood, defaultRow.likelihood, 0, 5),
      baseline: clampNumber(incoming?.baseline, defaultRow.baseline, 0, 25),
    };
  });
}

function mapDf05Input(input: unknown): Df05InputRow[] {
  const data = input as Partial<{ highImportance: number; highBaseline: number; normalImportance: number; normalBaseline: number }> | null;
  return [
    { key: "High", label: "High", importance: numberOr(data?.highImportance, 0), baseline: numberOr(data?.highBaseline, 30) },
    { key: "Normal", label: "Normal", importance: numberOr(data?.normalImportance, 0), baseline: numberOr(data?.normalBaseline, 30) },
  ];
}

function mapDf06Input(input: unknown): Df06InputRow[] {
  const data = input as Partial<{ highImportance: number; highBaseline: number; normalImportance: number; normalBaseline: number; lowImportance: number; lowBaseline: number }> | null;
  return [
    { key: "High", label: "High", importance: numberOr(data?.highImportance, 0), baseline: numberOr(data?.highBaseline, 30) },
    { key: "Normal", label: "Normal", importance: numberOr(data?.normalImportance, 0), baseline: numberOr(data?.normalBaseline, 30) },
    { key: "Low", label: "Low", importance: numberOr(data?.lowImportance, 0), baseline: numberOr(data?.lowBaseline, 30) },
  ];
}

function mapDf07Input(input: unknown): Df07InputRow[] {
  const data = input as Partial<{ supportImportance: number; supportBaseline: number; factoryImportance: number; factoryBaseline: number; turnaroundImportance: number; turnaroundBaseline: number; strategicImportance: number; strategicBaseline: number }> | null;
  return [
    { key: "Support", label: "Support", importance: numberOr(data?.supportImportance, 0), baseline: numberOr(data?.supportBaseline, 3) },
    { key: "Factory", label: "Factory", importance: numberOr(data?.factoryImportance, 0), baseline: numberOr(data?.factoryBaseline, 3) },
    { key: "Turnaround", label: "Turnaround", importance: numberOr(data?.turnaroundImportance, 0), baseline: numberOr(data?.turnaroundBaseline, 3) },
    { key: "Strategic", label: "Strategic", importance: numberOr(data?.strategicImportance, 0), baseline: numberOr(data?.strategicBaseline, 3) },
  ];
}

function mapDf08Input(input: unknown): Df08InputRow[] {
  const data = input as Partial<{ outsourcingImportance: number; outsourcingBaseline: number; cloudImportance: number; cloudBaseline: number; insourcingImportance: number; insourcingBaseline: number }> | null;
  return [
    { key: "Outsourcing", label: "Outsourcing", importance: numberOr(data?.outsourcingImportance, 0), baseline: numberOr(data?.outsourcingBaseline, 30) },
    { key: "Cloud", label: "Cloud", importance: numberOr(data?.cloudImportance, 0), baseline: numberOr(data?.cloudBaseline, 30) },
    { key: "Insourcing", label: "Insourced", importance: numberOr(data?.insourcingImportance, 0), baseline: numberOr(data?.insourcingBaseline, 30) },
  ];
}

function mapDf09Input(input: unknown): Df09InputRow[] {
  const data = input as Partial<{ agileImportance: number; agileBaseline: number; devOpsImportance: number; devOpsBaseline: number; traditionalImportance: number; traditionalBaseline: number }> | null;
  return [
    { key: "Agile", label: "Agile", importance: numberOr(data?.agileImportance, 0), baseline: numberOr(data?.agileBaseline, 30) },
    { key: "DevOps", label: "DevOps", importance: numberOr(data?.devOpsImportance, 0), baseline: numberOr(data?.devOpsBaseline, 30) },
    { key: "Traditional", label: "Traditional", importance: numberOr(data?.traditionalImportance, 0), baseline: numberOr(data?.traditionalBaseline, 30) },
  ];
}

function mapDf10Input(input: unknown): Df10InputRow[] {
  const data = input as Partial<{ firstMoverImportance: number; firstMoverBaseline: number; followerImportance: number; followerBaseline: number; slowAdopterImportance: number; slowAdopterBaseline: number }> | null;
  return [
    { key: "First_Mover", label: "First mover", importance: numberOr(data?.firstMoverImportance, 0), baseline: numberOr(data?.firstMoverBaseline, 30) },
    { key: "Follower", label: "Follower", importance: numberOr(data?.followerImportance, 0), baseline: numberOr(data?.followerBaseline, 30) },
    { key: "Slow_Adopter", label: "Slow adopter", importance: numberOr(data?.slowAdopterImportance, 0), baseline: numberOr(data?.slowAdopterBaseline, 30) },
  ];
}

function numberOr(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
