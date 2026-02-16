"use client";

import { Input } from "@/components/ui/input";
import type { RoiInputs } from "../hooks/useRoiCalculation";

interface RoiFormProps {
  inputs: RoiInputs;
  onChange: (inputs: RoiInputs) => void;
}

function Field({
  label,
  hint,
  value,
  onChange,
  prefix,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground block mb-1">
        {label}
        {hint && <span className="text-muted-foreground font-normal ml-1">({hint})</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className={prefix ? "pl-7 font-mono tabular-nums" : "font-mono tabular-nums"}
        />
      </div>
    </div>
  );
}

export default function RoiForm({ inputs, onChange }: RoiFormProps) {
  const update = (key: keyof RoiInputs, value: number) => {
    onChange({ ...inputs, [key]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Project
        </h3>
        <Field
          label="Total Project Cost"
          value={inputs.projectCost}
          onChange={(v) => update("projectCost", v)}
          prefix="$"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Venue
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Venue Capacity"
            hint="seats"
            value={inputs.venueCapacity}
            onChange={(v) => update("venueCapacity", v)}
          />
          <Field
            label="Events / Year"
            hint="games"
            value={inputs.eventsPerYear}
            onChange={(v) => update("eventsPerYear", v)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Ad Revenue
        </h3>
        <Field
          label="Ad CPM Rate"
          hint="per 1,000 impressions"
          value={inputs.adCpmRate}
          onChange={(v) => update("adCpmRate", v)}
          prefix="$"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Sponsorships
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Sponsor Packages"
            hint="count"
            value={inputs.sponsorPackages}
            onChange={(v) => update("sponsorPackages", v)}
          />
          <Field
            label="Avg. Annual Rate"
            hint="per package"
            value={inputs.avgSponsorRate}
            onChange={(v) => update("avgSponsorRate", v)}
            prefix="$"
          />
        </div>
      </div>
    </div>
  );
}
