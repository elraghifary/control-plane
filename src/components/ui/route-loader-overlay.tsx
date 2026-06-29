"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { KineticTextLoader } from "@/components/ui/kinetic-text-loader";

const clientTrue = () => true;
const serverFalse = () => false;
const noSubscribe = () => () => {};

export function RouteLoaderOverlay({ text = "Loading" }: { text?: string }) {
  const mounted = React.useSyncExternalStore(noSubscribe, clientTrue, serverFalse);

  if (!mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
    >
      <KineticTextLoader text={text} className="overflow-hidden" />
    </div>,
    document.body,
  );
}
