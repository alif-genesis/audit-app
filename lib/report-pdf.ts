type ReportBar = {
  label: string;
  value: number;
  count?: string;
};

type PdfImage = {
  width: number;
  height: number;
  hex: string;
};

type ReportStat = {
  label: string;
  value: string;
  caption?: string;
  color?: string;
};

export type ReportTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

export type SimpleReportInput = {
  title: string;
  subtitle: string;
  downloadedAt: string;
  summaryTitle: string;
  summaryText: string;
  totalLabel: string;
  totalValue: string;
  stats: Array<{ label: string; value: string }>;
  summaryItems?: Array<{ label: string; value: string }>;
  sectionTitle: string;
  bars: ReportBar[];
  note: string;
  tables?: ReportTable[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const BLUE = "0.08 0.33 0.72";
const GREEN = "0.42 0.75 0.25";
const LOGO_BLUE = "0.17 0.53 0.82";
const INK = "0.04 0.14 0.29";
const MUTED = "0.34 0.41 0.52";
const LINE = "0.84 0.89 0.96";

export async function downloadSimpleReportPdf(input: SimpleReportInput, fileName: string) {
  const logo = await loadReportLogo();
  const pdf = buildSimpleReportPdf(input, logo);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildSimpleReportPdf(input: SimpleReportInput, logo?: PdfImage) {
  const pages: string[] = [];
  pages.push(buildSummaryPage(input, 1, 1, Boolean(logo)));
  if (!input.title.toUpperCase().includes("COBIT")) {
    pages.push(buildAuditFollowUpPage(input, pages.length + 1, 1, Boolean(logo)));
  }

  input.tables?.forEach((table) => {
    const chunkSize = Math.max(12, table.columns.length > 6 ? 16 : 22);
    for (let index = 0; index < table.rows.length; index += chunkSize) {
      pages.push(buildTablePage(input, table, table.rows.slice(index, index + chunkSize), pages.length + 1, 1, Boolean(logo)));
    }
  });

  const totalPages = pages.length;
  const numberedPages = pages.map((page, index) => page.replace("__PAGE__", `${index + 1}/${totalPages}`));
  return makePdf(numberedPages, logo);
}

function buildSummaryPage(input: SimpleReportInput, pageNumber: number, totalPages: number, hasLogo: boolean) {
  const commands: string[] = [pageBase()];
  const isCobit = input.title.toUpperCase().includes("COBIT");
  const detailTable = input.tables?.find((table) => table.rows.length > 0 && table.columns.length >= 3);

  commands.push(brandHeader(input, hasLogo));
  commands.push(text("RINGKASAN EKSEKUTIF", 60, 605, 12, BLUE));
  commands.push(...wrappedText(input.summaryText, 60, 584, 285, 7, 11, INK, 5));
  commands.push(card(365, 548, 170, 84));
  commands.push(text(input.totalLabel.toUpperCase(), 386, 608, 8, INK));
  commands.push(text(input.totalValue, 386, 576, 26, isCobit ? BLUE : GREEN));
  commands.push(text(isCobit ? "Level 3 (Established)" : "Rata-rata kepatuhan", 386, 558, 8, INK));

  const stats = normalizeStats(input, isCobit);
  stats.slice(0, 5).forEach((stat, index) => {
    const x = 60 + index * 95;
    commands.push(card(x, 485, 95, 50));
    commands.push(text(stat.label.toUpperCase(), x + 9, 515, 5.5, BLUE));
    commands.push(text(stat.value, x + 38, 496, 15, stat.color ?? INK));
    if (stat.caption) commands.push(text(stat.caption, x + 28, 488, 5.5, MUTED));
  });

  if (isCobit) {
    commands.push(...simpleTable({
      title: "RINGKASAN CAPABILITY LEVEL",
      columns: ["DOMAIN", "RATA-RATA LEVEL", "TARGET", "STATUS"],
      rows: makeCobitCapabilityRows(input),
      x: 60,
      y: 450,
      width: 475,
      rowHeight: 22,
      maxRows: 5,
    }));
    commands.push(...horizontalDistribution("DISTRIBUSI CAPABILITY LEVEL", input.bars, 60, 265, 210, 5));
    commands.push(...miniBarChart("TARGET VS ACHIEVED", input.bars, 325, 265, 190, 5));
    commands.push(...simpleTable({
      title: "TOP 5 PROSES DENGAN GAP TERBESAR",
      columns: ["PROSES", "ACHIEVED", "TARGET", "PRIORITAS"],
      rows: makePriorityRows(input),
      x: 60,
      y: 190,
      width: 475,
      rowHeight: 18,
      maxRows: 5,
    }));
    commands.push(...priorityRecommendations(input.bars, 60, 72, 475));
  } else {
    commands.push(...auditResultVisual(input, 60, 435, 475));
    commands.push(...simpleTable({
      title: "RINGKASAN TEMUAN",
      columns: ["KATEGORI", "JML", "KRITIKALITAS", "STATUS"],
      rows: makeAuditFindingRows(detailTable),
      x: 60,
      y: 310,
      width: 475,
      rowHeight: 18,
      maxRows: 6,
    }));
  }

  if (isCobit) {
    commands.push(text("REKOMENDASI AUDITOR", 60, 52, 8, BLUE));
    commands.push(...wrappedText(input.note, 60, 40, 420, 6, 8, INK, 2));
  }
  commands.push(footer(pageNumber, totalPages));
  return commands.join("\n");
}

function buildAuditFollowUpPage(input: SimpleReportInput, pageNumber: number, totalPages: number, hasLogo: boolean) {
  const commands: string[] = [pageBase()];
  const firstTable = input.tables?.[0];
  commands.push(compactHeader(input, hasLogo));
  commands.push(...horizontalDistribution("CAPA TRACKING", input.bars, 60, 650, 210, 3));
  commands.push(...miniBarChart("TEMUAN BERDASARKAN TINGKAT", input.bars, 320, 650, 190, 3));
  commands.push(...simpleTable({
    title: "CA/PA TERDEKAT JATUH TEMPO",
    columns: ["ID CAPA", "TEMUAN", "PIC", "STATUS"],
    rows: makeCapaRows(firstTable),
    x: 60,
    y: 435,
    width: 475,
    rowHeight: 18,
    maxRows: 5,
  }));
  commands.push(text("REKOMENDASI AUDITOR", 60, 225, 10, BLUE));
  commands.push(...wrappedText(input.note, 60, 202, 475, 7, 11, INK, 5));
  commands.push(footer(pageNumber, totalPages));
  return commands.join("\n");
}

function normalizeStats(input: SimpleReportInput, isCobit: boolean): ReportStat[] {
  if (isCobit) {
    return [
      { label: "Total Domain", value: input.stats[1]?.value ?? "5" },
      { label: "Total Proses", value: input.stats[0]?.value ?? "0" },
      { label: "Proses Dinilai", value: input.stats[0]?.value ?? "0" },
      { label: "Target Level", value: "3", caption: "Established" },
      { label: "Prioritas", value: input.totalValue },
    ];
  }

  return [
    { label: "Jumlah Temuan", value: input.stats[1]?.value ?? "0" },
    { label: "Major", value: getStatValue(input, "Major"), color: "0.86 0.12 0.12" },
    { label: "Minor", value: getStatValue(input, "Minor"), color: "0.95 0.55 0.05" },
    { label: "OFI", value: getStatValue(input, "OFI"), color: "0.15 0.42 0.84" },
    { label: "Klausul Compliance", value: input.totalValue },
  ];
}

function getStatValue(input: SimpleReportInput, key: string) {
  const match = [...input.stats, ...(input.summaryItems ?? [])].find((item) =>
    item.label.toLowerCase().includes(key.toLowerCase()),
  );
  return match?.value ?? "0";
}

function simpleTable({
  title,
  columns,
  rows,
  x,
  y,
  width,
  rowHeight,
  maxRows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  x: number;
  y: number;
  width: number;
  rowHeight: number;
  maxRows: number;
}) {
  const commands: string[] = [text(title, x, y, 9, BLUE)];
  const headerY = y - 18;
  const colWidth = width / columns.length;
  commands.push(`${BLUE} rg ${x} ${headerY} ${width} 16 re f`);
  columns.forEach((column, index) => {
    commands.push(text(column, x + 6 + index * colWidth, headerY + 5, 5.5, "1 1 1"));
  });
  rows.slice(0, maxRows).forEach((row, rowIndex) => {
    const rowY = headerY - (rowIndex + 1) * rowHeight;
    commands.push(rowIndex % 2 === 0 ? `0.98 0.99 1 rg ${x} ${rowY} ${width} ${rowHeight} re f` : `1 1 1 rg ${x} ${rowY} ${width} ${rowHeight} re f`);
    commands.push(`${LINE} RG ${x} ${rowY} m ${x + width} ${rowY} l S`);
    columns.forEach((_, index) => {
      commands.push(...wrappedText(row[index] ?? "-", x + 6 + index * colWidth, rowY + rowHeight - 7, colWidth - 10, 5.5, 7, INK, 2));
    });
  });
  return commands;
}

function horizontalDistribution(title: string, bars: ReportBar[], x: number, y: number, width: number, maxRows: number) {
  const commands: string[] = [text(title, x, y, 9, BLUE)];
  const colors = [GREEN, "0.95 0.70 0.12", "0.15 0.42 0.84", "0.86 0.12 0.12", "0.36 0.45 0.57"];
  const rows = bars.length ? bars : [{ label: "Belum ada data", value: 0 }];
  rows.slice(0, maxRows).forEach((bar, index) => {
    const rowY = y - 24 - index * 21;
    const barWidth = Math.max(4, Math.min(width - 72, (bar.value / 100) * (width - 72)));
    commands.push(text(bar.label, x, rowY + 4, 6.5, INK));
    commands.push(`0.90 0.93 0.97 rg ${x + 78} ${rowY + 3} ${width - 100} 7 re f`);
    commands.push(`${colors[index % colors.length]} rg ${x + 78} ${rowY + 3} ${barWidth.toFixed(2)} 7 re f`);
    commands.push(text(`${bar.value}%`, x + width - 18, rowY + 1, 6.5, BLUE));
  });
  return commands;
}

function miniBarChart(title: string, bars: ReportBar[], x: number, y: number, width: number, maxRows: number) {
  const commands: string[] = [text(title, x, y, 9, BLUE)];
  const rows = bars.length ? bars.slice(0, maxRows) : [{ label: "N/A", value: 0 }];
  const chartY = y - 115;
  commands.push(`${LINE} RG ${x} ${chartY} m ${x + width} ${chartY} l S`);
  rows.forEach((bar, index) => {
    const barX = x + 12 + index * Math.max(28, width / Math.max(rows.length, 1));
    const h = Math.max(4, Math.min(82, bar.value * 0.82));
    commands.push(`${BLUE} rg ${barX} ${chartY} 10 ${h.toFixed(2)} re f`);
    commands.push(`${GREEN} rg ${barX + 13} ${chartY} 10 ${Math.max(4, h * 0.78).toFixed(2)} re f`);
    commands.push(text(bar.label.slice(0, 5), barX - 2, chartY - 12, 5.5, INK));
  });
  return commands;
}

function auditResultVisual(input: SimpleReportInput, x: number, y: number, width: number) {
  const commands: string[] = [text("RINCIAN HASIL AUDIT", x, y, 10, BLUE)];
  const value = Number(input.totalValue.replace(/[^0-9.]/g, "")) || 0;
  const goodWidth = Math.min(180, Math.max(4, (value / 100) * 180));
  commands.push(card(x, y - 100, width, 78));
  commands.push(text(`${input.totalValue}`, x + 46, y - 56, 22, GREEN));
  commands.push(text("Tingkat Pemenuhan", x + 43, y - 70, 7, INK));
  commands.push(`0.88 0.91 0.95 rg ${x + 220} ${y - 56} 180 10 re f`);
  commands.push(`${GREEN} rg ${x + 220} ${y - 56} ${goodWidth.toFixed(2)} 10 re f`);
  commands.push(text("Sesuai", x + 220, y - 38, 7, INK));
  commands.push(text(`${value.toFixed(1)}%`, x + 410, y - 58, 8, BLUE));
  return commands;
}

function makeAuditFindingRows(table?: ReportTable) {
  if (!table?.rows.length) {
    return [["-", "0", "-", "-"]];
  }
  return table.rows.slice(0, 6).map((row) => [row[0] ?? "-", row[1] ?? "1", row[2] ?? "-", row[4] ?? "Open"]);
}

function makeCapaRows(table?: ReportTable) {
  if (!table?.rows.length) {
    return [["CAPA-001", "-", "-", "Belum Mulai"]];
  }
  return table.rows.slice(0, 3).map((row, index) => [`CAPA-${String(index + 1).padStart(3, "0")}`, row[0] ?? "-", row[2] ?? "-", "Proses"]);
}

function makeCobitCapabilityRows(input: SimpleReportInput) {
  const domainNames = ["APO", "BAI", "DSS", "MEA", "EDM"];
  const values = input.bars.length ? input.bars : domainNames.map((label) => ({ label, value: 60 }));
  return domainNames.map((domain, index) => {
    const value = values[index % values.length]?.value ?? 60;
    const level = Math.max(1, Math.min(5, value / 25));
    return [domain, level.toFixed(2), "3", level >= 3 ? "Sesuai Target" : "Perlu Peningkatan"];
  });
}

function makePriorityRows(input: SimpleReportInput) {
  const rows = input.bars.length ? input.bars : [{ label: "APO12", value: 80 }];
  return rows.slice(0, 5).map((row) => [
    row.label,
    (row.value / 25).toFixed(2),
    "3",
    row.value >= 75 ? "High" : row.value >= 50 ? "Medium" : "Low",
  ]);
}

function priorityRecommendations(bars: ReportBar[], x: number, y: number, width: number) {
  const commands: string[] = [text("REKOMENDASI PRIORITAS", x, y + 62, 9, BLUE)];
  const rows = bars.length ? bars.slice(0, 5) : [{ label: "Perkuat proses prioritas", value: 80 }];
  rows.forEach((row, index) => {
    const itemY = y + 42 - index * 14;
    commands.push(card(x, itemY - 2, 14, 12));
    commands.push(text(String(index + 1), x + 5, itemY + 1, 6, BLUE));
    commands.push(...wrappedText(row.label, x + 22, itemY + 4, width - 34, 6, 7, INK, 1));
  });
  return commands;
}

function buildTablePage(input: SimpleReportInput, table: ReportTable, rows: string[][], pageNumber: number, totalPages: number, hasLogo: boolean) {
  const commands: string[] = [pageBase()];
  commands.push(compactHeader(input, hasLogo));
  commands.push(text(table.title, 60, 704, 14, BLUE));
  commands.push(`${BLUE} rg 60 678 475 22 re f`);
  const colCount = Math.max(table.columns.length, 1);
  const colWidth = 475 / colCount;
  table.columns.forEach((column, index) => {
    commands.push(text(column, 66 + index * colWidth, 686, 7, "1 1 1"));
  });
  rows.forEach((row, rowIndex) => {
    const y = 656 - rowIndex * 25;
    commands.push(rowIndex % 2 === 0 ? "0.98 0.99 1 rg 60 " + (y - 6) + " 475 22 re f" : "1 1 1 rg 60 " + (y - 6) + " 475 22 re f");
    commands.push(`${LINE} RG 60 ${y - 7} m 535 ${y - 7} l S`);
    row.slice(0, colCount).forEach((cell, index) => {
      commands.push(...wrappedText(cell, 66 + index * colWidth, y + 4, colWidth - 8, 6, 8, INK, 2));
    });
  });
  commands.push(footer(pageNumber, totalPages));
  return commands.join("\n");
}

function pageBase() {
  return [
    "q",
    "0.96 0.98 1 rg 0 0 595 842 re f",
    `${BLUE} rg 0 0 595 46 re f`,
    `${GREEN} rg 0 46 595 5 re f`,
    `${GREEN} rg 428 0 m 595 0 l 595 46 l 468 46 l h f`,
    `${BLUE} rg 390 842 m 520 842 l 545 800 l 492 768 l h f`,
    `${GREEN} rg 528 842 m 595 842 l 595 748 l h f`,
  ].join("\n");
}

function brandHeader(input: SimpleReportInput, hasLogo: boolean) {
  const reportId = input.title.toUpperCase().includes("COBIT")
    ? "COBIT-2019-ASSM"
    : "AUDIT-INT";
  return [
    hasLogo ? imageLogo(54, 707, 132, 72) : logoMark(58, 712, 0.75),
    text(input.title, 205, 758, 24, INK),
    ...wrappedText(input.subtitle, 205, 732, 260, 10, 13, INK, 2),
    `${LINE} RG 60 670 m 535 670 l S`,
    text(`ID LAPORAN : ${reportId}`, 60, 646, 7, INK),
    text(`TANGGAL : ${input.downloadedAt}`, 250, 646, 7, INK),
    text("VERSI : 1.0", 455, 646, 7, INK),
  ].join("\n");
}

function compactHeader(input: SimpleReportInput, hasLogo: boolean) {
  return [
    hasLogo ? imageLogo(60, 742, 110, 60) : logoMark(60, 744, 0.55),
    text(input.title, 330, 768, 18, INK),
    text(input.subtitle, 330, 746, 11, INK),
    `${GREEN} rg 330 730 50 4 re f`,
  ].join("\n");
}

function card(x: number, y: number, width: number, height: number) {
  return `1 1 1 rg ${LINE} RG ${x} ${y} ${width} ${height} re B`;
}

function footer(_pageNumber: number, _totalPages: number) {
  return [text("__PAGE__", 535, 22, 9, "1 1 1"), "Q"].join("\n");
}

function imageLogo(x: number, y: number, width: number, height: number) {
  return `q ${width} 0 0 ${height} ${x} ${y} cm /Im1 Do Q`;
}

function logoMark(x: number, y: number, scale: number) {
  const s = (value: number) => (value * scale).toFixed(2);
  return [
    `${GREEN} rg ${x} ${y + 34 * scale} ${s(10)} ${s(40)} re f`,
    `${BLUE} rg ${x} ${y} ${s(10)} ${s(26)} re f`,
    text("Genetika", x + 18 * scale, y + 66 * scale, 20 * scale, LOGO_BLUE),
    text("Solusi", x + 18 * scale, y + 44 * scale, 20 * scale, LOGO_BLUE),
    text("Bisnis", x + 18 * scale, y + 22 * scale, 20 * scale, LOGO_BLUE),
    text("PT Genetika Solusi Bisnis", x + 18 * scale, y + 6 * scale, 6 * scale, MUTED),
  ].join("\n");
}

function makePdf(pages: string[], logo?: PdfImage) {
  const imageObjectId = logo ? 3 + pages.length * 2 : null;
  const fontObjectId = 3 + pages.length * 2 + (logo ? 1 : 0);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  ];

  pages.forEach((content, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    const xObject = imageObjectId ? `/XObject << /Im1 ${imageObjectId} 0 R >>` : "";
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> ${xObject} >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  if (logo) {
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logo.hex.length + 1} >>\nstream\n${logo.hex}>\nendstream`);
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

async function loadReportLogo(): Promise<PdfImage | undefined> {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = "/genetika-1-warna.png";
    });
    const width = 220;
    const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    let hex = "";
    const pageRed = 245;
    const pageGreen = 250;
    const pageBlue = 255;
    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;
      const red = Math.round(data[index] * alpha + pageRed * (1 - alpha));
      const green = Math.round(data[index + 1] * alpha + pageGreen * (1 - alpha));
      const blue = Math.round(data[index + 2] * alpha + pageBlue * (1 - alpha));
      hex += toHex(red) + toHex(green) + toHex(blue);
    }
    return { width, height, hex };
  } catch {
    return undefined;
  }
}

function toHex(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0").toUpperCase();
}

function text(value: string, x: number, y: number, size: number, color: string) {
  return `${color} rg BT /F1 ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`;
}

function wrappedText(value: string, x: number, y: number, maxWidth: number, size: number, lineHeight: number, color: string, maxLines = 5) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  const maxChars = Math.max(12, Math.floor(maxWidth / (size * 0.55)));
  words.forEach((word) => {
    const safeWord = word.length > maxChars ? `${word.slice(0, Math.max(1, maxChars - 1))}.` : word;
    const next = line ? `${line} ${safeWord}` : safeWord;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = safeWord;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, maxLines).map((item, index) => text(item, x, y - index * lineHeight, size, color));
}

function escapePdf(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
