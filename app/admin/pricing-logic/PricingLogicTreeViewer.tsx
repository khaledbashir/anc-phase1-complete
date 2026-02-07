"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, HelpCircle, Calculator, Variable } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; description: string | null };

type Formula = {
  id: string;
  formula: string;
  unit: string;
  notes: string | null;
};

type Option = {
  id: string;
  optionText: string;
  nextNodeId: string | null;
  isFinal: boolean;
  formula: Formula | null;
};

type Node = {
  id: string;
  categoryId: string;
  parentNodeId: string | null;
  question: string;
  order: number;
  options: Option[];
};

type TreeResponse = {
  category: { id: string; name: string; description: string | null };
  nodes: Node[];
};

export function PricingLogicTreeViewer({
  categories,
}: {
  categories: Category[];
}) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [tree, setTree] = useState<TreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setTree(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/pricing-logic/tree?categoryId=${encodeURIComponent(categoryId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Category not found" : "Failed to load tree");
        return res.json();
      })
      .then((data) => {
        setTree(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load tree");
        setTree(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [categoryId]);

  const orderedNodes = [...(tree?.nodes ?? [])].sort((a, b) => a.order - b.order);

  const renderNode = (node: Node, index: number): React.ReactNode => {
    const isRoot = !node.parentNodeId;
    return (
      <div key={node.id} className="relative">
        {index > 0 && (
          <div className="absolute left-6 top-0 h-4 w-px bg-border" aria-hidden />
        )}
        <div
          className={cn(
            "rounded-lg border bg-card p-4",
            isRoot && "border-[#0A52EF]/30 bg-[#0A52EF]/5"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step {node.order}
              </p>
              <p className="mt-1 font-medium text-foreground">{node.question}</p>
            </div>
          </div>

          {node.options.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {node.options.map((opt) => (
                <div
                  key={opt.id}
                  className={cn(
                    "rounded-md border bg-background p-3",
                    opt.isFinal ? "border-amber-500/40 bg-amber-500/5" : "border-border"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-foreground">{opt.optionText}</span>
                    {opt.isFinal && (
                      <Badge variant="secondary" className="text-xs">
                        Final
                      </Badge>
                    )}
                    {!opt.isFinal && opt.nextNodeId && (
                      <span className="text-xs text-muted-foreground">
                        → next question
                      </span>
                    )}
                  </div>
                  {opt.formula && (
                    <div className="mt-3 flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                      <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-medium text-foreground">
                          {opt.formula.formula}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {opt.formula.unit}
                          </Badge>
                          {opt.formula.notes && (
                            <span className="text-xs text-muted-foreground">
                              {opt.formula.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="category-select" className="text-sm font-medium text-foreground">
          Category
        </label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="category-select" className="w-full sm:w-[280px]">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.description ? ` — ${c.description}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!categoryId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
          <Variable className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-foreground">
            Select a category to view its decision tree
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Questions, options, and pricing formulas are shown in order.
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {tree && !loading && !error && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">
              {tree.category.name}
            </h3>
            {tree.category.description && (
              <span className="text-sm text-muted-foreground">
                {tree.category.description}
              </span>
            )}
          </div>
          <div className="space-y-4">
            {orderedNodes.map((node, index) => renderNode(node, index))}
          </div>
        </div>
      )}
    </div>
  );
}
