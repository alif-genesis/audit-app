export type EnterpriseStrategyKey = "growth" | "innovation" | "cost" | "service";

export type Df01InputRow = {
  key: EnterpriseStrategyKey;
  label: string;
  importance: number;
  baseline: number;
};

export type EnterpriseGoalKey =
  | "EG01"
  | "EG02"
  | "EG03"
  | "EG04"
  | "EG05"
  | "EG06"
  | "EG07"
  | "EG08"
  | "EG09"
  | "EG10"
  | "EG11"
  | "EG12"
  | "EG13";

export type Df02InputRow = {
  key: EnterpriseGoalKey;
  label: string;
  importance: number;
  baseline: number;
};

export type RiskScenarioKey =
  | "itInvestment"
  | "programProjects"
  | "itCostOversight"
  | "itExpertise"
  | "enterpriseArchitecture"
  | "itInfrastructureIncidents"
  | "unauthorizedActions"
  | "softwareAdoption"
  | "hardwareIncidents"
  | "softwareFailures"
  | "logicalAttacks"
  | "thirdPartyIncidents"
  | "noncompliance"
  | "geopoliticalIssues"
  | "industrialAction"
  | "actsOfNature"
  | "technologyInnovation"
  | "environmental"
  | "dataManagement";

export type Df03InputRow = {
  key: RiskScenarioKey;
  label: string;
  impact: number;
  likelihood: number;
  baseline: number;
};

export type ItRelatedIssueKey =
  | "lowItBusinessValue"
  | "failedBusinessItInitiatives"
  | "significantItIncidents"
  | "outsourcerServiceDelivery"
  | "regulatoryContractualFailures"
  | "poorItPerformanceFindings"
  | "hiddenRogueItSpending"
  | "duplicatedInitiatives"
  | "insufficientItResources"
  | "failedItEnabledChanges"
  | "lowExecutiveEngagement"
  | "complexItOperatingModel"
  | "highItCost"
  | "blockedInnovationArchitecture"
  | "businessTechnicalKnowledgeGap"
  | "dataQualityIntegrationIssues"
  | "endUserComputingOversight"
  | "businessOwnedSolutions"
  | "privacyNoncompliance"
  | "unableToInnovate";

export type Df04InputRow = {
  key: ItRelatedIssueKey;
  label: string;
  importance: number;
  baseline: number;
};

export type Df05InputRow = {
  key: "High" | "Normal";
  label: string;
  importance: number;
  baseline: number;
};

export type Df06InputRow = {
  key: "High" | "Normal" | "Low";
  label: string;
  importance: number;
  baseline: number;
};

export type Df07InputRow = {
  key: "Support" | "Factory" | "Turnaround" | "Strategic";
  label: string;
  importance: number;
  baseline: number;
};

export type Df08InputRow = {
  key: "Outsourcing" | "Cloud" | "Insourcing";
  label: string;
  importance: number;
  baseline: number;
};

export type Df09InputRow = {
  key: "Agile" | "DevOps" | "Traditional";
  label: string;
  importance: number;
  baseline: number;
};

export type Df10InputRow = {
  key: "First_Mover" | "Follower" | "Slow_Adopter";
  label: string;
  importance: number;
  baseline: number;
};

export type ObjectiveCalculation = {
  objective: string;
  score: number;
  baselineScore: number;
  relativeImportance: number;
};

export const enterpriseStrategyArchetypes: Array<{
  key: EnterpriseStrategyKey;
  label: string;
}> = [
  { key: "growth", label: "Growth/Acquisition" },
  { key: "innovation", label: "Innovation/Differentiation" },
  { key: "cost", label: "Cost Leadership" },
  { key: "service", label: "Client Service/Stability" },
];

export const enterpriseGoals: Array<{
  key: EnterpriseGoalKey;
  label: string;
}> = [
  { key: "EG01", label: "Portfolio of competitive products and services" },
  { key: "EG02", label: "Managed business risk" },
  { key: "EG03", label: "Compliance with external laws and regulations" },
  { key: "EG04", label: "Quality of financial information" },
  { key: "EG05", label: "Customer-oriented service culture" },
  { key: "EG06", label: "Business-service continuity and availability" },
  { key: "EG07", label: "Quality of management information" },
  { key: "EG08", label: "Optimization of internal business process functionality" },
  { key: "EG09", label: "Optimization of business process costs" },
  { key: "EG10", label: "Staff skills, motivation and productivity" },
  { key: "EG11", label: "Compliance with internal policies" },
  { key: "EG12", label: "Managed digital transformation programs" },
  { key: "EG13", label: "Product and business innovation" },
];

export const riskScenarioCategories: Array<{
  key: RiskScenarioKey;
  label: string;
}> = [
  { key: "itInvestment", label: "IT investment decision making, portfolio definition & maintenance" },
  { key: "programProjects", label: "Program & projects life cycle management" },
  { key: "itCostOversight", label: "IT cost & oversight" },
  { key: "itExpertise", label: "IT expertise, skills & behavior" },
  { key: "enterpriseArchitecture", label: "Enterprise/IT architecture" },
  { key: "itInfrastructureIncidents", label: "IT operational infrastructure incidents" },
  { key: "unauthorizedActions", label: "Unauthorized actions" },
  { key: "softwareAdoption", label: "Software adoption/usage problems" },
  { key: "hardwareIncidents", label: "Hardware incidents" },
  { key: "softwareFailures", label: "Software failures" },
  { key: "logicalAttacks", label: "Logical attacks (hacking, malware, etc.)" },
  { key: "thirdPartyIncidents", label: "Third-party/supplier incidents" },
  { key: "noncompliance", label: "Noncompliance" },
  { key: "geopoliticalIssues", label: "Geopolitical Issues" },
  { key: "industrialAction", label: "Industrial action" },
  { key: "actsOfNature", label: "Acts of nature" },
  { key: "technologyInnovation", label: "Technology-based innovation" },
  { key: "environmental", label: "Environmental" },
  { key: "dataManagement", label: "Data & information management" },
];

