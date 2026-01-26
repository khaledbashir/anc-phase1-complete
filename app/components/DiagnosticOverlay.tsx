"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProposalContext } from "@/contexts/ProposalContext";

const DiagnosticOverlay = () => {
  const { diagnosticOpen, diagnosticPayload, submitDiagnostic, closeDiagnostic } = useProposalContext() as any;

  const [environment, setEnvironment] = useState("Indoor");
  const [service, setService] = useState("Front");
  const [formFactor, setFormFactor] = useState("Straight");
  const [selectedProduct, setSelectedProduct] = useState("");

  useEffect(() => {
    if (diagnosticOpen) {
      // reset
      setEnvironment("Indoor");
      setService("Front");
      setFormFactor("Straight");
      setSelectedProduct("");
    }
  }, [diagnosticOpen]);

  const handleConfirm = () => {
    const answers = {
      category: environment,
      serviceType: service,
      isCurvy: formFactor === "Curvy",
      selectedProduct,
    };
    submitDiagnostic(answers);
  };

  return (
    <Dialog open={diagnosticOpen} onOpenChange={(open) => (open ? {} : closeDiagnostic())}>
      <DialogContent className="max-w-2xl bg-zinc-950/50 backdrop-blur-xl border border-zinc-800">
        <DialogHeader>
          <DialogTitle>Diagnostic: Missing screen specs</DialogTitle>
          <DialogDescription>{diagnosticPayload?.payload?.message ?? diagnosticPayload?.payload?.message ?? "We need a few details to select the right product."}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm text-zinc-300 font-semibold">Environment</label>
            <div className="mt-2">
            <div className="flex gap-2">
              <RadioGroup value={environment} onChange={(v) => setEnvironment(v)}>
                <RadioGroupItem value="Indoor">Indoor</RadioGroupItem>
                <RadioGroupItem value="Outdoor">Outdoor</RadioGroupItem>
              </RadioGroup>
            </div>
          </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 font-semibold">Serviceability</label>
            <div className="mt-2">
              <div className="flex gap-2">
                <RadioGroup value={service} onChange={(v) => setService(v)}>
                  <RadioGroupItem value="Front">Front</RadioGroupItem>
                  <RadioGroupItem value="Back">Back</RadioGroupItem>
                </RadioGroup>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 font-semibold">Form factor</label>
            <div className="mt-2">
              <div className="flex gap-2">
                <RadioGroup value={formFactor} onChange={(v) => setFormFactor(v)}>
                  <RadioGroupItem value="Straight">Straight</RadioGroupItem>
                  <RadioGroupItem value="Curvy">Curvy</RadioGroupItem>
                </RadioGroup>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm text-zinc-300 font-semibold">Optional: Select a product (if you know it)</label>
          <Select onValueChange={(v) => setSelectedProduct(v)}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Choose product (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANC-4-IN">ANC 4mm Elite</SelectItem>
              <SelectItem value="ANC-10-OUT">ANC 10mm Standard</SelectItem>
              <SelectItem value="GPPA062">LG GPPA062</SelectItem>
              <SelectItem value="RISE-PRO">RISE WTC Special</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={closeDiagnostic}>Cancel</Button>
          <Button className="ml-2" onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiagnosticOverlay;
