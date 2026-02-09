# Product Catalog Skill

## Overview
The ANC Proposal Engine includes a structured product catalog for LED display modules from multiple manufacturers (LG, Yaham, Absen, Unilumin, etc.). Products are stored in a Prisma-managed PostgreSQL database and exposed via REST API.

## Database Schema
**Model:** `ManufacturerProduct` in `prisma/schema.prisma`

Key fields:
- `manufacturer`, `productFamily`, `modelNumber` (unique), `displayName`
- **Physical:** `pixelPitch` (mm), `cabinetWidthMm`, `cabinetHeightMm`, `cabinetDepthMm`, `weightKgPerCabinet`
- **Optical:** `maxNits`, `typicalNits`, `refreshRate`
- **Electrical:** `maxPowerWattsPerCab`, `typicalPowerWattsPerCab`
- **Environmental:** `environment` (indoor/outdoor/indoor_outdoor), `ipRating`, `operatingTempMin/Max`
- **Install:** `serviceType` (front/rear/front_rear), `supportsHalfModule`, `isCurved`
- **Pricing:** `costPerSqFt`, `msrpPerSqFt` (ANC internal)
- **Metadata:** `extendedSpecs` (JSON overflow), `sourceSpreadsheet`, `isActive` (soft-delete), `importedAt`, `updatedAt`

Indexes: `[pixelPitch, environment]`, `[manufacturer]`, `[isActive]`

## API Routes

### `/api/products` (GET)
List products with filtering:
- `?search=` — text search across displayName, modelNumber, manufacturer, productFamily
- `?manufacturer=` — exact match (case-insensitive)
- `?environment=` — indoor, outdoor, indoor_outdoor
- `?pitchMin=` / `?pitchMax=` — pixel pitch range
- `?active=false` — include deactivated products
- Returns: `{ products, total, manufacturers }` (manufacturers list for filter dropdowns)

### `/api/products` (POST)
Create a single product. Required: manufacturer, modelNumber, pixelPitch, cabinetWidthMm, cabinetHeightMm, maxPowerWattsPerCab.

### `/api/products/[id]` (GET/PUT/DELETE)
- GET: Fetch single product
- PUT: Partial update (only send changed fields)
- DELETE: Soft-delete (sets `isActive = false`)

### `/api/products/import` (POST)
Bulk import from Excel/CSV. Accepts multipart form with `file` field and optional `manufacturer` default. Smart column mapping handles different manufacturer header formats.

## Product Matching Engine
**File:** `services/catalog/productMatcher.ts`

`ProductMatcher.matchProduct(spec)` — async method that:
1. Queries Prisma for active products matching environment + optional manufacturer preference
2. Sorts by closeness to target pixel pitch
3. Calculates cabinet matrix (cols × rows) to fill target dimensions
4. Returns `MatchedSolution` with module details, resolution, total modules, and fitScore (0-100)
5. Falls back to hardcoded `LED_MODULES` in `data/catalogs/led-products.ts` if DB is empty

## Admin UI
**Page:** `/admin/products` (auth-guarded, admin only)

Features:
- Sortable table with all key specs
- Filters: search, manufacturer dropdown, environment, pitch range
- Inline editing (click Edit → modify → Save/Cancel)
- Add product form
- Excel import button
- Soft-delete per product

## Seed Data
**Script:** `prisma/seed-products.ts`
14 products across LG, Yaham, Absen, Unilumin. Run with `npx ts-node prisma/seed-products.ts`.

## Key Patterns
- All prices in USD unless noted
- `modelNumber` is the unique key for upsert during import
- `extendedSpecs` JSON field captures any unmapped columns from manufacturer spreadsheets
- Environment is normalized: outdoor, indoor, indoor_outdoor
- Soft-delete via `isActive` flag — never hard-delete products
