"use client";

import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
  featureId: string;
}

function getVoterId(): string {
  const key = "anc-voter-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function VoteButtons({ featureId }: VoteButtonsProps) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [counts, setCounts] = useState({ up: 0, down: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const voterId = getVoterId();
    fetch(`/api/demo/vote?featureId=${featureId}&voterId=${voterId}`)
      .then((r) => r.json())
      .then((data) => {
        setCounts({ up: data.up, down: data.down });
        setVote(data.myVote || null);
      })
      .catch(() => {});
  }, [featureId]);

  const handleVote = useCallback(async (direction: "up" | "down") => {
    if (loading) return;
    setLoading(true);

    const newDirection = vote === direction ? null : direction;

    // Optimistic update
    const prevVote = vote;
    const prevCounts = { ...counts };
    const newCounts = { ...counts };
    if (vote === direction) {
      newCounts[direction]--;
    } else {
      if (vote) newCounts[vote]--;
      newCounts[direction]++;
    }
    setVote(newDirection);
    setCounts(newCounts);

    try {
      const voterId = getVoterId();
      const res = await fetch("/api/demo/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId, direction: newDirection, voterId }),
      });
      if (!res.ok) throw new Error("Vote failed");
      const data = await res.json();
      setCounts({ up: data.up, down: data.down });
    } catch {
      // Rollback on error
      setVote(prevVote);
      setCounts(prevCounts);
    } finally {
      setLoading(false);
    }
  }, [featureId, vote, counts, loading]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote("up")}
        disabled={loading}
        className={cn(
          "flex items-center gap-1.5 text-xs transition-all active:scale-90",
          vote === "up" ? "text-[#0A52EF] font-semibold" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ThumbsUp className={cn("w-3.5 h-3.5", vote === "up" && "fill-[#0A52EF]")} />
        <span className="tabular-nums">{counts.up}</span>
      </button>
      <button
        onClick={() => handleVote("down")}
        disabled={loading}
        className={cn(
          "flex items-center gap-1.5 text-xs transition-all active:scale-90",
          vote === "down" ? "text-muted-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ThumbsDown className={cn("w-3.5 h-3.5", vote === "down" && "fill-muted-foreground")} />
        <span className="tabular-nums">{counts.down}</span>
      </button>
    </div>
  );
}
