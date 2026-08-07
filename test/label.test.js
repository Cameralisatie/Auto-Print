import test from "node:test";
import assert from "node:assert/strict";
import { buildLabelPdf, LABEL_HEIGHT_PT, LABEL_WIDTH_PT } from "../src/label.js";

test("creates a correctly sized one-page PDF", () => {
  const pdf = buildLabelPdf({ id: "rec123", createdTime: "2026-08-07T10:00:00Z", fields: { "Job orders": "J-42", "Dropbox Location": "IN-STORE" } });
  const text = pdf.toString("ascii");
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, new RegExp(`/MediaBox \\[0 0 ${LABEL_WIDTH_PT.toFixed(2)} ${LABEL_HEIGHT_PT.toFixed(2)}\\]`));
  assert.match(text, /J-42/);
  assert.match(text, /IN-STORE/);
});
