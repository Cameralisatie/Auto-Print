import { designerAuthorized } from "../../src/designer-auth.js";
import { AIRTABLE_FIELDS } from "../../src/default-template.js";

export default function handler(request, response) {
  try {
    if (!designerAuthorized(request)) return response.status(401).json({ error: "Unauthorized" });
    if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
    return response.status(200).json({ fields: AIRTABLE_FIELDS });
  } catch (error) {
    return response.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
