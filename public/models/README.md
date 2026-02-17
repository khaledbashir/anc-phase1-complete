# Arena GLB Models

Drop a `.glb` arena model here named `arena.glb` and the Virtual Venue Visualizer V2 will automatically load it.

## Requirements

- **Format:** `.glb` (binary glTF)
- **File name:** `arena.glb`
- **Mesh naming:** Name meshes to match zone IDs for automatic zone detection:
  - `scoreboard` — Center-hung scoreboard
  - `ribbon-north` — North ribbon board
  - `ribbon-south` — South ribbon board
  - `fascia` — Upper fascia ring
  - `vomitory` — Tunnel entrance displays
  - `concourse` — Concourse wall displays
  - `marquee` — Exterior entrance sign

## Recommended Sources

- [Sketchfab](https://sketchfab.com) — Search "arena interior" or "stadium"
- [Spline](https://spline.design) — Create custom, export as GLB
- [Blender](https://blender.org) — Model from scratch or modify existing

## How It Works

The V2 visualizer uses React Three Fiber with `useGLTF` from drei. If `/models/arena.glb` exists, it loads as the arena shell alongside the procedural geometry. The procedural arena (bowl, court, tunnels, etc.) always renders as a fallback and can coexist with the GLB model.

To use the GLB model exclusively, you would modify `ArenaScene.tsx` to conditionally hide the procedural shell when the GLB loads successfully.
