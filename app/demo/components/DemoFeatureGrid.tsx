"use client";

import { motion, AnimatePresence } from "framer-motion";
import DemoFeatureCard from "./DemoFeatureCard";
import type { DemoFeature } from "../data/featureIdeas";

export default function DemoFeatureGrid({ features }: { features: DemoFeature[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
      <AnimatePresence mode="popLayout">
        {features.map((feature, i) => (
          <motion.div
            key={feature.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <DemoFeatureCard feature={feature} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
