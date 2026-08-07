import { mkdir, writeFile } from "node:fs/promises";
import { buildLabelPdf } from "../src/label.js";
import { DEFAULT_TEMPLATE } from "../src/default-template.js";

const record = {
  id: "recSample",
  createdTime: "2026-08-07T10:30:00Z",
  fields: {
    "Job orders": "JOB-1042",
    "TOTAL FILM ROLLS": 4,
    "First Name": "Sample",
    "Last Name": "Customer",
    "Film Development": "C41",
    "Your negatives": "RETURN",
    "CUT NEGATIVES?": "YES",
    "FORMAT": "35MM",
    "C41 TOTAL": 3,
    "BW TOTAL": 1,
    "E6 TOTAL": 0,
    "Dropbox Location": "IN-STORE",
    "Notes": "Test label - do not process",
  },
};

await mkdir("output/pdf", { recursive: true });
await writeFile("output/pdf/sample-airtable-label.pdf", buildLabelPdf(record, {
  widthMm: DEFAULT_TEMPLATE.widthMm,
  heightMm: DEFAULT_TEMPLATE.heightMm,
  template: DEFAULT_TEMPLATE,
}));
