"use client";

import type { ZoneState } from "../hooks/useVenueState";

interface StadiumSvgProps {
  zones: ZoneState[];
  onToggle: (id: string) => void;
}

function getZoneActive(zones: ZoneState[], id: string): boolean {
  return zones.find((z) => z.id === id)?.isActive ?? false;
}

// Colors
const ACTIVE_FILL = "#0A52EF";
const ACTIVE_FILL_OUTDOOR = "#03B8FF";
const INACTIVE_FILL = "#1C1C1C";
const INACTIVE_STROKE = "#3A3A3A";
const FIELD_FILL = "#1a2f1a";
const SEATING_FILL = "#141414";
const BOWL_STROKE = "#2A2A2A";

export default function StadiumSvg({ zones, onToggle }: StadiumSvgProps) {
  const isActive = (id: string) => getZoneActive(zones, id);

  const zoneStyle = (id: string, outdoor = false): React.CSSProperties => ({
    fill: isActive(id) ? (outdoor ? ACTIVE_FILL_OUTDOOR : ACTIVE_FILL) : INACTIVE_FILL,
    stroke: isActive(id) ? (outdoor ? ACTIVE_FILL_OUTDOOR : ACTIVE_FILL) : INACTIVE_STROKE,
    strokeWidth: isActive(id) ? 1.5 : 1,
    filter: isActive(id) ? `url(#zone-glow${outdoor ? "-outdoor" : ""})` : "none",
    cursor: "pointer",
    transition: "fill 0.4s ease, stroke 0.4s ease, filter 0.4s ease",
    opacity: isActive(id) ? 1 : 0.6,
  });

  const labelStyle = (id: string): React.CSSProperties => ({
    fill: isActive(id) ? "#ffffff" : "#666666",
    fontSize: "9px",
    fontFamily: "'Work Sans', sans-serif",
    fontWeight: 600,
    textAnchor: "middle" as const,
    pointerEvents: "none" as const,
    transition: "fill 0.4s ease",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  });

  return (
    <div className="relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-xl border border-border overflow-hidden">
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow filter for active zones */}
          <filter id="zone-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor={ACTIVE_FILL} floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="zone-glow-outdoor" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor={ACTIVE_FILL_OUTDOOR} floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle inner shadow for bowl */}
          <radialGradient id="bowl-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
        </defs>

        {/* Background grid (blueprint style) */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#111" strokeWidth="0.5" />
        </pattern>
        <rect width="800" height="600" fill="url(#grid)" />

        {/* ===== OUTER BOWL (Seating Tiers) ===== */}
        {/* Upper deck / fascia level */}
        <ellipse cx="400" cy="300" rx="360" ry="240" fill="none" stroke={BOWL_STROKE} strokeWidth="1" />
        {/* Seating bowl fill */}
        <ellipse cx="400" cy="300" rx="340" ry="220" fill={SEATING_FILL} stroke={BOWL_STROKE} strokeWidth="0.5" />
        {/* Lower bowl */}
        <ellipse cx="400" cy="300" rx="260" ry="160" fill="url(#bowl-gradient)" stroke={BOWL_STROKE} strokeWidth="0.5" />

        {/* ===== PLAYING FIELD ===== */}
        <ellipse cx="400" cy="300" rx="180" ry="105" fill={FIELD_FILL} stroke="#2a4a2a" strokeWidth="1" />
        {/* Court lines */}
        <ellipse cx="400" cy="300" rx="30" ry="18" fill="none" stroke="#2a4a2a" strokeWidth="0.5" />
        <line x1="400" y1="195" x2="400" y2="405" stroke="#2a4a2a" strokeWidth="0.5" />

        {/* ===== FASCIA BOARDS (upper deck rail - elliptical arc) ===== */}
        <g onClick={() => onToggle("fascia")}>
          <title>Fascia Boards — 300×2ft @ $116.25/sqft</title>
          {/* Top arc */}
          <path
            d="M 100 300 A 340 220 0 0 1 700 300"
            fill="none"
            strokeWidth={isActive("fascia") ? 6 : 4}
            strokeLinecap="round"
            style={{
              ...zoneStyle("fascia"),
              fill: "none",
              stroke: isActive("fascia") ? ACTIVE_FILL : INACTIVE_STROKE,
            }}
          />
          {/* Bottom arc */}
          <path
            d="M 100 300 A 340 220 0 0 0 700 300"
            fill="none"
            strokeWidth={isActive("fascia") ? 6 : 4}
            strokeLinecap="round"
            style={{
              ...zoneStyle("fascia"),
              fill: "none",
              stroke: isActive("fascia") ? ACTIVE_FILL : INACTIVE_STROKE,
            }}
          />
          <text x="400" y="78" style={labelStyle("fascia")}>Fascia</text>
        </g>

        {/* ===== RIBBON BOARD NORTH (lower bowl perimeter - top) ===== */}
        <g onClick={() => onToggle("ribbon-north")}>
          <title>Ribbon Board North — 200×3ft @ $112.22/sqft</title>
          <path
            d="M 180 300 A 260 160 0 0 1 620 300"
            fill="none"
            strokeWidth={isActive("ribbon-north") ? 8 : 5}
            strokeLinecap="round"
            style={{
              ...zoneStyle("ribbon-north"),
              fill: "none",
              stroke: isActive("ribbon-north") ? ACTIVE_FILL : INACTIVE_STROKE,
            }}
          />
          <text x="400" y="138" style={labelStyle("ribbon-north")}>Ribbon North</text>
        </g>

        {/* ===== RIBBON BOARD SOUTH (lower bowl perimeter - bottom) ===== */}
        <g onClick={() => onToggle("ribbon-south")}>
          <title>Ribbon Board South — 200×3ft @ $112.22/sqft</title>
          <path
            d="M 180 300 A 260 160 0 0 0 620 300"
            fill="none"
            strokeWidth={isActive("ribbon-south") ? 8 : 5}
            strokeLinecap="round"
            style={{
              ...zoneStyle("ribbon-south"),
              fill: "none",
              stroke: isActive("ribbon-south") ? ACTIVE_FILL : INACTIVE_STROKE,
            }}
          />
          <text x="400" y="472" style={labelStyle("ribbon-south")}>Ribbon South</text>
        </g>

        {/* ===== CENTER-HUNG SCOREBOARD ===== */}
        <g onClick={() => onToggle("scoreboard")}>
          <title>Center-Hung Scoreboard — 25×15ft @ $178.09/sqft</title>
          <rect
            x="340"
            y="260"
            width="120"
            height="80"
            rx="4"
            style={zoneStyle("scoreboard")}
          />
          {/* Inner detail lines */}
          {isActive("scoreboard") && (
            <>
              <rect x="348" y="268" width="104" height="64" rx="2" fill="none" stroke="#ffffff20" strokeWidth="0.5" />
              <line x1="400" y1="268" x2="400" y2="332" stroke="#ffffff15" strokeWidth="0.5" />
              <line x1="348" y1="300" x2="452" y2="300" stroke="#ffffff15" strokeWidth="0.5" />
            </>
          )}
          <text x="400" y="305" style={{ ...labelStyle("scoreboard"), fontSize: "11px" }}>
            Scoreboard
          </text>
        </g>

        {/* ===== VOMITORY SIGNS (tunnel entrances) ===== */}
        {[
          { x: 80, y: 190, id: "vom1" },
          { x: 80, y: 400, id: "vom2" },
          { x: 720, y: 190, id: "vom3" },
          { x: 720, y: 400, id: "vom4" },
          { x: 400, y: 62, id: "vom5" },
          { x: 400, y: 535, id: "vom6" },
        ].map((vom, i) => (
          <g key={vom.id} onClick={() => onToggle("vomitory")}>
            <title>Vomitory Sign {i + 1} — 6×3ft @ $136.51/sqft</title>
            <rect
              x={vom.x - 14}
              y={vom.y - 9}
              width="28"
              height="18"
              rx="3"
              style={zoneStyle("vomitory")}
            />
          </g>
        ))}
        {/* Vomitory label */}
        <text x="68" y="300" style={{ ...labelStyle("vomitory"), fontSize: "8px" }} transform="rotate(-90 68 300)">
          Vomitory
        </text>

        {/* ===== CONCOURSE DISPLAYS (outside bowl) ===== */}
        {[
          { x: 400, y: 30 },
          { x: 400, y: 568 },
          { x: 38, y: 300 },
          { x: 762, y: 300 },
        ].map((pos, i) => (
          <g key={`conc-${i}`} onClick={() => onToggle("concourse")}>
            <title>Concourse Display {i + 1} — 10×6ft @ $251.57/sqft</title>
            <rect
              x={pos.x - 20}
              y={pos.y - 12}
              width="40"
              height="24"
              rx="2"
              style={zoneStyle("concourse")}
            />
            {isActive("concourse") && (
              <rect
                x={pos.x - 16}
                y={pos.y - 8}
                width="32"
                height="16"
                rx="1"
                fill="none"
                stroke="#ffffff20"
                strokeWidth="0.5"
              />
            )}
          </g>
        ))}
        <text x="38" y="275" style={{ ...labelStyle("concourse"), fontSize: "7px" }}>
          Concourse
        </text>

        {/* ===== MARQUEE / ENTRANCE (bottom exterior) ===== */}
        <g onClick={() => onToggle("marquee")}>
          <title>Marquee Entrance — 30×10ft @ $154.79/sqft</title>
          <rect
            x="310"
            y="560"
            width="180"
            height="30"
            rx="4"
            style={zoneStyle("marquee", true)}
          />
          {isActive("marquee") && (
            <rect
              x="318"
              y="564"
              width="164"
              height="22"
              rx="2"
              fill="none"
              stroke="#ffffff20"
              strokeWidth="0.5"
            />
          )}
          <text x="400" y="579" style={{ ...labelStyle("marquee"), fontSize: "10px" }}>
            Marquee
          </text>
        </g>

        {/* Legend label */}
        <text x="20" y="20" fill="#333" fontSize="10" fontFamily="'Work Sans', sans-serif" fontWeight="600">
          VENUE LAYOUT — BIRD&apos;S EYE VIEW
        </text>
        <text x="20" y="34" fill="#222" fontSize="8" fontFamily="'Work Sans', sans-serif">
          Click zones to toggle displays
        </text>
      </svg>

      {/* Pulse overlay for active zones */}
      {zones.some((z) => z.isActive) && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A52EF05] to-transparent animate-pulse" style={{ animationDuration: "3s" }} />
        </div>
      )}
    </div>
  );
}
