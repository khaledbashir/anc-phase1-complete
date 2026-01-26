import fs from "fs";
import path from "path";

export type CatalogEntry = {
  product_id: string;
  product_name: string;
  category: string;
  pixel_pitch: number;
  cabinet_width_mm?: number;
  cabinet_height_mm?: number;
  weight_kg_per_cabinet?: number;
  max_nits?: number;
  service_type?: string;
  is_curvy?: string;
  uefa_certified?: string;
  cost_per_sqft?: number;
  description?: string;
};

let catalog: CatalogEntry[] | null = null;

function parseCsv(content: string) {
  const lines = content.trim().split(/\r?\n/);
  const header = lines.shift();
  if (!header) return [];
  const keys = header.split(",").map((k) => k.trim());

  const rows: CatalogEntry[] = lines.map((ln) => {
    // naive CSV parse (works for our simple file)
    const parts = ln.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((p) => p.replace(/^\"|\"$/g, "").trim());
    const obj: any = {};
    for (let i = 0; i < keys.length; i++) {
      obj[keys[i]] = parts[i];
    }
    return {
      product_id: obj.product_id,
      product_name: obj.product_name,
      category: obj.category,
      pixel_pitch: parseFloat(obj.pixel_pitch || "0"),
      cabinet_width_mm: obj.cabinet_width_mm ? parseFloat(obj.cabinet_width_mm) : undefined,
      cabinet_height_mm: obj.cabinet_height_mm ? parseFloat(obj.cabinet_height_mm) : undefined,
      weight_kg_per_cabinet: obj.weight_kg_per_cabinet ? parseFloat(obj.weight_kg_per_cabinet) : undefined,
      max_nits: obj.max_nits ? parseFloat(obj.max_nits) : undefined,
      service_type: obj.service_type,
      is_curvy: obj.is_curvy,
      uefa_certified: obj.uefa_certified,
      cost_per_sqft: obj.cost_per_sqft ? parseFloat(obj.cost_per_sqft) : undefined,
      description: obj.description,
    } as CatalogEntry;
  });

  return rows;
}

export function loadCatalog() {
  if (catalog) return catalog;
  const p = path.join(process.cwd(), "public", "assets", "data", "anc_catalog.csv");
  try {
    const c = fs.readFileSync(p, "utf-8");
    catalog = parseCsv(c);
    return catalog;
  } catch (e) {
    console.error("Failed to load catalog:", e);
    catalog = [];
    return catalog;
  }
}

export function findByProductId(id: string) {
  const c = loadCatalog();
  return c.find((r) => r.product_id === id || r.product_name === id || r.product_name?.toLowerCase() === id.toLowerCase()) || null;
}

export function searchByName(q: string) {
  const c = loadCatalog();
  const lower = q.toLowerCase();
  return c
    .map((r) => ({ r, score: (r.product_name || "").toLowerCase().includes(lower) ? 0.95 : 0.0 }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.r);
}
