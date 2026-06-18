import { inflateRawSync } from "node:zlib";

type ZipEntry = {
  name: string;
  data: Buffer;
  compression: number;
};

const XLSX_FILES = {
  contentTypes: "[Content_Types].xml",
  rels: "_rels/.rels",
  workbook: "xl/workbook.xml",
  workbookRels: "xl/_rels/workbook.xml.rels",
  styles: "xl/styles.xml",
  sheet: "xl/worksheets/sheet1.xml",
};

export function createXlsx(rows: string[][]) {
  const files = [
    {
      name: XLSX_FILES.contentTypes,
      data: Buffer.from(contentTypesXml(), "utf8"),
    },
    {
      name: XLSX_FILES.rels,
      data: Buffer.from(rootRelsXml(), "utf8"),
    },
    {
      name: XLSX_FILES.workbook,
      data: Buffer.from(workbookXml(), "utf8"),
    },
    {
      name: XLSX_FILES.workbookRels,
      data: Buffer.from(workbookRelsXml(), "utf8"),
    },
    {
      name: XLSX_FILES.styles,
      data: Buffer.from(stylesXml(), "utf8"),
    },
    {
      name: XLSX_FILES.sheet,
      data: Buffer.from(worksheetXml(rows), "utf8"),
    },
  ];

  return createZip(files);
}

export function parseXlsxRows(buffer: Buffer) {
  const entries = readZip(buffer);
  const sheet = entries.find((entry) => entry.name === XLSX_FILES.sheet);

  if (!sheet) {
    return [];
  }

  const sharedStrings = parseSharedStrings(entries);
  const xml = readEntryData(buffer, sheet).toString("utf8");
  const rowMatches = Array.from(xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)).sort(
    (a, b) => rowNumber(a[1]) - rowNumber(b[1]),
  );

  return rowMatches.map((rowMatch) => {
    const cells: string[] = [];
    const cellMatches = Array.from(rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)).sort(
      (a, b) => cellColumnIndex(a[1]) - cellColumnIndex(b[1]),
    );

    for (const cellMatch of cellMatches) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const reference = attributes.match(/\br="([A-Z]+)\d+"/)?.[1];
      const type = attributes.match(/\bt="([^"]+)"/)?.[1];
      const index = reference ? columnIndex(reference) : cells.length;

      if (type === "inlineStr") {
        cells[index] = decodeXml(collectText(body));
        continue;
      }

      const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
      cells[index] = type === "s" ? sharedStrings[Number(rawValue)] ?? "" : decodeXml(rawValue);
    }

    return cells.map((cell) => cell ?? "");
  });
}

function createZip(files: { name: string; data: Buffer }[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(file.data.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, file.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(file.data.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + file.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localDirectory.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, end]);
}

function readZip(buffer: Buffer): ZipEntry[] {
  const eocdOffset = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));

  if (eocdOffset === -1) {
    return [];
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      break;
    }

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;

    entries.push({
      name,
      compression,
      data: buffer.subarray(dataStart, dataStart + compressedSize),
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readEntryData(_buffer: Buffer, entry: ZipEntry) {
  if (entry.compression === 0) {
    return entry.data;
  }

  if (entry.compression === 8) {
    return inflateRawSync(entry.data);
  }

  throw new Error("Format kompresi XLSX belum didukung.");
}

function parseSharedStrings(entries: ZipEntry[]) {
  const sharedStrings = entries.find((entry) => entry.name === "xl/sharedStrings.xml");

  if (!sharedStrings) {
    return [];
  }

  const xml = readEntryData(Buffer.alloc(0), sharedStrings).toString("utf8");
  return Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map((match) =>
    decodeXml(collectText(match[1])),
  );
}

function collectText(xml: string) {
  return Array.from(xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))
    .map((match) => match[1])
    .join("");
}

function rowNumber(attributes: string) {
  return Number(attributes.match(/\br="(\d+)"/)?.[1] ?? 0);
}

function cellColumnIndex(attributes: string) {
  const reference = attributes.match(/\br="([A-Z]+)\d+"/)?.[1];
  return reference ? columnIndex(reference) : 0;
}

function worksheetXml(rows: string[][]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="14" customWidth="1"/>
    <col min="2" max="2" width="42" customWidth="1"/>
    <col min="3" max="3" width="70" customWidth="1"/>
    <col min="4" max="4" width="80" customWidth="1"/>
  </cols>
  <sheetData>
${rows
  .map(
    (row, rowIndex) =>
      `    <row r="${rowIndex + 1}">${row
        .map(
          (cell, cellIndex) =>
            `<c r="${columnName(cellIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`,
        )
        .join("")}</row>`,
  )
  .join("\n")}
  </sheetData>
</worksheet>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function workbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Template Pertanyaan Audit" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function workbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }

  return name;
}

function columnIndex(column: string) {
  return column.split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;

  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  return crc >>> 0;
});

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function decodeXml(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}
