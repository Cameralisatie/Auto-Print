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
  const notes = pdfText(clean(f["Notes"]) || clean(f["LAB NOTES"]) || "-");
  const ptX = (mm) => mmToPt(mm);
  const ptY = (mm) => pageHeight - mmToPt(mm);
  const commands = ["0 G", "0 g", "0.55 w"];
  const box = (x, y, width, height, heading, content, fontSize = 9, limit = 24) => {
    const px = ptX(x), top = ptY(y), pw = ptX(width), ph = ptX(height);
    commands.push(`${px.toFixed(2)} ${(top - ph).toFixed(2)} ${pw.toFixed(2)} ${ph.toFixed(2)} re S`);
    commands.push(`BT /F1 4 Tf ${(px + 3).toFixed(2)} ${(top - 7).toFixed(2)} Td (${pdfText(heading)}) Tj ET`);
    commands.push(`BT /F2 ${fontSize} Tf ${(px + 3).toFixed(2)} ${(top - 9 - fontSize).toFixed(2)} Td (${pdfText(content).slice(0, limit)}) Tj ET`);
  };

  // Frontrunner-style black header with compact uppercase metadata.
  commands.push(`${ptX(3).toFixed(2)} ${(ptY(13)).toFixed(2)} ${ptX(56).toFixed(2)} ${ptX(10).toFixed(2)} re f`);
  commands.push(`1 g BT /F2 11 Tf ${ptX(5).toFixed(2)} ${ptY(9.5).toFixed(2)} Td (FRONTRUNNER) Tj ET`);
  commands.push(`BT /F1 5 Tf ${ptX(45).toFixed(2)} ${ptY(9).toFixed(2)} Td (${pdfText(date(record.createdTime))}) Tj ET 0 g`);

  box(3, 15, 42, 13, "NAME", customer, 11, 24);
  box(46, 15, 13, 13, "ROLLS", clean(f["TOTAL FILM ROLLS"]) || "0", 13, 5);
  box(3, 29, 56, 11, "DROPBOX LOCATION", clean(f["Dropbox Location"]) || "-", 10, 30);
  box(3, 41, 27.5, 12, "DEVELOPMENT", clean(f["Film Development"]) || "-", 9, 17);
  box(31.5, 41, 27.5, 12, "NEGATIVES", clean(f["Your negatives"]) || "-", 9, 17);
  box(3, 54, 13, 11, "CUT?", clean(f["CUT NEGATIVES?"]) || "-", 9, 8);
  box(17, 54, 13, 11, "C41", clean(f["C41 TOTAL"]) || "0", 11, 5);
  box(31, 54, 13, 11, "BW", clean(f["BW TOTAL"]) || "0", 11, 5);
  box(45, 54, 14, 11, "E6", clean(f["E6 TOTAL"]) || "0", 11, 5);

  // Notes card, styled like Frontrunner's emphasized detail panels.
  const notesX = ptX(3), notesTop = ptY(66), notesW = ptX(56), notesH = ptX(15);
  commands.push(`${notesX.toFixed(2)} ${(notesTop - notesH).toFixed(2)} ${notesW.toFixed(2)} ${notesH.toFixed(2)} re S`);
  commands.push(`BT /F2 4 Tf ${(notesX + 3).toFixed(2)} ${(notesTop - 7).toFixed(2)} Td (NOTES) Tj ET`);
  const noteWidth = 42;
  for (let line = 0; line < 3; line += 1) {
    const chunk = notes.slice(line * noteWidth, (line + 1) * noteWidth);
    if (chunk) commands.push(`BT /F1 6 Tf ${(notesX + 3).toFixed(2)} ${(notesTop - 16 - line * 8).toFixed(2)} Td (${chunk}) Tj ET`);
  }

  // Code 128 barcode with a quiet zone and human-readable value.
  const patterns = code128(barcode);
  const modules = patterns.reduce((sum, pattern) => sum + [...pattern].reduce((a, n) => a + Number(n), 0), 0);
  const barcodeX = ptX(5), barcodeTop = ptY(84), barcodeWidth = ptX(52), barHeight = ptX(9);
  const moduleWidth = barcodeWidth / modules;
  let cursor = barcodeX;
  for (const pattern of patterns) {
    [...pattern].forEach((digit, index) => {
      const width = Number(digit) * moduleWidth;
      if (index % 2 === 0) commands.push(`${cursor.toFixed(2)} ${(barcodeTop - barHeight).toFixed(2)} ${Math.max(0.3, width).toFixed(2)} ${barHeight.toFixed(2)} re f`);
      cursor += width;
    });
  }
  commands.push(`BT /F1 5 Tf ${ptX(5).toFixed(2)} ${ptY(96.5).toFixed(2)} Td (BARCODE  ${pdfText(barcode).slice(0, 28)}) Tj ET`);

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
