import type { ReactNode } from "react";

/** The public platform is open. Authentication and admin access remain route guards. */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
