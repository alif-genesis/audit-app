import type { ComplianceStatus } from "@prisma/client";

export const COBIT_DOMAINS = ["EDM", "APO", "BAI", "DSS", "MEA"] as const;
export const COBIT_LEVELS = [1, 2, 3, 4, 5] as const;

export type CobitDomain = (typeof COBIT_DOMAINS)[number];
export type CobitLevel = (typeof COBIT_LEVELS)[number];
export type CobitRating = "F" | "L" | "P" | "N" | "N/A";

export type CobitQuestionLike = {
  id: string;
  clause: string;
  title?: string | null;
  question?: string;
};

export type CobitResponseLike = {
  questionId: string;
  compliance: ComplianceStatus | string;
};

export type CobitFindingLike = {
  responseId: string | null;
  level?: string | null;
};

export type CobitClauseParts = {
  domain: CobitDomain | "";
  objective: string;
  level: CobitLevel;
};

export type CobitLevelSummary = {
  level: CobitLevel;
  total: number;
  yes: number;
  no: number;
  percentage: number;
  rating: CobitRating;
  applicable: boolean;
};

export type CobitObjectiveSummary = {
  domain: CobitDomain | "";
  objective: string;
  title: string;
  levels: CobitLevelSummary[];
  achievedLevel: number;
  averageScore: number;
  answered: number;
  total: number;
};

export type CobitDomainSummary = {
  domain: CobitDomain;
  achievedLevel: number;
  averageScore: number;
  objectiveCount: number;
  answered: number;
  total: number;
};

export type CobitAuditSummary = {
  baseline: number;
  overallCapability: number;
  overallScore: number;
  answered: number;
  total: number;
  objectives: CobitObjectiveSummary[];
  domains: CobitDomainSummary[];
};

export function parseCobitClause(clause: string): CobitClauseParts {
  const normalized = clause.toUpperCase().replace(/[^A-Z0-9. -]/g, "");
  const objective = normalized.match(/\b(EDM|APO|BAI|DSS|MEA)\s*0?\d{1,2}\b/)?.[0]?.replace(/\s+/g, "") ?? "";
  const domain = COBIT_DOMAINS.find((item) => objective.startsWith(item)) ?? "";
  const rawLevel =
    normalized.match(/(?:^|[.\-\s])L(?:EVEL)?\s*([1-5])\b/)?.[1] ??
    normalized.match(/\bLEVEL\s*([1-5])\b/)?.[1] ??
    "";
  const parsedLevel = Number(rawLevel);

  return {
    domain,
    objective,
    level: parsedLevel >= 1 && parsedLevel <= 5 ? (parsedLevel as CobitLevel) : 1,
  };
}

export function getCobitRating(percentage: number): CobitRating {
  if (percentage > 85) return "F";
  if (percentage > 50) return "L";
  if (percentage > 15) return "P";
  return "N";
}

export function isCapabilityAchieved(rating: CobitRating) {
  return rating === "F" || rating === "L";
}

export function parseCobitBaseline(description: string | null | undefined) {
  const match = String(description ?? "").match(/Baseline COBIT:\s*(\d+(?:\.\d+)?)/i);
  const baseline = match ? Number(match[1]) : 3;
  if (!Number.isFinite(baseline)) {
    return 3;
  }

  return baseline > 5
    ? Math.min(5, Math.max(0, baseline / 20))
    : Math.min(5, Math.max(0, baseline));
}