export const itRelatedIssues: Array<{
  key: ItRelatedIssueKey;
  label: string;
}> = [
  {
    key: "lowItBusinessValue",
    label:
      "Frustration between different IT entities across the organization because of a perception of low contribution to business value",
  },
  {
    key: "failedBusinessItInitiatives",
    label:
      "Frustration between business departments (i.e., the IT customer) and the IT department because of failed initiatives or a perception of low contribution to business value",
  },
  {
    key: "significantItIncidents",
    label:
      "Significant IT-related incidents, such as data loss, security breaches, project failure and application errors, linked to IT",
  },
  { key: "outsourcerServiceDelivery", label: "Service delivery problems by the IT outsourcer(s)" },
  { key: "regulatoryContractualFailures", label: "Failures to meet IT-related regulatory or contractual requirements" },
  {
    key: "poorItPerformanceFindings",
    label:
      "Regular audit findings or other assessment reports about poor IT performance or reported IT quality or service problems",
  },
  {
    key: "hiddenRogueItSpending",
    label:
      "Substantial hidden and rogue IT spending, that is, IT spending by user departments outside the control of the normal IT investment decision mechanisms and approved budgets",
  },
  {
    key: "duplicatedInitiatives",
    label: "Duplications or overlaps between various initiatives, or other forms of wasted resources",
  },
  {
    key: "insufficientItResources",
    label: "Insufficient IT resources, staff with inadequate skills or staff burnout/dissatisfaction",
  },
  {
    key: "failedItEnabledChanges",
    label: "IT-enabled changes or projects frequently failing to meet business needs and delivered late or over budget",
  },
  {
    key: "lowExecutiveEngagement",
    label:
      "Reluctance by board members, executives or senior management to engage with IT, or a lack of committed business sponsorship for IT",
  },
  {
    key: "complexItOperatingModel",
    label: "Complex IT operating model and/or unclear decision mechanisms for IT-related decisions",
  },
  { key: "highItCost", label: "Excessively high cost of IT" },
  {
    key: "blockedInnovationArchitecture",
    label:
      "Obstructed or failed implementation of new initiatives or innovations caused by the current IT architecture and systems",
  },
  {
    key: "businessTechnicalKnowledgeGap",
    label:
      "Gap between business and technical knowledge, which leads to business users and information and/or technology specialists speaking different languages",
  },
  {
    key: "dataQualityIntegrationIssues",
    label: "Regular issues with data quality and integration of data across various sources",
  },
  {
    key: "endUserComputingOversight",
    label:
      "High level of end-user computing, creating (among other problems) a lack of oversight and quality control over the applications that are being developed and put in operation",
  },
  {
    key: "businessOwnedSolutions",
    label:
      "Business departments implementing their own information solutions with little or no involvement of the enterprise IT department (related to end-user computing, which often stems from dissatisfaction with IT solutions and services)",
  },
  { key: "privacyNoncompliance", label: "Ignorance of and/or noncompliance with privacy regulations" },
  { key: "unableToInnovate", label: "Inability to exploit new technologies or innovate using I&T" },
];

export const cobitObjectives = [
  "EDM01",
  "EDM02",
  "EDM03",
  "EDM04",
  "EDM05",
  "APO01",
  "APO02",
  "APO03",
  "APO04",
  "APO05",
  "APO06",
  "APO07",
  "APO08",
  "APO09",
  "APO10",
  "APO11",
  "APO12",
  "APO13",
  "APO14",
  "BAI01",
  "BAI02",
  "BAI03",
  "BAI04",
  "BAI05",
  "BAI06",
  "BAI07",
  "BAI08",
  "BAI09",
  "BAI10",
  "BAI11",
  "DSS01",
  "DSS02",
  "DSS03",
  "DSS04",
  "DSS05",
  "DSS06",
  "MEA01",
  "MEA02",
  "MEA03",
  "MEA04",
] as const;

export type CobitObjective = (typeof cobitObjectives)[number];

export const DF1_MATRIX: Record<CobitObjective, [number, number, number, number]> = {
  EDM01: [1.0, 1.0, 1.5, 1.5],
  EDM02: [1.5, 1.0, 2.0, 3.5],
  EDM03: [1.0, 1.0, 1.0, 2.0],
  EDM04: [1.5, 1.0, 4.0, 1.0],
  EDM05: [1.5, 1.5, 1.0, 2.0],
  APO01: [1.0, 1.0, 1.0, 1.0],
  APO02: [3.5, 3.5, 1.5, 1.0],
  APO03: [4.0, 2.0, 1.0, 1.0],
  APO04: [1.0, 4.0, 1.0, 1.0],
  APO05: [3.5, 4.0, 2.5, 1.0],
  APO06: [1.5, 1.0, 4.0, 1.0],
  APO07: [2.0, 1.0, 1.0, 1.0],
  APO08: [1.0, 1.5, 1.0, 3.5],
  APO09: [1.0, 1.0, 1.5, 4.0],
  APO10: [1.0, 1.0, 3.5, 1.5],
  APO11: [1.0, 1.0, 1.0, 4.0],
  APO12: [1.0, 1.5, 1.0, 2.5],
  APO13: [1.0, 1.0, 1.0, 2.5],
  APO14: [1.0, 1.0, 1.0, 1.0],
  BAI01: [4.0, 2.0, 1.5, 1.5],
  BAI02: [1.0, 1.0, 1.5, 1.0],
  BAI03: [1.0, 1.0, 1.5, 1.0],
  BAI04: [1.0, 1.0, 1.0, 3.0],
  BAI05: [4.0, 2.0, 1.0, 1.5],
  BAI06: [2.0, 2.0, 1.0, 1.5],
  BAI07: [1.5, 2.0, 1.0, 1.5],
  BAI08: [1.0, 3.5, 1.0, 1.0],
  BAI09: [1.0, 1.0, 1.0, 1.0],
  BAI10: [1.0, 1.0, 1.0, 1.0],
  BAI11: [3.5, 3.0, 1.5, 1.0],
  DSS01: [1.0, 1.0, 1.0, 1.5],
  DSS02: [1.0, 1.0, 1.0, 4.0],
  DSS03: [1.0, 1.0, 1.0, 3.0],
  DSS04: [1.0, 1.0, 1.0, 4.0],
  DSS05: [1.0, 1.0, 1.0, 2.5],
  DSS06: [1.0, 1.0, 1.0, 1.5],
  MEA01: [1.0, 1.0, 1.0, 1.0],
  MEA02: [1.0, 1.0, 1.0, 1.0],
  MEA03: [1.0, 1.0, 1.0, 1.0],
  MEA04: [1.0, 1.0, 1.0, 1.0],
};

