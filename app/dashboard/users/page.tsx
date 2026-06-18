import { redirect } from "next/navigation";
import { Building2, Search, UsersRound } from "lucide-react";
import { UserRole } from "@prisma/client";
import { hasAdminSession } from "@/app/login/actions";
import { AdminShell } from "@/components/admin-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { CustomSelect } from "@/components/custom-select";
import { prisma } from "@/lib/prisma";
import { AddUserDialog, DeleteUserButton, EditUserDialog } from "./user-dialogs";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  AUDITEE: "Auditee",
  AUDITOR: "Auditor",
};

type UsersPageProps = {
  searchParams?: Promise<{
    q?: string;
    role?: string;
    company?: string;
  }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const isAuthenticated = await hasAdminSession();

  if (!isAuthenticated) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const q = String(params.q || "").trim();
  const role = Object.values(UserRole).includes(params.role as UserRole)
    ? (params.role as UserRole)
    : undefined;
  const company = String(params.company || "").trim();

  const users = await prisma.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(role ? { role } : {}),
      ...(company ? { companyName: company } : {}),
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  const companies = await prisma.company.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AdminShell active="users">
      <section className="page-header">
        <div>
          <div className="title-row">
            <UsersRound size={30} aria-hidden="true" />
            <h1>User Management</h1>
          </div>
          <p>Kelola Akun Admin, Auditee, Auditor, Dan Penugasan Perusahaan.</p>
        </div>
        <AddUserDialog companies={companies} />
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar User</h2>
            <p>Tambah Dan Pantau Akun Yang Akan Mengakses Aplikasi Audit.</p>
          </div>
        </div>

        <AutoSubmitForm className="user-filter" action="/dashboard/users">
          <CustomSelect
            name="role"
            defaultValue={role ?? ""}
            ariaLabel="Filter role"
            options={[
              { value: "", label: "Semua Role" },
              { value: "ADMIN", label: "Admin" },
              { value: "AUDITEE", label: "Auditee" },
              { value: "AUDITOR", label: "Auditor" },
            ]}
          />

          <CustomSelect
            name="company"
            defaultValue={company}
            ariaLabel="Filter perusahaan"
            options={[
              { value: "", label: "Semua Perusahaan" },
              ...companies.map((item) => ({
                value: item.name,
                label: item.name,
              })),
            ]}
          />

          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari nama atau email..."
            />
          </div>
        </AutoSubmitForm>

        <div className="table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Perusahaan</th>
                <th>Role</th>
                <th>Status</th>
                <th>Assigned Audits</th>
                <th>Last Login</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </td>
                  <td>
                    <div className="company-cell">
                      {user.companyName ? (
                        <>
                          <Building2 size={16} aria-hidden="true" />
                          {user.companyName}
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="role-badge">{roleLabels[user.role]}</span>
                  </td>
                  <td>
                    <span className={user.isActive ? "status active" : "status"}>
                      {user.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>{user.assignedAudits}</td>
                  <td>
                    {user.lastLoginAt
                      ? new Intl.DateTimeFormat("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(user.lastLoginAt)
                      : "Belum Pernah"}
                  </td>
                  <td>
                    <div className="row-actions">
                      <EditUserDialog companies={companies} user={user} />
                      <DeleteUserButton
                        userId={user.id}
                        userName={user.name}
                        userRole={user.role}
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
