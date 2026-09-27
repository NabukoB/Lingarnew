"use client";

import { animate, LazyMotion, m, MotionConfig, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

const loadFeatures = () => import("./motion-features").then((r) => r.default);

/** Loads framer-motion features once and honours the OS "reduce motion" setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

export const spring = { type: "spring", stiffness: 500, damping: 38, mass: 0.7 } as const;
export const ease = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

/** Children marked <StaggerItem> rise in one after another. */
export function Stagger({ className, children, as = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "ul" | "section" }) {
  const Comp = as === "ul" ? m.ul : as === "section" ? m.section : m.div;
  return (
    <Comp className={className} variants={stagger} initial="hidden" animate="show">
      {children}
    </Comp>
  );
}

export function StaggerItem({ className, children, as = "div", ...rest }: { className?: string; children: React.ReactNode; as?: "div" | "li" } & React.AriaAttributes) {
  const Comp = as === "li" ? m.li : m.div;
  return (
    <Comp className={className} variants={rise} {...rest}>
      {children}
    </Comp>
  );
}

/** Fades and lifts content in on mount. */
export function Reveal({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <m.div className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease, delay }}>
      {children}
    </m.div>
  );
}

/** Animates a number up from 0 the first time it is on screen. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-KE"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => format(v));
  React.useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.9, ease });
    return () => controls.stop();
  }, [inView, value, reduce, mv]);
  return (
    <m.span ref={ref} className={cn("tabular", className)} aria-label={format(value)}>
      {text}
    </m.span>
  );
}

/** A lift-on-hover, press-on-tap wrapper for cards and tiles. */
export const Pressable = React.forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(({ className, children }, ref) => (
  <m.div ref={ref} className={className} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={spring}>
    {children}
  </m.div>
));
Pressable.displayName = "Pressable";

export { m };
