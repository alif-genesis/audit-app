import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, Plus, Search, Settings, Trash2 } from "lucide-react";
import { hasAdminSession } from "@/app/login/actions";
import { AdminShell } from "@/components/admin-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { prisma } from "@/lib/prisma";
import { deleteAuditTypeAction } from "./actions";

type AuditTypesPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function AuditTypesPage({ searchParams }: AuditTypesPageProps) {
  const isAuthenticated = await hasAdminSession();

  if (!isAuthenticated) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const q = String(params.q || "").trim();

  const auditTypes = await prisma.auditType.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { isoStandard: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    include: {
      _count: {
        select: { questions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell active="audit-types">
      <section className="page-header">
        <div>
          <div className="title-row">
            <BookOpenCheck className="title-logo-icon" size={34} aria-hidden="true" />
            <h1>Framework Audit</h1>
          </div>
          <p>Kelola template audit ISO dan COBIT beserta pertanyaan klausul/domain.</p>
        </div>
        <Link className="primary-button page-action" href="/dashboard/audit-types/new">
          <Plus size={17} aria-hidden="true" />
          Tambah Framework
        </Link>
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar Framework Audit</h2>
            <p>Template yang akan dipakai saat membuat program audit.</p>
          </div>
        </div>

        <AutoSubmitForm className="user-filter company-filter" action="/dashboard/audit-types">
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Cari nama, standar, atau deskripsi..." />
          </div>
        </AutoSubmitForm>

        <div className="table-wrap">
          <table className="user-table audit-type-table">
            <thead>
              <tr>
                <th>Framework Audit</th>
                <th>Framework / Standar</th>
                <th>Jumlah Pertanyaan</th>
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {auditTypes.map((auditType) => (
                <tr key={auditType.id}>
                  <td>
                    <strong>{auditType.name}</strong>
                    <span>Dibuat {auditType.createdAt.toLocaleDateString("id-ID")}</span>
                  </td>
                  <td>{auditType.isoStandard}</td>
                  <td>{auditType._count.questions}</td>
                  <td>{auditType.description || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <Link aria-label="Edit framework audit" href={`/dashboard/audit-types/${auditType.id}`}>
                        <Settings size={17} aria-hidden="true" />
                      </Link>
                      <form action={deleteAuditTypeAction}>
                        <input name="id" type="hidden" value={auditType.id} />
                        <button aria-label="Hapus framework audit" type="submit">
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
