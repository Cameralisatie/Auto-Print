import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, grayscale, rgb } from "pdf-lib";

export const DEFAULT_LABEL_WIDTH_MM = 102;
export const DEFAULT_LABEL_HEIGHT_MM = 152;
const DESIGN_WIDTH_MM = 62;
const DESIGN_HEIGHT_MM = 100;
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
  const codes = [...safe].map((character) => character.charCodeAt(0) - 32);
  const checksum = (104 + codes.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103;
  return { safe, patterns: [104, ...codes, checksum, 106].map((code) => CODE128_PATTERNS[code]) };
}

function createdDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam", day: "2-digit", month: "2-digit", year: "numeric",
  }).formatToParts(parsed);
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

export async function buildLabelPdf(record, options = {}) {
  const targetWidthMm = Number(options.widthMm ?? DEFAULT_LABEL_WIDTH_MM);
  const targetHeightMm = Number(options.heightMm ?? DEFAULT_LABEL_HEIGHT_MM);
  if (!Number.isFinite(targetWidthMm) || targetWidthMm <= 0 || !Number.isFinite(targetHeightMm) || targetHeightMm <= 0) {
    throw new Error("Label dimensions must be positive numbers");
  }
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([mm(DESIGN_WIDTH_MM), mm(DESIGN_HEIGHT_MM)]);
  const { width, height } = page.getSize();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await readFile(new URL("../assets/logo-lab-zwart.png", import.meta.url)));
  const black = grayscale(0.08);
  const white = rgb(1, 1, 1);
  const fields = record.fields || {};
  const customer = [clean(fields["First Name"]), clean(fields["Last Name"])].filter(Boolean).join(" ") || clean(fields.Name) || "-";
  const top = (y, boxHeight = 0) => height - mm(y + boxHeight);

  const fit = (value, font, preferred, maxWidth, minimum = 3.5) => {
    const text = clean(value) || "-";
    let size = preferred;
    while (size > minimum && font.widthOfTextAtSize(text, size) > mm(maxWidth)) size -= 0.25;
    return { text, size };
  };
  const box = (x, y, boxWidth, boxHeight, lineWidth = 0.45) => {
    const w = mm(boxWidth);
    const h = mm(boxHeight);
    const radius = Math.min(mm(1.35), w / 4, h / 4);
    const curve = radius * 0.5522848;
    const path = [
      `M ${radius} 0`, `L ${w - radius} 0`,
      `C ${w - radius + curve} 0 ${w} ${radius - curve} ${w} ${radius}`,
      `L ${w} ${h - radius}`,
      `C ${w} ${h - radius + curve} ${w - radius + curve} ${h} ${w - radius} ${h}`,
      `L ${radius} ${h}`,
      `C ${radius - curve} ${h} 0 ${h - radius + curve} 0 ${h - radius}`,
      `L 0 ${radius}`,
      `C 0 ${radius - curve} ${radius - curve} 0 ${radius} 0`, "Z",
    ].join(" ");
    page.drawSvgPath(path, {
      x: mm(x), y: height - mm(y), color: white, borderColor: black, borderWidth: lineWidth,
    });
  };
  const centered = (x, y, boxWidth, boxHeight, value, preferred = 7, font = bold, maxLength = 48) => {
    const { text, size } = fit(clean(value).slice(0, maxLength), font, preferred, boxWidth - 2);
    page.drawText(text, {
      x: mm(x) + (mm(boxWidth) - font.widthOfTextAtSize(text, size)) / 2,
      y: top(y, boxHeight) + (mm(boxHeight) - size) / 2 + 1,
      size, font, color: black,
    });
  };
  const fieldBox = (x, y, boxWidth, boxHeight, heading, value, preferred = 7) => {
    box(x, y, boxWidth, boxHeight);
    if (heading) {
      page.drawText(heading.toUpperCase(), { x: mm(x + 1.2), y: top(y + 2.7), size: 3.5, font: bold, color: black });
    }
    if (clean(value)) centered(x + 1, y + (heading ? 2.2 : 0), boxWidth - 2, boxHeight - (heading ? 2.2 : 0), value, preferred);
  };
  const miniChoice = (x, y, boxWidth, heading, value) => {
    box(x, y, boxWidth, 5);
    page.drawText(heading, { x: mm(x + 1), y: top(y + 3.2), size: 3.7, font: bold, color: black });
    centered(x + 4, y, boxWidth - 4, 5, value, 5.2);
  };

  // Strong ticket header.
  box(2.5, 2.5, 27, 8);
  box(31, 2.5, 8, 8);
  box(40.5, 2.5, 19, 8);
  centered(2.5, 2.5, 27, 8, clean(fields["Job orders"]) || record.id, 9.5, bold, 18);
  centered(31, 2.5, 8, 8, clean(fields["TOTAL FILM ROLLS"]) || "0", 10);
  centered(40.5, 2.5, 19, 8, createdDate(record.createdTime), 7);
  // Left instruction stack.
  fieldBox(2.5, 12, 27, 8, "", fields["Film Development"], 7);
  miniChoice(2.5, 21.5, 12.75, "HF", clean(fields["HALF FRAME"]) || "-");
  miniChoice(16.75, 21.5, 12.75, "FF", clean(fields.BORDERS) || "-");
  fieldBox(2.5, 28, 27, 7, "Format", [clean(fields.FORMAT), clean(fields.TIFF)].filter(Boolean).join("  "), 6);
  fieldBox(2.5, 36.5, 27, 6.5, "", fields["Your negatives"], 6.5);
  fieldBox(2.5, 44.5, 27, 6.5, "", fields["CUT NEGATIVES?"], 7);
  fieldBox(2.5, 52.5, 27, 29, "", "", 6);
  wrapWords(clean(fields.Notes) || clean(fields["LAB NOTES"]), 27, 5).forEach((line, index) => {
    page.drawText(line, { x: mm(4), y: top(57.5 + index * 3.2), size: 5.2, font: regular, color: black });
  });

  // Right roll summary, inspired by a photographic lab docket.
  box(31, 12, 28.5, 69.5);
  const chemistry = [
    ["C41", fields["C41 TOTAL"]],
    ["BW", fields["BW TOTAL"]],
    ["E6", fields["E6 TOTAL"]],
  ];
  chemistry.forEach(([, value], index) => {
    const x = 35.5 + index * 7;
    box(x, 14.5, 5.5, 5.5);
    centered(x, 14.5, 5.5, 5.5, clean(value) || "0", 6.5);
  });

  // Customer row, logo, and barcode footer.
  const location = (clean(fields["Dropbox Location"]) || "-").toUpperCase();
  const customerText = customer.toUpperCase();
  const customerSize = fit(customerText, bold, 5.5, 35).size;
  const locationSize = fit(location, bold, 4.5, 18).size;
  page.drawText(customerText, { x: mm(2.8), y: top(85.5), size: customerSize, font: bold, color: black });
  page.drawText(location, {
    x: mm(59.2) - bold.widthOfTextAtSize(location, locationSize), y: top(85.5), size: locationSize, font: bold, color: black,
  });
  page.drawLine({ start: { x: mm(2.5), y: top(87.5) }, end: { x: mm(59.5), y: top(87.5) }, thickness: 0.7, color: black });

  const footerTop = 89;
  const footerHeight = 8;
  const logoScale = Math.min(mm(22.5) / logo.width, mm(6.5) / logo.height);
  const logoHeight = logo.height * logoScale;
  page.drawImage(logo, {
    x: mm(3.5), y: top(footerTop + footerHeight) + (mm(footerHeight) - logoHeight) / 2,
    width: logo.width * logoScale, height: logoHeight,
  });
  const { patterns } = barcodePatterns(fields.BARCODE || fields["Job orders"] || record.id);
  const modules = patterns.reduce((sum, pattern) => sum + [...pattern].reduce((total, digit) => total + Number(digit), 0), 0);
  const barcodeX = mm(32), barcodeWidth = mm(27), barcodeY = top(footerTop + footerHeight), barcodeHeight = mm(footerHeight);
  const moduleWidth = barcodeWidth / modules;
  let cursor = barcodeX;
  for (const pattern of patterns) {
    [...pattern].forEach((digit, index) => {
      const barWidth = Number(digit) * moduleWidth;
      if (index % 2 === 0) page.drawRectangle({ x: cursor, y: barcodeY, width: barWidth, height: barcodeHeight, color: black });
      cursor += barWidth;
    });
  }
  const designBytes = await pdf.save({ useObjectStreams: false });
  if (targetWidthMm === DESIGN_WIDTH_MM && targetHeightMm === DESIGN_HEIGHT_MM) return Buffer.from(designBytes);

  const finalizedDesign = await PDFDocument.load(designBytes);
  const output = await PDFDocument.create();
  const embedded = await output.embedPage(finalizedDesign.getPage(0));
  const outputPage = output.addPage([mm(targetWidthMm), mm(targetHeightMm)]);
  outputPage.drawPage(embedded, {
    x: 0, y: 0, width: mm(targetWidthMm), height: mm(targetHeightMm),
  });
  return Buffer.from(await output.save({ useObjectStreams: false }));
}
