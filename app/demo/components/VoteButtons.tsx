"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
  featureId: string;
  seedVotes: { up: number; down: number };
}

export default function VoteButtons({ featureId, seedVotes }: VoteButtonsProps) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [counts, setCounts] = useState(seedVotes);

  useEffect(() => {
    const saved = localStorage.getItem(`demo-vote-${featureId}`);
    if (saved === "up" || saved === "down") {
      setVote(saved);
    }
    const savedCounts = localStorage.getItem(`demo-vote-counts-${featureId}`);
    if (savedCounts) {
      try {
        setCounts(JSON.parse(savedCounts));
      } catch {
        // use seed
      }
    }
  }, [featureId]);

  const handleVote = (direction: "up" | "down") => {
    let newVote: "up" | "down" | null;
    let newCounts = { ...counts };

    if (vote === direction) {
      // un-vote
      newVote = null;
      newCounts[direction]--;
    } else {
      if (vote) {
        // switch vote
        newCounts[vote]--;
      }
      newVote = direction;
      newCounts[direction]++;
    }

    setVote(newVote);
    setCounts(newCounts);
    localStorage.setItem(`demo-vote-${featureId}`, newVote || "");
    localStorage.setItem(`demo-vote-counts-${featureId}`, JSON.stringify(newCounts));
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote("up")}
        className={cn(
          "flex items-center gap-1.5 text-sm transition-all active:scale-90",
          vote === "up" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ThumbsUp className={cn("w-4 h-4", vote === "up" && "fill-primary")} />
        <span className="tabular-nums">{counts.up}</span>
      </button>
      <button
        onClick={() => handleVote("down")}
        className={cn(
          "flex items-center gap-1.5 text-sm transition-all active:scale-90",
          vote === "down" ? "text-destructive font-semibold" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ThumbsDown className={cn("w-4 h-4", vote === "down" && "fill-destructive")} />
        <span className="tabular-nums">{counts.down}</span>
      </button>
    </div>
  );
}
