"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ProposalType } from "@/types";

import { motion } from "framer-motion";

export default function AuditTable() {
  const { control } = useFormContext<ProposalType>();
  const audit = useWatch({ name: "details.internalAudit", control }) as any;

  if (!audit || !audit.perScreen || audit.perScreen.length === 0) {
    return <p className="text-zinc-400">No internal audit available. Generate PDF to create an audit snapshot.</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-zinc-950/50 backdrop-blur-xl border border-zinc-800 rounded-lg p-2"
    >
      <table className="min-w-full text-sm text-left text-zinc-200">
        <thead>
          <tr>
            <th className="px-3 py-2">Screen</th>
            <th className="px-3 py-2">Service</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Area (sqft)</th>
            <th className="px-3 py-2">Pixel Matrix</th>
            <th className="px-3 py-2">Hardware</th>
            <th className="px-3 py-2">Structure</th>
            <th className="px-3 py-2">Install</th>
            <th className="px-3 py-2">Labor</th>
            <th className="px-3 py-2">Power</th>
            <th className="px-3 py-2">Shipping</th>
            <th className="px-3 py-2">PM</th>
            <th className="px-3 py-2">Total Cost</th>
            <th className="px-3 py-2">ANC Margin</th>
            <th className="px-3 py-2">Sell Price</th>
            <th className="px-3 py-2">Bond</th>
            <th className="px-3 py-2">Final Total</th>
            <th className="px-3 py-2">$/SqFt</th>
          </tr>
        </thead>
        <tbody>
          {audit.perScreen.map((s: any, idx: number) => (
            <tr key={idx} className="border-t border-zinc-800">
              <td className="px-3 py-2">{s.name}</td>
              <td className="px-3 py-2">{s.serviceType || '-'}</td>
              <td className="px-3 py-2">{s.quantity}</td>
              <td className="px-3 py-2">{s.areaSqFt}</td>
              <td className="px-3 py-2">{s.pixelMatrix || s.pixelResolution}</td>
              <td className="px-3 py-2">{s.breakdown.hardware}</td>
              <td className="px-3 py-2">{s.breakdown.structure}</td>
              <td className="px-3 py-2">{s.breakdown.install}</td>
              <td className="px-3 py-2">{s.breakdown.labor}</td>
              <td className="px-3 py-2">{s.breakdown.power}</td>
              <td className="px-3 py-2">{s.breakdown.shipping}</td>
              <td className="px-3 py-2">{s.breakdown.pm}</td>
              <td className="px-3 py-2">{s.breakdown.totalCost}</td>
              <td className="px-3 py-2">{s.breakdown.ancMargin}</td>
              <td className="px-3 py-2">{s.breakdown.sellPrice}</td>
              <td className="px-3 py-2">{s.breakdown.bondCost}</td>
              <td className="px-3 py-2">{s.breakdown.finalClientTotal}</td>
              <td className="px-3 py-2">{s.breakdown.sellingPricePerSqFt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
