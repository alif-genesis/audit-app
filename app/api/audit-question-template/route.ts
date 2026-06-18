import { createXlsx } from "@/lib/xlsx";

export async function GET(request: Request) {
  const framework = new URL(request.url).searchParams.get("framework");
  const isCobit = framework?.toLowerCase() === "cobit";
  const rows = isCobit ? buildCobitRows() : isoRows;

  return new Response(createXlsx(rows), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        `attachment; filename="${isCobit ? "template-pertanyaan-audit-cobit.xlsx" : "template-pertanyaan-audit-iso.xlsx"}"`,
    },
  });
}

const isoRows = [
    ["klausul", "judul", "prasyarat", "pertanyaan"],
    [
      "4.1",
      "Understanding The Organization And Its Context",
      "The organization shall determine external and internal issues.",
      "Apakah terdapat isu internal atau eksternal terkait pelaksanaan pekerjaan dan keamanan informasi?",
    ],
    [
      "4.2",
      "Understanding The Needs And Expectations Of Interested Parties",
      "The organization shall determine interested parties and requirements.",
      "Apakah pihak terkait telah diidentifikasi dan didokumentasikan?",
    ],
    [
      "A.5.1",
      "Policies For Information Security",
      "Information security policy shall be defined and approved.",
      "Apakah kebijakan keamanan informasi sudah didokumentasikan dan direview secara rutin?",
    ],
  ];

const cobitObjectives = [
  ["EDM", "EDM01", "Ensured Governance Framework Setting and Maintenance"],
  ["EDM", "EDM02", "Ensured Benefits Delivery"],
  ["EDM", "EDM03", "Ensured Risk Optimization"],
  ["EDM", "EDM04", "Ensured Resource Optimization"],
  ["EDM", "EDM05", "Ensured Stakeholder Engagement"],
  ["APO", "APO01", "Managed I&T Management Framework"],
  ["APO", "APO02", "Managed Strategy"],
  ["APO", "APO03", "Managed Enterprise Architecture"],
  ["APO", "APO04", "Managed Innovation"],
  ["APO", "APO05", "Managed Portfolio"],
  ["APO", "APO06", "Managed Budget and Costs"],
  ["APO", "APO07", "Managed Human Resources"],
  ["APO", "APO08", "Managed Relationships"],
  ["APO", "APO09", "Managed Service Agreements"],
  ["APO", "APO10", "Managed Vendors"],
  ["APO", "APO11", "Managed Quality"],
  ["APO", "APO12", "Managed Risk"],
  ["APO", "APO13", "Managed Security"],
  ["APO", "APO14", "Managed Data"],
  ["BAI", "BAI01", "Managed Programs"],
  ["BAI", "BAI02", "Managed Requirements Definition"],
  ["BAI", "BAI03", "Managed Solutions Identification and Build"],
  ["BAI", "BAI04", "Managed Availability and Capacity"],
  ["BAI", "BAI05", "Managed Organizational Change"],
  ["BAI", "BAI06", "Managed IT Changes"],
  ["BAI", "BAI07", "Managed IT Change Acceptance and Transitioning"],
  ["BAI", "BAI08", "Managed Knowledge"],
  ["BAI", "BAI09", "Managed Assets"],
  ["BAI", "BAI10", "Managed Configuration"],
  ["BAI", "BAI11", "Managed Projects"],
  ["DSS", "DSS01", "Managed Operations"],
  ["DSS", "DSS02", "Managed Service Requests and Incidents"],
  ["DSS", "DSS03", "Managed Problems"],
  ["DSS", "DSS04", "Managed Continuity"],
  ["DSS", "DSS05", "Managed Security Services"],
  ["DSS", "DSS06", "Managed Business Process Controls"],
  ["MEA", "MEA01", "Managed Performance and Conformance Monitoring"],
  ["MEA", "MEA02", "Managed System of Internal Control"],
  ["MEA", "MEA03", "Managed Compliance With External Requirements"],
  ["MEA", "MEA04", "Managed Assurance"],
];

const capabilityLevelRequirements: Record<number, string> = {
  1: "Aktivitas dasar proses telah dilakukan untuk mencapai tujuan proses.",
  2: "Aktivitas proses telah dikelola, direncanakan, dipantau, dan menghasilkan work product yang sesuai.",
  3: "Proses telah didefinisikan dan diterapkan secara konsisten sesuai standar organisasi.",
  4: "Proses telah diukur secara kuantitatif dan dikendalikan untuk mencapai hasil yang ditetapkan.",
  5: "Proses terus ditingkatkan berdasarkan pengukuran, evaluasi, dan peluang optimasi.",
};

function buildCobitRows() {
  const rows = [["domain", "objective_id", "level", "judul", "prasyarat", "pertanyaan"]];

  for (const [domain, objectiveId, title] of cobitObjectives) {
    for (const level of [1, 2, 3, 4, 5]) {
      rows.push([
        domain,
        objectiveId,
        String(level),
        title,
        capabilityLevelRequirements[level],
        `Apakah ${objectiveId} Level ${level} sudah terpenuhi untuk ${title}?`,
      ]);
    }
  }

  return rows;
}
