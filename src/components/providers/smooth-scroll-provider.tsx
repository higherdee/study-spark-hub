import { type ReactNode } from "react";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  // App screens own their scroll containers; native browser scrolling keeps
  // keyboard placement, PDF gestures and chat position consistent with Android.

  return <>{children}</>;
}
