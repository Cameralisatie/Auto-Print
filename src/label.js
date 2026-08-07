// A dependency-free, single-page PDF sized like the existing 385x574 label at 203 DPI.
// The Brother driver rasterizes this PDF for the QL-800 or QL-1100.
const DESIGN_WIDTH_PT = (385 / 203) * 72;
const DESIGN_HEIGHT_PT = (574 / 203) * 72;
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

export function buildLabelPdf(record, options = {}) {
  const pageWidth = mmToPt(options.widthMm ?? DEFAULT_LABEL_WIDTH_MM);
  const pageHeight = mmToPt(options.heightMm ?? DEFAULT_LABEL_HEIGHT_MM);
  if (!Number.isFinite(pageWidth) || pageWidth <= 0 || !Number.isFinite(pageHeight) || pageHeight <= 0) {
    throw new Error("Label dimensions must be positive numbers");
  }
  const scale = Math.min(pageWidth / DESIGN_WIDTH_PT, pageHeight / DESIGN_HEIGHT_PT);
  const offsetX = (pageWidth - DESIGN_WIDTH_PT * scale) / 2;
  const offsetY = (pageHeight - DESIGN_HEIGHT_PT * scale) / 2;
  const f = record.fields || {};
  const order = clean(f["Job orders"]) || record.id;
  const customer = [clean(f["First Name"]), clean(f["Last Name"])].filter(Boolean).join(" ") || "-";
  const commands = [
    "q",
    `${scale.toFixed(6)} 0 0 ${scale.toFixed(6)} ${offsetX.toFixed(2)} ${offsetY.toFixed(2)} cm`,
    "0 G",
    "0.6 w",
    `4 4 ${DESIGN_WIDTH_PT - 8} ${DESIGN_HEIGHT_PT - 8} re S`,
  ];
  const value = (x, y, text, size = 7, limit = 24) => commands.push(`BT /F2 ${size} Tf ${x} ${y} Td (${pdfText(text).slice(0, limit)}) Tj ET`);
  const label = (x, y, text) => commands.push(`BT /F1 4 Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`);
  const rule = (y) => commands.push(`5 ${y} m ${(DESIGN_WIDTH_PT - 5).toFixed(2)} ${y} l S`);

  label(7, 191, "ORDER"); value(7, 180, order, 11, 13);
  label(78, 191, "ROLLS"); value(78, 181, clean(f["TOTAL FILM ROLLS"]) || "0", 8, 4);
  label(102, 191, "DATE"); value(102, 181, date(record.createdTime), 5, 10);
  rule(175);
  label(7, 168, "CUSTOMER"); value(7, 157, customer, 8, 28); rule(151);

  commands.push(`68 151 m 68 45 l S`);
  const left = [
    ["DEVELOPMENT", clean(f["Film Development"]) || "-"],
    ["NEGATIVES", clean(f["Your negatives"]) || "-"],
    ["CUT?", clean(f["CUT NEGATIVES?"]) || "-"],
    ["FORMAT", clean(f["FORMAT"]) || "-"],
  ];
  left.forEach(([name, text], index) => {
    const y = 142 - index * 26;
    label(7, y, name); value(7, y - 11, text, 7, 12);
    if (index < left.length - 1) commands.push(`5 ${y - 17} m 68 ${y - 17} l S`);
  });

  label(72, 142, "C41 / BW / E6");
  value(72, 131, `${clean(f["C41 TOTAL"]) || "0"} / ${clean(f["BW TOTAL"]) || "0"} / ${clean(f["E6 TOTAL"]) || "0"}`, 8, 15);
  commands.push(`68 119 m ${(DESIGN_WIDTH_PT - 5).toFixed(2)} 119 l S`);
  label(72, 112, "LOCATION"); value(72, 101, clean(f["Dropbox Location"]) || "-", 8, 14);
  commands.push(`68 93 m ${(DESIGN_WIDTH_PT - 5).toFixed(2)} 93 l S`);
  label(72, 86, "NOTES");
  const notes = pdfText(clean(f["Notes"]) || "-");
  value(72, 75, notes.slice(0, 18), 6, 18);
  value(72, 66, notes.slice(18, 36), 6, 18);
  value(72, 57, notes.slice(36, 54), 6, 18);
  rule(45);
  label(7, 36, "RECORD"); value(7, 25, record.id, 6, 22);
  label(72, 36, "DROPBOX"); value(72, 25, clean(f["Dropbox Location"]) || "-", 7, 14);
  commands.push("Q");

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
