import { mkdir, writeFile } from "node:fs/promises";
import { buildLabelPdf } from "../src/label.js";

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
    "HALF FRAME": "NO",
    "BORDERS": "YES",
    "FORMAT": "35MM",
    "TIFF": "YES",
    "C41 TOTAL": 3,
    "BW TOTAL": 1,
    "E6 TOTAL": 0,
    "Dropbox Location": "IN-STORE",
    "Notes": "Test label - do not process",
    "BARCODE": "8712345678901",
  },
};

await mkdir("output/pdf", { recursive: true });
await writeFile("output/pdf/generated-label-preview.pdf", await buildLabelPdf(record));
