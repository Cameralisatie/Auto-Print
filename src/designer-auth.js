import { validWebhookSecret } from "./auth.js";

export function designerAuthorized(request) {
  const expected = process.env.DESIGNER_SECRET?.trim();
  if (!expected) throw new Error("Missing DESIGNER_SECRET");
  return validWebhookSecret(request.headers["x-designer-secret"], expected);
}
