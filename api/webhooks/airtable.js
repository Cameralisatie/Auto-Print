import { config } from "../../src/config.js";
import { validWebhookSecret } from "../../src/auth.js";
import { processRecord } from "../../src/process-record.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  try {
    const cfg = config();
    if (!validWebhookSecret(request.headers["x-webhook-secret"], cfg.webhookSecret)) {
      return response.status(401).json({ error: "Unauthorized" });
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    const recordId = body?.recordId;
    if (typeof recordId !== "string" || !recordId.trim()) {
      return response.status(400).json({ error: "Missing recordId" });
    }

    return response.status(200).json(await processRecord(cfg, recordId));
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