export const EG_AG_MATRIX: Record<EnterpriseGoalKey, number[]> = {
  EG01: [0, 0, 1, 0, 2, 2, 0, 2, 2, 0, 0, 0, 2],
  EG02: [1, 2, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
  EG03: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
  EG04: [0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0],
  EG05: [0, 0, 1, 0, 1, 1, 0, 2, 1, 0, 0, 1, 0],
  EG06: [0, 1, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0],
  EG07: [0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0],
  EG08: [0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  EG09: [0, 0, 1, 2, 0, 0, 0, 0, 1, 1, 0, 0, 0],
  EG10: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0],
  EG11: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
  EG12: [0, 0, 2, 0, 1, 1, 0, 2, 2, 0, 0, 0, 1],
  EG13: [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 2],
};

export const AG_GMO_MATRIX: number[][] = [
  [1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 2, 1],
  [1, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 2, 1, 0, 1, 0, 1],
  [2, 2, 0, 1, 0, 2, 1, 1, 1, 2, 1, 1, 1, 0, 0, 1, 0, 0, 0, 2, 1, 1, 0, 2, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [0, 1, 0, 1, 0, 1, 1, 1, 0, 2, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 2, 2, 2, 1, 1, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 2, 1, 0, 1],
  [0, 1, 0, 1, 0, 0, 1, 2, 2, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0, 1, 2, 2, 0, 1, 2, 2, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 2, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 1, 0, 1, 0, 1],
  [1, 1, 0, 1, 0, 1, 2, 2, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 2, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0],
  [0, 0, 0, 2, 0, 1, 0, 0, 0, 1, 2, 1, 1, 0, 1, 2, 0, 0, 0, 2, 2, 2, 1, 2, 0, 1, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 1],
  [1, 0, 1, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 1, 2],
  [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 1, 0, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export const DF3_MATRIX: Record<CobitObjective, number[]> = {
  EDM01: [3, 2, 3, 0, 0, 0, 2, 0, 0, 0, 0, 0, 3, 2, 0, 0, 2, 2, 2],
  EDM02: [3, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 1, 3],
  EDM03: [2, 2, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 3, 3, 0, 0, 0, 2, 3],
  EDM04: [3, 0, 4, 3, 2, 0, 0, 0, 0, 0, 0, 2, 1, 0, 2, 0, 0, 2, 3],
  EDM05: [3, 1, 3, 0, 0, 0, 2, 0, 0, 1, 0, 1, 3, 3, 0, 0, 0, 2, 2],
  APO01: [2, 3, 2, 0, 2, 2, 4, 2, 0, 2, 3, 3, 3, 0, 0, 0, 3, 2, 3],
  APO02: [2, 0, 0, 0, 3, 0, 0, 2, 1, 0, 1, 2, 0, 0, 0, 0, 2, 2, 1],
  APO03: [2, 0, 0, 0, 4, 0, 0, 2, 0, 2, 2, 2, 0, 0, 0, 0, 2, 0, 3],
  APO04: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0],
  APO05: [4, 2, 2, 0, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
  APO06: [2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 2, 2, 0],
  APO07: [0, 0, 0, 4, 0, 2, 3, 3, 0, 0, 2, 0, 0, 2, 4, 0, 2, 2, 0],
  APO08: [0, 0, 0, 2, 2, 0, 0, 4, 0, 0, 2, 2, 0, 0, 0, 0, 3, 0, 2],
  APO09: [0, 0, 2, 0, 0, 0, 2, 3, 0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0],
  APO10: [0, 2, 3, 0, 0, 0, 2, 2, 3, 2, 2, 4, 2, 2, 0, 0, 0, 0, 0],
  APO11: [0, 3, 0, 0, 0, 0, 0, 2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  APO12: [0, 0, 0, 0, 0, 0, 3, 0, 0, 2, 3, 0, 0, 0, 0, 2, 0, 0, 0],
  APO13: [0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 3, 0, 0, 0, 0, 0, 0],
  APO14: [0, 0, 0, 0, 0, 0, 3, 2, 0, 0, 2, 0, 3, 0, 2, 4, 2, 0, 4],
  BAI01: [0, 4, 0, 0, 2, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  BAI02: [2, 2, 0, 0, 2, 0, 0, 3, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  BAI03: [0, 3, 0, 0, 2, 0, 0, 2, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  BAI04: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  BAI05: [0, 2, 0, 2, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  BAI06: [0, 0, 0, 0, 0, 3, 4, 0, 0, 2, 3, 0, 0, 0, 0, 0, 0, 0, 3],
  BAI07: [0, 0, 0, 0, 0, 2, 3, 2, 0, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  BAI08: [0, 0, 0, 2, 0, 3, 0, 3, 0, 3, 0, 0, 0, 0, 2, 0, 0, 0, 2],
  BAI09: [0, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  BAI10: [0, 0, 0, 0, 0, 2, 4, 0, 0, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  BAI11: [0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  DSS01: [0, 0, 0, 0, 0, 4, 3, 0, 4, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0],
  DSS02: [0, 0, 0, 0, 0, 3, 2, 3, 2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0],
  DSS03: [0, 0, 0, 0, 0, 3, 1, 4, 0, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  DSS04: [0, 0, 0, 0, 0, 3, 3, 0, 3, 0, 4, 0, 2, 0, 3, 4, 0, 0, 2],
  DSS05: [0, 0, 0, 0, 0, 3, 4, 0, 2, 0, 4, 0, 3, 0, 3, 2, 0, 0, 3],
  DSS06: [0, 0, 0, 0, 0, 3, 4, 2, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 3],
  MEA01: [1, 2, 2, 0, 0, 2, 2, 0, 0, 2, 3, 2, 2, 2, 0, 2, 0, 0, 2],
  MEA02: [1, 2, 2, 0, 0, 3, 3, 0, 0, 2, 3, 2, 2, 3, 0, 2, 0, 0, 2],
  MEA03: [0, 1, 0, 0, 0, 1, 2, 0, 0, 0, 3, 2, 4, 2, 0, 0, 0, 0, 2],
  MEA04: [1, 2, 0, 0, 0, 0, 3, 0, 0, 2, 3, 2, 2, 4, 0, 2, 2, 0, 2],
};

export const DF4_MATRIX: Record<CobitObjective, number[]> = {
  EDM01: [3, 3, 1, 1, 2, 2, 2, 1, 1, 1, 3, 3.5, 1, 1, 1, 1, 2, 3, 1.5, 1],
  EDM02: [2.5, 3, 1, 1, 1.5, 2.5, 2, 1.5, 0.5, 2.5, 1.5, 1, 3, 2, 1, 1, 2, 2, 1, 2.5],
  EDM03: [1, 1, 2, 1, 2, 2, 1, 1, 0, 0.5, 1, 0, 1, 1.5, 1, 2, 1, 1, 2.5, 1],
  EDM04: [1, 1, 1, 1, 1, 2, 3, 3.5, 3.5, 1, 1.5, 0, 4, 2, 1, 1.5, 2, 2.5, 0, 1],
  EDM05: [1, 1, 1, 1, 1.5, 2, 1, 1, 0, 1, 3, 1.5, 1.5, 0.5, 0, 0.5, 1, 1, 1, 0],
  APO01: [2, 1, 2, 1, 2, 2, 1, 1, 0, 0.5, 1.5, 4, 1, 2, 1, 1, 1.5, 2, 0.5, 1],
  APO02: [1.5, 1.5, 1.5, 1.5, 1, 1.5, 1, 1, 0, 1, 2.5, 0.5, 0.5, 1.5, 1.5, 0.5, 2, 2, 0, 2.5],
  APO03: [1, 1.5, 1, 2, 0.5, 1.5, 2, 1.5, 1, 3.5, 0.5, 0.5, 1, 4, 1, 3.5, 2, 3, 0, 2],
  APO04: [1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0, 0, 0.5, 1, 0.5, 2, 1, 0, 0.5, 0.5, 0, 4],
  APO05: [3, 3, 1, 1.5, 2, 2, 1.5, 3.5, 0.5, 2, 2, 1.5, 2, 1, 0.5, 0, 2.5, 2.5, 0, 2],
  APO06: [3.5, 2, 1, 1.5, 1.5, 2, 4, 3, 1, 2, 1, 1.5, 4, 0, 0, 0, 1, 2, 0, 0],
  APO07: [1.5, 1, 1, 1, 1, 1.5, 2, 2, 4, 1, 0, 0, 1, 0, 3, 0, 0.5, 0.5, 1.5, 1],
  APO08: [2.5, 2, 1, 2.5, 1.5, 1, 2.5, 2, 1.5, 1, 3, 1, 0.5, 1, 4, 1, 3, 3.5, 0, 0.5],
  APO09: [2, 1.5, 2, 4, 1, 2.5, 1.5, 2, 0.5, 1, 0, 0, 1, 0, 0, 0, 1, 1.5, 0, 0],
  APO10: [1, 1, 2, 4, 1.5, 1.5, 1.5, 0, 1.5, 1, 0, 0, 1, 0, 0, 0, 0.5, 2, 1, 0],
  APO11: [1, 1, 3, 1.5, 1, 3, 0, 0, 0, 2, 0, 0, 0, 0.5, 0.5, 3, 2, 2, 0, 1],
  APO12: [1, 0.5, 2.5, 1.5, 2, 2, 1, 1, 0.5, 1, 1, 1, 1, 1, 1, 2, 1, 1.5, 2.5, 1],
  APO13: [0, 0, 3.5, 1, 2, 1, 0, 1, 0, 0.5, 0, 0, 0, 0, 0, 1.5, 2, 1, 2, 1],
  APO14: [1, 1.5, 3, 1, 2.5, 1.5, 1, 1.5, 0, 1.5, 0, 0, 0.5, 2.5, 0.5, 4, 2.5, 2, 3, 0.5],
  BAI01: [0, 1, 1.5, 0, 0, 0, 0, 3, 1, 3.5, 0, 0, 1.5, 0.5, 1, 0, 1.5, 2, 0, 1],
  BAI02: [0, 3, 0, 0, 0.5, 2, 0, 2, 0, 3.5, 0, 1, 1, 2, 2, 1.5, 2.5, 3, 0.5, 1],
  BAI03: [1, 2, 2, 0, 0, 2, 0, 1, 0, 3, 0, 0.5, 1, 1, 1, 0.5, 2, 2, 1, 0.5],
  BAI04: [0.5, 0, 2, 3, 0, 2, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 1, 1, 1, 0, 0.5],
  BAI05: [1, 3, 0, 0, 0, 0, 0, 0.5, 0, 3, 1, 0, 0, 0.5, 2, 0, 0.5, 1.5, 0, 1],
  BAI06: [0, 0, 2.5, 3, 0.5, 1.5, 0, 1, 0, 1.5, 0, 1, 0.5, 1, 0.5, 2, 2, 2, 1, 1],
  BAI07: [0, 1, 2, 2, 0.5, 1.5, 0, 0.5, 0, 2, 0, 1, 0, 1, 0.5, 2, 2, 2, 0, 1],
  BAI08: [0, 0, 0, 1.5, 0.5, 0.5, 0, 1, 2, 0.5, 0, 0.5, 0, 1, 3, 2, 1, 1.5, 0, 0.5],
  BAI09: [0.5, 0.5, 1, 0, 0, 0, 2, 2, 0, 0, 0, 0, 2, 1, 0, 0, 1, 1.5, 0, 0],
  BAI10: [0, 0, 2.5, 2, 0.5, 0, 0, 0.5, 0, 0, 0, 0, 1, 1.5, 0, 1.5, 1, 2, 0, 0],
  BAI11: [1, 2, 2.5, 0, 0, 0, 2, 3, 1, 4, 0, 0, 1.5, 2, 0.5, 0, 1, 1.5, 0, 0.5],
  DSS01: [0, 0, 2.5, 2, 1, 2, 0, 0.5, 0, 0, 0, 0, 1, 0, 0, 1.5, 1, 2, 0, 0],
  DSS02: [1, 1, 4, 3, 1, 2.5, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0],
  DSS03: [0, 1, 3, 3, 0, 3, 0, 0, 0, 0, 0, 0, 0, 1, 1.5, 1, 1, 1, 0.5, 0],
  DSS04: [0, 0, 3, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.5, 1, 2, 0, 0],
  DSS05: [0, 0, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.5, 1, 2, 2, 0],
  DSS06: [0, 1, 0.5, 0, 3, 0.5, 0, 0, 0, 1, 0, 0, 0, 0, 1.5, 2.5, 1.5, 1, 2, 0],
  MEA01: [1, 1.5, 2, 2, 2.5, 3, 1, 2, 1.5, 1, 1, 1, 2, 1, 1, 1, 1.5, 1, 2.5, 1],
  MEA02: [0, 0, 2, 2, 2.5, 2, 2, 0, 0.5, 2, 1, 1, 1.5, 1, 0, 2, 1, 1, 2.5, 0],
  MEA03: [0, 0, 2, 2, 4, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 4, 0],
  MEA04: [1, 1, 3, 1.5, 3, 4, 2, 1, 1, 0.5, 1, 1, 1.5, 0, 1, 1, 1, 1, 2.5, 1],
};

export const DF5_MATRIX: Record<"High" | "Normal", Record<CobitObjective, number>> = {
  High: {
    EDM01: 3.0,
    EDM02: 1.0,
    EDM03: 4.0,
    EDM04: 1.0,
    EDM05: 2.0,
    APO01: 3.0,
    APO02: 1.0,
    APO03: 3.0,
    APO04: 1.0,
    APO05: 1.0,
    APO06: 1.0,
    APO07: 2.0,
    APO08: 1.0,
    APO09: 2.0,
    APO10: 3.0,
    APO11: 2.0,
    APO12: 4.0,
    APO13: 4.0,
    APO14: 3.0,
    BAI01: 1.0,
    BAI02: 1.0,
    BAI03: 1.0,
    BAI04: 2.0,
    BAI05: 1.0,
    BAI06: 3.0,
    BAI07: 1.0,
    BAI08: 1.0,
    BAI09: 1.0,
    BAI10: 3.0,
    BAI11: 1.0,
    DSS01: 1.0,
    DSS02: 3.0,
    DSS03: 2.0,
    DSS04: 4.0,
    DSS05: 3.0,
    DSS06: 3.0,
    MEA01: 3.0,
    MEA02: 2.0,
    MEA03: 3.0,
    MEA04: 3.0,
  },
  Normal: {
    EDM01: 1.0,
    EDM02: 1.0,
    EDM03: 1.0,
    EDM04: 1.0,
    EDM05: 1.0,
    APO01: 1.0,
    APO02: 1.0,
    APO03: 1.0,
    APO04: 1.0,
    APO05: 1.0,
    APO06: 1.0,
    APO07: 1.0,
    APO08: 1.0,
    APO09: 1.0,
    APO10: 1.0,
    APO11: 1.0,
    APO12: 1.0,
    APO13: 1.0,
    APO14: 1.0,
    BAI01: 1.0,
    BAI02: 1.0,
    BAI03: 1.0,
    BAI04: 1.0,
    BAI05: 1.0,
    BAI06: 1.0,
    BAI07: 1.0,
    BAI08: 1.0,
    BAI09: 1.0,
    BAI10: 1.0,
    BAI11: 1.0,
    DSS01: 1.0,
    DSS02: 1.0,
    DSS03: 1.0,
    DSS04: 1.0,
    DSS05: 1.0,
    DSS06: 1.0,
    MEA01: 1.0,
    MEA02: 1.0,
    MEA03: 1.0,
    MEA04: 1.0,
  },
};

export const DF6_MATRIX: Record<"High" | "Normal" | "Low", Record<CobitObjective, number>> = {
  High: {
    EDM01: 3.0,
    EDM02: 1.0,
    EDM03: 4.0,
    EDM04: 1.0,
    EDM05: 1.5,
    APO01: 2.0,
    APO02: 1.0,
    APO03: 1.0,
    APO04: 1.0,
    APO05: 1.0,
    APO06: 1.0,
    APO07: 1.0,
    APO08: 1.0,
    APO09: 1.0,
    APO10: 1.5,
    APO11: 1.0,
    APO12: 4.0,
    APO13: 1.5,
    APO14: 2.0,
    BAI01: 1.0,
    BAI02: 1.0,
    BAI03: 1.0,
    BAI04: 1.0,
    BAI05: 1.0,
    BAI06: 1.0,
    BAI07: 1.0,
    BAI08: 1.0,
    BAI09: 1.0,
    BAI10: 1.0,
    BAI11: 1.0,
    DSS01: 1.0,
    DSS02: 1.0,
    DSS03: 1.0,
    DSS04: 1.5,
    DSS05: 2.0,
    DSS06: 1.0,
    MEA01: 1.0,
    MEA02: 1.0,
    MEA03: 4.0,
    MEA04: 3.5,
  },
  Normal: {
    EDM01: 2.0,
    EDM02: 1.0,
    EDM03: 2.0,
    EDM04: 1.0,
    EDM05: 1.0,
    APO01: 1.5,
    APO02: 1.0,
    APO03: 1.0,
    APO04: 1.0,
    APO05: 1.0,
    APO06: 1.0,
    APO07: 1.0,
    APO08: 1.0,
    APO09: 1.0,
    APO10: 1.0,
    APO11: 1.0,
    APO12: 2.0,
    APO13: 1.0,
    APO14: 1.5,
    BAI01: 1.0,
    BAI02: 1.0,
    BAI03: 1.0,
    BAI04: 1.0,
    BAI05: 1.0,
    BAI06: 1.0,
    BAI07: 1.0,
    BAI08: 1.0,
    BAI09: 1.0,
    BAI10: 1.0,
    BAI11: 1.0,
    DSS01: 1.0,
    DSS02: 1.0,
    DSS03: 1.0,
    DSS04: 1.0,
    DSS05: 1.0,
    DSS06: 1.0,
    MEA01: 1.0,
    MEA02: 1.0,
    MEA03: 2.0,
    MEA04: 2.0,
  },
  Low: {
    EDM01: 1.0,
    EDM02: 1.0,
    EDM03: 1.0,
    EDM04: 1.0,
    EDM05: 1.0,
    APO01: 1.0,
    APO02: 1.0,
    APO03: 1.0,
    APO04: 1.0,
    APO05: 1.0,
    APO06: 1.0,
    APO07: 1.0,
    APO08: 1.0,
    APO09: 1.0,
    APO10: 1.0,
    APO11: 1.0,
    APO12: 1.0,
    APO13: 1.0,
    APO14: 1.0,
    BAI01: 1.0,
    BAI02: 1.0,
    BAI03: 1.0,
    BAI04: 1.0,
    BAI05: 1.0,
    BAI06: 1.0,
    BAI07: 1.0,
    BAI08: 1.0,
    BAI09: 1.0,
    BAI10: 1.0,
    BAI11: 1.0,
    DSS01: 1.0,
    DSS02: 1.0,
    DSS03: 1.0,
    DSS04: 1.0,
    DSS05: 1.0,
    DSS06: 1.0,
    MEA01: 1.0,
    MEA02: 1.0,
    MEA03: 1.0,
    MEA04: 1.0,
  },
};

export const DF7_MATRIX: Record<"Support" | "Factory" | "Turnaround" | "Strategic", Record<CobitObjective, number>> = {
  Support: {
    EDM01: 1.0, EDM02: 1.0, EDM03: 1.0, EDM04: 1.0, EDM05: 1.0,
    APO01: 1.0, APO02: 1.0, APO03: 1.0, APO04: 0.5, APO05: 1.0, APO06: 1.0, APO07: 1.0,
    APO08: 1.0, APO09: 1.0, APO10: 1.0, APO11: 1.0, APO12: 1.0, APO13: 1.0, APO14: 1.0,
    BAI01: 1.0, BAI02: 1.0, BAI03: 1.0, BAI04: 1.0, BAI05: 1.0, BAI06: 1.0, BAI07: 1.0,
    BAI08: 1.0, BAI09: 1.0, BAI10: 1.0, BAI11: 1.0,
    DSS01: 1.0, DSS02: 1.0, DSS03: 1.0, DSS04: 1.0, DSS05: 1.5, DSS06: 1.0,
    MEA01: 1.0, MEA02: 1.0, MEA03: 1.0, MEA04: 1.0,
  },
  Factory: {
    EDM01: 2.0, EDM02: 1.0, EDM03: 3.0, EDM04: 1.0, EDM05: 1.0,
    APO01: 1.5, APO02: 1.0, APO03: 1.0, APO04: 1.0, APO05: 1.0, APO06: 1.0, APO07: 1.0,
    APO08: 1.0, APO09: 2.0, APO10: 2.5, APO11: 1.5, APO12: 2.5, APO13: 2.0, APO14: 1.5,
    BAI01: 1.0, BAI02: 1.0, BAI03: 1.0, BAI04: 2.5, BAI05: 1.0, BAI06: 2.5, BAI07: 1.0,
    BAI08: 1.0, BAI09: 1.0, BAI10: 1.5, BAI11: 1.0,
    DSS01: 3.5, DSS02: 3.0, DSS03: 3.0, DSS04: 3.0, DSS05: 2.5, DSS06: 1.0,
    MEA01: 1.0, MEA02: 1.0, MEA03: 1.0, MEA04: 1.0,
  },
  Turnaround: {
    EDM01: 1.5, EDM02: 2.5, EDM03: 1.0, EDM04: 1.0, EDM05: 1.0,
    APO01: 1.5, APO02: 3.0, APO03: 2.0, APO04: 3.5, APO05: 2.5, APO06: 1.0, APO07: 1.0,
    APO08: 2.0, APO09: 1.5, APO10: 1.5, APO11: 1.5, APO12: 1.0, APO13: 1.5, APO14: 1.5,
    BAI01: 2.0, BAI02: 3.0, BAI03: 3.0, BAI04: 1.5, BAI05: 1.0, BAI06: 1.0, BAI07: 2.0,
    BAI08: 1.0, BAI09: 1.0, BAI10: 1.0, BAI11: 2.0,
    DSS01: 1.0, DSS02: 1.5, DSS03: 1.5, DSS04: 1.5, DSS05: 1.5, DSS06: 1.0,
    MEA01: 1.0, MEA02: 1.0, MEA03: 1.0, MEA04: 1.0,
  },
  Strategic: {
    EDM01: 4.0, EDM02: 3.0, EDM03: 3.0, EDM04: 2.0, EDM05: 2.0,
    APO01: 2.5, APO02: 3.0, APO03: 2.0, APO04: 4.0, APO05: 3.0, APO06: 2.0, APO07: 1.5,
    APO08: 2.5, APO09: 2.0, APO10: 2.0, APO11: 2.0, APO12: 3.0, APO13: 3.0, APO14: 2.5,
    BAI01: 2.5, BAI02: 3.0, BAI03: 3.0, BAI04: 2.0, BAI05: 2.0, BAI06: 2.0, BAI07: 2.0,
    BAI08: 2.0, BAI09: 2.0, BAI10: 2.0, BAI11: 2.0,
    DSS01: 3.0, DSS02: 3.0, DSS03: 3.5, DSS04: 3.5, DSS05: 3.5, DSS06: 2.5,
    MEA01: 2.0, MEA02: 2.0, MEA03: 1.5, MEA04: 2.0,
  },
};

function objectiveWeights(overrides: Partial<Record<CobitObjective, number>> = {}): Record<CobitObjective, number> {
  return Object.fromEntries(cobitObjectives.map((objective) => [objective, overrides[objective] ?? 1.0])) as Record<
    CobitObjective,
    number
  >;
}

export const DF8_MATRIX: Record<"Outsourcing" | "Cloud" | "Insourcing", Record<CobitObjective, number>> = {
  Outsourcing: objectiveWeights({
    APO09: 4.0,
    APO10: 4.0,
    APO12: 2.0,
    MEA01: 3.0,
  }),
  Cloud: objectiveWeights({
    EDM03: 2.0,
    APO09: 4.0,
    APO10: 4.0,
    APO12: 2.0,
    MEA01: 3.0,
  }),
  Insourcing: objectiveWeights(),
};

export const DF9_MATRIX: Record<"Agile" | "DevOps" | "Traditional", Record<CobitObjective, number>> = {
  Agile: objectiveWeights({
    BAI01: 2.0,
    BAI02: 3.5,
    BAI03: 4.0,
    BAI05: 2.5,
    BAI06: 3.5,
    BAI07: 2.5,
    BAI10: 1.5,
    BAI11: 2.5,
    MEA01: 1.5,
  }),
  DevOps: objectiveWeights({
    APO03: 2.0,
    APO07: 1.5,
    APO12: 1.5,
    BAI01: 1.5,
    BAI02: 2.0,
    BAI03: 3.0,
    BAI05: 1.5,
    BAI06: 2.0,
    BAI07: 2.5,
    BAI10: 2.0,
    DSS01: 2.5,
    DSS02: 1.5,
    DSS03: 1.5,
    MEA01: 1.5,
  }),
  Traditional: objectiveWeights(),
};

export const DF10_MATRIX: Record<"First_Mover" | "Follower" | "Slow_Adopter", Record<CobitObjective, number>> = {
  First_Mover: {
    EDM01: 3.5, EDM02: 4.0, EDM03: 1.5, EDM04: 2.5, EDM05: 1.5,
    APO01: 2.5, APO02: 4.0, APO03: 2.0, APO04: 4.0, APO05: 4.0, APO06: 1.0, APO07: 2.5,
    APO08: 3.0, APO09: 1.5, APO10: 2.5, APO11: 1.5, APO12: 2.0, APO13: 1.0, APO14: 2.5,
    BAI01: 4.0, BAI02: 3.5, BAI03: 4.0, BAI04: 1.5, BAI05: 3.0, BAI06: 2.5, BAI07: 3.5,
    BAI08: 1.5, BAI09: 1.0, BAI10: 1.5, BAI11: 3.5,
    DSS01: 1.0, DSS02: 1.0, DSS03: 1.5, DSS04: 1.5, DSS05: 1.5, DSS06: 1.0,
    MEA01: 3.0, MEA02: 1.0, MEA03: 1.0, MEA04: 1.0,
  },
  Follower: {
    EDM01: 2.5, EDM02: 2.5, EDM03: 1.0, EDM04: 2.0, EDM05: 1.0,
    APO01: 1.5, APO02: 3.0, APO03: 1.0, APO04: 3.0, APO05: 2.5, APO06: 1.5, APO07: 1.0,
    APO08: 1.5, APO09: 1.5, APO10: 1.5, APO11: 1.5, APO12: 1.5, APO13: 1.0, APO14: 2.0,
    BAI01: 3.0, BAI02: 2.5, BAI03: 2.5, BAI04: 1.5, BAI05: 2.0, BAI06: 2.0, BAI07: 2.5,
    BAI08: 1.0, BAI09: 1.0, BAI10: 1.0, BAI11: 2.5,
    DSS01: 1.0, DSS02: 1.0, DSS03: 1.0, DSS04: 1.0, DSS05: 1.0, DSS06: 1.0,
    MEA01: 2.0, MEA02: 1.0, MEA03: 1.0, MEA04: 1.0,
  },
  Slow_Adopter: {
    EDM01: 1.5, EDM02: 1.5, EDM03: 1.0, EDM04: 1.5, EDM05: 1.0,
    APO01: 1.0, APO02: 1.5, APO03: 1.0, APO04: 1.0, APO05: 1.0, APO06: 1.0, APO07: 1.0,
    APO08: 1.0, APO09: 1.0, APO10: 1.0, APO11: 1.0, APO12: 1.0, APO13: 1.0, APO14: 1.0,
    BAI01: 1.5, BAI02: 1.0, BAI03: 1.0, BAI04: 1.0, BAI05: 1.0, BAI06: 1.0, BAI07: 1.0,
    BAI08: 1.0, BAI09: 1.0, BAI10: 1.0, BAI11: 1.0,
    DSS01: 1.0, DSS02: 1.0, DSS03: 1.0, DSS04: 1.0, DSS05: 1.0, DSS06: 1.0,
    MEA01: 1.0, MEA02: 1.0, MEA03: 1.0, MEA04: 1.0,
  },
};

export function defaultDf01Rows(): Df01InputRow[] {
  return enterpriseStrategyArchetypes.map((strategy) => ({
    ...strategy,
    importance: 0,
    baseline: 3,
  }));
}

export function defaultDf02Rows(): Df02InputRow[] {
  return enterpriseGoals.map((goal) => ({
    ...goal,
    importance: 0,
    baseline: 3,
  }));
}

export function defaultDf03Rows(): Df03InputRow[] {
  return riskScenarioCategories.map((scenario) => ({
    ...scenario,
    impact: 0,
    likelihood: 0,
    baseline: 3,
  }));
}

export function defaultDf04Rows(): Df04InputRow[] {
  return itRelatedIssues.map((issue) => ({
    ...issue,
    importance: 0,
    baseline: 3,
  }));
}

export function defaultDf05Rows(): Df05InputRow[] {
  return [
    { key: "High", label: "High", importance: 0, baseline: 30 },
    { key: "Normal", label: "Normal", importance: 0, baseline: 30 },
  ];
}

export function defaultDf06Rows(): Df06InputRow[] {
  return [
    { key: "High", label: "High", importance: 0, baseline: 30 },
    { key: "Normal", label: "Normal", importance: 0, baseline: 30 },
    { key: "Low", label: "Low", importance: 0, baseline: 30 },
  ];
}

export function defaultDf07Rows(): Df07InputRow[] {
  return [
    { key: "Support", label: "Support", importance: 0, baseline: 3 },
    { key: "Factory", label: "Factory", importance: 0, baseline: 3 },
    { key: "Turnaround", label: "Turnaround", importance: 0, baseline: 3 },
    { key: "Strategic", label: "Strategic", importance: 0, baseline: 3 },
  ];
}

export function defaultDf08Rows(): Df08InputRow[] {
  return [
    { key: "Outsourcing", label: "Outsourcing", importance: 0, baseline: 30 },
    { key: "Cloud", label: "Cloud", importance: 0, baseline: 30 },
    { key: "Insourcing", label: "Insourced", importance: 0, baseline: 30 },
  ];
}

export function defaultDf09Rows(): Df09InputRow[] {
  return [
    { key: "Agile", label: "Agile", importance: 0, baseline: 30 },
    { key: "DevOps", label: "DevOps", importance: 0, baseline: 30 },
    { key: "Traditional", label: "Traditional", importance: 0, baseline: 30 },
  ];
}

export function defaultDf10Rows(): Df10InputRow[] {
  return [
    { key: "First_Mover", label: "First mover", importance: 0, baseline: 30 },
    { key: "Follower", label: "Follower", importance: 0, baseline: 30 },
    { key: "Slow_Adopter", label: "Slow adopter", importance: 0, baseline: 30 },
  ];
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(5, Math.max(1, value));
}

export function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

export function clampRiskScale(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(5, Math.max(1, value));
}

export function clampRiskScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(25, Math.max(0, value));
}

export function clampThreePointScale(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(3, Math.max(1, value));
}

export function mround(value: number, multiple: number) {
  if (!Number.isFinite(value) || multiple === 0) {
    return 0;
  }

  return Math.round(value / multiple) * multiple;
}

export function calculateDf05Results(rows: Df05InputRow[]): ObjectiveCalculation[] {
  return calculatePercentageFactorResults(rows, DF5_MATRIX);
}

export function calculateDf02Results(rows: Df02InputRow[]): ObjectiveCalculation[] {
  const rowByKey = new Map(rows.map((row) => [row.key, row]));
  const normalizedRows = defaultDf02Rows().map((defaultRow) => {
    const row = rowByKey.get(defaultRow.key);
    return {
      ...defaultRow,
      importance: clampScore(Number(row?.importance ?? defaultRow.importance)),
      baseline: clampScore(Number(row?.baseline ?? defaultRow.baseline)),
    };
  });
  const importance = normalizedRows.map((row) => row.importance);
  const baseline = normalizedRows.map((row) => row.baseline);
  const averageImportance = importance.reduce((sum, value) => sum + value, 0) / importance.length;
  const averageBaseline = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;

  const alignmentScores = multiplyEgAg(importance);
  const baselineAlignmentScores = multiplyEgAg(baseline);

  return cobitObjectives.map((objective, objectiveIndex) => {
    const score = AG_GMO_MATRIX.reduce(
      (sum, alignmentWeights, alignmentIndex) => sum + alignmentScores[alignmentIndex] * alignmentWeights[objectiveIndex],
      0,
    );
    const baselineScore = AG_GMO_MATRIX.reduce(
      (sum, alignmentWeights, alignmentIndex) =>
        sum + baselineAlignmentScores[alignmentIndex] * alignmentWeights[objectiveIndex],
      0,
    );
    const relativeImportance =
      baselineScore === 0 || averageImportance === 0
        ? 0
        : mround((averageBaseline / averageImportance) * 100 * (score / baselineScore), 5) - 100;

    return {
      objective,
      score,
      baselineScore,
      relativeImportance,
    };
  });
}

export function calculateDf03Results(rows: Df03InputRow[]): ObjectiveCalculation[] {
  const rowByKey = new Map(rows.map((row) => [row.key, row]));
  const normalizedRows = defaultDf03Rows().map((defaultRow) => {
    const row = rowByKey.get(defaultRow.key);
    const impact = clampRiskScale(Number(row?.impact ?? defaultRow.impact));
    const likelihood = clampRiskScale(Number(row?.likelihood ?? defaultRow.likelihood));
    return {
      ...defaultRow,
      impact,
      likelihood,
      baseline: clampRiskScore(Number(row?.baseline ?? defaultRow.baseline)),
    };
  });
  const riskScores = normalizedRows.map((row) => row.impact * row.likelihood);
  const baselineScores = normalizedRows.map((row) => row.baseline);
  const averageRiskScore = riskScores.reduce((sum, value) => sum + value, 0) / riskScores.length;
  const averageBaselineScore = baselineScores.reduce((sum, value) => sum + value, 0) / baselineScores.length;

  return cobitObjectives.map((objective) => {
    const weights = DF3_MATRIX[objective];
    const score = weights.reduce((sum, weight, index) => sum + weight * riskScores[index], 0);
    const baselineScore = weights.reduce((sum, weight, index) => sum + weight * baselineScores[index], 0);
    const relativeImportance =
      baselineScore === 0 || averageRiskScore === 0
        ? 0
        : mround((averageBaselineScore / averageRiskScore) * 100 * (score / baselineScore), 5) - 100;

    return {
      objective,
      score,
      baselineScore,
      relativeImportance,
    };
  });
}

function multiplyEgAg(values: number[]) {
  return Array.from({ length: 13 }, (_, alignmentIndex) =>
    enterpriseGoals.reduce(
      (sum, goal, goalIndex) => sum + values[goalIndex] * EG_AG_MATRIX[goal.key][alignmentIndex],
      0,
    ),
  );
}

export function calculateDf04Results(rows: Df04InputRow[]): ObjectiveCalculation[] {
  const rowByKey = new Map(rows.map((row) => [row.key, row]));
  const normalizedRows = defaultDf04Rows().map((defaultRow) => {
    const row = rowByKey.get(defaultRow.key);
    return {
      ...defaultRow,
      importance: clampThreePointScale(Number(row?.importance ?? defaultRow.importance)),
      baseline: clampThreePointScale(Number(row?.baseline ?? defaultRow.baseline)),
    };
  });
  const importanceScores = normalizedRows.map((row) => row.importance);
  const baselineScores = normalizedRows.map((row) => row.baseline);
  const averageImportance = importanceScores.reduce((sum, value) => sum + value, 0) / importanceScores.length;
  const averageBaseline = baselineScores.reduce((sum, value) => sum + value, 0) / baselineScores.length;

  return cobitObjectives.map((objective) => {
    const weights = DF4_MATRIX[objective];
    const score = weights.reduce((sum, weight, index) => sum + weight * importanceScores[index], 0);
    const baselineScore = weights.reduce((sum, weight, index) => sum + weight * baselineScores[index], 0);
    const relativeImportance =
      baselineScore === 0 || averageImportance === 0
        ? 0
        : mround((averageBaseline / averageImportance) * 100 * (score / baselineScore), 5) - 100;

    return {
      objective,
      score,
      baselineScore,
      relativeImportance,
    };
  });
}

export function calculateDf06Results(rows: Df06InputRow[]): ObjectiveCalculation[] {
  return calculatePercentageFactorResults(rows, DF6_MATRIX);
}

export function calculateDf07Results(rows: Df07InputRow[]): ObjectiveCalculation[] {
  return calculateWeightedFactorResults(rows, DF7_MATRIX);
}

export function calculateDf08Results(rows: Df08InputRow[]): ObjectiveCalculation[] {
  return calculatePercentageFactorResults(rows, DF8_MATRIX);
}

export function calculateDf09Results(rows: Df09InputRow[]): ObjectiveCalculation[] {
  return calculatePercentageFactorResults(rows, DF9_MATRIX);
}

export function calculateDf10Results(rows: Df10InputRow[]): ObjectiveCalculation[] {
  return calculatePercentageFactorResults(rows, DF10_MATRIX);
}

function calculatePercentageFactorResults<T extends string>(
  rows: Array<{ key: T; importance: number; baseline: number }>,
  matrix: Record<T, Record<CobitObjective, number>>,
): ObjectiveCalculation[] {
  return cobitObjectives.map((objective) => {
    const score = rows.reduce(
      (sum, row) => sum + matrix[row.key][objective] * (clampPercentage(Number(row.importance)) / 100),
      0,
    );
    const baselineScore = rows.reduce(
      (sum, row) => sum + matrix[row.key][objective] * (clampPercentage(Number(row.baseline)) / 100),
      0,
    );
    const relativeImportance = baselineScore === 0 ? 0 : mround((100 * score) / baselineScore, 5) - 100;

    return {
      objective,
      score,
      baselineScore,
      relativeImportance,
    };
  });
}

function calculateWeightedFactorResults<T extends string>(
  rows: Array<{ key: T; importance: number; baseline: number }>,
  matrix: Record<T, Record<CobitObjective, number>>,
): ObjectiveCalculation[] {
  const normalizedRows = rows.map((row) => ({
    ...row,
    importance: clampScore(Number(row.importance)),
    baseline: clampScore(Number(row.baseline)),
  }));
  const averageImportance =
    normalizedRows.reduce((sum, row) => sum + row.importance, 0) / Math.max(normalizedRows.length, 1);
  const averageBaseline =
    normalizedRows.reduce((sum, row) => sum + row.baseline, 0) / Math.max(normalizedRows.length, 1);

  return cobitObjectives.map((objective) => {
    const score = normalizedRows.reduce((sum, row) => sum + matrix[row.key][objective] * row.importance, 0);
    const baselineScore = normalizedRows.reduce((sum, row) => sum + matrix[row.key][objective] * row.baseline, 0);
    const relativeImportance =
      baselineScore === 0 || averageImportance === 0
        ? 0
        : mround((averageBaseline / averageImportance) * 100 * (score / baselineScore), 5) - 100;

    return {
      objective,
      score,
      baselineScore,
      relativeImportance,
    };
  });
}

export function calculateDf01Results(rows: Df01InputRow[]): ObjectiveCalculation[] {
  const importance = enterpriseStrategyArchetypes.map((strategy) => {
    const row = rows.find((item) => item.key === strategy.key);
    return clampScore(Number(row?.importance ?? 1));
  });
  const baseline = enterpriseStrategyArchetypes.map((strategy) => {
    const row = rows.find((item) => item.key === strategy.key);
    return clampScore(Number(row?.baseline ?? 3));
  });
  const averageImportance = importance.reduce((sum, value) => sum + value, 0) / importance.length;
  const averageBaseline = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;

  return cobitObjectives.map((objective) => {
    const weights = DF1_MATRIX[objective];
    const score = weights.reduce((sum, weight, index) => sum + importance[index] * weight, 0);
    const baselineScore = weights.reduce((sum, weight, index) => sum + baseline[index] * weight, 0);
    const relativeImportance =
      baselineScore === 0
        ? 0
        : mround((averageBaseline / averageImportance) * 100 * (score / baselineScore), 5) - 100;

    return {
      objective,
      score,
      baselineScore,
      relativeImportance,
    };
  });
}
