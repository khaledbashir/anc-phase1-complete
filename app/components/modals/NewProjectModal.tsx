"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type NewProjectModalProps = {
  children: React.ReactNode;
};

export default function NewProjectModal({ children }: NewProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const steps = ["Creating Workspace...", "Injecting Master Formulas...", "Training Strategic Agent..."];

  const handleCreate = async () => {
    if (!clientName) return;
    setLoading(true);
    setStep(0);
    setError(null);

    try {
      // Animate through steps
      const resp = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clientName, userEmail: email || "noreply@anc.com", createInitialProposal: true, clientName }),
      });

      // show step transitions
      for (let i = 0; i < steps.length; i++) {
        setStep(i);
        await new Promise((r) => setTimeout(r, 600));
      }

      const text = await resp.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (resp.ok && json && json.proposal) {
        // store workspace/thread locally for Commander
        if (typeof window !== "undefined") {
          if (json.ai?.slug) localStorage.setItem("aiWorkspaceSlug", json.ai.slug);
          if (json.ai?.threadId) localStorage.setItem("aiThreadId", json.ai.threadId);
        }

        // redirect to clean route for proposal
        setOpen(false);
        router.push(`/projects/${json.proposal.id}`);
      } else if (resp.ok && json && json.workspace) {
        setOpen(false);
        router.push(`/`);
      } else {
        const msg =
          (json && (json.details || json.error)) ||
          text ||
          `Workspace creation failed (HTTP ${resp.status})`;
        setError(String(msg));
      }
    } catch (e) {
      console.error("Failed to create workspace:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className="cursor-pointer">
          {children}
        </div>

        <DialogContent className="max-w-lg bg-background/95 backdrop-blur-2xl border border-border">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Start a new proposal</DialogDescription>
          </DialogHeader>

          {!loading ? (
            <div className="grid gap-4 mt-4">
              <Input placeholder="Client Name (e.g., Lakers)" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              <Input placeholder="Contact Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} className="shadow-[0_0_20px_rgba(255,255,255,0.03)]">Create Project</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3 }} className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center border border-border">
                <div className="w-6 h-6 rounded-full bg-brand-blue" />
              </motion.div>
              <div className="text-center">
                <div className="text-foreground font-medium">{steps[step]}</div>
                <div className="text-muted-foreground text-sm mt-2">Creating your project. This may take a few seconds.</div>
              </div>
              {error && (
                <div className="w-full max-w-md rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-xs text-red-200 break-words">
                  {error}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
