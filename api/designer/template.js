import { designerAuthorized } from "../../src/designer-auth.js";
import { getTemplate, listVersions, restoreVersion, saveTemplate } from "../../src/templates.js";

const validTemplate = (value) => value && Number(value.widthMm) > 0 && Number(value.heightMm) > 0 && Array.isArray(value.elements) && value.elements.length <= 100;

export default async function handler(request, response) {
  try {
    if (!designerAuthorized(request)) return response.status(401).json({ error: "Unauthorized" });
    if (request.method === "GET") return response.status(200).json({ template: await getTemplate(), versions: await listVersions() });
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    if (request.method === "PUT") {
      if (!validTemplate(body)) return response.status(400).json({ error: "Invalid template" });
      return response.status(200).json({ template: await saveTemplate(body), versions: await listVersions() });
    }
    if (request.method === "POST") {
      const version = Number(body?.version);
      if (!Number.isInteger(version) || version < 1) return response.status(400).json({ error: "Invalid version" });
      return response.status(200).json({ template: await restoreVersion(version), versions: await listVersions() });
    }
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
