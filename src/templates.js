import { neon } from "@neondatabase/serverless";
import { DEFAULT_TEMPLATE } from "./default-template.js";

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
}

function db() {
  const url = databaseUrl();
  if (!url) throw new Error("Missing DATABASE_URL from the Neon Vercel integration");
  return neon(url);
}

const normalize = (row) => row ? ({
  name: row.name,
  widthMm: Number(row.width_mm),
  heightMm: Number(row.height_mm),
  elements: row.design?.elements || [],
  version: Number(row.version),
  updatedAt: row.updated_at,
}) : null;

export async function getTemplate(name = "Default") {
  const sql = db();
  const rows = await sql`SELECT name, width_mm, height_mm, design, version, updated_at FROM label_templates WHERE name = ${name}`;
  return normalize(rows[0]) || { ...DEFAULT_TEMPLATE, version: 0, updatedAt: null };
}

export async function getTemplateOrDefault(name = "Default") {
  try { return await getTemplate(name); }
  catch (error) {
    console.warn("Using built-in label template:", error instanceof Error ? error.message : error);
    return { ...DEFAULT_TEMPLATE, version: 0, updatedAt: null };
  }
}

export async function saveTemplate(template, name = "Default") {
  const sql = db();
  const design = JSON.stringify({ elements: template.elements });
  const rows = await sql`
    WITH saved AS (
      INSERT INTO label_templates (name, width_mm, height_mm, design)
      VALUES (${name}, ${template.widthMm}, ${template.heightMm}, ${design}::jsonb)
      ON CONFLICT (name) DO UPDATE SET
        width_mm = EXCLUDED.width_mm,
        height_mm = EXCLUDED.height_mm,
        design = EXCLUDED.design,
        version = label_templates.version + 1,
        updated_at = now()
      RETURNING id, name, width_mm, height_mm, design, version, updated_at
    ), archived AS (
      INSERT INTO label_template_versions (template_id, version, width_mm, height_mm, design)
      SELECT id, version, width_mm, height_mm, design FROM saved
      RETURNING id
    )
    SELECT name, width_mm, height_mm, design, version, updated_at FROM saved`;
  return normalize(rows[0]);
}

export async function listVersions(name = "Default") {
  const sql = db();
  const rows = await sql`
    SELECT v.version, v.width_mm, v.height_mm, v.created_at
    FROM label_template_versions v
    JOIN label_templates t ON t.id = v.template_id
    WHERE t.name = ${name}
    ORDER BY v.version DESC LIMIT 20`;
  return rows.map((row) => ({ version: Number(row.version), widthMm: Number(row.width_mm), heightMm: Number(row.height_mm), createdAt: row.created_at }));
}

export async function restoreVersion(version, name = "Default") {
  const sql = db();
  const rows = await sql`
    SELECT v.width_mm, v.height_mm, v.design
    FROM label_template_versions v JOIN label_templates t ON t.id = v.template_id
    WHERE t.name = ${name} AND v.version = ${version}`;
  if (!rows[0]) throw new Error(`Template version ${version} not found`);
  return saveTemplate({ widthMm: Number(rows[0].width_mm), heightMm: Number(rows[0].height_mm), elements: rows[0].design.elements }, name);
}
