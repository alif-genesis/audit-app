import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ChevronRight, Filter, Search } from "lucide-react";
import { hasAdminSession } from "@/app/login/actions";
import { AdminShell } from "@/components/admin-shell";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { CustomSelect } from "@/components/custom-select";
import { ALLOWED_ACTIVITY_ACTIONS, normalizeActivityAction } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

type LogsPageProps = {
  searchParams?: Promise<{
    q?: string;
    action?: string;
    entity?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 25;

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const isAuthenticated = await hasAdminSession();

  if (!isAuthenticated) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const q = String(params.q || "").trim();
  const action = String(params.action || "").trim();
  const selectedAction = ALLOWED_ACTIVITY_ACTIONS.includes(action as any) ? action : "";
  const entity = String(params.entity || "").trim();
  const page = Math.max(1, Number(params.page || 1) || 1);
  const allowedActionWhere = selectedAction
    ? buildActionWhere(selectedAction)
    : { OR: ALLOWED_ACTIVITY_ACTIONS.flatMap((item) => buildActionWhere(item).OR) };
  const where = {
    AND: [
      allowedActionWhere,
      ...(q
        ? [{
            OR: [
              { actorName: { contains: q, mode: "insensitive" as const } },
              { actorEmail: { contains: q, mode: "insensitive" as const } },
              { details: { contains: q, mode: "insensitive" as const } },
            ],
          }]
        : []),
    ],
    ...(entity ? { entity } : {}),
  };

  const totalLogs = await prisma.activityLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const entities = await prisma.activityLog.findMany({
    distinct: ["entity"],
    select: { entity: true },
    orderBy: { entity: "asc" },
  });

  return (
    <AdminShell active="logs">
      <section className="page-header">
        <div>
          <div className="title-row">
            <Activity size={30} aria-hidden="true" />
            <h1>Log System</h1>
          </div>
          <p>Rekam Jejak Aktivitas User Di Dalam Aplikasi.</p>
        </div>
      </section>

      <section className="users-panel log-filter-panel">
        <div className="section-heading">
          <div>
            <h2>
              <Filter size={20} aria-hidden="true" />
              Filter
            </h2>
            <p>Saring Log Berdasarkan User, Action, Entity, Atau Detail.</p>
          </div>
        </div>

        <AutoSubmitForm className="log-filter" action="/dashboard/logs">
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Cari log..." />
          </div>
          <CustomSelect
            name="action"
            defaultValue={selectedAction}
            ariaLabel="Filter action"
            options={[
              { value: "", label: "Semua Action" },
              ...ALLOWED_ACTIVITY_ACTIONS.map((item) => ({
                value: item,
                label: item,
              })),
            ]}
          />
          <CustomSelect
            name="entity"
            defaultValue={entity}
            ariaLabel="Filter entity"
            options={[
              { value: "", label: "Semua Entity" },
              ...entities.map((item) => ({
                value: item.entity,
                label: item.entity,
              })),
            ]}
          />
        </AutoSubmitForm>
      </section>

      <section className="users-panel">
        <div className="section-heading">
          <div>
            <h2>Activity Records</h2>
            <p>
              Menampilkan {logs.length} Dari {totalLogs} Aktivitas.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="user-table log-table">
            <thead>
              <tr>
                <th></th>
                <th>Waktu</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <ChevronRight size={18} aria-hidden="true" />
                  </td>
                  <td>
                    <strong>
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(log.createdAt)}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(log.createdAt)}
                    </span>
                  </td>
                  <td>
                    <strong>{log.actorName}</strong>
                    <span>{log.actorEmail}</span>
                  </td>
                  <td>
                    <span className="action-badge">{normalizeActivityAction(log.action) ?? log.action}</span>
                  </td>
                  <td>
                    <strong>{log.entity}</strong>
                    <span>{log.entityId ? `${log.entityId.slice(0, 8)}...` : "-"}</span>
                  </td>
                  <td>
                    <strong>{log.details}</strong>
                    <span>IP: {log.ipAddress ?? "-"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="pagination">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((item) => (
              <Link
                className={item === currentPage ? "page-link active" : "page-link"}
                href={`/dashboard/logs?${buildLogQuery({ q, action: selectedAction, entity, page: item })}`}
                key={item}
              >
                {item}
              </Link>
            ))}
            {totalPages > 5 ? (
              <AutoSubmitForm className="pagination-jump" action="/dashboard/logs">
                {q ? <input type="hidden" name="q" value={q} /> : null}
                {selectedAction ? <input type="hidden" name="action" value={selectedAction} /> : null}
                {entity ? <input type="hidden" name="entity" value={entity} /> : null}
                <CustomSelect
                  name="page"
                  defaultValue={String(currentPage)}
                  ariaLabel="Pilih halaman log"
                  options={Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => ({
                    value: String(item),
                    label: `Halaman ${item}`,
                  }))}
                />
              </AutoSubmitForm>
            ) : null}
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}

function buildActionWhere(action: string) {
  return {
    OR: [
      { action },
      { action: { contains: action, mode: "insensitive" as const } },
    ],
  };
}

function buildLogQuery({
  q,
  action,
  entity,
  page,
}: {
  q: string;
  action: string;
  entity: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (action) params.set("action", action);
  if (entity) params.set("entity", entity);
  params.set("page", String(page));

  return params.toString();
}
