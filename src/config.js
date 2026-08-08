function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function config() {
  const printerId = Number(required("PRINTNODE_PRINTER_ID"));
  const copies = Number(process.env.PRINTNODE_COPIES || 1);
  const labelWidthMm = Number(process.env.LABEL_WIDTH_MM || 102);
  const labelHeightMm = Number(process.env.LABEL_HEIGHT_MM || 152);
  if (!Number.isInteger(printerId) || printerId < 1) throw new Error("PRINTNODE_PRINTER_ID must be a positive integer");
  if (!Number.isInteger(copies) || copies < 1) throw new Error("PRINTNODE_COPIES must be a positive integer");
  if (!Number.isFinite(labelWidthMm) || labelWidthMm <= 0) throw new Error("LABEL_WIDTH_MM must be positive");
  if (!Number.isFinite(labelHeightMm) || labelHeightMm <= 0) throw new Error("LABEL_HEIGHT_MM must be positive");

  return {
    airtablePat: required("AIRTABLE_PAT"),
    airtableBaseId: required("AIRTABLE_BASE_ID"),
    airtableTableId: required("AIRTABLE_TABLE_ID"),
    printNodeApiKey: required("PRINTNODE_API_KEY"),
    printNodePrinterId: printerId,
    webhookSecret: required("WEBHOOK_SECRET"),
    port: Number(process.env.PORT || 3001),
    copies,
    paper: process.env.PRINTNODE_PAPER?.trim() || undefined,
    bin: process.env.PRINTNODE_BIN?.trim() || undefined,
    labelWidthMm,
    labelHeightMm,
  };
}
