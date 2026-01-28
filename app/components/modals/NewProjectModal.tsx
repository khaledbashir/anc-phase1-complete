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
  const router = useRouter();

  const steps = ["Creating Workspace...", "Injecting Master Formulas...", "Training Strategic Agent..."];

  const handleCreate = async () => {
    if (!clientName) return;
    setLoading(true);
    setStep(0);

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

      const json = await resp.json();
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
        console.error("Workspace creation failed", json);
      }
    } catch (e) {
      console.error("Failed to create workspace:", e);
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

        <DialogContent className="max-w-lg bg-zinc-950/80 backdrop-blur-2xl border border-zinc-800">
          <DialogHeader>
            <DialogTitle>Initialize AI Strategic Hub</DialogTitle>
            <DialogDescription>Create a new ANC workspace + initial proposal</DialogDescription>
          </DialogHeader>

          {!loading ? (
            <div className="grid gap-4 mt-4">
              <Input placeholder="Client Name (e.g., Lakers)" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              <Input placeholder="Contact Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} className="shadow-[0_0_20px_rgba(255,255,255,0.03)]">Initialize Project</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3 }} className="w-12 h-12 rounded-full bg-zinc-900/40 flex items-center justify-center border border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-blue-500" />
              </motion.div>
              <div className="text-center">
                <div className="text-zinc-200 font-medium">{steps[step]}</div>
                <div className="text-zinc-500 text-sm mt-2">Initializing AI Strategic Hub. This may take a few seconds.</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}