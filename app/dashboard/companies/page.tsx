import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Eye, Mail, Phone, Search } from "lucide-react";
import { hasAdminSession } from "@/app/login/actions";
import { AdminShell } from "@/components/admin-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { prisma } from "@/lib/prisma";
import {
  AddCompanyDialog,
  DeleteCompanyButton,
  EditCompanyDialog,
} from "./company-dialogs";

type CompaniesPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const isAuthenticated = await hasAdminSession();

  if (!isAuthenticated) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const q = String(params.q || "").trim();

  const companies = await prisma.company.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { name: "asc" },
  });

  const activeUserCounts = await prisma.user.groupBy({
    by: ["companyName"],
    where: {
      isActive: true,
      companyName: { not: null },
    },
    _count: { id: true },
  });

  const activeUserCountByCompany = new Map(
    activeUserCounts.map((item) => [item.companyName, item._count.id]),
  );

  return (
    <AdminShell active="companies">
      <section className="page-header">
        <div>
          <div className="title-row">
            <Building2 size={30} aria-hidden="true" />
            <h1>Company</h1>
          </div>
          <p>Kelola Perusahaan Yang Akan Menjadi Objek Audit.</p>
        </div>
        <AddCompanyDialog />
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar Perusahaan</h2>
            <p>Tambahkan Perusahaan Sebelum Membuat Program Audit.</p>
          </div>
        </div>

        <AutoSubmitForm className="user-filter company-filter" action="/dashboard/companies">
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Cari nama, kode, atau email..." />
          </div>
        </AutoSubmitForm>

        <div className="table-wrap">
          <table className="user-table company-table">
            <thead>
              <tr>
                <th>Perusahaan</th>
                <th>Kontak</th>
                <th>Audit Aktif</th>
                <th>User Aktif</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <strong>{company.name}</strong>
                    <span>{company.code || "-"}</span>
                    {company.address ? <span>{company.address}</span> : null}
                  </td>
                  <td>
                    <div className="stacked-info">
                      {company.email ? (
                        <span>
                          <Mail size={15} aria-hidden="true" />
                          {company.email}
                        </span>
                      ) : null}
                      {company.phone ? (
                        <span>
                          <Phone size={15} aria-hidden="true" />
                          {company.phone}
                        </span>
                      ) : null}
                      {!company.email && !company.phone ? "-" : null}
                    </div>
                  </td>
                  <td>0</td>
                  <td>{activeUserCountByCompany.get(company.name) ?? 0}</td>
                  <td>
                    <div className="row-actions">
                      <Link aria-label="Lihat perusahaan" href={`/dashboard/companies/${company.id}`}>
                        <Eye size={17} aria-hidden="true" />
                      </Link>
                      <EditCompanyDialog company={company} />
                      <DeleteCompanyButton
                        companyId={company.id}
                        companyName={company.name}
                      />
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
