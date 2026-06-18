"use client";

import { Download } from "lucide-react";
import { downloadSimpleReportPdf } from "@/lib/report-pdf";

type DownloadAuditReportButtonProps = {
  auditTitle: string;
  companyName: string;
  auditTypeName: string;
  auditModeLabel: string;
  auditorName?: string;
  auditeeName?: string;
  statusLabel: string;
  compliancePercentage: number;
  answeredCount: number;
  totalQuestions: number;
  reviewedCount: number;
  chartItems: Array<{
    label: string;
    value: number;
  }>;
  detailRows: string[][];
};

export function DownloadAuditReportButton({
  auditTitle,
  companyName,
  auditTypeName,
  auditModeLabel,
  auditorName,
  auditeeName,
  statusLabel,
  compliancePercentage,
  answeredCount,
  totalQuestions,
  reviewedCount,
  chartItems,
  detailRows,
}: DownloadAuditReportButtonProps) {
  const downloadedAt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  return (
    <button
      className="primary-button report-download-button"
      type="button"
      onClick={() =>
        downloadSimpleReportPdf(
          {
            title: "LAPORAN AUDIT",
            subtitle: `${auditTypeName.toUpperCase()} - ${auditModeLabel.toUpperCase()}`,
            downloadedAt,
            summaryTitle: "RINGKASAN",
            summaryText: `Laporan ini menyajikan informasi pemenuhan audit ${auditTitle} untuk ${companyName}. Data diperoleh dari jawaban auditee dan penilaian auditor pada saat laporan diunduh.`,
            totalLabel: "COMPLIANCE SCORE",
            totalValue: `${compliancePercentage}%`,
            stats: [
              { label: "Pertanyaan Dijawab", value: `${answeredCount}/${totalQuestions}` },
              { label: "Review Auditor", value: String(reviewedCount) },
              { label: "Compliance", value: `${compliancePercentage}%` },
            ],
            summaryItems: [
              { label: "Framework", value: auditTypeName },
              { label: "Mode", value: auditModeLabel },
              { label: "Status", value: statusLabel },
              { label: "Perusahaan", value: companyName },
              { label: "Auditor", value: auditorName || "-" },
              { label: "Auditee", value: auditeeName || "-" },
            ],
            sectionTitle: "PEMENUHAN AUDIT",
            bars: chartItems.map((item) => ({
              label: item.label,
              value: totalQuestions > 0 ? Math.round((item.value / totalQuestions) * 100) : 0,
              count: `${item.value}/${totalQuestions}`,
            })),
            note: "Persentase menunjukkan tingkat pemenuhan audit berdasarkan jawaban auditee dan review auditor. Semakin tinggi persentase, semakin baik tingkat pemenuhan.",
            tables: [
              {
                title: "Statistik Audit",
                columns: ["Kategori", "Jumlah", "Persentase"],
                rows: chartItems.map((item) => [
                  item.label,
                  String(item.value),
                  `${totalQuestions > 0 ? Math.round((item.value / totalQuestions) * 100) : 0}%`,
                ]),
              },
              {
                title: "Detail Compliance Per Question",
                columns: ["Klausul", "Question", "Auditee", "Auditor", "Status"],
                rows: detailRows,
              },
            ],
          },
          `laporan-audit-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
        )
      }
    >
      <Download size={16} aria-hidden="true" />
      Download Report
    </button>
  );
}
