import type { SVGProps } from "react";

// Readable provider wordmarks; never substitute distorted or incomplete paths.
export function AmazonLogo(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 112 38" fill="currentColor" role="img" aria-label="Amazon" {...props}><text x="1" y="25" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="28" letterSpacing="-1">amazon</text><path d="M12 30 Q49 42 90 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

// Official Apple Silhouette Logo SVG
export function AppleLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 170 170" fill="currentColor" {...props}>
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.73-7.94-12.13-14.58-6.19-9.33-11.07-19.98-14.65-31.95-3.58-11.97-5.38-23.36-5.38-34.18 0-13.51 3.4-24.89 10.19-34.15 6.8-9.26 15.42-13.98 25.86-14.16 4.7 0 9.87 1.35 15.52 4.05 5.65 2.7 9.38 4.09 11.19 4.17 1.45 0 5.46-1.52 12.03-4.56 6.57-3.04 12.35-4.38 17.34-4.02 12.83.69 22.88 5.43 30.15 14.22-11.4 6.88-17 16.32-16.8 28.32.22 9.4 3.91 17.26 11.07 23.59 7.16 6.33 15.7 9.86 25.62 10.59-2.3 6.94-5.11 14.13-8.44 21.57zM119.22 33.64c0-7.39 2.66-14.47 7.99-21.24 5.33-6.77 11.96-11.14 19.89-13.11.16 1.15.24 2.22.24 3.21 0 7.23-2.77 14.39-8.31 21.48-5.54 7.09-12.21 11.53-20.02 13.32-.42-1.22-.63-2.34-.63-3.35z" />
    </svg>
  );
}

export function VisaLogo(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 112 38" fill="currentColor" role="img" aria-label="Visa" {...props}><text x="2" y="31" fontFamily="Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="38" letterSpacing="-1">VISA</text></svg>;
}

// Official Steam Piston / Crank Emblem SVG
export function SteamLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
      <path d="M50 0C22.4 0 0 22.4 0 50c0 23.4 16.1 43 37.9 48.4l13.6-19.8c-1.3-.5-2.5-1.3-3.5-2.3L27.6 82C18.6 77.2 12.5 67.8 12.5 57c0-15.2 12.3-27.5 27.5-27.5 15.2 0 27.5 12.3 27.5 27.5 0 2.8-.4 5.5-1.2 8.1l19.5 8.2c6.2-7 10-16.2 10-26.3C95.8 22.4 75.3 0 50 0zm-10 40c9.4 0 17 7.6 17 17 0 2.2-.4 4.3-1.2 6.2l-10-4.2c.1-.7.2-1.3.2-2 0-3.3-2.7-6-6-6s-6 2.7-6 6 2.7 6 6 6c.7 0 1.3-.1 2-.2l4.2 10c-1.9.8-4 1.2-6.2 1.2-9.4 0-17-7.6-17-17s7.6-17 17-17z" />
    </svg>
  );
}

// Smart Chip Gold Vector SVG
export function CardSmartChip(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 50 40" fill="none" {...props}>
      <rect width="50" height="40" rx="8" fill="#d4af37" />
      <rect x="2" y="2" width="46" height="36" rx="6" stroke="#b89326" strokeWidth="1.5" />
      <path d="M0 14h16M0 26h16M34 14h16M34 26h16M16 0v40M34 0v40" stroke="#94741c" strokeWidth="1.2" />
      <rect x="18" y="10" width="14" height="20" rx="4" stroke="#94741c" strokeWidth="1.2" />
    </svg>
  );
}
