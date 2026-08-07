import test from "node:test";
import assert from "node:assert/strict";
import { buildLabelPdf } from "../src/label.js";
import { DEFAULT_TEMPLATE } from "../src/default-template.js";

test("creates a correctly sized one-page PDF", () => {
  const pdf = buildLabelPdf({ id: "rec123", createdTime: "2026-08-07T10:00:00Z", fields: { "Job orders": "J-42", "Dropbox Location": "IN-STORE" } });
  const text = pdf.toString("ascii");
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /\/MediaBox \[0 0 175\.75 283\.46\]/);
  assert.match(text, /J-42/);
  assert.match(text, /IN-STORE/);
});

test("supports a different Brother roll size", () => {
  const pdf = buildLabelPdf({ id: "rec123", fields: {} }, { widthMm: 103, heightMm: 164 });
  assert.match(pdf.toString("ascii"), /\/MediaBox \[0 0 291\.97 464\.88\]/);
});

test("renders a visual template with Airtable values", () => {
  const pdf = buildLabelPdf({ id: "rec123", fields: { "Job orders": "J-99", "Dropbox Location": "IN-STORE" } }, {
    widthMm: 62, heightMm: 100, template: DEFAULT_TEMPLATE,
  });
  const text = pdf.toString("ascii");
  assert.match(text, /J-99/);
  assert.match(text, /IN-STORE/);
});
