"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Leaf, Maximize2, Menu, Pencil, Save, Upload, X } from "lucide-react";
import { saveDesignFactorReportAction } from "../../actions";
import { reportFactorLabels, type ReportFactorCode, type ReportInputRow, type ReportSummaryRow } from "@/lib/cobit/designFactorReport";
import styles from "./report.module.css";

type Assessment = {
  id: string;
  name: string;
  companyName: string;
  description: string | null;
  status: string;
  targetScore: number | null;
  startDate: string;
  dueDate: string | null;
  updatedAt: string;
  auditorName: string;
  auditeeName: string;
};

type ReportContent = Record<string, string>;
const factorCodes = Object.keys(reportFactorLabels) as ReportFactorCode[];

export function DesignFactorReportDeck({ assessment, factorRows, summaryRows, storedContent }: {
  assessment: Assessment;
  factorRows: Record<ReportFactorCode, ReportInputRow[]>;
  summaryRows: ReportSummaryRow[];
  storedContent: ReportContent;
}) {
  const defaults = useMemo(() => createDefaults(assessment, summaryRows), [assessment, summaryRows]);
  const [content, setContent] = useState<ReportContent>({ ...defaults, ...storedContent });
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const slides = buildSlides(assessment, factorRows, summaryRows, content, editing, setContent);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (editing && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
      if (event.key === "ArrowRight" || event.key === " ") setSlide((value) => Math.min(slides.length - 1, value + 1));
      if (event.key === "ArrowLeft") setSlide((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editing, slides.length]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPreviewing(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function save() {
    startTransition(async () => {
      const result = await saveDesignFactorReportAction(assessment.id, content);
      setMessage(result.message ?? "");
      if (result.success) setEditing(false);
      window.setTimeout(() => setMessage(""), 3500);
    });
  }

  function downloadPdf() {
    const previous = document.title;
    document.title = `Report-Design-Factor-${slug(assessment.companyName)}`;
    window.print();
    window.setTimeout(() => { document.title = previous; }, 500);
  }

  async function openPreview() {
    setPreviewing(true);
    try {
      await shellRef.current?.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by browser policy; presentation mode still works in-page.
    }
  }

  async function closePreview() {
    setPreviewing(false);
    if (document.fullscreenElement) await document.exitFullscreen();
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.set("logo", file);
    try {
      const response = await fetch(`/api/design-factors/${assessment.id}/report-logo`, { method: "POST", body: formData });
      const result = await response.json() as { logoUrl?: string; error?: string };
      if (!response.ok || !result.logoUrl) throw new Error(result.error || "Logo gagal diunggah.");
      setContent((current) => ({ ...current, companyLogoPath: result.logoUrl as string }));
      setMessage("Logo perusahaan berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logo gagal diunggah.");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
      window.setTimeout(() => setMessage(""), 3500);
    }
  }

  return (
    <main ref={shellRef} className={`${styles.shell} ${previewing ? styles.previewMode : ""}`}>
      <nav className={styles.topbar} aria-label="Navigasi report">
        <div className={styles.brand}>
          <span className={styles.brandIcon}><img src="/genetika-1-warna.png" alt="Genesis" /></span>
          <div><strong>Genesis Design Factor Report</strong><small>{assessment.name} · {assessment.companyName}</small></div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.ghostButton} href={`/dashboard/design-factors/${assessment.id}`}><ArrowLeft size={17} /> Summary</Link>
          <button className={styles.ghostButton} onClick={() => setSlide((value) => Math.max(0, value - 1))} disabled={slide === 0}><ChevronLeft size={17} /> Prev</button>
          <span className={styles.counter}>SLIDE {String(slide + 1).padStart(2, "0")} / {slides.length}</span>
          <button className={styles.nextButton} onClick={() => setSlide((value) => Math.min(slides.length - 1, value + 1))} disabled={slide === slides.length - 1}>Next <ChevronRight size={17} /></button>
          <button className={styles.iconButton} onClick={() => setMenuOpen((value) => !value)} aria-label="Buka daftar slide">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <input ref={logoInputRef} className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadLogo(event.target.files?.[0])} />
          <button className={styles.ghostButton} onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}><Upload size={17} /> {uploadingLogo ? "Uploading..." : "Upload Logo"}</button>
          <button className={editing ? styles.saveButton : styles.ghostButton} onClick={editing ? save : () => setEditing(true)} disabled={pending}>
            {editing ? <Save size={17} /> : <Pencil size={17} />}{pending ? "Menyimpan..." : editing ? "Save" : "Edit"}
          </button>
          <button className={styles.downloadButton} onClick={downloadPdf}><Download size={17} /> Download PDF</button>
        </div>
      </nav>

      {previewing ? <nav className={styles.previewToolbar} aria-label="Kontrol preview">
        <button onClick={() => setSlide((value) => Math.max(0, value - 1))} disabled={slide === 0}><ChevronLeft size={20} /> Prev</button>
        <span>{slide + 1} / {slides.length}</span>
        <button onClick={() => setSlide((value) => Math.min(slides.length - 1, value + 1))} disabled={slide === slides.length - 1}>Next <ChevronRight size={20} /></button>
        <button className={styles.exitPreview} onClick={closePreview}><X size={20} /> Exit Preview</button>
      </nav> : null}

      {message ? <div className={styles.toast}>{message}</div> : null}
      <div className={`${styles.deckLayout} ${menuOpen ? "" : styles.menuClosed}`}>
        <aside className={styles.sidebar}>
          <h2>Daftar Isi Report</h2>
          <div>{slides.map((item, index) => (
            <button key={item.title} className={index === slide ? styles.activeAgenda : ""} onClick={() => setSlide(index)}>
              <span>{index + 1}. {item.title}</span><b>S{String(index + 1).padStart(2, "0")}</b>
            </button>
          ))}</div>
        </aside>

        <section className={styles.stage}>
          <article className={styles.slide}>{slides[slide].node}</article>
          {!previewing ? <button className={styles.previewLaunch} onClick={openPreview}><Maximize2 size={24} /> Preview Fullscreen</button> : null}
        </section>
      </div>
      <footer className={styles.footer}>© {new Date().getFullYear()} {assessment.companyName} · COBIT 2019 Design Factor Assessment <span>Gunakan tombol panah kiri / kanan untuk navigasi</span></footer>

      <section className={`df-report-print ${styles.printDeck}`} aria-hidden="true">
        {slides.map((item, index) => <article className={`${styles.slide} ${styles.printSlide}`} key={item.title}><span className={styles.printNumber}>{index + 1} / {slides.length}</span>{item.node}</article>)}
      </section>
    </main>
  );
}

