export const CLERK_PUBLISHABLE_KEY =
  (import.meta.env['VITE_CLERK_PUBLISHABLE_KEY'] as string | undefined) ||
  (import.meta.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] as string | undefined) ||
  "pk_test_bW9yZS1vY3RvcHVzLTM5MTYuY2xlcmsuYWNjb3VudHMuZGV2JA";

export const clerkAppearance = {
  elements: {
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-medium h-11 text-sm transition-colors",
    card: "shadow-none border border-border rounded-2xl bg-card",
    headerTitle: "font-display text-2xl font-semibold text-foreground",
    headerSubtitle: "text-sm text-muted-foreground",
    socialButtonsBlockButton:
      "border border-border bg-card text-foreground hover:bg-accent rounded-xl h-11 transition-colors",
    formFieldInput:
      "h-11 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    footerActionLink: "text-primary hover:underline font-medium",
  },
};
