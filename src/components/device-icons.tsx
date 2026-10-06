import type { SVGProps } from "react";

// User-provided modern minimalist Windows outline logo
export function WindowsOutlineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.5" />
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="1.5" />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="1.5" />
      <rect x="13" y="13" width="8.5" height="8.5" rx="1.5" />
    </svg>
  );
}

// User-provided modern minimalist Android robot outline logo
export function AndroidOutlineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Antennae */}
      <line x1="6.5" y1="2" x2="8.5" y2="4.8" />
      <line x1="17.5" y1="2" x2="15.5" y2="4.8" />
      {/* Head */}
      <path d="M5.5 10a6.5 6.5 0 0 1 13 0H5.5z" />
      {/* Eyes */}
      <circle cx="8.5" cy="7.8" r="0.8" fill="currentColor" />
      <circle cx="15.5" cy="7.8" r="0.8" fill="currentColor" />
      {/* Body */}
      <path d="M5.5 11.5h13v7a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-7z" />
      {/* Arms */}
      <rect x="2" y="11.5" width="2.2" height="6" rx="1.1" />
      <rect x="19.8" y="11.5" width="2.2" height="6" rx="1.1" />
      {/* Legs */}
      <rect x="8" y="20.5" width="2.2" height="2.5" rx="1.1" />
      <rect x="13.8" y="20.5" width="2.2" height="2.5" rx="1.1" />
    </svg>
  );
}

// User-provided modern minimalist Apple outline logo
export function AppleOutlineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Leaf */}
      <path d="M12.5 2c.6 1.6-.4 3.2-1.8 3.8-.5-.8-.1-2.4 1.8-3.8z" />
      {/* Apple contour with clean bite */}
      <path d="M19.2 13.5c-.1-2.4 2-3.6 2.1-3.7-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.2-.9-1.7 0-3.2 1-4.1 2.5-1.8 3.1-.5 7.7 1.2 10.2.9 1.2 1.9 2.5 3.2 2.4 1.3-.1 1.8-.8 3.3-.8 1.4 0 1.9.8 3.3.8 1.4 0 2.3-1.2 3.1-2.4 1-1.5 1.4-2.9 1.4-3-.1 0-3-1.1-3-4.6z" />
    </svg>
  );
}
