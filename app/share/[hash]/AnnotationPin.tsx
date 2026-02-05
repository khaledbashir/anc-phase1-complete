"use client";

import { motion } from "framer-motion";

interface AnnotationPinProps {
  pinNumber: number;
  x: number; // 0-1 ratio
  y: number; // 0-1 ratio
  isActive: boolean;
  onClick: () => void;
}

export default function AnnotationPin({
  pinNumber,
  x,
  y,
  isActive,
  onClick,
}: AnnotationPinProps) {
  return (
    <motion.button
      data-annotation-pin
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.15 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold shadow-lg transition-colors ${
        isActive
          ? "bg-blue-600 text-white ring-4 ring-blue-300/50"
          : "bg-blue-500 text-white hover:bg-blue-600"
      }`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {pinNumber}
    </motion.button>
  );
}
