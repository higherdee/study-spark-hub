import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";
import { useMembership } from "@/hooks/use-membership";
interface CookieChoice {
  analytics: boolean;
  advertising: boolean;
}
export function CookiePreferences() {
  const { user, loading } = useAuth();
  const membership = useMembership();
  const [choice, setChoice] = useState<CookieChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem("syllaboss-cookie-choice") || "null");
      if (value && typeof value.analytics === "boolean" && typeof value.advertising === "boolean") {
        setChoice(value);
        setAnalytics(value.analytics);
        setAdvertising(value.advertising);
      } else setOpen(true);
    } catch {
      setOpen(true);
    }
    const show = () => setOpen(true);
    window.addEventListener("syllaboss:cookie-preferences", show);
    return () => window.removeEventListener("syllaboss:cookie-preferences", show);
  }, []);
  useEffect(() => {
    const target = window as unknown as Window & Record<string, unknown>;
    target[`ga-disable-${GA_MEASUREMENT_ID}`] = !choice?.analytics;
    if (choice?.analytics) {
      window.dataLayer ??= [];
      window.gtag ??= function (..._args: unknown[]) {
        window.dataLayer?.push(arguments);
      };
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: choice.advertising ? "granted" : "denied",
        ad_user_data: choice.advertising ? "granted" : "denied",
        ad_personalization: choice.advertising ? "granted" : "denied",
      });
      if (!document.getElementById("syllaboss-analytics")) {
        const script = document.createElement("script");
        script.id = "syllaboss-analytics";
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        document.head.append(script);
        window.gtag("js", new Date());
        window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: true });
      }
    } else if (window.gtag)
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    const showAds =
      choice?.advertising && !loading && (!user || (membership.isSuccess && !membership.data.paid));
    if (showAds && !document.getElementById("syllaboss-advertising")) {
      const script = document.createElement("script");
      script.id = "syllaboss-advertising";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3521407661073190";
      document.head.append(script);
    } else if (!showAds) document.getElementById("syllaboss-advertising")?.remove();
  }, [choice, loading, user?.id, membership.data?.paid, membership.isSuccess]);
  function save(value: CookieChoice) {
    localStorage.setItem("syllaboss-cookie-choice", JSON.stringify(value));
    setChoice(value);
    setOpen(false);
  }
  if (!open) return null;
  return (
    <aside
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-[70] mx-auto max-w-xl rounded-2xl border border-border bg-card p-5 shadow-xl sm:left-auto sm:right-5 sm:mx-0"
    >
      <h2 className="font-serif text-xl">Choose what stays on your device.</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Essential storage keeps sign-in and your preferences working. Optional cookies help measure
        usage and show advertising.{" "}
        <a className="underline" href="/privacy">
          Privacy details
        </a>
      </p>
      <div className="my-4 flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox checked={analytics} onCheckedChange={(value) => setAnalytics(value === true)} />
          Usage analytics
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={advertising}
            onCheckedChange={(value) => setAdvertising(value === true)}
          />
          Advertising
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => save({ analytics: false, advertising: false })}>
          Essential only
        </Button>
        <Button variant="outline" onClick={() => save({ analytics, advertising })}>
          Save choices
        </Button>
        <Button onClick={() => save({ analytics: true, advertising: true })}>Allow optional</Button>
      </div>
    </aside>
  );
}
