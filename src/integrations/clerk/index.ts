export const CLERK_PUBLISHABLE_KEY =
  (import.meta.env['VITE_CLERK_PUBLISHABLE_KEY'] as string | undefined) ||
  (import.meta.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] as string | undefined) ||
  "pk_test_bW9yZS1vY3RvcHVzLTM5MTYuY2xlcmsuYWNjb3VudHMuZGV2JA";

export const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    card: "shadow-xl border border-border/80 rounded-3xl bg-card p-6 sm:p-8",
    headerTitle: "font-display text-2xl font-bold text-foreground text-center",
    headerSubtitle: "text-sm text-muted-foreground text-center",
    socialButtonsBlockButton:
      "border border-border/80 bg-background text-foreground hover:bg-secondary rounded-xl h-11 transition-all font-medium text-sm",
    dividerLine: "bg-border/60",
    dividerText: "text-xs text-muted-foreground uppercase font-mono px-2",
    formFieldLabel: "text-xs font-semibold text-foreground tracking-wide",
    formFieldInput:
      "h-11 rounded-xl border border-input bg-background px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl font-semibold h-11 text-sm transition-all shadow-sm active:scale-[0.99]",
    footerActionLink: "text-primary hover:underline font-semibold",
    footer: "bg-transparent border-t-0 pt-4",
  },
};
