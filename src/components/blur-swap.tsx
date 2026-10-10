"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Cross-fades between states with a blur: the old one blurs and fades out while the new one
 * sharpens in, in the same spot. Change `swapKey` to swap.
 */
export function BlurSwap({ swapKey, children }: { swapKey: string; children: ReactNode }) {
  const still = useReducedMotion();
  const hidden = still ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", scale: 0.8 };
  return (
    // both states share one grid cell, so the swap never shifts the layout
    <span className="inline-grid place-items-center">
      <AnimatePresence initial={false}>
        <motion.span
          key={swapKey}
          className="col-start-1 row-start-1 inline-flex items-center justify-center"
          initial={hidden}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={hidden}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
