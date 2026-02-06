"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

type Activity = {
    id: string;
    action: string;
    description: string;
    actor: string | null;
    createdAt: string;
};

type ActivityLogProps = {
    proposalId: string | undefined;
};

const ACTION_ICONS: Record<string, string> = {
    created: "\u2728",
    excel_imported: "\u{1F4CA}",
    pdf_exported: "\u{1F4C4}",
    data_exported: "\u{1F4E6}",
    client_name_updated: "\u270F\uFE0F",
    text_edited: "\u{1F4DD}",
    status_changed: "\u{1F504}",
    document_mode_changed: "\u{1F50E}",
    screen_renamed: "\u{1F3AC}",
};

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    }) + ", " + d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

export default function ActivityLog({ proposalId }: ActivityLogProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!proposalId || proposalId === "new") return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/projects/${proposalId}/activities`, {
                    cache: "no-store" as any,
                });
                if (!res.ok) throw new Error("Failed to load");
                const json = await res.json();
                if (!cancelled) {
                    setActivities(Array.isArray(json?.activities) ? json.activities : []);
                }
            } catch (err) {
                if (!cancelled) setError("Could not load activity history");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [proposalId]);

    if (!proposalId || proposalId === "new") {
        return (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-8">
                Save the project to see activity history.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-8">
                <Clock className="w-3.5 h-3.5 mr-2 animate-pulse" />
                Loading history...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-8">
                {error}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-8">
                No activity recorded yet.
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="divide-y divide-border/40">
                {activities.map((a) => (
                    <div key={a.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                        <span className="text-sm mt-0.5 shrink-0 w-5 text-center" aria-hidden>
                            {ACTION_ICONS[a.action] || "\u25CB"}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs text-foreground leading-relaxed">
                                {a.description}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <span>{formatTimestamp(a.createdAt)}</span>
                                {a.actor && (
                                    <>
                                        <span className="text-border">&middot;</span>
                                        <span>{a.actor}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
