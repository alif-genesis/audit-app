import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.isActive) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === "ADMIN";
  const audits = await prisma.audit.findMany({
    where: !isAdmin
      ? {
          assignments: {
            some: {
              OR: [
                { auditeeId: currentUser.id },
                { auditorId: currentUser.id },
              ],
            },
          },
        }
      : undefined,
    include: {
      auditType: {
        select: {
          name: true,
          isoStandard: true,
          _count: { select: { questions: true } },
        },
      },
      responses: {
        select: {
          id: true,
          compliance: true,
          submittedAt: true,
        },
      },
      findings: {
        select: {
          responseId: true,
          level: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const standards = Array.from(new Set(audits.map((audit) => audit.auditType.isoStandard))).slice(0, 8);
  const latestAudits = audits.slice(0, 5);

  return (
    <AdminShell active="dashboard">
        <section className="dashboard-content">
          <div className="dashboard-hero">
            <div>
              <p className="eyebrow">Audit Center</p>
              <h1>Platform Audit Enterprise Untuk ISO Dan COBIT</h1>
              <p>
                Mulai Dari Perencanaan Program, Pemetaan Framework, Pengumpulan
                Evidence, Sampai Monitoring Corrective Action.
              </p>
            </div>
          </div>

          <section className="standards-panel">
            <div className="section-heading">
              <h2>Audit Terbaru</h2>
              <p>Status program audit terakhir.</p>
            </div>
            <div className="dashboard-audit-list">
              {latestAudits.length ? latestAudits.map((audit) => (
                <div key={audit.id}>
                  <strong>{audit.title}</strong>
                  <span>{audit.companyName} - {audit.mode === "GAP_ASSESSMENT" ? "Gap Assessment" : "Audit Internal"}</span>
                </div>
              )) : (
                <p className="empty-dashboard-state">Belum ada audit yang dibuat.</p>
              )}
            </div>
          </section>

          <section className="standards-panel">
            <div className="section-heading">
              <h2>Framework Audit</h2>
              <p>Standar yang sudah dipakai pada program audit.</p>
            </div>
            <div className="standard-list">
              {(standards.length ? standards : ["Belum Ada Data"]).map((standard) => (
                <span key={standard}>{standard}</span>
              ))}
            </div>
          </section>
        </section>
    </AdminShell>
  );
}
