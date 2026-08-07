export const AIRTABLE_FIELDS = [
  "Job orders", "TOTAL FILM ROLLS", "First Name", "Last Name",
  "Film Development", "Your negatives", "CUT NEGATIVES?", "FORMAT",
  "C41 TOTAL", "BW TOTAL", "E6 TOTAL", "Dropbox Location", "Notes",
  "BARCODE",
];

export const DEFAULT_TEMPLATE = {
  name: "Default",
  widthMm: 62,
  heightMm: 100,
  elements: [
    { id: "order", type: "field", field: "Job orders", label: "ORDER", x: 3, y: 4, width: 30, height: 10, fontSize: 15, bold: true },
    { id: "rolls", type: "field", field: "TOTAL FILM ROLLS", label: "ROLLS", x: 36, y: 4, width: 10, height: 10, fontSize: 12, bold: true },
    { id: "date", type: "createdTime", label: "DATE", x: 47, y: 4, width: 12, height: 10, fontSize: 6, bold: true },
    { id: "customer", type: "combined", fields: ["First Name", "Last Name"], label: "CUSTOMER", x: 3, y: 17, width: 56, height: 10, fontSize: 12, bold: true },
    { id: "development", type: "field", field: "Film Development", label: "DEVELOPMENT", x: 3, y: 31, width: 28, height: 11, fontSize: 11, bold: true },
    { id: "totals", type: "combined", fields: ["C41 TOTAL", "BW TOTAL", "E6 TOTAL"], separator: " / ", label: "C41 / BW / E6", x: 33, y: 31, width: 26, height: 11, fontSize: 11, bold: true },
    { id: "negatives", type: "field", field: "Your negatives", label: "NEGATIVES", x: 3, y: 45, width: 28, height: 11, fontSize: 10, bold: true },
    { id: "location", type: "field", field: "Dropbox Location", label: "LOCATION", x: 33, y: 45, width: 26, height: 11, fontSize: 11, bold: true },
    { id: "cut", type: "field", field: "CUT NEGATIVES?", label: "CUT?", x: 3, y: 59, width: 28, height: 11, fontSize: 10, bold: true },
    { id: "notes", type: "field", field: "Notes", label: "NOTES", x: 33, y: 59, width: 26, height: 25, fontSize: 8, bold: true, wrap: true },
    { id: "format", type: "field", field: "FORMAT", label: "FORMAT", x: 3, y: 73, width: 28, height: 11, fontSize: 10, bold: true },
    { id: "record", type: "recordId", label: "RECORD", x: 3, y: 88, width: 28, height: 8, fontSize: 7, bold: true },
    { id: "dropbox", type: "field", field: "Dropbox Location", label: "DROPBOX", x: 33, y: 88, width: 26, height: 8, fontSize: 9, bold: true },
  ],
};