function buildSlides(
  assessment: Assessment,
  factorRows: Record<ReportFactorCode, ReportInputRow[]>,
  summaryRows: ReportSummaryRow[],
  content: ReportContent,
  editing: boolean,
  setContent: (value: ReportContent) => void,
) {
  const field = (key: string, multiline = true) => editing ? (
    multiline ? <textarea className={styles.editor} value={content[key]} onChange={(event) => setContent({ ...content, [key]: event.target.value })} /> :
      <input className={styles.editorInput} value={content[key]} onChange={(event) => setContent({ ...content, [key]: event.target.value })} />
  ) : <p>{content[key]}</p>;
  const sorted = [...summaryRows].sort((a, b) => a.rank - b.rank);
  const adopted = sorted.filter((row) => row.suggestedCapability >= 2);
  const top = sorted.slice(0, 8);
  const slides: Array<{ title: string; node: React.ReactNode }> = [
    { title: "Cover Design Factor", node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow="COBIT 2019 · DESIGN FACTORS"><div className={styles.cover}><span>ASSESSMENT REPORT</span><h1>{assessment.name}</h1>{field("coverSubtitle")}<i /><div className={styles.coverMeta}><Meta label="Company" value={assessment.companyName} /><Meta label="Penyusun" value="PT Genetika Solusi Bisnis" /><Meta label="Tanggal" value={formatMonth(assessment.updatedAt)} /><Meta label="Status" value="Selesai" /></div></div></SlideFrame> },
    { title: "Tujuan Analisis", node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow="01 · ARAH ANALISIS" title="Tujuan Analisis Design Factor"><Narrative field={field("purposeNarrative")} /><CardGrid items={[[field("purposePriorityTitle", false), field("purposePriorityText")], [field("purposeFocusTitle", false), field("purposeFocusText")], ["Dasar Roadmap", field("purposeRoadmapText")]]} /></SlideFrame> },
    { title: "Metodologi", node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow="02 · METODOLOGI" title="Metodologi"><Narrative field={field("methodologyNarrative")} /><Process items={[field("methodologyStep1"), field("methodologyStep2"), field("methodologyStep3"), field("methodologyStep4"), field("methodologyStep5")]} /></SlideFrame> },
    { title: "Profil Assessment", node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow="03 · PROFIL" title="Konteks Assessment"><Narrative field={field("profileNarrative")} /><div className={styles.profileGrid}><Meta label="Assessment" value={assessment.name} /><Meta label="Company" value={assessment.companyName} /><Meta label="Auditor" value={assessment.auditorName} /><Meta label="Auditee" value={assessment.auditeeName} /><Meta label="Baseline" value={assessment.targetScore ? `Level ${assessment.targetScore}` : "Belum ditentukan"} /><Meta label="Periode" value={`${formatDate(assessment.startDate)} – ${assessment.dueDate ? formatDate(assessment.dueDate) : "Berjalan"}`} /></div></SlideFrame> },
  ];

  factorCodes.forEach((code) => {
    const factorLabel = formatFactorCode(code);
    slides.push({ title: `${factorLabel} ${reportFactorLabels[code]}`, node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow={`${factorLabel} · DYNAMIC ASSESSMENT`} title={reportFactorLabels[code]}><FactorView codes={[code]} factorRows={factorRows} summaryRows={summaryRows} /></SlideFrame> });
  });
  slides.push({ title: "Hasil Akhir Priority GMO", node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow="15 · HASIL AKHIR" title="Governance Objectives Priority"><div className={styles.stats}><Stat value={String(adopted.length)} label="Objective Diadopsi" /><Stat value={String(summaryRows.filter((row) => row.suggestedCapability === 4).length)} label="Capability Level 4" /><Stat value={String(summaryRows.length)} label="Total Objective" /></div><PriorityTable rows={top} /></SlideFrame> });
  const recommendationPages = chunk(adopted, 6);
  recommendationPages.forEach((rows, pageIndex) => {
    const pageLabel = recommendationPages.length > 1 ? ` ${pageIndex + 1}/${recommendationPages.length}` : "";
    slides.push({
      title: `Arahan Rekomendasi${pageLabel}`,
      node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow={`${16 + pageIndex} · IMPLIKASI`} title={`Arahan Rekomendasi Tata Kelola${pageLabel}`}>
        {pageIndex === 0 ? <Narrative field={field("implicationNarrative")} /> : null}
        <div className={styles.recommendationGrid}>{rows.map((row) => <article key={row.objective}><b>#{row.rank}</b><h2>{row.objective}</h2><p>Priority {row.priorityScore}</p><strong>Capability Level {row.suggestedCapability}</strong></article>)}</div>
      </SlideFrame>,
    });
  });
  return slides;
}

function SlideFrame({ company, logoUrl, eyebrow, title, children }: { company: string; logoUrl?: string; eyebrow: string; title?: string; children: React.ReactNode }) {
  return <div className={styles.slideInner}><header><div><span className={styles.eyebrow}>{eyebrow}</span>{title ? <h1>{title}</h1> : null}</div><div className={styles.slideBrands}><img className={styles.genesisSlideLogo} src="/genetika-1-warna.png" alt="PT Genetika Solusi Bisnis" /><i /><div className={styles.companyMark}>{logoUrl ? <img src={logoUrl} alt={`Logo ${company}`} /> : <><Leaf size={18} /><b>{company}</b></>}</div></div></header><div className={styles.slideBody}>{children}</div><div className={styles.accent} /></div>;
}

function FactorView({ codes, factorRows, summaryRows }: { codes: ReportFactorCode[]; factorRows: Record<ReportFactorCode, ReportInputRow[]>; summaryRows: ReportSummaryRow[] }) {
  return <div className={styles.factorColumns}>{codes.map((code) => {
    const rows = factorRows[code];
    const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
    const contributions = [...summaryRows].sort((a, b) => Math.abs(b.df[code]) - Math.abs(a.df[code])).slice(0, 5);
    return <section className={styles.factorPanel} key={code}><h2>{formatFactorCode(code)} · {reportFactorLabels[code]}</h2><div className={styles.barList}>{rows.slice(0, 8).map((row) => <div className={styles.barRow} key={row.key}><span>{row.label}</span><i><b style={{ width: `${Math.max(3, Math.abs(row.value) / max * 100)}%` }} /></i><strong>{formatNumber(row.value)}</strong></div>)}</div><h3>Kontribusi objective terbesar</h3><div className={styles.chips}>{contributions.map((row) => <span key={row.objective}>{row.objective} <b>{formatNumber(row.df[code])}</b></span>)}</div></section>;
  })}</div>;
}

function PriorityTable({ rows }: { rows: ReportSummaryRow[] }) { return <div className={styles.table}><div className={styles.tableHead}><span>Rank</span><span>Objective</span><span>Priority</span><span>Capability</span></div>{rows.map((row) => <div key={row.objective}><span>#{row.rank}</span><strong>{row.objective}</strong><span>{row.priorityScore}</span><span>Level {row.suggestedCapability}</span></div>)}</div>; }
function Narrative({ field }: { field: React.ReactNode }) { return <div className={styles.narrative}>{field}</div>; }
function CardGrid({ items }: { items: React.ReactNode[][] }) { return <div className={styles.cardGrid}>{items.map(([title, body], index) => <article key={index}><b>{String(index + 1).padStart(2, "0")}</b><div className={styles.cardTitle}>{title}</div><div className={styles.cardCopy}>{body}</div></article>)}</div>; }
function Process({ items }: { items: React.ReactNode[] }) { return <div className={styles.process}>{items.map((item, index) => <div key={index}><b>{index + 1}</b><div className={styles.processCopy}>{item}</div></div>)}</div>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className={styles.meta}><span>{label}</span><strong>{value}</strong></div>; }
function Stat({ value, label }: { value: string; label: string }) { return <div><strong>{value}</strong><span>{label}</span></div>; }

function createDefaults(assessment: Assessment, rows: ReportSummaryRow[]): ReportContent {
  const adopted = rows.filter((row) => row.suggestedCapability >= 2);
  const top = [...rows].sort((a, b) => a.rank - b.rank).slice(0, 5).map((row) => row.objective).join(", ");
  return {
    coverSubtitle: `Rekomendasi desain tata kelola teknologi informasi untuk ${assessment.companyName}.`,
    preparedBy: `${assessment.auditorName} & ${assessment.auditeeName}`,
    documentStatus: formatStatus(assessment.status),
    purposeNarrative: `Analisis ini menerjemahkan profil strategis dan kondisi I&T ${assessment.companyName} menjadi prioritas Governance & Management Objectives COBIT 2019 yang dapat ditindaklanjuti.`,
    methodologyNarrative: "Perhitungan menggunakan input aktual DF01 sampai DF10. DF01–DF04 membentuk initial scope, kemudian DF05–DF10 menyempurnakan skor final, ranking, dan suggested capability level.",
    profileNarrative: assessment.description || `Assessment ${assessment.name} disusun berdasarkan data yang diberikan auditee dan baseline yang diverifikasi auditor.`,
    implicationNarrative: `Hasil otomatis mengidentifikasi ${adopted.length} objective pada Capability Level 2–4. Fokus awal diarahkan ke ${top || "objective dengan skor prioritas tertinggi"}. Narasi ini dapat disesuaikan sebelum report disahkan.`,
    roadmapNarrative: "Roadmap disusun bertahap: validasi prioritas, gap assessment, implementasi kontrol, lalu monitoring pencapaian capability. Waktu pelaksanaan perlu diselaraskan dengan kapasitas dan rencana kerja organisasi.",
    executiveSummary: `Sebanyak ${adopted.length} objective direkomendasikan masuk scope adopsi.`,
    purposePriorityText: "Menentukan Governance & Management Objectives yang paling relevan.",
    purposeFocusText: "Mengarahkan sumber daya ke capability level yang dibutuhkan.",
    purposeRoadmapText: "Menyusun urutan peningkatan tata kelola yang terukur.",
    purposePriorityTitle: "Prioritas Objektif",
    purposeFocusTitle: "Fokus Implementasi",
    methodologyStep1: "Input DF01–DF04",
    methodologyStep2: "Initial Scope",
    methodologyStep3: "Refinement DF05–DF10",
    methodologyStep4: "Priority Score",
    methodologyStep5: "Capability Level",
    roadmapStep1: "0–3 bulan · Validasi",
    roadmapStep2: "3–6 bulan · Gap assessment",
    roadmapStep3: "6–12 bulan · Implementasi kontrol",
    roadmapStep4: "12+ bulan · Monitoring capability",
  };
}

function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function formatMonth(value: string) { return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(value)); }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function formatStatus(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function formatFactorCode(value: ReportFactorCode) { return `DF${Number(value.slice(2))}`; }
function chunk<T>(items: T[], size: number) { return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size)); }
