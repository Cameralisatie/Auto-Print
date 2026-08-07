import { timingSafeEqual } from "node:crypto";

export function validWebhookSecret(suppliedValue, expectedValue) {
  const supplied = Buffer.from(String(suppliedValue || ""));
  const expected = Buffer.from(expectedValue);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
