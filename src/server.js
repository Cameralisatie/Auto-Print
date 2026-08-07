import http from "node:http";
import { config } from "./config.js";
import { validWebhookSecret } from "./auth.js";
import { processRecord } from "./process-record.js";

const cfg = config();
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/webhooks/airtable") return json(res, 404, { error: "Not found" });
  if (!validWebhookSecret(req.headers["x-webhook-secret"], cfg.webhookSecret)) return json(res, 401, { error: "Unauthorized" });

  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16_384) throw new Error("Request body is too large");
      chunks.push(chunk);
    }
    const { recordId } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof recordId !== "string" || !recordId.trim()) return json(res, 400, { error: "Missing recordId" });

    return json(res, 200, await processRecord(cfg, recordId));
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(cfg.port, () => console.log(`Airtable PrintNode service listening on port ${cfg.port}`));
