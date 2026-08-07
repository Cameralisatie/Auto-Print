import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, grayscale } from "pdf-lib";

export const DEFAULT_LABEL_WIDTH_MM = 62;
export const DEFAULT_LABEL_HEIGHT_MM = 100;
const mm = (value) => (value / 25.4) * 72;
const clean = (value) => Array.isArray(value) ? value.join(", ") : String(value ?? "").trim();

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

function barcodePatterns(value) {
  const safe = clean(value).replace(/[^\x20-\x7e]/g, "?") || "-";
  const codes = [...safe].map((char) => char.charCodeAt(0) - 32);
  const checksum = (104 + codes.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103;
  return { safe, patterns: [104, ...codes, checksum, 106].map((code) => CODE128_PATTERNS[code]) };
}

function createdDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(parsed);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

function wrapWords(value, maxCharacters, maxLines) {
  const lines = [];
  for (const word of clean(value).split(/\s+/).filter(Boolean)) {
    const current = lines.at(-1) || "";
    if (!current || `${current} ${word}`.length > maxCharacters) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }
  return lines.slice(0, maxLines);
}

export async function buildLabelPdf(record) {
  const templateBytes = await readFile(new URL("../assets/label-template.pdf", import.meta.url));
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPages()[0];
  const { width, height } = page.getSize();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = grayscale(0.12);
  const fields = record.fields || {};
  const customer = [clean(fields["First Name"]), clean(fields["Last Name"])].filter(Boolean).join(" ") || clean(fields["Name"]);

  const fitSize = (text, font, preferred, maxWidth, minimum = 4) => {
    let size = preferred;
    while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.25;
    return size;
  };
  const centered = (xMm, yMm, widthMm, heightMm, value, preferredSize, maxLength = 40) => {
    const text = clean(value).slice(0, maxLength) || "-";
    const size = fitSize(text, bold, preferredSize, mm(widthMm - 2));
    const x = mm(xMm) + (mm(widthMm) - bold.widthOfTextAtSize(text, size)) / 2;
    const y = height - mm(yMm + heightMm) + (mm(heightMm) - size) / 2 + 1;
    page.drawText(text, { x, y, size, font: bold, color: ink });
  };

  centered(3, 4, 25, 7, clean(fields["Job orders"]) || record.id, 9, 16);
  centered(30, 4, 9, 7, clean(fields["TOTAL FILM ROLLS"]) || "0", 9, 4);
  centered(41, 4, 18, 7, createdDate(record.createdTime), 7, 10);
  const location = clean(fields["Dropbox Location"]);
  if (location) centered(3, 11.2, 25, 2.5, location, 4.5, 28);
  centered(3, 14, 25, 7, fields["Film Development"], 6, 24);
  centered(3, 23, 11.5, 6, `HF  ${clean(fields["HALF FRAME"]) || "-"}`, 5.5, 11);
  centered(16.5, 23, 11.5, 6, `FF  ${clean(fields["BORDERS"]) || "-"}`, 5.5, 11);
  const format = [clean(fields["FORMAT"]), clean(fields["TIFF"])].filter(Boolean).join("  ");
  centered(3, 31, 25, 6, format || "-", 6, 24);
  centered(3, 39, 25, 7, fields["Your negatives"], 8, 20);
  centered(3, 48, 25, 7, fields["CUT NEGATIVES?"], 8, 16);
  centered(39.5, 17, 5.5, 4, clean(fields["C41 TOTAL"]) || "0", 5.5, 3);
  centered(46.5, 17, 5.5, 4, clean(fields["BW TOTAL"]) || "0", 5.5, 3);
  centered(53.5, 17, 5.5, 4, clean(fields["E6 TOTAL"]) || "0", 5.5, 3);
  centered(39.5, 21, 5.5, 2, "C41", 3.2, 3);
  centered(46.5, 21, 5.5, 2, "BW", 3.2, 2);
  centered(53.5, 21, 5.5, 2, "E6", 3.2, 2);

  const notes = clean(fields["Notes"]) || clean(fields["LAB NOTES"]);
  if (customer) centered(3, 58.5, 25, 5, customer, 6.5, 30);
  wrapWords(notes, 23, 7).forEach((line, index) => page.drawText(line, {
    x: mm(5), y: height - mm(68 + index * 3.2), size: 5.5, font: regular, color: ink,
  }));

  const { safe: barcodeValue, patterns } = barcodePatterns(fields["BARCODE"] || fields["Job orders"] || record.id);
  const modules = patterns.reduce((sum, pattern) => sum + [...pattern].reduce((total, digit) => total + Number(digit), 0), 0);
  const barcodeX = mm(32), barcodeWidth = mm(25), barcodeY = height - mm(98), barcodeHeight = mm(6.5);
  const moduleWidth = barcodeWidth / modules;
  let cursor = barcodeX;
  for (const pattern of patterns) {
    [...pattern].forEach((digit, index) => {
      const barWidth = Number(digit) * moduleWidth;
      if (index % 2 === 0) page.drawRectangle({ x: cursor, y: barcodeY, width: barWidth, height: barcodeHeight, color: ink });
      cursor += barWidth;
    });
  }
  const barcodeTextSize = fitSize(barcodeValue, regular, 3.5, barcodeWidth);
  page.drawText(barcodeValue, { x: barcodeX, y: height - mm(99.5), size: barcodeTextSize, font: regular, color: ink });

  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
