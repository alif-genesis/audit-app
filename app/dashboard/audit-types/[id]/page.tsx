import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { hasAdminSession } from "@/app/login/actions";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { AuditTypeEditor } from "./audit-type-editor";
import { AuditQuestionTable } from "./audit-question-table";

type AuditTypeDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AuditTypeDetailPage({ params }: AuditTypeDetailPageProps) {
  const isAuthenticated = await hasAdminSession();

  if (!isAuthenticated) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const auditType = await prisma.auditType.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!auditType) {
    notFound();
  }

  return (
    <AdminShell active="audit-types">
      <section className="company-detail-header">
        <div className="company-title-block">
          <Link className="icon-link" href="/dashboard/audit-types" aria-label="Kembali">
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <BookOpenCheck size={34} aria-hidden="true" />
          <div>
            <h1>{auditType.name}</h1>
            <p>{auditType.isoStandard}</p>
          </div>
        </div>
      </section>

      <AuditTypeEditor auditType={auditType} />

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar Pertanyaan Audit</h2>
            <p>{auditType.questions.length} Pertanyaan Dalam Template Ini.</p>
          </div>
        </div>

        <AuditQuestionTable auditTypeId={auditType.id} questions={auditType.questions} />
      </section>
    </AdminShell>
  );
}
