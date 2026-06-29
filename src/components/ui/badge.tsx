import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground ring-border",
        secondary: "bg-muted text-muted-foreground ring-transparent",
        outline: "bg-transparent text-muted-foreground ring-border",
        healthy: "bg-status-healthy/10 text-status-healthy ring-status-healthy/30",
        warn: "bg-status-warn/10 text-status-warn ring-status-warn/30",
        error: "bg-status-error/10 text-status-error ring-status-error/30",
        instrument: "bg-instrument/10 text-instrument ring-instrument/30",
      },
      size: {
        default: "px-2.5 py-0.5 text-[11px]",
        sm: "px-2 py-0.5 text-[10px]",
      },
      shape: {
        pill: "rounded-full",
        tag: "rounded-lg px-2 py-1 text-xs font-mono",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "pill",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  shape,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
