// Node imports moved inside functions to avoid client-side build issues

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

export async function loadCatalog(): Promise<CatalogEntry[]> {
  if (catalog) return catalog;

  const MASTER_CATALOG_URL = process.env.ANYTHING_LLM_MASTER_CATALOG_URL;
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    try {
      const url = MASTER_CATALOG_URL || "/assets/data/anc_catalog.csv";
      const response = await fetch(url);
      const content = await response.text();
      catalog = parseCsv(content);
      return catalog;
    } catch (e) {
      console.error("Failed to fetch catalog in browser:", e);
      return [];
    }
  }

  // Server-side
  try {
    if (MASTER_CATALOG_URL) {
      const response = await fetch(MASTER_CATALOG_URL);
      const content = await response.text();
      catalog = parseCsv(content);
      return catalog;
    }

    const fs = require("fs");
    const path = require("path");
    const p = path.join(process.cwd(), "public", "assets", "data", "anc_catalog.csv");
    const c = fs.readFileSync(p, "utf-8");
    catalog = parseCsv(c);
    return catalog;
  } catch (e) {
    console.error("Failed to load catalog on server:", e);
    catalog = [];
    return catalog;
  }
}

// Synchronous version for legacy support if needed (will be empty on first call in browser if not preloaded)
export function loadCatalogSync() {
  if (catalog) return catalog;

  if (typeof window === "undefined") {
    try {
      const fs = require("fs");
      const path = require("path");
      const p = path.join(process.cwd(), "public", "assets", "data", "anc_catalog.csv");
      const c = fs.readFileSync(p, "utf-8");
      catalog = parseCsv(c);
      return catalog;
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function findByProductId(id: string): CatalogEntry | null {
  const c = loadCatalogSync();
  return c.find((r: CatalogEntry) => r.product_id === id || r.product_name === id || r.product_name?.toLowerCase() === id.toLowerCase()) || null;
}

export function searchByName(q: string): CatalogEntry[] {
  const c = loadCatalogSync();
  const lower = q.toLowerCase();
  return c
    .map((r: CatalogEntry) => ({ r, score: (r.product_name || "").toLowerCase().includes(lower) ? 0.95 : 0.0 }))
    .filter((s: { score: number }) => s.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .map((s: { r: CatalogEntry }) => s.r);
}
