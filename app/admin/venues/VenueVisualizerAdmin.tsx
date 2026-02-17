"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, X, Check, RefreshCw, Database, Upload, Image as ImageIcon,
  MapPin, Monitor, ChevronRight, MousePointer2, Square,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Hotspot {
  id: string;
  photoId: string;
  zoneType: string;
  label: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  cssTransform: string | null;
  sortOrder: number;
}

interface Photo {
  id: string;
  venueId: string;
  label: string;
  imageUrl: string;
  sortOrder: number;
  hotspots: Hotspot[];
}

interface Venue {
  id: string;
  name: string;
  client: string;
  city: string;
  state: string;
  photos: Photo[];
}

const ZONE_TYPES = [
  { id: "scoreboard", label: "Scoreboard", color: "#ef4444" },
  { id: "ribbon", label: "Ribbon Board", color: "#3b82f6" },
  { id: "fascia", label: "Fascia", color: "#8b5cf6" },
  { id: "vomitory", label: "Vomitory", color: "#f59e0b" },
  { id: "concourse", label: "Concourse", color: "#10b981" },
  { id: "marquee", label: "Marquee", color: "#ec4899" },
  { id: "courtside", label: "Courtside", color: "#06b6d4" },
];

function getZoneColor(zoneType: string): string {
  return ZONE_TYPES.find(z => z.id === zoneType)?.color || "#6b7280";
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function VenueVisualizerAdmin() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [newHotspotZone, setNewHotspotZone] = useState("scoreboard");
  const [newHotspotLabel, setNewHotspotLabel] = useState("");
  const [pendingRect, setPendingRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [newPhotoLabel, setNewPhotoLabel] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──
  const fetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/venue-visualizer/venues");
      const data = await res.json();
      setVenues(data.venues || []);
    } catch (err) {
      console.error("Failed to fetch venues:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  const selectedVenue = venues.find(v => v.id === selectedVenueId) || null;
  const selectedPhoto = selectedVenue?.photos.find(p => p.id === selectedPhotoId) || null;

  // Auto-select first photo when venue changes
  useEffect(() => {
    if (selectedVenue && selectedVenue.photos.length > 0 && !selectedVenue.photos.find(p => p.id === selectedPhotoId)) {
      setSelectedPhotoId(selectedVenue.photos[0].id);
    }
  }, [selectedVenue, selectedPhotoId]);

  // ── Seed ──
  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/venue-visualizer/seed", { method: "POST" });
      const data = await res.json();
      setSeedResult(data.message || data.error || "Done");
      fetchVenues();
    } catch (err) {
      setSeedResult(String(err));
    } finally {
      setSeeding(false);
    }
  };

  // ── Add Photo ──
  const handleAddPhoto = async () => {
    if (!selectedVenueId || !newPhotoLabel || !newPhotoUrl) return;
    try {
      await fetch("/api/venue-visualizer/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: selectedVenueId, label: newPhotoLabel, imageUrl: newPhotoUrl }),
      });
      setShowAddPhoto(false);
      setNewPhotoLabel("");
      setNewPhotoUrl("");
      fetchVenues();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Delete Photo ──
  const handleDeletePhoto = async (photoId: string) => {
    try {
      await fetch(`/api/venue-visualizer/photos/${photoId}`, { method: "DELETE" });
      if (selectedPhotoId === photoId) setSelectedPhotoId(null);
      fetchVenues();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Drawing hotspots ──
  const getRelativePos = (e: React.MouseEvent): { x: number; y: number } | null => {
    const container = imageContainerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!drawingMode || !selectedPhoto) return;
    const pos = getRelativePos(e);
    if (pos) {
      setDrawStart(pos);
      setDrawCurrent(pos);
      setPendingRect(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawStart) return;
    const pos = getRelativePos(e);
    if (pos) setDrawCurrent(pos);
  };

  const handleMouseUp = () => {
    if (!drawStart || !drawCurrent) return;
    const left = Math.min(drawStart.x, drawCurrent.x);
    const top = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);
    if (width > 1 && height > 1) {
      setPendingRect({ left, top, width, height });
      setNewHotspotLabel("");
    }
    setDrawStart(null);
    setDrawCurrent(null);
  };

  // ── Save hotspot ──
  const handleSaveHotspot = async () => {
    if (!selectedPhoto || !pendingRect || !newHotspotLabel) return;
    try {
      await fetch("/api/venue-visualizer/hotspots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: selectedPhoto.id,
          zoneType: newHotspotZone,
          label: newHotspotLabel,
          leftPct: pendingRect.left,
          topPct: pendingRect.top,
          widthPct: pendingRect.width,
          heightPct: pendingRect.height,
        }),
      });
      setPendingRect(null);
      setNewHotspotLabel("");
      fetchVenues();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Delete hotspot ──
  const handleDeleteHotspot = async (hotspotId: string) => {
    try {
      await fetch(`/api/venue-visualizer/hotspots/${hotspotId}`, { method: "DELETE" });
      fetchVenues();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Drawing rect preview ──
  const drawingRect = drawStart && drawCurrent ? {
    left: Math.min(drawStart.x, drawCurrent.x),
    top: Math.min(drawStart.y, drawCurrent.y),
    width: Math.abs(drawCurrent.x - drawStart.x),
    height: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex gap-6 min-h-[700px]">
      {/* ── LEFT: Venue List ── */}
      <div className="w-64 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Venues</h2>
          <div className="flex gap-1">
            <button onClick={fetchVenues} className="p-1.5 rounded border border-border hover:bg-accent transition-colors" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleSeed} disabled={seeding} className="p-1.5 rounded border border-[#0A52EF] text-[#0A52EF] hover:bg-[#0A52EF]/5 transition-colors" title="Seed demo data">
              <Database className={`w-3.5 h-3.5 ${seeding ? "animate-pulse" : ""}`} />
            </button>
          </div>
        </div>

        {seedResult && (
          <div className="text-xs p-2 rounded border border-border bg-accent/30">
            {seedResult}
            <button onClick={() => setSeedResult(null)} className="ml-2 text-muted-foreground hover:text-foreground"><X className="w-3 h-3 inline" /></button>
          </div>
        )}

        <div className="space-y-1">
          {venues.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground py-4 text-center">No venues yet. Click seed to add demo data.</p>
          )}
          {venues.map(venue => (
            <button
              key={venue.id}
              onClick={() => { setSelectedVenueId(venue.id); setSelectedPhotoId(null); setPendingRect(null); }}
              className={`w-full text-left px-3 py-2.5 rounded border transition-all ${
                selectedVenueId === venue.id
                  ? "border-[#0A52EF]/30 bg-[#0A52EF]/5"
                  : "border-border hover:bg-accent/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{venue.name}</p>
                  <p className="text-[10px] text-muted-foreground">{venue.client} · {venue.photos.length} photos</p>
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── CENTER: Photo + Hotspot Canvas ── */}
      <div className="flex-1 min-w-0">
        {!selectedVenue ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            <div className="text-center space-y-2">
              <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p>Select a venue to manage photos and hotspots</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Photo tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedVenue.photos.map(photo => (
                <button
                  key={photo.id}
                  onClick={() => { setSelectedPhotoId(photo.id); setPendingRect(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-all ${
                    selectedPhotoId === photo.id
                      ? "border-[#0A52EF]/30 bg-[#0A52EF]/5 text-foreground font-medium"
                      : "border-border text-muted-foreground hover:bg-accent/30"
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  {photo.label}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                    className="p-0.5 hover:bg-red-100 rounded text-muted-foreground hover:text-red-600 ml-1"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </button>
              ))}
              {showAddPhoto ? (
                <div className="flex items-center gap-2">
                  <input
                    value={newPhotoLabel}
                    onChange={e => setNewPhotoLabel(e.target.value)}
                    placeholder="Photo label"
                    className="px-2 py-1 text-xs border border-border rounded bg-background w-32"
                  />
                  <input
                    value={newPhotoUrl}
                    onChange={e => setNewPhotoUrl(e.target.value)}
                    placeholder="/venues/filename.jpg"
                    className="px-2 py-1 text-xs border border-border rounded bg-background w-48"
                  />
                  <button onClick={handleAddPhoto} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setShowAddPhoto(false)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddPhoto(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded border border-dashed border-border text-xs text-muted-foreground hover:bg-accent/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Photo
                </button>
              )}
            </div>

            {/* Drawing toolbar */}
            {selectedPhoto && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setDrawingMode(!drawingMode); setPendingRect(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    drawingMode
                      ? "bg-[#0A52EF] text-white"
                      : "border border-border text-muted-foreground hover:bg-accent/30"
                  }`}
                >
                  {drawingMode ? <Square className="w-3 h-3" /> : <MousePointer2 className="w-3 h-3" />}
                  {drawingMode ? "Drawing Mode ON" : "Draw Hotspot"}
                </button>
                {drawingMode && (
                  <select
                    value={newHotspotZone}
                    onChange={e => setNewHotspotZone(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-border rounded bg-background"
                  >
                    {ZONE_TYPES.map(z => (
                      <option key={z.id} value={z.id}>{z.label}</option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {selectedPhoto.hotspots.length} hotspot{selectedPhoto.hotspots.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Photo canvas with hotspot overlays */}
            {selectedPhoto && (
              <div
                ref={imageContainerRef}
                className="relative border border-border rounded overflow-hidden bg-black select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ cursor: drawingMode ? "crosshair" : "default" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.label}
                  className="w-full h-auto block"
                  draggable={false}
                />

                {/* Existing hotspots */}
                {selectedPhoto.hotspots.map(hs => (
                  <div
                    key={hs.id}
                    className="absolute border-2 flex items-end justify-between group"
                    style={{
                      left: `${hs.leftPct}%`,
                      top: `${hs.topPct}%`,
                      width: `${hs.widthPct}%`,
                      height: `${hs.heightPct}%`,
                      borderColor: getZoneColor(hs.zoneType),
                      backgroundColor: `${getZoneColor(hs.zoneType)}20`,
                      transform: hs.cssTransform || undefined,
                    }}
                  >
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 leading-none text-white"
                      style={{ backgroundColor: getZoneColor(hs.zoneType) }}
                    >
                      {hs.label}
                    </span>
                    <button
                      onClick={() => handleDeleteHotspot(hs.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 bg-red-600 text-white rounded-sm transition-opacity"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}

                {/* Drawing preview */}
                {drawingRect && (
                  <div
                    className="absolute border-2 border-dashed pointer-events-none"
                    style={{
                      left: `${drawingRect.left}%`,
                      top: `${drawingRect.top}%`,
                      width: `${drawingRect.width}%`,
                      height: `${drawingRect.height}%`,
                      borderColor: getZoneColor(newHotspotZone),
                      backgroundColor: `${getZoneColor(newHotspotZone)}15`,
                    }}
                  />
                )}

                {/* Pending rect — needs label to save */}
                {pendingRect && (
                  <div
                    className="absolute border-2 border-dashed"
                    style={{
                      left: `${pendingRect.left}%`,
                      top: `${pendingRect.top}%`,
                      width: `${pendingRect.width}%`,
                      height: `${pendingRect.height}%`,
                      borderColor: getZoneColor(newHotspotZone),
                      backgroundColor: `${getZoneColor(newHotspotZone)}25`,
                    }}
                  >
                    <div className="absolute -bottom-20 left-0 bg-background border border-border rounded p-2 shadow-lg z-10 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        value={newHotspotLabel}
                        onChange={e => setNewHotspotLabel(e.target.value)}
                        placeholder="Label (e.g. Main Scoreboard)"
                        className="px-2 py-1 text-xs border border-border rounded bg-background w-48"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") handleSaveHotspot(); if (e.key === "Escape") setPendingRect(null); }}
                      />
                      <button onClick={handleSaveHotspot} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setPendingRect(null)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Hotspot List ── */}
      {selectedPhoto && selectedPhoto.hotspots.length > 0 && (
        <div className="w-56 shrink-0 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hotspots</h3>
          <div className="space-y-1.5">
            {selectedPhoto.hotspots.map(hs => (
              <div key={hs.id} className="flex items-center gap-2 px-2 py-1.5 rounded border border-border hover:bg-accent/20 transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getZoneColor(hs.zoneType) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{hs.label}</p>
                  <p className="text-[10px] text-muted-foreground">{hs.zoneType} · {hs.widthPct.toFixed(0)}×{hs.heightPct.toFixed(0)}%</p>
                </div>
                <button onClick={() => handleDeleteHotspot(hs.id)} className="p-0.5 text-muted-foreground hover:text-red-600 rounded">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
