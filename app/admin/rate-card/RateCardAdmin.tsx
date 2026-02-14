"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Upload,
    Plus,
    Trash2,
    X,
    Check,
    Edit3,
    Download,
    RefreshCw,
    Search,
    Filter,
    History,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface RateCardEntry {
    id: string;
    category: string;
    key: string;
    label: string;
    value: number;
    unit: string;
    provenance: string | null;
    confidence: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface AuditEntry {
    id: string;
    action: string;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    changedBy: string | null;
    createdAt: string;
    entry: { key: string; label: string } | null;
}

interface CategoryCount {
    name: string;
    count: number;
}

const CATEGORIES = [
    "margin",
    "bond_tax",
    "install",
    "electrical",
    "spare_parts",
    "led_cost",
    "warranty",
    "other",
];

const UNITS = ["pct", "per_lb", "per_sqft", "fixed", "pct_annual", "multiplier"];

const CONFIDENCE_LEVELS = ["extracted", "validated", "official", "estimated"];

const UNIT_LABELS: Record<string, string> = {
    pct: "%",
    per_lb: "$/lb",
    per_sqft: "$/sqft",
    fixed: "$",
    pct_annual: "%/yr",
    multiplier: "×",
};

const CONFIDENCE_COLORS: Record<string, string> = {
    official: "text-green-700 bg-green-50 border-green-200",
    validated: "text-blue-700 bg-blue-50 border-blue-200",
    extracted: "text-amber-700 bg-amber-50 border-amber-200",
    estimated: "text-red-700 bg-red-50 border-red-200",
};

function formatValue(value: number, unit: string): string {
    if (unit === "pct" || unit === "pct_annual") return `${(value * 100).toFixed(2)}%`;
    if (unit === "per_lb") return `$${value.toFixed(0)}/lb`;
    if (unit === "per_sqft") return `$${value.toFixed(0)}/sqft`;
    if (unit === "fixed") return `$${value.toLocaleString()}`;
    if (unit === "multiplier") return `${value}×`;
    return String(value);
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RateCardAdmin() {
    const [entries, setEntries] = useState<RateCardEntry[]>([]);
    const [categories, setCategories] = useState<CategoryCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState("");
    const [searchText, setSearchText] = useState("");

    // Inline editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<RateCardEntry>>({});

    // Add form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEntry, setNewEntry] = useState({
        category: "margin",
        key: "",
        label: "",
        value: "",
        unit: "pct",
        provenance: "",
        confidence: "estimated",
    });

    // Import
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Audit trail
    const [showAudit, setShowAudit] = useState(false);
    const [audits, setAudits] = useState<AuditEntry[]>([]);
    const [auditsLoading, setAuditsLoading] = useState(false);

    // ========================================================================
    // FETCH
    // ========================================================================

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterCategory) params.set("category", filterCategory);
            const res = await fetch(`/api/rate-card?${params.toString()}`);
            const data = await res.json();
            setEntries(data.entries || []);
            setCategories(data.categories || []);
        } catch (err) {
            console.error("Failed to fetch rate card:", err);
        } finally {
            setLoading(false);
        }
    }, [filterCategory]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const fetchAudits = useCallback(async () => {
        setAuditsLoading(true);
        try {
            const res = await fetch("/api/rate-card/audit?limit=50");
            const data = await res.json();
            setAudits(data.audits || []);
        } catch (err) {
            console.error("Failed to fetch audits:", err);
        } finally {
            setAuditsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (showAudit) fetchAudits();
    }, [showAudit, fetchAudits]);

    // Filter by search text client-side
    const filtered = entries.filter((e) => {
        if (!searchText) return true;
        const q = searchText.toLowerCase();
        return (
            e.label.toLowerCase().includes(q) ||
            e.key.toLowerCase().includes(q) ||
            (e.provenance || "").toLowerCase().includes(q)
        );
    });

    // ========================================================================
    // CRUD HANDLERS
    // ========================================================================

    const handleSaveEdit = async () => {
        if (!editingId) return;
        try {
            const res = await fetch("/api/rate-card", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editingId, ...editData }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(`Save failed: ${err.error}`);
                return;
            }
            setEditingId(null);
            setEditData({});
            fetchEntries();
        } catch (err) {
            alert(`Save failed: ${err}`);
        }
    };

    const handleDelete = async (id: string, label: string) => {
        if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/rate-card?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                alert(`Delete failed: ${err.error}`);
                return;
            }
            fetchEntries();
        } catch (err) {
            alert(`Delete failed: ${err}`);
        }
    };

    const handleAdd = async () => {
        const value = parseFloat(newEntry.value);
        if (!Number.isFinite(value)) {
            alert("Value must be a valid number");
            return;
        }
        try {
            const res = await fetch("/api/rate-card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newEntry, value }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(`Create failed: ${err.error}`);
                return;
            }
            setShowAddForm(false);
            setNewEntry({ category: "margin", key: "", label: "", value: "", unit: "pct", provenance: "", confidence: "estimated" });
            fetchEntries();
        } catch (err) {
            alert(`Create failed: ${err}`);
        }
    };

    // ========================================================================
    // IMPORT
    // ========================================================================

    const handleImport = async (file: File) => {
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/rate-card/import", { method: "POST", body: formData });
            const data = await res.json();
            setImportResult(data);
            fetchEntries();
        } catch (err) {
            setImportResult({ error: "Import failed" });
        } finally {
            setImporting(false);
        }
    };

    // ========================================================================
    // EXPORT
    // ========================================================================

    const handleExport = () => {
        const headers = ["category", "key", "label", "value", "unit", "provenance", "confidence"];
        const rows = [headers.join(",")];
        for (const e of entries) {
            rows.push(
                [
                    e.category,
                    e.key,
                    `"${e.label.replace(/"/g, '""')}"`,
                    e.value,
                    e.unit,
                    `"${(e.provenance || "").replace(/"/g, '""')}"`,
                    e.confidence,
                ].join(",")
            );
        }
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rate-card-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Category filter */}
                <div className="flex items-center gap-2 bg-background border border-border rounded px-3 py-1.5">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-transparent text-sm outline-none"
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map((c) => {
                            const count = categories.find((x) => x.name === c)?.count || 0;
                            return (
                                <option key={c} value={c}>
                                    {c} ({count})
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-background border border-border rounded px-3 py-1.5 flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search rates..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="bg-transparent text-sm outline-none w-full"
                    />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={() => fetchEntries()}
                        className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 hover:bg-accent transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                    </button>
                    <a
                        href="/api/rate-card/template"
                        download
                        className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 hover:bg-accent transition-colors"
                    >
                        <Download className="w-3 h-3" />
                        Template
                    </a>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 hover:bg-accent transition-colors"
                    >
                        <Download className="w-3 h-3" />
                        Export CSV
                    </button>
                    <label className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer">
                        <Upload className="w-3 h-3" />
                        {importing ? "Importing..." : "Import CSV"}
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImport(file);
                                e.target.value = "";
                            }}
                        />
                    </label>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 text-xs bg-foreground text-background rounded px-3 py-1.5 hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-3 h-3" />
                        Add Rate
                    </button>
                </div>
            </div>

            {/* Import result banner */}
            {importResult && (
                <div className={`border rounded px-4 py-3 text-sm ${importResult.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
                    {importResult.error ? (
                        <span>Import error: {importResult.error}</span>
                    ) : (
                        <span>
                            Import complete: {importResult.created} created, {importResult.updated} updated, {importResult.skipped} skipped
                            {importResult.errors?.length > 0 && (
                                <span className="block mt-1 text-xs text-red-700">
                                    Errors: {importResult.errors.join("; ")}
                                </span>
                            )}
                        </span>
                    )}
                    <button onClick={() => setImportResult(null)} className="ml-3 text-xs underline">dismiss</button>
                </div>
            )}

            {/* Add form */}
            {showAddForm && (
                <div className="border border-border rounded bg-background p-4 space-y-3">
                    <div className="text-sm font-medium">New Rate Card Entry</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Category</label>
                            <select
                                value={newEntry.category}
                                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                                className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Key</label>
                            <input
                                value={newEntry.key}
                                onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })}
                                placeholder="margin.custom_rate"
                                className="w-full border-b border-border px-1 py-1.5 text-sm bg-transparent outline-none focus:border-[#0A52EF]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Label</label>
                            <input
                                value={newEntry.label}
                                onChange={(e) => setNewEntry({ ...newEntry, label: e.target.value })}
                                placeholder="Custom Rate Name"
                                className="w-full border-b border-border px-1 py-1.5 text-sm bg-transparent outline-none focus:border-[#0A52EF]"
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-muted-foreground block mb-1">Value</label>
                                <input
                                    value={newEntry.value}
                                    onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                                    placeholder="0.30"
                                    className="w-full border-b border-border px-1 py-1.5 text-sm bg-transparent outline-none focus:border-[#0A52EF]"
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-muted-foreground block mb-1">Unit</label>
                                <select
                                    value={newEntry.unit}
                                    onChange={(e) => setNewEntry({ ...newEntry, unit: e.target.value })}
                                    className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
                                >
                                    {UNITS.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Provenance</label>
                            <input
                                value={newEntry.provenance}
                                onChange={(e) => setNewEntry({ ...newEntry, provenance: e.target.value })}
                                placeholder="Where did this come from?"
                                className="w-full border-b border-border px-1 py-1.5 text-sm bg-transparent outline-none focus:border-[#0A52EF]"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Confidence</label>
                            <select
                                value={newEntry.confidence}
                                onChange={(e) => setNewEntry({ ...newEntry, confidence: e.target.value })}
                                className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
                            >
                                {CONFIDENCE_LEVELS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-1.5 text-xs bg-foreground text-background rounded px-3 py-1.5"
                        >
                            <Check className="w-3 h-3" />
                            Create
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5"
                        >
                            <X className="w-3 h-3" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Stats strip */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span><strong className="text-foreground">{entries.length}</strong> entries</span>
                <span><strong className="text-foreground">{categories.length}</strong> categories</span>
                <span>
                    <strong className="text-foreground">
                        {entries.filter((e) => e.confidence === "validated").length}
                    </strong> validated
                </span>
                <span>
                    <strong className="text-foreground">
                        {entries.filter((e) => e.confidence === "estimated").length}
                    </strong> estimated
                </span>
            </div>

            {/* Table */}
            <div className="border border-border rounded overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-accent/30">
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">Category</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Label</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground w-40">Key</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Value</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground w-16">Unit</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Provenance</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground w-24">Confidence</th>
                            <th className="text-center px-3 py-2 font-medium text-muted-foreground w-20">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                                    Loading...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                                    {entries.length === 0
                                        ? "No rate card entries yet. Click \"Add Rate\" or run the seed script."
                                        : "No results match your search."}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((entry) => {
                                const isEditing = editingId === entry.id;

                                return (
                                    <tr
                                        key={entry.id}
                                        className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                                    >
                                        {/* Category */}
                                        <td className="px-3 py-2">
                                            <span className="text-xs px-1.5 py-0.5 rounded border border-border bg-accent/30">
                                                {entry.category}
                                            </span>
                                        </td>

                                        {/* Label */}
                                        <td className="px-3 py-2 font-medium">
                                            {isEditing ? (
                                                <input
                                                    value={editData.label ?? entry.label}
                                                    onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                                                    className="w-full border-b border-[#0A52EF] px-1 py-0.5 text-sm bg-transparent outline-none"
                                                />
                                            ) : (
                                                entry.label
                                            )}
                                        </td>

                                        {/* Key */}
                                        <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                                            {entry.key}
                                        </td>

                                        {/* Value */}
                                        <td className="px-3 py-2 text-right font-mono">
                                            {isEditing ? (
                                                <input
                                                    value={editData.value ?? entry.value}
                                                    onChange={(e) => setEditData({ ...editData, value: parseFloat(e.target.value) || 0 })}
                                                    className="w-full border-b border-[#0A52EF] px-1 py-0.5 text-sm bg-transparent outline-none text-right"
                                                />
                                            ) : (
                                                <span className="text-foreground">{formatValue(Number(entry.value), entry.unit)}</span>
                                            )}
                                        </td>

                                        {/* Unit */}
                                        <td className="px-3 py-2 text-xs text-muted-foreground">
                                            {isEditing ? (
                                                <select
                                                    value={editData.unit ?? entry.unit}
                                                    onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                                                    className="border border-border rounded px-1 py-0.5 text-xs bg-background"
                                                >
                                                    {UNITS.map((u) => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                UNIT_LABELS[entry.unit] || entry.unit
                                            )}
                                        </td>

                                        {/* Provenance */}
                                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">
                                            {isEditing ? (
                                                <input
                                                    value={editData.provenance ?? entry.provenance ?? ""}
                                                    onChange={(e) => setEditData({ ...editData, provenance: e.target.value })}
                                                    className="w-full border-b border-[#0A52EF] px-1 py-0.5 text-xs bg-transparent outline-none"
                                                />
                                            ) : (
                                                <span title={entry.provenance || ""}>
                                                    {entry.provenance || "-"}
                                                </span>
                                            )}
                                        </td>

                                        {/* Confidence */}
                                        <td className="px-3 py-2 text-center">
                                            {isEditing ? (
                                                <select
                                                    value={editData.confidence ?? entry.confidence}
                                                    onChange={(e) => setEditData({ ...editData, confidence: e.target.value })}
                                                    className="border border-border rounded px-1 py-0.5 text-xs bg-background"
                                                >
                                                    {CONFIDENCE_LEVELS.map((c) => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span
                                                    className={`text-xs px-1.5 py-0.5 rounded border ${CONFIDENCE_COLORS[entry.confidence] || ""}`}
                                                >
                                                    {entry.confidence}
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-3 py-2 text-center">
                                            {isEditing ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        className="p-1 rounded hover:bg-green-50 text-green-700"
                                                        title="Save"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingId(null); setEditData({}); }}
                                                        className="p-1 rounded hover:bg-red-50 text-red-700"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => { setEditingId(entry.id); setEditData({}); }}
                                                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                                        title="Edit"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry.id, entry.label)}
                                                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-700"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Audit Trail */}
            <div className="border border-border rounded">
                <button
                    onClick={() => setShowAudit(!showAudit)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-accent/20 transition-colors"
                >
                    <span className="flex items-center gap-2 font-medium text-muted-foreground">
                        <History className="w-3.5 h-3.5" />
                        Change History
                    </span>
                    {showAudit ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                {showAudit && (
                    <div className="border-t border-border">
                        {auditsLoading ? (
                            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading history...</div>
                        ) : audits.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No changes recorded yet.</div>
                        ) : (
                            <div className="max-h-80 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-accent/30 border-b border-border">
                                        <tr>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">When</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Entry</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Action</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Old</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">New</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {audits.map((a) => (
                                            <tr key={a.id} className="border-b border-border last:border-0 hover:bg-accent/10">
                                                <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                                                    {new Date(a.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-3 py-1.5 font-mono">
                                                    {a.entry?.key || "—"}
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <span className={`px-1.5 py-0.5 rounded border ${
                                                        a.action === "create" ? "text-green-700 bg-green-50 border-green-200" :
                                                        a.action === "update" ? "text-blue-700 bg-blue-50 border-blue-200" :
                                                        a.action === "delete" ? "text-red-700 bg-red-50 border-red-200" :
                                                        "text-amber-700 bg-amber-50 border-amber-200"
                                                    }`}>
                                                        {a.action}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-muted-foreground">{a.field || "—"}</td>
                                                <td className="px-3 py-1.5 font-mono text-red-600 max-w-[120px] truncate" title={a.oldValue || ""}>{a.oldValue || "—"}</td>
                                                <td className="px-3 py-1.5 font-mono text-green-600 max-w-[120px] truncate" title={a.newValue || ""}>{a.newValue || "—"}</td>
                                                <td className="px-3 py-1.5 text-muted-foreground">{a.changedBy || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
