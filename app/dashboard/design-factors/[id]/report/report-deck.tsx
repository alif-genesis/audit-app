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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const captureDeckRef = useRef<HTMLElement>(null);
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

  async function downloadPdf() {
    const deck = captureDeckRef.current;
    if (!deck || downloadingPdf) return;
    setDownloadingPdf(true);
    setMessage("Menyiapkan PDF...");
    try {
      const pages = await renderSlidesToJpegs(Array.from(deck.querySelectorAll<HTMLElement>("[data-pdf-slide]")));
      downloadBlob(buildImagePdf(pages), `Report-Design-Factor-${slug(assessment.companyName)}.pdf`);
      setMessage("PDF berhasil diunduh.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF gagal dibuat.");
    } finally {
      setDownloadingPdf(false);
      window.setTimeout(() => setMessage(""), 3500);
    }
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
          <button className={styles.downloadButton} onClick={downloadPdf} disabled={downloadingPdf}>
            <Download size={17} /> {downloadingPdf ? "Preparing..." : "Download PDF"}
          </button>
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

      <section ref={captureDeckRef} className={styles.captureDeck} aria-hidden="true">
        {slides.map((item) => <article className={`${styles.slide} ${styles.captureSlide}`} data-pdf-slide key={item.title}>{item.node}</article>)}
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
  slides.push({ title: "Hasil Akhir Priority GMO", node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow="15 · HASIL AKHIR" title="Hasil Akhir Priority GMO"><div className={styles.stats}><Stat value={String(adopted.length)} label="Objective Diadopsi" /><Stat value={String(summaryRows.filter((row) => row.suggestedCapability === 4).length)} label="Capability Level 4" /><Stat value={String(summaryRows.length)} label="Total Objective" /></div><PriorityTable rows={adopted} /></SlideFrame> });
  slides.push({
    title: "Arahan Rekomendasi",
    node: <SlideFrame company={assessment.companyName} logoUrl={content.companyLogoPath} eyebrow="16 · IMPLIKASI" title="Arahan Rekomendasi Tata Kelola">
      <Narrative field={field("implicationNarrative")} />
      <div className={`${styles.recommendationGrid} ${styles.recommendationGridCompact}`}>{adopted.map((row) => <article key={row.objective}><b>#{row.rank}</b><h2>{row.objective}</h2><p>Priority {row.priorityScore}</p><strong>Capability Level {row.suggestedCapability}</strong></article>)}</div>
    </SlideFrame>,
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

function PriorityTable({ rows }: { rows: ReportSummaryRow[] }) { return <div className={`${styles.table} ${styles.priorityTable}`}><div className={styles.tableHead}><span>Rank</span><span>Objective</span><span>Priority</span><span>Capability</span></div>{rows.map((row) => <div key={row.objective}><span>#{row.rank}</span><strong>{row.objective}</strong><span>{row.priorityScore}</span><span>Level {row.suggestedCapability}</span></div>)}</div>; }
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

type PdfPageImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

async function renderSlidesToJpegs(slides: HTMLElement[]): Promise<PdfPageImage[]> {
  if (!slides.length) throw new Error("Tidak ada slide untuk dibuat PDF.");
  const pages: PdfPageImage[] = [];
  for (const slide of slides) {
    await replaceImagesWithDataUrls(slide);
    const canvas = await renderElementToCanvas(slide);
    pages.push({
      width: canvas.width,
      height: canvas.height,
      data: base64ToBytes(canvas.toDataURL("image/jpeg", 0.94).split(",")[1] ?? ""),
    });
  }
  return pages;
}

async function replaceImagesWithDataUrls(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(images.map(async (image) => {
    const source = image.currentSrc || image.src;
    if (!source || source.startsWith("data:")) return;
    try {
      const response = await fetch(source);
      const blob = await response.blob();
      image.src = await blobToDataUrl(blob);
      await image.decode().catch(() => undefined);
    } catch {
      // Keep the original image source; same-origin assets usually still render.
    }
  }));
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function renderElementToCanvas(element: HTMLElement) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const clone = element.cloneNode(true) as HTMLElement;
  inlineComputedStyles(element, clone);
  const html = new XMLSerializer().serializeToString(clone);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<foreignObject width="100%" height="100%">`,
    `<div xmlns="http://www.w3.org/1999/xhtml">${html}</div>`,
    `</foreignObject>`,
    `</svg>`,
  ].join("");
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak dapat membuat PDF dari slide.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function inlineComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const style = Array.from(computed).map((name) => `${name}:${computed.getPropertyValue(name)};`).join("");
  (target as HTMLElement).setAttribute("style", style);
  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((child, index) => {
    const targetChild = targetChildren[index];
    if (targetChild) inlineComputedStyles(child, targetChild);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Slide gagal dirender menjadi gambar."));
    image.src = source;
  });
}

function buildImagePdf(pages: PdfPageImage[]) {
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const objects: Array<string | Array<string | Uint8Array>> = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 3} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((page, index) => {
    const pageObject = 3 + index * 3;
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    const draw = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im${index} Do\nQ`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${index} ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    objects.push([
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.byteLength} >>\nstream\n`,
      page.data,
      "\nendstream",
    ]);
  });
  return new Blob([makePdf(objects)], { type: "application/pdf" });
}

function makePdf(objects: Array<string | Array<string | Uint8Array>>) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(byteLength(chunks));
    chunks.push(encoder.encode(`${index + 1} 0 obj\n`));
    chunks.push(...normalizePdfObject(object, encoder));
    chunks.push(encoder.encode("\nendobj\n"));
  });
  const xref = byteLength(chunks);
  chunks.push(encoder.encode(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`));
  offsets.slice(1).forEach((offset) => {
    chunks.push(encoder.encode(`${String(offset).padStart(10, "0")} 00000 n \n`));
  });
  chunks.push(encoder.encode(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return concatBytes(chunks);
}

function normalizePdfObject(object: string | Array<string | Uint8Array>, encoder: TextEncoder) {
  const parts = Array.isArray(object) ? object : [object];
  return parts.map((part) => typeof part === "string" ? encoder.encode(part) : part);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function byteLength(chunks: Uint8Array[]) {
  return chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
}

function concatBytes(chunks: Uint8Array[]) {
  const output = new Uint8Array(byteLength(chunks));
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return output;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}
