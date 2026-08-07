export async function getAirtableRecord(cfg, recordId) {
  const url = `https://api.airtable.com/v0/${encodeURIComponent(cfg.airtableBaseId)}/${encodeURIComponent(cfg.airtableTableId)}/${encodeURIComponent(recordId)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.airtablePat}` },
  });
  if (!response.ok) throw new Error(`Airtable returned ${response.status}: ${await response.text()}`);
  return response.json();
}
