import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { hasAdminSession } from "@/app/login/actions";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/lib/prisma";
import { EditCompanyDialog } from "../company-dialogs";

type CompanyDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const isAuthenticated = await hasAdminSession();

  if (!isAuthenticated) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
  });

  if (!company) {
    notFound();
  }

  const activeUserCount = await prisma.user.count({
    where: {
      isActive: true,
      companyName: company.name,
    },
  });

  return (
    <AdminShell active="companies">
      <section className="company-detail-header">
        <div className="company-title-block">
          <Link className="icon-link" href="/dashboard/companies" aria-label="Kembali">
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <Building2 size={34} aria-hidden="true" />
          <div>
            <h1>{company.name}</h1>
            <p>Kode: {company.code || "-"}</p>
          </div>
        </div>
        <div className="detail-actions">
          <button className="secondary-button" type="button">
            <FileText size={17} aria-hidden="true" />
            Lihat Audit
          </button>
          <EditCompanyDialog company={company} />
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <h2>Informasi Dasar</h2>
          <p>Detail perusahaan dan ruang lingkup audit.</p>

          <div className="detail-list">
            <DetailItem icon={Building2} label="Nama Perusahaan" value={company.name} />
            <DetailItem icon={ReceiptText} label="Kode Perusahaan" value={company.code || "-"} />
            <DetailItem
              icon={FileText}
              label="Deskripsi"
              value={company.description || "-"}
            />
          </div>
        </article>

        <article className="detail-card">
          <h2>Informasi Kontak</h2>
          <p>Kontak resmi perusahaan.</p>

          <div className="detail-list">
            <DetailItem icon={Mail} label="Email" value={company.email || "-"} />
            <DetailItem icon={Phone} label="Telepon" value={company.phone || "-"} />
            <DetailItem icon={MapPin} label="Alamat" value={company.address || "-"} />
          </div>
        </article>
      </section>

      <section className="detail-card stats-card">
        <h2>Statistik Audit</h2>
        <p>Ringkasan audit dan user aktif perusahaan ini.</p>
        <div className="stats-row">
          <div className="stat-tile">
            <FileText size={30} aria-hidden="true" />
            <div>
              <strong>0</strong>
              <span>Total Audit</span>
            </div>
          </div>
          <div className="stat-tile">
            <UsersRound size={30} aria-hidden="true" />
            <div>
              <strong>{activeUserCount}</strong>
              <span>User Aktif</span>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="detail-item">
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}
