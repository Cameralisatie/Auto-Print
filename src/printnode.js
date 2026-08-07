export async function createPrintJob(cfg, { title, pdf }) {
  const options = { copies: cfg.copies };
  if (cfg.paper) options.paper = cfg.paper;
  if (cfg.bin) options.bin = cfg.bin;

  const response = await fetch("https://api.printnode.com/printjobs", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.printNodeApiKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      printerId: cfg.printNodePrinterId,
      title,
      contentType: "pdf_base64",
      content: pdf.toString("base64"),
      source: "Airtable IN-STORE label service",
      expireAfter: 86400,
      options,
    }),
  });

  const body = await response.text();
  if (response.status === 409) return { duplicate: true, printJobId: null };
  if (!response.ok) throw new Error(`PrintNode returned ${response.status}: ${body}`);
  return { duplicate: false, printJobId: Number(body) };
}
