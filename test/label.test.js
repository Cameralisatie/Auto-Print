import test from "node:test";
import assert from "node:assert/strict";
import { buildLabelPdf } from "../src/label.js";

test("creates a correctly sized Frontrunner label", () => {
  const pdf = buildLabelPdf({ id: "rec123", createdTime: "2026-08-07T10:00:00Z", fields: { "Job orders": "J-42", "Dropbox Location": "IN-STORE", "CUT NEGATIVES?": "YES", "BARCODE": "ABC-123" } });
  const text = pdf.toString("ascii");
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /\/MediaBox \[0 0 175\.75 283\.46\]/);
  assert.match(text, /IN-STORE/);
  assert.match(text, /ROLLS/);
  assert.match(text, /\(YES\)/);
  assert.match(text, /ABC-123/);
});

test("supports a different Brother roll size", () => {
  const pdf = buildLabelPdf({ id: "rec123", fields: {} }, { widthMm: 103, heightMm: 164 });
  assert.match(pdf.toString("ascii"), /\/MediaBox \[0 0 291\.97 464\.88\]/);
});
