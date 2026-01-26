"use client";

import React from "react";

type RadioGroupProps = React.PropsWithChildren<{
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}>;

export function RadioGroup({ value, onChange, children, className }: RadioGroupProps) {
  return (
    <div role="radiogroup" aria-label="Radio group" className={className}>
      {React.Children.map(children, (child: any) => {
        if (!React.isValidElement(child)) return null;
        return React.cloneElement(child, { name: "rg", checked: child.props.value === value, onChange });
      })}
    </div>
  );
}

export function RadioGroupItem({ value, children, checked, onChange, className }: any) {
  return (
    <button
      role="radio"
      aria-checked={checked}
      onClick={() => onChange && onChange(value)}
      className={`px-3 py-1 rounded ${checked ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-300'} ${className || ''}`}
    >
      {children}
    </button>
  );
}

export default RadioGroup;