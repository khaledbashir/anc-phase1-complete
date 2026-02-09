# ANC Product Catalog — Knowledge Document for AnythingLLM

## Purpose
This document enables AnythingLLM to answer questions about ANC's LED display product catalog, recommend products for specific projects, and compare specifications across manufacturers.

## Product Database Overview
ANC maintains a structured product catalog of LED display modules from multiple manufacturers. Each product represents a single LED cabinet/module with detailed specifications.

## Manufacturers in Catalog
- **LG** — Premium indoor fine-pitch displays (GSQA series, LAA series)
- **Yaham** — Indoor and outdoor displays (MG, Slim series)
- **Absen** — Indoor fine-pitch and outdoor (A27, X series)
- **Unilumin** — Indoor and outdoor (UpadIII, Ustorm series)

## How to Recommend a Product
When asked to recommend a product for a project, consider:

1. **Environment**: Indoor vs Outdoor vs Both
   - Indoor: lobbies, concourses, conference rooms, retail
   - Outdoor: stadium facades, scoreboards, billboards
   - Indoor/Outdoor: covered but exposed areas

2. **Pixel Pitch**: Determines viewing distance and resolution
   - Fine pitch (≤2.5mm): Close viewing, conference rooms, lobbies
   - Standard indoor (2.5-6mm): Arenas, concourses, retail
   - Outdoor (6-16mm): Stadiums, facades, billboards
   - Rule of thumb: minimum viewing distance (meters) ≈ pixel pitch (mm)

3. **Brightness (Nits)**:
   - Indoor: 800-1500 nits typical
   - Semi-outdoor/high ambient: 3000-5000 nits
   - Full outdoor/direct sun: 5000-10000+ nits

4. **Cabinet Size**: Affects installation flexibility
   - Smaller cabinets (500×500mm): More flexible for odd shapes
   - Larger cabinets (960×960mm): Faster installation for large walls

5. **Service Access**: Front vs Rear
   - Front service: Wall-mounted, no rear access needed
   - Rear service: Requires walkway behind display
   - Front+rear: Maximum flexibility

## Product Specification Fields

| Field | Description | Example |
|-------|-------------|---------|
| manufacturer | Brand name | "LG", "Yaham" |
| productFamily | Product line/series | "GSQA", "MG Series" |
| modelNumber | Unique identifier | "GSQA039N" |
| pixelPitch | Pixel spacing in mm | 3.9 |
| cabinetWidthMm | Cabinet width | 600 |
| cabinetHeightMm | Cabinet height | 337.5 |
| maxNits | Peak brightness | 1200 |
| maxPowerWattsPerCab | Power per cabinet | 150 |
| environment | indoor/outdoor/indoor_outdoor | "indoor" |
| weightKgPerCabinet | Weight per cabinet | 7.5 |
| serviceType | front/rear/front_rear | "front" |
| supportsHalfModule | Can use half-width modules | true/false |
| costPerSqFt | ANC buy cost (confidential) | 85.00 |

## Querying the Catalog

### By Environment
- "What indoor products do we have?" → Filter environment = indoor
- "Show me outdoor displays" → Filter environment = outdoor

### By Pitch
- "What fine-pitch options under 4mm?" → Filter pixelPitch ≤ 4.0
- "Products for a stadium scoreboard" → Filter pixelPitch ≥ 10, environment = outdoor

### By Manufacturer
- "What LG products do we carry?" → Filter manufacturer = LG
- "Compare Yaham vs Absen for indoor" → Filter each + compare specs

### For a Specific Project
- "Recommend a display for a 20ft × 10ft indoor lobby" → Indoor, fine pitch (2-4mm), calculate cabinet count
- "What's best for an outdoor stadium 40ft × 20ft?" → Outdoor, 10mm+, high nits

## Cabinet Matrix Calculation
To determine how many cabinets are needed:
- `columns = round(target_width_mm / cabinet_width_mm)`
- `rows = round(target_height_mm / cabinet_height_mm)`
- `total_cabinets = columns × rows`
- `active_width = columns × cabinet_width_mm`
- `active_height = rows × cabinet_height_mm`

Convert feet to mm: `feet × 304.8 = mm`

## Resolution Calculation
- `horizontal_pixels = active_width_mm / pixel_pitch_mm`
- `vertical_pixels = active_height_mm / pixel_pitch_mm`
- `total_pixels = horizontal × vertical`

## API Access
Products can be queried via REST API at `/api/products` with filters:
- `?search=LG` — text search
- `?manufacturer=Yaham` — exact manufacturer
- `?environment=outdoor` — environment filter
- `?pitchMin=2&pitchMax=6` — pitch range

## Important Notes
- Cost/pricing fields are **confidential** — never share with clients
- Always recommend products that are `isActive = true`
- When in doubt, recommend the closest pixel pitch match for the viewing distance
- ANC prefers LG for premium indoor installations
- For outdoor, Yaham and Absen are strong options
