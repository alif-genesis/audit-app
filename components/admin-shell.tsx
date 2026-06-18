import Link from "next/link";
import { Activity, BookOpenCheck, Building2, CheckCircle2, ClipboardCheck, Home, LogOut, Network, Radar, ShieldCheck, UsersRound } from "lucide-react";
import { UserRole } from "@prisma/client";
import { logoutAction } from "@/app/login/actions";
import { BrandMark } from "@/components/brand-mark";
import { GlobalEscapeClose } from "@/components/global-escape-close";
import { ProfileMenu } from "@/components/profile-menu";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type AdminShellProps = {
  active: "dashboard" | "companies" | "audit-types" | "audits" | "capa" | "cobit-audits" | "design-factors" | "users" | "logs";
  children: React.ReactNode;
};

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    adminOnly: false,
  },
  {
    id: "companies",
    label: "Company",
    href: "/dashboard/companies",
    icon: Building2,
    adminOnly: true,
  },
  {
    id: "audit-types",
    label: "Framework Audit",
    href: "/dashboard/audit-types",
    icon: BookOpenCheck,
    adminOnly: true,
  },
  {
    id: "audits",
    label: "Audit (ISO)",
    href: "/dashboard/audits",
    icon: CheckCircle2,
    adminOnly: false,
  },
  {
    id: "capa",
    label: "CAPA",
    href: "/dashboard/capa",
    icon: ClipboardCheck,
    adminOnly: false,
  },
  {
    id: "cobit-audits",
    label: "Audit (COBIT)",
    href: "/dashboard/cobit-audits",
    icon: Radar,
    adminOnly: false,
  },
  {
    id: "design-factors",
    label: "Design Factors",
    href: "/dashboard/design-factors",
    icon: Network,
    adminOnly: false,
  },
  {
    id: "users",
    label: "User Management",
    href: "/dashboard/users",
    icon: UsersRound,
    adminOnly: true,
  },
  {
    id: "logs",
    label: "Log System",
    href: "/dashboard/logs",
    icon: Activity,
    adminOnly: true,
  },
] as const;

export async function AdminShell({ active, children }: AdminShellProps) {
  const currentUser = await getCurrentUser();
  const assignedAccess =
    currentUser && currentUser.role !== UserRole.ADMIN
      ? await getAssignedMenuAccess(currentUser.id)
      : null;
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.id === "dashboard") {
      return true;
    }

    if (currentUser?.role === UserRole.ADMIN) {
      return true;
    }

    if (item.adminOnly || !assignedAccess) {
      return false;
    }

    if (item.id === "audits") {
      return assignedAccess.isoAudits;
    }

    if (item.id === "cobit-audits") {
      return assignedAccess.cobitAudits;
    }

    if (item.id === "design-factors") {
      return assignedAccess.designFactors;
    }

    if (item.id === "capa") {
      return assignedAccess.capa;
    }

    return false;
  });

  return (
    <main className="app-shell">
      <GlobalEscapeClose />
      <aside className="sidebar">
        <BrandMark />

        <nav className="side-nav" aria-label="Navigasi admin">
          {visibleMenuItems.map((item) => {
            const isCobitItem = item.id === "design-factors" || item.id === "cobit-audits";
            const isIsoAuditItem = item.id === "audits";
            const Icon = item.icon;
            return (
              <Link
                className={active === item.id ? "side-link active" : "side-link"}
                href={item.href}
                key={item.id}
              >
                {isCobitItem ? (
                  <img className="side-link-logo cobit" src="/images/cobit-logo.png" alt="" />
                ) : isIsoAuditItem ? (
                  <img className="side-link-logo iso" src="/images/iso-logo.svg" alt="" />
                ) : (
                  <Icon size={18} aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="dashboard-area">
        <header className="dashboard-topbar">
          <div className="workspace-select">
            <ShieldCheck size={20} aria-hidden="true" />
            <span>PT Genetika Solusi Bisnis</span>
          </div>
          {currentUser ? <ProfileMenu user={currentUser} /> : null}
          <form action={logoutAction}>
            <button className="topbar-button" type="submit">
              <LogOut size={17} aria-hidden="true" />
              Logout
            </button>
          </form>
        </header>

        {children}
        <footer className="app-footer">© 2026 PT. Genetika Solusi Bisnis</footer>
      </section>
    </main>
  );
}

async function getAssignedMenuAccess(userId: string) {
  const assignmentWhere = {
    OR: [{ auditorId: userId }, { auditeeId: userId }],
  };
  const cobitTypeWhere = {
    OR: [
      { name: { contains: "COBIT", mode: "insensitive" as const } },
      { isoStandard: { contains: "COBIT", mode: "insensitive" as const } },
    ],
  };

  const [isoAudits, cobitAudits, designFactors, capa] = await Promise.all([
    prisma.audit.count({
      where: {
        auditType: {
          NOT: cobitTypeWhere,
        },
        assignments: {
          some: assignmentWhere,
        },
      },
    }),
    prisma.audit.count({
      where: {
        auditType: cobitTypeWhere,
        assignments: {
          some: assignmentWhere,
        },
      },
    }),
    prisma.designFactorAssessment.count({
      where: {
        OR: [{ auditorId: userId }, { auditeeId: userId }],
      },
    }),
    prisma.capaAction.count({
      where: {
        finding: {
          audit: {
            auditType: {
              NOT: cobitTypeWhere,
            },
            assignments: {
              some: assignmentWhere,
            },
          },
        },
      },
    }),
  ]);

  return {
    isoAudits: isoAudits > 0,
    cobitAudits: cobitAudits > 0,
    designFactors: designFactors > 0,
    capa: capa > 0,
  };
}
