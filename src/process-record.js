import { getAirtableRecord } from "./airtable.js";
import { buildLabelPdf } from "./label.js";
import { createPrintJob } from "./printnode.js";

export async function processRecord(cfg, recordId) {
  const record = await getAirtableRecord(cfg, recordId.trim());
  if (String(record.fields?.["Dropbox Location"] || "").trim().toUpperCase() !== "IN-STORE") {
    return { ok: true, skipped: true, reason: "Dropbox Location is not IN-STORE" };
  }

  const order = String(record.fields?.["Job orders"] || record.id);
  const result = await createPrintJob(cfg, {
    title: `Order ${order}`,
    pdf: await buildLabelPdf(record, {
      widthMm: cfg.labelWidthMm,
      heightMm: cfg.labelHeightMm,
    }),
  });
  return { ok: true, ...result, recordId: record.id };
}