export function buildCobitAuditSummary(
  questions: CobitQuestionLike[],
  responses: CobitResponseLike[],
  description?: string | null,
): CobitAuditSummary {
  const responseMap = new Map(responses.map((response) => [response.questionId, response]));
  const objectiveMap = new Map<string, CobitQuestionLike[]>();

  for (const question of questions) {
    const parts = parseCobitClause(question.clause);
    const objective = parts.objective || question.clause;
    objectiveMap.set(objective, [...(objectiveMap.get(objective) ?? []), question]);
  }

  const objectives = [...objectiveMap.entries()]
    .map(([objective, objectiveQuestions]) => buildObjectiveSummary(objective, objectiveQuestions, responseMap))
    .sort(compareCobitObjectives);

  const domains = COBIT_DOMAINS.map((domain) => {
    const domainObjectives = objectives.filter((objective) => objective.domain === domain);
    const objectiveCount = domainObjectives.length;
    const total = domainObjectives.reduce((sum, objective) => sum + objective.total, 0);
    const answered = domainObjectives.reduce((sum, objective) => sum + objective.answered, 0);
    const averageScore =
      objectiveCount > 0
        ? Math.round(domainObjectives.reduce((sum, objective) => sum + objective.averageScore, 0) / objectiveCount)
        : 0;
    const achievedLevel =
      objectiveCount > 0
        ? Number((domainObjectives.reduce((sum, objective) => sum + objective.achievedLevel, 0) / objectiveCount).toFixed(2))
        : 0;

    return { domain, achievedLevel, averageScore, objectiveCount, answered, total };
  });

  const total = objectives.reduce((sum, objective) => sum + objective.total, 0);
  const answered = objectives.reduce((sum, objective) => sum + objective.answered, 0);
  const applicableDomains = domains.filter((domain) => domain.objectiveCount > 0);
  const overallCapability =
    applicableDomains.length > 0
      ? Number((applicableDomains.reduce((sum, domain) => sum + domain.achievedLevel, 0) / applicableDomains.length).toFixed(2))
      : 0;
  const overallScore =
    applicableDomains.length > 0
      ? Math.round(applicableDomains.reduce((sum, domain) => sum + domain.averageScore, 0) / applicableDomains.length)
      : 0;

  return {
    baseline: parseCobitBaseline(description),
    overallCapability,
    overallScore,
    answered,
    total,
    objectives,
    domains,
  };
}

function compareCobitObjectives(a: CobitObjectiveSummary, b: CobitObjectiveSummary) {
  const domainA = getCobitDomainOrder(a.domain);
  const domainB = getCobitDomainOrder(b.domain);

  if (domainA !== domainB) {
    return domainA - domainB;
  }

  const numberA = getCobitObjectiveNumber(a.objective);
  const numberB = getCobitObjectiveNumber(b.objective);

  if (numberA !== numberB) {
    return numberA - numberB;
  }

  return a.objective.localeCompare(b.objective);
}

function getCobitDomainOrder(domain: CobitDomain | "") {
  const index = COBIT_DOMAINS.indexOf(domain as CobitDomain);
  return index === -1 ? COBIT_DOMAINS.length : index;
}

function getCobitObjectiveNumber(objective: string) {
  const match = objective.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export function buildCobitAuditorResponseData(
  responses: Array<{ id: string; questionId: string; compliance: ComplianceStatus | string }>,
  findings: CobitFindingLike[],
): CobitResponseLike[] {
  const findingMap = new Map(
    findings
      .filter((finding) => finding.responseId)
      .map((finding) => [finding.responseId, finding]),
  );

  return responses.map((response) => {
    const finding = findingMap.get(response.id);
    const compliance =
      finding?.level === "PASS"
        ? "COMPLY"
        : finding?.level === "MAJOR"
          ? "NOT_COMPLY"
          : response.compliance;

    return {
      questionId: response.questionId,
      compliance,
    };
  });
}

function buildObjectiveSummary(
  objective: string,
  questions: CobitQuestionLike[],
  responseMap: Map<string, CobitResponseLike>,
): CobitObjectiveSummary {
  const firstQuestion = questions[0];
  const parts = parseCobitClause(firstQuestion?.clause ?? objective);
  const title = firstQuestion?.title || objective;
  const levels = COBIT_LEVELS.map((level) => {
    const levelQuestions = questions.filter((question) => parseCobitClause(question.clause).level === level);
    const yes = levelQuestions.filter((question) => responseMap.get(question.id)?.compliance === "COMPLY").length;
    const no = levelQuestions.filter((question) => responseMap.get(question.id)?.compliance === "NOT_COMPLY").length;
    const percentage = levelQuestions.length > 0 ? Math.round((yes / levelQuestions.length) * 100) : 0;
    const applicable = levelQuestions.length > 0;

    return {
      level,
      total: levelQuestions.length,
      yes,
      no,
      percentage,
      rating: applicable ? getCobitRating(percentage) : "N/A",
      applicable,
    };
  });

  let achievedLevel = 0;
  for (const level of levels.filter((item) => item.applicable)) {
    if (!isCapabilityAchieved(level.rating)) break;
    achievedLevel = level.level;
  }

  const total = levels.reduce((sum, level) => sum + level.total, 0);
  const answered = questions.filter((question) => {
    const response = responseMap.get(question.id);
    return response ? response.compliance !== "NA" : false;
  }).length;
  const applicableLevels = levels.filter((level) => level.applicable);
  const averageScore =
    applicableLevels.length > 0
      ? Math.round(applicableLevels.reduce((sum, level) => sum + level.percentage, 0) / applicableLevels.length)
      : 0;

  return {
    domain: parts.domain,
    objective,
    title,
    levels,
    achievedLevel,
    averageScore,
    answered,
    total,
  };
}
