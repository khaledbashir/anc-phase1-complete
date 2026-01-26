"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ProposalType } from "@/types";

export default function AuditTable() {
  const { control } = useFormContext<ProposalType>();
  const audit = useWatch({ name: "details.internalAudit", control }) as any;

  if (!audit || !audit.perScreen || audit.perScreen.length === 0) {
    return <p className="text-zinc-400">No internal audit available. Generate PDF to create an audit snapshot.</p>;
  }

  return (
    <table className="min-w-full text-sm text-left text-zinc-200">
      <thead>
        <tr>
          <th className="px-3 py-2">Screen</th>
          <th className="px-3 py-2">Qty</th>
          <th className="px-3 py-2">Area (sqft)</th>
          <th className="px-3 py-2">Hardware</th>
          <th className="px-3 py-2">Structure (20%)</th>
          <th className="px-3 py-2">Install</th>
          <th className="px-3 py-2">Labor (15%)</th>
          <th className="px-3 py-2">Shipping</th>
          <th className="px-3 py-2">PM</th>
          <th className="px-3 py-2">Bond</th>
          <th className="px-3 py-2">Total Cost</th>
          <th className="px-3 py-2">Total Price</th>
        </tr>
      </thead>
      <tbody>
        {audit.perScreen.map((s: any, idx: number) => (
          <tr key={idx} className="border-t border-zinc-800">
            <td className="px-3 py-2">{s.name}</td>
            <td className="px-3 py-2">{s.quantity}</td>
            <td className="px-3 py-2">{s.areaSqFt}</td>
            <td className="px-3 py-2">{s.breakdown.hardware}</td>
            <td className="px-3 py-2">{s.breakdown.structure}</td>
            <td className="px-3 py-2">{s.breakdown.install}</td>
            <td className="px-3 py-2">{s.breakdown.labor}</td>
            <td className="px-3 py-2">{s.breakdown.shipping}</td>
            <td className="px-3 py-2">{s.breakdown.pm}</td>
            <td className="px-3 py-2">{s.breakdown.bond}</td>
            <td className="px-3 py-2">{s.breakdown.totalCost}</td>
            <td className="px-3 py-2">{s.breakdown.totalPrice}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
