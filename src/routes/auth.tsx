import { ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useTheme } from "@/lib/theme";
import { AlertCircle, BookOpen, Bot, Coins, Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";

import { SyllabossEmblem, SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { clerkAppearance } from "@/integrations/clerk";
import { TermsBeforeSignup } from "@/components/account-consent";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).catch("signin").default("signin"),
  redirect: z
    .string()
    .regex(/^\/(?:shared\/[a-f0-9-]{36}|dashboard(?:[/?][^\\\u0000-\u001f]*)?)$/i)
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Syllaboss" },
      {
        name: "description",
        content: "Sign in to Syllaboss or create a free account to save your study profile.",
      },
      { property: "og:title", content: "Sign in or create an account — Syllaboss" },
      {
        property: "og:description",
        content: "Save your institution, course and level with a free Syllaboss account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const PERKS = [
  {
    icon: BookOpen,
    title: "Verified notes & past questions",
    sub: "Searchable by school, course and level.",
  },
  {
    icon: Bot,
    title: "Boss AI that shows its working",
    sub: "Step-by-step answers, quizzes and explanations.",
  },
  {
    icon: Coins,
    title: "Earn while you learn",
    sub: "Points for studying and sharing, withdrawable to your bank.",
  },
];

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const destination = redirect || "/dashboard";
  const { user } = useAuth();
  const isSignup = mode === "signup";
  const { theme } = useTheme();
  const appearance = useMemo(
    () => ({
      ...clerkAppearance,
      variables: {
        ...clerkAppearance.variables,
        colorPrimary: theme === "dark" ? "#9bd7bb" : "#153e32",
        colorText: theme === "dark" ? "#e3eee6" : "#1e3029",
        colorTextSecondary: theme === "dark" ? "#b0c3b7" : "#607067",
        colorBackground: theme === "dark" ? "#101d17" : "#f6f5ef",
        colorInputBackground: theme === "dark" ? "#1c2e24" : "#eaece5",
        borderRadius: "0.875rem",
      },
    }),
    [theme],
  );

  useEffect(() => {
    if (user) {
      window.location.replace(destination);
    }
  }, [user, destination]);

  return (
    <div className="native-auth">
      <header>
        <a href="/" aria-label="Back to Syllaboss">
          <SyllabossLogo asDiv />
        </a>
        <a
          href={
            (isSignup ? "/auth?mode=signin" : "/auth?mode=signup") +
            "&redirect=" +
            encodeURIComponent(destination)
          }
        >
          {isSignup ? "Sign in" : "Create account"}
        </a>
      </header>
      <main>
        <div className="native-auth-intro">
          <p className="native-eyebrow">Your learning, all together</p>
          <h1>{isSignup ? "Make it yours." : "Welcome back."}</h1>
          <p>{isSignup ? "A study space built around you." : "Your next chapter starts here."}</p>
        </div>
        <div className="native-auth-form">
          {" "}
          <ClerkLoading>
            <AuthLoadingPanel />
          </ClerkLoading>
          <ClerkLoaded>
            <div key={mode} className="route-enter !h-auto w-full max-w-[26rem]">
              {isSignup ? (
                <TermsBeforeSignup>
                  <SignUp
                    appearance={appearance}
                    routing="virtual"
                    signInUrl={"/auth?mode=signin&redirect=" + encodeURIComponent(destination)}
                    forceRedirectUrl={destination}
                    fallbackRedirectUrl={destination}
                    fallback={<AuthLoadingPanel label="Preparing account creation…" />}
                  />
                </TermsBeforeSignup>
              ) : (
                <SignIn
                  appearance={appearance}
                  routing="virtual"
                  signUpUrl={"/auth?mode=signup&redirect=" + encodeURIComponent(destination)}
                  forceRedirectUrl={destination}
                  fallbackRedirectUrl={destination}
                  fallback={<AuthLoadingPanel label="Preparing sign in…" />}
                />
              )}
            </div>
          </ClerkLoaded>
          <ClerkFailed>
            <AuthFailurePanel />
          </ClerkFailed>
        </div>
      </main>
      <footer>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/">Back to Syllaboss</a>
      </footer>
    </div>
  );
}

function AuthLoadingPanel({ label = "Connecting to secure sign in…" }: { label?: string }) {
  return (
    <div
      className="grid w-full max-w-[26rem] justify-items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-[var(--elev-1)]"
      role="status"
      aria-live="polite"
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-forest/8 text-forest">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        This usually takes a moment.
      </p>
    </div>
  );
}

function AuthFailurePanel() {
  return (
    <div
      className="grid w-full max-w-[26rem] justify-items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-[var(--elev-1)]"
      role="alert"
    >
      <span className="grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" aria-hidden="true" />
      </span>
      <h1 className="font-display text-xl font-medium text-ink">Sign in didn’t load</h1>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        Check your connection, then try again. If the problem continues, the sign-in service may be
        temporarily unavailable.
      </p>
      <Button className="mt-1 min-h-11 gap-2" onClick={() => window.location.reload()}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
