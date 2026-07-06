"use client";
import * as React from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedCounter({ value, className, suffix }: { value: number; className?: string; suffix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1200, bounce: 0 });
  const [display, setDisplay] = React.useState(0);
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (!inView) return;
    if (shouldReduceMotion) React.startTransition(() => setDisplay(value));
    else mv.set(value);
  }, [inView, value, mv, shouldReduceMotion]);

  React.useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display.toLocaleString()}{suffix}
    </span>
  );
}
