import { getAirtableRecord } from "./airtable.js";
import { buildLabelPdf } from "./label.js";
import { createPrintJob } from "./printnode.js";
import { getTemplateOrDefault } from "./templates.js";

export async function processRecord(cfg, recordId) {
  const record = await getAirtableRecord(cfg, recordId.trim());
  if (String(record.fields?.["Dropbox Location"] || "").trim().toUpperCase() !== "IN-STORE") {
    return { ok: true, skipped: true, reason: "Dropbox Location is not IN-STORE" };
  }

  const order = String(record.fields?.["Job orders"] || record.id);
  const template = await getTemplateOrDefault();
  const result = await createPrintJob(cfg, {
    recordId: record.id,
    title: `Order ${order}`,
    pdf: buildLabelPdf(record, {
      widthMm: template.widthMm || cfg.labelWidthMm,
      heightMm: template.heightMm || cfg.labelHeightMm,
      template,
    }),
  });
  return { ok: true, ...result, recordId: record.id };
}
