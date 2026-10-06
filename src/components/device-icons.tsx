import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Exact user-provided Windows outline logo
 */
export function WindowsOutlineIcon({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="img"
      aria-label="Windows"
      className={cn("inline-block size-5 bg-current shrink-0", className)}
      style={{
        maskImage: "url('/device-logos/windows.png')",
        WebkitMaskImage: "url('/device-logos/windows.png')",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
      {...props}
    />
  );
}

/**
 * Exact user-provided Android robot outline logo
 */
export function AndroidOutlineIcon({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="img"
      aria-label="Android"
      className={cn("inline-block size-5 bg-current shrink-0", className)}
      style={{
        maskImage: "url('/device-logos/android.png')",
        WebkitMaskImage: "url('/device-logos/android.png')",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
      {...props}
    />
  );
}

/**
 * Exact user-provided Apple outline logo
 */
export function AppleOutlineIcon({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="img"
      aria-label="Apple"
      className={cn("inline-block size-5 bg-current shrink-0", className)}
      style={{
        maskImage: "url('/device-logos/apple.png')",
        WebkitMaskImage: "url('/device-logos/apple.png')",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
      {...props}
    />
  );
}
