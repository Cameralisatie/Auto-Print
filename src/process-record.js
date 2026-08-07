import { randomUUID } from "node:crypto";
import { getAirtableRecord } from "./airtable.js";
import { buildLabelPdf } from "./label.js";
import { createPrintJob } from "./printnode.js";

export async function processRecord(cfg, recordId, { reprint = false } = {}) {
  const record = await getAirtableRecord(cfg, recordId.trim());
  if (String(record.fields?.["Dropbox Location"] || "").trim().toUpperCase() !== "IN-STORE") {
    return { ok: true, skipped: true, reason: "Dropbox Location is not IN-STORE" };
  }

  const order = String(record.fields?.["Job orders"] || record.id);
  const result = await createPrintJob(cfg, {
    recordId: record.id,
    title: `${reprint ? "Reprint " : ""}Order ${order}`,
    pdf: await buildLabelPdf(record),
    idempotencyKey: reprint ? `airtable-reprint-${record.id}-${randomUUID()}` : `airtable-${record.id}`,
  });
  return { ok: true, reprint, ...result, recordId: record.id };
}
