// A dependency-free, single-page PDF sized like the existing 385x574 label at 203 DPI.
// The Brother driver rasterizes this PDF for the QL-800 or QL-1100.
const mmToPt = (millimeters) => (millimeters / 25.4) * 72;

export const DEFAULT_LABEL_WIDTH_MM = 62;
export const DEFAULT_LABEL_HEIGHT_MM = 100;

const clean = (value) => Array.isArray(value) ? value.join(", ") : String(value ?? "").trim();
const pdfText = (value) => clean(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "?");

function date(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(parsed);
}

const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212",
  "112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131",
  "311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321",
  "112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121",
  "313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114",
  "122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212",
  "124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113",
  "114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112",
];

function code128(value) {
  const safe = clean(value).replace(/[^\x20-\x7e]/g, "?") || "-";
  const codes = [...safe].map((char) => char.charCodeAt(0) - 32);
  const checksum = (104 + codes.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103;
  return [104, ...codes, checksum, 106].map((code) => CODE128_PATTERNS[code]);
}

export function buildLabelPdf(record, options = {}) {
  const pageWidth = mmToPt(options.widthMm ?? DEFAULT_LABEL_WIDTH_MM);
  const pageHeight = mmToPt(options.heightMm ?? DEFAULT_LABEL_HEIGHT_MM);
  if (!Number.isFinite(pageWidth) || pageWidth <= 0 || !Number.isFinite(pageHeight) || pageHeight <= 0) {
    throw new Error("Label dimensions must be positive numbers");
  }
  const f = record.fields || {};
  const customer = [clean(f["First Name"]), clean(f["Last Name"])].filter(Boolean).join(" ") || clean(f["Name"]) || "-";
  const barcode = clean(f["BARCODE"]) || clean(f["Job orders"]) || record.id;
  const notes = clean(f["Notes"]) || clean(f["LAB NOTES"]) || "-";
  const ptX = (mm) => mmToPt(mm);
  const ptY = (mm) => pageHeight - mmToPt(mm);
  const commands = ["0 G", "0 g", "0.55 w"];
  const rounded = (x, y, width, height, radius = 1.4) => {
    const left = ptX(x), right = ptX(x + width), top = ptY(y), bottom = ptY(y + height), r = ptX(radius), c = r * 0.5522848;
    return `${(left+r).toFixed(2)} ${bottom.toFixed(2)} m ${(right-r).toFixed(2)} ${bottom.toFixed(2)} l ${(right-r+c).toFixed(2)} ${bottom.toFixed(2)} ${right.toFixed(2)} ${(bottom+r-c).toFixed(2)} ${right.toFixed(2)} ${(bottom+r).toFixed(2)} c ${right.toFixed(2)} ${(top-r).toFixed(2)} l ${right.toFixed(2)} ${(top-r+c).toFixed(2)} ${(right-r+c).toFixed(2)} ${top.toFixed(2)} ${(right-r).toFixed(2)} ${top.toFixed(2)} c ${(left+r).toFixed(2)} ${top.toFixed(2)} l ${(left+r-c).toFixed(2)} ${top.toFixed(2)} ${left.toFixed(2)} ${(top-r+c).toFixed(2)} ${left.toFixed(2)} ${(top-r).toFixed(2)} c ${left.toFixed(2)} ${(bottom+r).toFixed(2)} l ${left.toFixed(2)} ${(bottom+r-c).toFixed(2)} ${(left+r-c).toFixed(2)} ${bottom.toFixed(2)} ${(left+r).toFixed(2)} ${bottom.toFixed(2)} c h`;
  };
  const centered = (x, y, width, height, content, size = 8, limit = 24) => {
    const text = pdfText(content).slice(0, limit), textWidth = text.length * size * 0.51;
    const left = ptX(x) + Math.max(2, (ptX(width) - textWidth) / 2);
    const baseline = ptY(y) - (ptX(height) + size) / 2 + 2;
    commands.push(`BT /F2 ${size} Tf ${left.toFixed(2)} ${baseline.toFixed(2)} Td (${text}) Tj ET`);
  };
  const pill = (x, y, width, height, content, size = 8, limit = 24) => {
    commands.push(`${rounded(x,y,width,height)} S`); centered(x,y,width,height,content,size,limit);
  };
  const labelValue = (x, y, width, height, heading, content, size = 8, limit = 20) => {
    commands.push(`${rounded(x,y,width,height)} S`);
    commands.push(`BT /F2 3.7 Tf ${ptX(x+1.5).toFixed(2)} ${ptY(y+2.7).toFixed(2)} Td (${pdfText(heading)}) Tj ET`);
    centered(x,y+1.5,width,height-1.5,content,size,limit);
  };
  const compact = (x, y, width, height, heading, content) => {
    commands.push(`${rounded(x,y,width,height)} S`);
    const baseline = ptY(y) - (ptX(height) + 5.2) / 2 + 2;
    commands.push(`BT /F2 3.8 Tf ${ptX(x+1.5).toFixed(2)} ${baseline.toFixed(2)} Td (${pdfText(heading)}) Tj ET`);
    commands.push(`BT /F2 5.5 Tf ${ptX(x+5.5).toFixed(2)} ${baseline.toFixed(2)} Td (${pdfText(content).slice(0,8)}) Tj ET`);
  };

  // Three compact header pills from the supplied production label.
  pill(3, 4, 25, 7, clean(f["Job orders"]) || record.id, 9, 14);
  pill(30, 4, 9, 7, clean(f["TOTAL FILM ROLLS"]) || "0", 9, 4);
  pill(41, 4, 18, 7, date(record.createdTime), 6.5, 10);

  // Narrow instruction column.
  commands.push(`${ptX(3).toFixed(2)} ${ptY(15).toFixed(2)} m ${ptX(28).toFixed(2)} ${ptY(15).toFixed(2)} l S`);
  centered(3, 11.5, 25, 3.5, customer, 4.3, 28);
  labelValue(3, 17, 25, 7, "DEVELOPMENT", clean(f["Film Development"]) || "-", 6.5, 21);
  pill(3, 26, 25, 7, clean(f["Your negatives"]) || "-", 8, 18);
  pill(3, 35, 25, 7, clean(f["CUT NEGATIVES?"]) || "-", 8, 12);
  compact(3, 44, 11.5, 5.5, "HF", clean(f["HALF FRAME"]) || "-");
  compact(16.5, 44, 11.5, 5.5, "FF", clean(f["BORDERS"]) || "-");
  compact(3, 51.5, 11.5, 5.5, "FMT", clean(f["FORMAT"]) || "-");
  compact(16.5, 51.5, 11.5, 5.5, "TIFF", clean(f["TIFF"]) || "-");

  const notesX = ptX(3), notesTop = ptY(59), notesW = ptX(25), notesH = ptX(24);
  commands.push(`${rounded(3,59,25,24)} S`);
  commands.push(`BT /F2 3.7 Tf ${(notesX+3).toFixed(2)} ${(notesTop-7).toFixed(2)} Td (LAB USE:) Tj ET`);
  const noteLines = [];
  for (const word of notes.split(/\s+/)) {
    const current = noteLines.at(-1) || "";
    if (!current || `${current} ${word}`.length > 21) noteLines.push(word);
    else noteLines[noteLines.length - 1] = `${current} ${word}`;
  }
  for (let line = 0; line < 3; line += 1) {
    const chunk = pdfText(noteLines[line] || "");
    if (chunk) commands.push(`BT /F1 5 Tf ${(notesX + 3).toFixed(2)} ${(notesTop - 15 - line * 7).toFixed(2)} Td (${chunk}) Tj ET`);
  }

  // Large rolls panel with chemistry counters.
  commands.push(`${rounded(30,13,29,72,1.8)} S`);
  commands.push(`BT /F2 4 Tf ${ptX(31.5).toFixed(2)} ${ptY(16).toFixed(2)} Td (ROLLS) Tj ET`);
  commands.push(`BT /F1 3 Tf ${ptX(40).toFixed(2)} ${ptY(16).toFixed(2)} Td (C41) Tj ET`);
  commands.push(`BT /F1 3 Tf ${ptX(47).toFixed(2)} ${ptY(16).toFixed(2)} Td (BW) Tj ET`);
  commands.push(`BT /F1 3 Tf ${ptX(54).toFixed(2)} ${ptY(16).toFixed(2)} Td (E6) Tj ET`);
  pill(39.5, 17, 5.5, 4, clean(f["C41 TOTAL"]) || "0", 5.5, 3);
  pill(46.5, 17, 5.5, 4, clean(f["BW TOTAL"]) || "0", 5.5, 3);
  pill(53.5, 17, 5.5, 4, clean(f["E6 TOTAL"]) || "0", 5.5, 3);

  // Location and Camera-Lisatie footer.
  commands.push(`BT /F2 4 Tf ${ptX(5).toFixed(2)} ${ptY(88).toFixed(2)} Td (${pdfText(clean(f["Dropbox Location"]) || "-").slice(0,25)}) Tj ET`);
  commands.push(`${ptX(3).toFixed(2)} ${ptY(90).toFixed(2)} m ${ptX(28).toFixed(2)} ${ptY(90).toFixed(2)} l S`);
  commands.push(`BT /F2 9 Tf ${ptX(5).toFixed(2)} ${ptY(95).toFixed(2)} Td (CAMERA) Tj ET`);
  commands.push(`BT /F2 9 Tf ${ptX(7).toFixed(2)} ${ptY(98.5).toFixed(2)} Td (-LISATIE) Tj ET`);

  // Code 128 barcode with a quiet zone and human-readable value.
  const patterns = code128(barcode);
  const modules = patterns.reduce((sum, pattern) => sum + [...pattern].reduce((a, n) => a + Number(n), 0), 0);
  const barcodeX = ptX(32), barcodeTop = ptY(89), barcodeWidth = ptX(25), barHeight = ptX(6.5);
  const moduleWidth = barcodeWidth / modules;
  let cursor = barcodeX;
  for (const pattern of patterns) {
    [...pattern].forEach((digit, index) => {
      const width = Number(digit) * moduleWidth;
      if (index % 2 === 0) commands.push(`${cursor.toFixed(2)} ${(barcodeTop - barHeight).toFixed(2)} ${Math.max(0.3, width).toFixed(2)} ${barHeight.toFixed(2)} re f`);
      cursor += width;
    });
  }
  commands.push(`BT /F1 3.5 Tf ${ptX(32).toFixed(2)} ${ptY(98).toFixed(2)} Td (${pdfText(barcode).slice(0, 22)}) Tj ET`);

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}
