# Virtual Venue Visualizer

**Module:** ANC Proposal Engine — Demo Lab  
**Route:** `/demo/virtual-venue`  
**Branch:** `phase2/product-database`  
**Status:** Production-ready  
**Last Updated:** February 2026

---

## Table of Contents

1. [What It Is](#what-it-is)
2. [Why It Exists](#why-it-exists)
3. [Who It's For](#who-its-for)
4. [How to Access](#how-to-access)
5. [Architecture Overview](#architecture-overview)
6. [3D Scene Anatomy](#3d-scene-anatomy)
7. [LED Screen Zones](#led-screen-zones)
8. [Controls HUD — Configure Tab](#controls-hud--configure-tab)
9. [Controls HUD — Brand Tab](#controls-hud--brand-tab)
10. [Controls HUD — Value Tab](#controls-hud--value-tab)
11. [Venue Types](#venue-types)
12. [Scene Moods](#scene-moods)
13. [Camera Presets](#camera-presets)
14. [Package Presets](#package-presets)
15. [Auto Tour Mode](#auto-tour-mode)
16. [Presentation Mode](#presentation-mode)
17. [Before/After Toggle](#beforeafter-toggle)
18. [Screenshot Export](#screenshot-export)
19. [Pricing Model](#pricing-model)
20. [Revenue Model](#revenue-model)
21. [ROI Calculations](#roi-calculations)
22. [File Structure](#file-structure)
23. [Data Schema Reference](#data-schema-reference)
24. [Technical Implementation](#technical-implementation)
25. [Performance Considerations](#performance-considerations)
26. [Known Limitations](#known-limitations)
27. [Future Roadmap](#future-roadmap)

---

## What It Is

The Virtual Venue Visualizer is a real-time, interactive 3D arena environment built with Three.js inside the ANC Proposal Engine. It renders a complete sports/entertainment venue — bowl seating, playing surface, lighting rig, tunnel entrances, scorer's table, and a packed crowd of 4,000 instanced spectators — with every LED screen zone modeled as toggleable 3D geometry.

Users can upload a sponsor logo (or type a client name), and every screen in the arena updates live. They can toggle individual screen zones on and off, switch between venue types (NBA, NHL, NFL, Concert, MLS), change the lighting mood, fly through 8 camera angles, and immediately see the financial impact: hardware cost, sell price, annual sponsor revenue, and ROI payback period.

It is not a mockup. It is not a static image. It is a fully interactive, GPU-accelerated 3D environment running at 60fps in the browser.

---

## Why It Exists

ANC Sports sells LED display systems to sports venues. The traditional sales process involves:

1. A sales rep describes what screens would look like in a venue
2. Static renderings are created (expensive, slow, usually outsourced)
3. Pricing is assembled manually in Excel
4. The client tries to imagine the result

This tool collapses all four steps into a single interactive session. A sales rep can sit with a venue decision-maker, pull up the Visualizer, type the client's name or drop in their logo, configure exactly which screen zones they want, switch between venue types to match the client's actual building, and show them — in real-time — what their arena would look like with ANC screens, what it would cost, and how fast it pays for itself through sponsorship revenue.

**The core sales pitch becomes visceral instead of abstract.**

The Before/After toggle is the money shot: flip between an empty arena and one fully equipped with glowing LED screens. The Presentation Mode lets you leave it running on a big screen in a conference room. The Auto Tour cycles through all camera angles automatically.

---

## Who It's For

| Role | Use Case |
|------|----------|
| **ANC Sales Reps** | Live client demos, pitch meetings, trade show booths |
| **Venue Decision Makers** | See their arena transformed before committing |
| **ANC Proposal Team** | Quick visual validation of screen zone configurations |
| **ANC Leadership** | Trade show demos, board presentations, investor meetings |
| **Marketing** | Screenshots and recordings for collateral |

---

## How to Access

**URL:** `https://<your-domain>/demo/virtual-venue`

The page is inside the Demo Lab section of the application. No authentication is required to view it (it's in the `/demo` route group). The 3D environment loads client-side only — Three.js is dynamically imported with `ssr: false` to avoid server-side rendering issues.

The page is a single full-screen component. There is no separate mobile layout — this tool is designed for desktop/laptop screens and large displays.

---

## Architecture Overview

```
page.tsx                          → Next.js page (dynamic import, ssr: false)
  └── VenueCanvas.tsx             → Main component (Three.js scene + state)
        ├── buildScene()          → Arena geometry, lights, crowd, volumetrics
        ├── buildZoneGroups()     → LED screen meshes grouped by zone
        ├── animate()             → Render loop (camera lerp, ribbon scroll, auto-tour)
        └── ControlsHUD.tsx       → Sidebar UI (3 tabs: Configure, Brand, Value)

data/venueZones.ts                → All data: zones, packages, cameras, venue types, moods
```

**Stack:**
- **Renderer:** Three.js (WebGL) with ACES Filmic tone mapping
- **Controls:** OrbitControls (orbit, zoom, no pan)
- **UI Framework:** React 18 + Tailwind CSS
- **Icons:** Lucide React
- **Utilities:** `cn()` from shadcn/ui for conditional class merging

**No external 3D models are loaded.** Every piece of geometry is constructed programmatically using Three.js primitives (PlaneGeometry, BoxGeometry, CylinderGeometry, LatheGeometry, TorusGeometry, ConeGeometry, BufferGeometry). This means zero loading time for assets beyond the JavaScript bundle itself.

---

## 3D Scene Anatomy

The arena is built from the following elements, created in `buildScene()`:

### Arena Structure
| Element | Geometry | Details |
|---------|----------|---------|
| **Floor** | PlaneGeometry 200×200 | Dark metallic surface (color `0x030812`) |
| **Stadium Bowl** | LatheGeometry (11-point profile, 80 segments) | Scaled 0.7 in Z for oval shape. Rendered `BackSide` to appear as concave interior |
| **Seating Tiers** | 3× TorusGeometry at y=6, 10, 14 | Radii 22, 26, 30 — gives visual depth to the bowl |
| **Playing Court** | PlaneGeometry (size varies by venue type) | Reflective surface: roughness 0.5, metalness 0.15 (NBA default) |
| **Court Lines** | Group of TorusGeometry + PlaneGeometry | Center circle, half-court line, three-point arcs |
| **Lighting Rig** | TorusGeometry radius=10 at y=22 | Dark metallic catwalk ring |

### Atmosphere
| Element | Implementation | Count |
|---------|---------------|-------|
| **Crowd** | InstancedMesh (BoxGeometry 0.25×0.45×0.25) | **4,000 instances** |
| **Atmosphere Particles** | Points (BufferGeometry) | 1,500 points (4500 float values ÷ 3) |
| **Volumetric Light Cones** | ConeGeometry (radius 5, height 22) | 9 cones around the rig |
| **Arena Tunnels** | BoxGeometry 2.5×3×2.5 | 4 entrances at cardinal positions |
| **Scorer's Table** | BoxGeometry 8×0.5×0.8 | Courtside at z=-5.5 |

### Lighting
| Light | Type | Intensity | Position |
|-------|------|-----------|----------|
| **Ambient** | AmbientLight | 0.2 (default, changes with mood) | Scene-wide |
| **Main Spot** | SpotLight | 100 | (0, 35, 0) — straight down, casts shadows |
| **Spot 2** | SpotLight | 70 | (20, 28, -15) — French Blue accent |
| **Spot 3** | SpotLight | 50 | (-20, 24, 15) — Cyan accent |
| **Rim Lights** | 2× PointLight | 12 each | (±30, 5, 0) — French Blue |
| **Rim Lights** | 2× PointLight | 8 each | (0, 5, ±30) — Cyan |

### Crowd System

The crowd uses `THREE.InstancedMesh` — a single draw call renders all 4,000 spectators. Each instance is a small box positioned along the bowl's lathe profile:

- **Angle:** Random 0–2π (full circle)
- **Vertical position (t):** Random 0.05–0.93, mapped to y = 0.3–17.3
- **Radius:** 18 + t×16 (inner edge to outer edge of bowl), with ±1.0 jitter
- **Z-axis scaled ×0.7** to match the bowl's oval shape
- **Facing inward:** rotation.y = angle + π
- **Scale:** Random 0.65–1.15

Colors are drawn from an 11-color palette (team blues, whites, grays, red, gold) with ±12% RGB jitter per instance. The result looks like a packed arena with realistic color variation.

### Volumetric Light Cones

9 transparent cones point downward from the lighting rig, spaced every 0.7 radians around a circle of radius 8. They use additive blending at 2.5% opacity, creating a subtle god-ray effect without any shader complexity. The `depthWrite: false` prevents z-fighting with other transparent objects.

---

## LED Screen Zones

There are **7 screen zones**, each modeled as a Three.js Group containing screen face meshes and frame geometry. All zones are defined in `venueZones.ts` and constructed in `buildZoneGroups()`.

### Zone Inventory

| Zone ID | Name | Display Type | Size (ft) | Qty | Pixel Pitch | $/sqft | Annual Revenue |
|---------|------|-------------|-----------|-----|-------------|--------|---------------|
| `scoreboard` | Center-Hung Scoreboard | Main Scoreboard | 25×15 | 1 | 4mm | $178.09 | $850,000 |
| `ribbon-north` | Ribbon Board (North) | Ribbon Board | 200×3 | 1 | 10mm | $112.22 | $420,000 |
| `ribbon-south` | Ribbon Board (South) | Ribbon Board | 200×3 | 1 | 10mm | $112.22 | $520,000 |
| `fascia` | Fascia Boards | Fascia Board | 300×2 | 1 | 10mm | $116.25 | $380,000 |
| `vomitory` | Vomitory Signs | Vomitory | 6×3 | 6 | 6mm | $136.51 | $180,000 |
| `concourse` | Concourse Displays | Concourse | 10×6 | 4 | 2.5mm | $251.57 | $240,000 |
| `marquee` | Marquee / Entrance Sign | Marquee | 30×10 | 1 | 10mm | $154.79 | $320,000 |

### 3D Geometry Per Zone

**Scoreboard:** Box housing (8×4.5×5) suspended by 4 cables (CylinderGeometry). 2 front/back faces (7.6×4.1), 2 side faces (4.6×4.1), 1 bottom face (7.6×4.6). All screen faces use emissive materials with the sponsor texture.

**Ribbon Boards (North/South):** CylinderGeometry (radius 25.5, height 1.2, 64 segments, half-circle arc). Texture is cloned with `RepeatWrapping` and `repeat.set(2, 1)` so the sponsor content tiles twice around the ribbon. Frame rings above and below using TorusGeometry. Rendered `BackSide` (viewed from inside the bowl).

**Fascia:** Full CylinderGeometry ring (radius 33, height 0.8, 80 segments). Texture repeats 6× around the ring. Positioned at y=15 (upper deck rail). Rendered `BackSide`.

**Vomitory Signs:** 6 flat screens at tunnel entrance positions, evenly spaced at 60° intervals. Each is a 2.5×1.5 face with a 2.7×1.7 frame. The group `lookAt(0, 4, 0)` so all signs face the court center.

**Concourse Displays:** 4 large flat screens (4×2.5) mounted on the outer wall at positions (±28, 3, ±10). Each has a frame box behind it.

**Marquee:** A 12×5 face at (0, 6, 40) — the venue entrance. Mounted on two 8ft support columns. Largest single exterior screen.

**Courtside Boards:** 4 low boards around the court perimeter (2 long at 14ft, 2 short at 8ft) with legs. These are always visible and not toggled with a zone — they provide visual framing for the court.

### Screen Textures

All screens display a dynamically generated `CanvasTexture`:

**Default (no logo):** Dark gradient background with a subtle 6px LED pixel grid, the text "ANC PARTNER" (or the typed client name) in French Blue with 30px glow, "PREMIUM LED DISPLAY" subtitle in cyan, and corner accent lines.

**With Logo:** The uploaded image is composited onto a dark background at 75% max fill, optionally using `screen` blend mode to remove white backgrounds.

**Texture Animation:** Ribbon boards and fascia textures have `RepeatWrapping` enabled. In the animation loop, their `offset.x` is incremented by `delta × 0.03` each frame, creating a continuous horizontal scroll effect. When textures are regenerated (logo/name change), the wrapping and repeat settings are preserved by cloning the new texture and copying the repeat vector from the old one.

---

## Controls HUD — Configure Tab

The left sidebar is a 380px-wide panel with 3 tabs. The Configure tab contains (in order from top to bottom):

### 1. Venue Type Selector
A 3-column grid of 5 buttons, each showing an emoji icon, venue name, and capacity. Clicking one changes the court color, size, and surface material properties in real-time.

### 2. Scene Mood
A horizontal row of 5 pill buttons. Clicking one changes ambient light intensity, spot light intensity, fog near/far/color, renderer exposure, and screen emissive glow — all in real-time, no scene rebuild needed.

### 3. Before/After Toggle
A single full-width toggle button. When enabled ("Before: Empty Venue"), all LED screen zones are hidden. When disabled ("After: ANC Equipped"), zones follow their individual toggle states. This is for showing the transformation — empty venue vs. ANC-equipped.

### 4. Quick Packages
3 preset configurations (Essential/Premium/Flagship) that activate specific combinations of zones in one click. Each shows the package name, badge (GOOD/BETTER/BEST), zone count, total sell price, and annual revenue. Clicking one sets the active zone set to exactly those zones.

### 5. Screen Zones
Individual toggle switches for each of the 7 zones. Each row shows the zone icon, name, quantity multiplier (if >1), pixel pitch, total area in sqft, and annual revenue. An "All On" / "Clear" button at the top toggles everything.

### 6. Camera Angles
A 2-column grid of 8 camera preset buttons. Clicking one smoothly lerps the camera to that position over ~0.5 seconds. The currently active preset is highlighted. Clicking any manual preset stops Auto Tour if it's running.

### 7. Auto Tour + Presentation
Two buttons at the bottom:
- **Auto Tour:** Toggle switch that cycles through all 8 camera presets every 6 seconds. Uses a ref-synced boolean so the animation loop can read it without re-renders.
- **Presentation Mode:** Launches full-screen mode (hides sidebar, expands canvas, starts auto-tour, shows branded watermark).

---

## Controls HUD — Brand Tab

### 1. Sponsor Logo Upload
A drag-and-drop zone (or click-to-browse) accepting PNG, JPG, SVG, and WebP. Once uploaded, a preview appears with a red X button to remove it. The logo is composited onto every screen in the arena.

### 2. Sponsor / Client Name
A text input. Whatever is typed appears on all screens (when no logo is uploaded). The default placeholder is "ANC PARTNER".

### 3. LED Brightness
A range slider from 10% to 200%. Controls the `emissiveIntensity` multiplier on all screen materials. Default is 100% (intensity = 3.5).

### 4. Screen Blend Mode
A toggle switch. When enabled, logos are composited using `screen` blend mode, which removes white backgrounds. Useful for logos that aren't on transparent backgrounds.

---

## Controls HUD — Value Tab

### 1. Project Investment
A line-item breakdown:
- **LED Hardware** — sum of (width × height × costPerSqFt × quantity) for all active zones
- **Services & Install (+45%)** — hardware cost × 0.45 (structure, electrical, PM, engineering, shipping)
- **Total Project Cost** — (hardware + services) ÷ (1 - 0.30) — i.e., 30% margin applied

### 2. Sponsorship Revenue Potential
A highlighted card showing total annual sponsor revenue from all active zones, with a per-zone breakdown list showing each zone's icon, name, and annual revenue.

### 3. Return on Investment
Two KPI cards:
- **Years to Payback** — total sell price ÷ annual revenue
- **Annual ROI** — (annual revenue ÷ total sell price) × 100%

Plus a narrative summary: "This configuration generates $X in annual sponsor revenue, paying back the $Y investment in Z years. Over 10 years: $W net revenue."

### 4. Export
A "Download Arena Screenshot" button that renders the current 3D frame to a PNG and triggers a browser download. The filename includes the client name if set.

---

## Venue Types

| ID | Name | Court Color | Surface Properties | Court Size | Icon |
|----|------|------------|-------------------|-----------|------|
| `nba` | NBA Arena (18,000) | `0x2a1f0a` warm hardwood | roughness 0.5, metalness 0.15 | 16×9 | 🏀 |
| `nhl` | NHL Arena (18,500) | `0xd0dce8` ice white | roughness 0.15, metalness 0.4 | 17×8 | 🏒 |
| `nfl` | NFL Stadium (70,000) | `0x1a3a1a` green turf | roughness 0.8, metalness 0.05 | 20×10 | 🏈 |
| `concert` | Concert Hall (12,000) | `0x0a0a0a` dark stage | roughness 0.8, metalness 0.05 | 12×8 | 🎤 |
| `mls` | MLS Stadium (25,000) | `0x1a3a1a` green pitch | roughness 0.8, metalness 0.05 | 22×13 | ⚽ |

When a venue type is selected, the court mesh's material color, roughness, and metalness are updated, and the geometry is replaced with the new dimensions. The NHL ice surface is notably reflective — it picks up specular highlights from the spotlights, simulating real ice.

---

## Scene Moods

Each mood adjusts 7 parameters simultaneously:

| ID | Name | Ambient | Spots | Fog Near/Far | Fog Color | Exposure | Screen Glow |
|----|------|---------|-------|-------------|-----------|----------|-------------|
| `game-night` | Game Night | 0.2 | 100 | 30/130 | `0x030812` | 1.4 | 3.5× |
| `concert` | Concert Mode | 0.1 | 120 | 20/100 | `0x0a0518` | 1.6 | 4.5× |
| `corporate` | Corporate Event | 0.6 | 60 | 50/160 | `0x0c1020` | 1.8 | 2.0× |
| `bright` | Full Lights | 1.0 | 40 | 60/200 | `0x101828` | 2.2 | 1.5× |
| `blackout` | Blackout | 0.02 | 15 | 10/60 | `0x000005` | 1.0 | 5.0× |

**Game Night** (default): Dark arena, dramatic lighting, screens pop. Standard broadcast atmosphere.

**Concert Mode:** Even darker with purple-tinted fog, maximum screen glow, and higher spot intensity. Simulates a halftime show or concert event.

**Corporate Event:** Brighter ambient, pushed-back fog, moderate screen glow. Professional and well-lit — suitable for corporate presentations.

**Full Lights:** Maximum visibility. Arena is fully lit, fog is minimal, screens are subdued. Good for showing structural detail and court markings.

**Blackout:** Near-total darkness. Only the screens themselves are visible, at maximum glow. This is the most dramatic mood — pure screen impact in total darkness.

---

## Camera Presets

| ID | Label | Position (x, y, z) | Look Target | Auto Rotate |
|----|-------|-------------------|-------------|-------------|
| `overview` | Arena Overview | (22, 16, 28) | (0, 6, 0) | Yes |
| `fan-upper` | Fan POV (Upper) | (25, 14, 18) | (0, 8, 0) | No |
| `fan-lower` | Fan POV (Lower) | (16, 6, 14) | (0, 6, 0) | No |
| `broadcast` | Broadcast View | (0, 10, 28) | (0, 8, 0) | No |
| `suite` | Suite Level | (18, 16, 8) | (0, 12, 0) | No |
| `courtside` | Courtside | (8, 3, 16) | (0, 0.6, 0) | No |
| `scoreboard` | Center Hung | (0, 12, 18) | (0, 14, 0) | No |
| `entrance` | Venue Entrance | (0, 8, 50) | (0, 6, 38) | No |

Camera transitions use linear interpolation (lerp) at `Math.min(2 × delta, 1)` per frame, producing a smooth ~0.5-second glide between any two positions. The Arena Overview preset enables auto-rotation at 0.25 speed — a slow orbit around the venue.

OrbitControls settings:
- Pan disabled (prevents users from getting lost)
- Min distance: 5, Max distance: 70
- Max polar angle: ~89° (can't go below the floor)
- Damping enabled (factor 0.05) for smooth deceleration

---

## Package Presets

| ID | Name | Badge | Zones Included | Color |
|----|------|-------|---------------|-------|
| `essential` | Essential | GOOD | Scoreboard + Ribbon North + Ribbon South | Blue `#3B82F6` |
| `premium` | Premium | BETTER | Essential + Fascia + Vomitory | Purple `#8B5CF6` |
| `flagship` | Flagship | BEST | All 7 zones | Green `#10B981` |

Each package button shows the total sell price and annual revenue, computed live from the zone data. Clicking a package sets `activeZoneIds` to exactly that set — it's not additive.

---

## Auto Tour Mode

When enabled, the animation loop cycles through all 8 camera presets every 6 seconds. Implementation:

1. A `useRef(false)` tracks the boolean (avoids re-renders)
2. A `useEffect` syncs the React state to the ref
3. In `animate()`, a timer accumulates `delta` time
4. When the timer exceeds 6 seconds, it resets and advances to the next preset
5. The camera target position and look-at are updated, and the lerp handles the smooth transition

Clicking any manual camera angle in the HUD stops the auto-tour by calling `setAutoTour(false)`.

---

## Presentation Mode

Activating Presentation Mode (from the header button, the Configure tab button, or via `onPresentationMode`):

1. **Hides the sidebar** — ControlsHUD is conditionally rendered (`{!presentationMode && <ControlsHUD />}`)
2. **Canvas goes full-width** — the container div switches from `pl-[380px]` to no padding
3. **Canvas resizes** — a `useEffect` on `presentationMode` calls `requestAnimationFrame` to update the camera aspect ratio and renderer size after the CSS layout recalculates
4. **Auto-tour starts** — `setAutoTour(true)` is called alongside `setPresentationMode(true)`
5. **Branded watermark** — a subtle ANC Sports wordmark appears in the top-right at 7% opacity, plus the client name if set
6. **Live stats** — zone count, sell price, and revenue appear at bottom-left at 20% opacity
7. **Exit button** — a nearly invisible button at bottom-center reads "Press ESC or click to exit presentation"

**ESC key handler:** A `useEffect` listens for `keydown` events. If the key is `Escape` and `presentationMode` is true, it exits and stops auto-tour.

---

## Before/After Toggle

The simplest but most effective sales feature. When `beforeAfter` is `true`:

```typescript
group.visible = beforeAfter ? false : activeZoneIds.has(zoneId);
```

All LED screen zone groups are hidden. The arena still has its crowd, lighting, court, tunnels, and atmosphere — but no screens. Flip it off, and every active screen zone instantly appears, glowing with the sponsor's branding. The transformation is immediate and visceral.

---

## Screenshot Export

The `takeScreenshot` function:

1. Forces a render: `renderer.render(scene, camera)`
2. Reads the canvas as a data URL: `renderer.domElement.toDataURL("image/png")`
3. Creates a temporary `<a>` element with `download` attribute
4. Filename: `{clientName}_Visualizer.png` (sanitized to alphanumeric + underscore)
5. Triggers a click and removes the element

The WebGL renderer is created with `preserveDrawingBuffer: true` specifically to enable this — normally, the buffer is cleared after each frame for performance.

---

## Pricing Model

All pricing uses real data from the **Yaham NX Rate Card (LGEUS Markup, February 2026)**.

### Cost Calculation

```
Hardware Cost = Σ (zone.width × zone.height × zone.costPerSqFt × zone.quantity)
Services Cost = Hardware Cost × 0.45
Total Project  = Hardware Cost + Services Cost
Sell Price     = Total Project ÷ (1 - 0.30)
```

| Constant | Value | Source |
|----------|-------|--------|
| `SERVICES_MULTIPLIER` | 0.45 (45%) | Typical ratio from ANC EstimatorBridge calculations. Covers structural materials, structural labor, LED installation, electrical & data, PM/GC/travel, submittals, engineering, and permits. |
| `DEFAULT_MARGIN` | 0.30 (30%) | Standard ANC proposal margin on LED hardware projects. Applied as a divisor: `cost / (1 - margin)`. |

### Cost Per Square Foot by Pixel Pitch

| Product | Pitch | $/sqft | Notes |
|---------|-------|--------|-------|
| Yaham Corona C2.5-MIP | 2.5mm | $251.57 | NationStar MIP LEDs, highest resolution |
| Yaham Corona C4 | 4mm | $178.09 | Nitxeon LEDs, main scoreboard standard |
| Yaham Corona C6 | 6mm | $136.51 | Vomitory / entry signage |
| Yaham Corona C10 | 10mm | $112.22 | Ribbon boards, lowest cost indoor |
| Yaham Halo H10T | 10mm | $116.25 | Fascia-specific form factor |
| Yaham Radiance R10 | 10mm | $154.79 | Outdoor (marquee), IP66, 10000 nits |

These are LGEUS 28% markup prices (ANC's acquisition cost from LG's distribution channel), including ex-works, 10% tariff, and 5% shipping.

---

## Revenue Model

Revenue projections are based on industry benchmarks from IEG, KORE Software, and ANC internal data for typical NBA/NHL arena sponsorship packages.

### Per-Zone Revenue Assumptions

Each zone has:
- **annualSponsorRevenue** — total annual revenue from all sponsors on that zone
- **avgCPM** — average cost per thousand impressions
- **impressionsPerEvent** — venue attendance per event
- **eventsPerYear** — events/year (default: 150 for all zones)

The revenue figures represent what a venue can expect to earn from selling advertising inventory on each screen zone across a typical event calendar. The south ribbon commands higher revenue ($520K vs $420K) because it's the broadcast camera side — TV exposure multiplies the impression value.

### Revenue Breakdown by Package

| Package | Zones | Annual Revenue |
|---------|-------|---------------|
| Essential (3 zones) | Scoreboard + 2 Ribbons | $1,790,000 |
| Premium (5 zones) | + Fascia + Vomitory | $2,350,000 |
| Flagship (7 zones) | All screens | $2,910,000 |

---

## ROI Calculations

Displayed in the Value tab when both sell price and revenue are non-zero.

```
Payback Period = Total Sell Price ÷ Annual Sponsor Revenue
Annual ROI     = (Annual Sponsor Revenue ÷ Total Sell Price) × 100%
10-Year Net    = (Annual Revenue × 10) - Total Sell Price
```

For the Flagship package:
- Sell price: ~$3.1M
- Annual revenue: $2.91M
- Payback: ~1.1 years
- Annual ROI: ~94%
- 10-year net: ~$26M

These numbers make the case that LED screens are not a cost — they're a revenue-generating asset that pays for itself in the first year.

---

## File Structure

```
app/demo/virtual-venue/
├── page.tsx                          # Next.js page (dynamic import, ssr: false)
├── data/
│   └── venueZones.ts                 # All data: zones, packages, cameras, venue types, moods
└── components/
    └── three/
        ├── VenueCanvas.tsx           # Main 3D component (~650 lines)
        └── ControlsHUD.tsx           # Sidebar UI (~575 lines)
```

### venueZones.ts Exports

| Export | Type | Description |
|--------|------|-------------|
| `VENUE_ZONES` | `VenueZone[]` | 7 screen zone definitions with specs, cost, and revenue |
| `SERVICES_MULTIPLIER` | `number` | 0.45 — services cost ratio |
| `DEFAULT_MARGIN` | `number` | 0.30 — sell price margin |
| `PACKAGE_PRESETS` | `PackagePreset[]` | 3 Good/Better/Best configurations |
| `CAMERA_PRESETS` | `CameraPreset[]` | 8 named camera positions |
| `VENUE_TYPES` | `VenueType[]` | 5 sport/venue configurations |
| `SCENE_MOODS` | `SceneMood[]` | 5 lighting atmosphere presets |

### VenueCanvas.tsx Structure

| Section | Lines | Purpose |
|---------|-------|---------|
| `makeTextTexture()` | ~30 | Generates canvas texture with client name + LED grid |
| `makeLogoTexture()` | ~15 | Composites uploaded logo onto dark background |
| `buildScene()` | ~140 | Arena geometry, lights, crowd, volumetrics, tunnels, table |
| `buildZoneGroups()` | ~155 | LED screen meshes grouped by zone ID |
| `LoadingOverlay` | ~15 | Animated loading spinner |
| `VenueCanvas` (component) | ~280 | State, effects, animation loop, JSX |

### ControlsHUD.tsx Structure

| Section | Lines | Purpose |
|---------|-------|---------|
| Props interface | ~30 | 25+ props for full bidirectional state |
| Configure tab | ~250 | Venue type, mood, before/after, packages, zones, cameras, tour |
| Brand tab | ~80 | Logo upload, client name, brightness, blend mode |
| Value tab | ~90 | Pricing, revenue, ROI, export |

---

## Data Schema Reference

### VenueZone

```typescript
interface VenueZone {
  id: string;                    // Unique zone identifier
  name: string;                  // Display name
  displayType: string;           // Category (Scoreboard, Ribbon, etc.)
  defaultWidthFt: number;        // Width in feet
  defaultHeightFt: number;       // Height in feet
  quantity: number;              // Number of identical units
  pixelPitch: string;            // LED pitch ("4mm", "10mm", etc.)
  environment: "indoor" | "outdoor";
  costPerSqFt: number;          // LGEUS 28% markup price
  icon: LucideIcon;             // React icon component
  description: string;           // Human-readable description
  annualSponsorRevenue: number;  // Expected annual revenue ($)
  avgCPM: number;               // Cost per thousand impressions ($)
  impressionsPerEvent: number;   // Attendance per event
  eventsPerYear: number;         // Events per year
}
```

### VenueType

```typescript
interface VenueType {
  id: string;
  name: string;
  capacity: string;              // Display string ("18,000")
  courtColor: number;            // Hex color for court surface
  courtShape: "rect" | "oval";   // Currently visual only
  courtW: number;                // Court width in 3D units
  courtH: number;                // Court height in 3D units
  icon: string;                  // Emoji
  description: string;
}
```

### SceneMood

```typescript
interface SceneMood {
  id: string;
  name: string;
  description: string;
  ambientIntensity: number;      // 0.02 – 1.0
  spotIntensity: number;         // 15 – 120
  fogNear: number;               // 10 – 60
  fogFar: number;                // 60 – 200
  fogColor: number;              // Hex color
  exposure: number;              // Tone mapping exposure (1.0 – 2.2)
  screenGlow: number;            // Emissive intensity multiplier (1.5 – 5.0)
  accentColor: string;           // CSS hex (for potential UI use)
}
```

### PackagePreset

```typescript
interface PackagePreset {
  id: string;
  name: string;
  description: string;
  zoneIds: string[];             // Zone IDs to activate
  badge: string;                 // "GOOD" | "BETTER" | "BEST"
  color: string;                 // CSS hex for badge/icon tinting
}
```

### CameraPreset

```typescript
interface CameraPreset {
  id: string;
  label: string;
  description: string;
  pos: [number, number, number];    // Camera position
  target: [number, number, number]; // OrbitControls target (look-at)
  autoRotate: boolean;              // Enable auto-rotation at this angle
}
```

---

## Technical Implementation

### Renderer Configuration

```typescript
antialias: true                     // Smooth edges
preserveDrawingBuffer: true         // Enables screenshot export
pixelRatio: min(devicePixelRatio, 2) // Cap at 2× for performance
toneMapping: ACESFilmicToneMapping  // Cinematic color response
toneMappingExposure: 1.4            // Default (changes with mood)
shadowMap.enabled: true             // Spot1 casts shadows
```

### State Management

All state lives in the `VenueCanvas` component via `useState` hooks. There is no external state management (no Redux, Zustand, or Context). State is passed to `ControlsHUD` via props. The 25+ props are intentional — this keeps the data flow explicit and avoids hidden dependencies.

Refs are used for values that the animation loop needs to read without causing re-renders:
- `autoTourRef` — synced via `useEffect` from `autoTour` state
- `autoTourTimerRef` — accumulated delta time
- `autoTourIndexRef` — current camera index
- `sceneRefsRef` — direct references to Three.js objects (ambient light, spots, court mesh, crowd)

### Animation Loop

The `animate()` function runs via `requestAnimationFrame` at display refresh rate (typically 60fps):

1. **Camera lerp** — position and look-at smoothly interpolate toward target
2. **OrbitControls update** — handles user interaction, auto-rotation, damping
3. **Ribbon scroll** — traverses visible zone groups, finds wrapped textures, increments `offset.x`
4. **Auto-tour check** — if enabled, accumulates time and cycles cameras at 6-second intervals
5. **Render** — `renderer.render(scene, camera)`

### Texture Update Pipeline

When the user changes the logo, client name, brightness, or blend mode:

1. A `useEffect` fires with `[logoFile, clientName, brightness, multiplyBlend]` dependencies
2. If a logo file exists, it's loaded as an `Image` element and composited via `makeLogoTexture`
3. If no logo, `makeTextTexture` generates a text-based texture
4. `updateGroupTextures` traverses all zone groups
5. For each mesh with an emissive map, the texture is replaced
6. **Critical:** If the old texture had `RepeatWrapping` (ribbon/fascia), the new texture is cloned and the wrapping/repeat settings are copied over — this preserves the tiling and scroll animation

---

## Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| **4000 crowd instances** | Single draw call via `InstancedMesh` — no per-instance overhead |
| **Pixel ratio** | Capped at 2× to prevent 4K+ rendering on high-DPI displays |
| **Texture updates** | Only triggered on user input (logo/name change), not per-frame |
| **Fog** | Cheap screen-space effect, hides distant geometry naturally |
| **Volumetric cones** | Geometry-based (not ray-marched), 9 transparent meshes with no shader cost |
| **Ribbon scroll** | Only traverses visible groups; skips hidden ones |
| **Shadow map** | Only one light (spot1) casts shadows — the minimum for visual quality |
| **Geometry reuse** | Frame material is shared across all zones; screen material factory creates unique instances only where needed (for per-zone texture control) |
| **No external assets** | Zero HTTP requests for 3D models — everything is procedural geometry |

The scene typically renders at 60fps on modern hardware (any discrete GPU or Apple Silicon). Integrated GPUs on older laptops may drop to 30-45fps due to the crowd instancing and volumetric cone transparency.

---

## Known Limitations

1. **Court lines are basketball-only.** Switching to NHL/NFL/Concert doesn't change the court markings — only the surface color and size change. Court lines remain as NBA-style center circle, half-court line, and three-point arcs regardless of venue type.

2. **No zone dimension editing.** Zone sizes are fixed at their default values. A planned Zone Dimension Editor (W×H sliders per zone) would allow per-zone sizing with live price recalculation, but it requires complex state management since dimension changes affect both the 3D geometry and the pricing calculations.

3. **No multi-sponsor support.** All screens show the same texture. In reality, different zones would show different sponsors in rotation. A future version could support a sponsor library with per-zone assignment.

4. **No mobile layout.** The 380px sidebar + 3D canvas assumes a desktop/laptop screen. On tablets or phones, the sidebar would overlap the canvas or be too narrow to use.

5. **Bowl geometry is fixed.** The lathe profile doesn't change with venue type. An NFL stadium would have a fundamentally different bowl shape than an NBA arena. Currently only the court surface changes — the seating bowl remains the same oval.

6. **Revenue figures are benchmarks, not quotes.** The annual sponsor revenue numbers are based on industry averages, not specific venue negotiations. Actual revenue varies significantly by market size, team performance, and local sponsorship demand.

7. **No persistence.** Configurations are not saved. Refreshing the page resets everything to defaults. A future version could save configurations to the database or generate shareable URLs.

8. **Single-page app.** No routing within the visualizer. Everything happens on one page. The back button exits to `/demo`.

---

## Future Roadmap

| Feature | Priority | Complexity | Impact |
|---------|----------|-----------|--------|
| Zone Dimension Editor (W×H sliders) | High | Medium | Per-zone sizing with live price recalc |
| Configuration persistence (DB or URL) | High | Medium | Save and share configurations |
| Multi-sponsor mode | Medium | High | Different logos per zone with rotation |
| Sport-specific court lines | Medium | Low | Hockey rink lines, football yard lines |
| Sport-specific bowl shapes | Low | High | NFL stadium vs NBA arena geometry |
| Events/year slider (affects revenue) | Medium | Low | Client-specific event calendar |
| Sponsor rotation estimator | Medium | Low | "12 sponsors × 8s = 96s cycle" per zone |
| PDF export of configuration | High | Medium | One-page summary with screenshot + pricing |
| Click-to-select zones in 3D | Medium | High | Raycasting to select zones by clicking screens |
| Sound design (ambient crowd) | Low | Low | Optional ambient arena audio |

---

*This document describes the Virtual Venue Visualizer as of commit `229dcca1` on `phase2/product-database`. It is a living document — update it when features are added or changed.*
