export const CLERK_PUBLISHABLE_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.['VITE_CLERK_PUBLISHABLE_KEY'] as string | undefined) ||
  (typeof import.meta !== "undefined" && import.meta.env?.['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] as string | undefined) ||
  (typeof process !== "undefined" && process.env?.['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']) ||
  (typeof process !== "undefined" && process.env?.['CLERK_PUBLISHABLE_KEY']) ||
  (typeof process !== "undefined" && process.env?.['VITE_CLERK_PUBLISHABLE_KEY']) ||
  "pk_live_Y2xlcmsuc3lsbGFib3NzLm9yZyQ";

export const CLERK_SECRET_KEY =
  (typeof process !== "undefined" && process.env?.['CLERK_SECRET_KEY']) || "";

export const clerkAppearance = {
  variables: {
    colorPrimary: "#0b2e22",
    colorText: "#14201b",
    colorTextSecondary: "#66706a",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    borderRadius: "0.625rem",
    fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
  },
  elements: {
    rootBox: "w-full",
    card: "shadow-none border-0 bg-transparent p-0 gap-6",
    headerTitle: "font-display text-[1.75rem] font-semibold tracking-tight text-ink",
    headerSubtitle: "text-sm text-muted-foreground",
    socialButtonsBlockButton:
      "border border-input bg-card text-foreground hover:bg-muted rounded-lg h-11 transition-colors font-semibold text-sm shadow-none",
    dividerLine: "bg-border",
    dividerText: "text-[11px] text-muted-foreground uppercase tracking-widest px-2",
    formFieldLabel: "text-xs font-semibold text-foreground",
    formFieldInput:
      "h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-none focus-visible:outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15 transition-[border-color,box-shadow]",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary-container rounded-lg font-semibold h-11 text-sm transition-[background-color,transform] shadow-none active:scale-[0.98] normal-case",
    footerActionLink: "text-forest hover:underline font-semibold",
    footer: "bg-transparent border-t-0",
    footerAction: "justify-start",
  },
};
