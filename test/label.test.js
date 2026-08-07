import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { buildLabelPdf } from "../src/label.js";

test("composites Airtable values onto the Illustrator template", async () => {
  const bytes = await buildLabelPdf({ id: "rec123", createdTime: "2026-08-07T10:00:00Z", fields: {
    "Job orders": "J-42", "Dropbox Location": "IN-STORE", "CUT NEGATIVES?": "YES", "BARCODE": "ABC-123",
  }});
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  const { width, height } = pdf.getPage(0).getSize();
  assert.ok(Math.abs(width - 175.75) < 0.02);
  assert.ok(Math.abs(height - 283.46) < 0.02);
  assert.ok(bytes.length > 50_000);
});
