"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
      <DialogContent className="max-w-2xl bg-zinc-950/90 backdrop-blur-2xl border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Strategic Specs Required</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {diagnosticPayload?.payload?.message ?? "To select the correct ANC product, I need to know the environment and serviceability requirements."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-zinc-300">Environment</Label>
            <RadioGroup
              value={environment}
              onValueChange={(value) => setEnvironment(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Indoor" id="env-indoor" className="border-zinc-700" />
                <Label htmlFor="env-indoor" className="cursor-pointer">Indoor</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Outdoor" id="env-outdoor" className="border-zinc-700" />
                <Label htmlFor="env-outdoor" className="cursor-pointer">Outdoor</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-zinc-300">Serviceability</Label>
            <RadioGroup
              value={service}
              onValueChange={(value) => setService(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Front" id="service-front" className="border-zinc-700" />
                <Label htmlFor="service-front" className="cursor-pointer">Front Service</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Back" id="service-back" className="border-zinc-700" />
                <Label htmlFor="service-back" className="cursor-pointer">Rear Service</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-zinc-300">Form Factor</Label>
            <RadioGroup
              value={formFactor}
              onValueChange={(value) => setFormFactor(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Straight" id="form-straight" className="border-zinc-700" />
                <Label htmlFor="form-straight" className="cursor-pointer">Straight</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Curvy" id="form-curvy" className="border-zinc-700" />
                <Label htmlFor="form-curvy" className="cursor-pointer">Curved</Label>
              </div>
            </RadioGroup>
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
