import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Globe,
  Radio,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
  Smartphone,
  Sparkles,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  GA_MEASUREMENT_ID,
  GA_CONSOLE_URL,
  sendGATestPing,
  trackGAEvent,
} from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [{ title: "Analytics Hub — Syllaboss Admin" }],
  }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [pingCount, setPingCount] = useState(0);
  const [testingPing, setTestingPing] = useState(false);
  const [clientInfo, setClientInfo] = useState<{
    url: string;
    referrer: string;
    screen: string;
    userAgent: string;
    online: boolean;
  }>({
    url: "",
    referrer: "",
    screen: "",
    userAgent: "",
    online: true,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLiveActive(typeof window.gtag === "function");
      setClientInfo({
        url: window.location.href,
        referrer: document.referrer || "Direct / Syllaboss PWA",
        screen: `${window.screen.width}x${window.screen.height}`,
        userAgent: navigator.userAgent,
        online: navigator.onLine,
      });
    }
  }, []);

  const handleSendTestPing = () => {
    setTestingPing(true);
    const success = sendGATestPing(user?.email || "admin@syllaboss.org");
    if (success) {
      setPingCount((prev) => prev + 1);
      toast.success(
        "Live test event dispatched to Google Analytics (event: admin_diagnostic_ping)!",
        {
          description: "Check your GA4 Realtime dashboard to verify immediate delivery.",
        }
      );
    } else {
      toast.error(
        "Google Analytics gtag is initializing or blocked by an ad-blocker."
      );
    }
    setTimeout(() => setTestingPing(false), 500);
  };

  const handleSendCustomEvent = (eventName: string, label: string) => {
    trackGAEvent(eventName, "admin_action", label, undefined, {
      admin_user: user?.email || "admin",
      timestamp: new Date().toISOString(),
    });
    toast.success(`Event '${eventName}' sent to GA4.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Telemetry & Audience"
        title="Google Analytics 4"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTestPing}
              disabled={testingPing}
              className="gap-2 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Send className="size-3.5 text-primary" />
              {testingPing ? "Dispatching..." : "Send Test Ping"}
            </Button>
            <a
              href={GA_CONSOLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              Open GA4 Console
              <ExternalLink className="size-3.5 ml-0.5" />
            </a>
          </div>
        }
      />

      {/* Main Status & Quick Launch Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Live Telemetry Active
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-mono font-medium text-primary">
                {GA_MEASUREMENT_ID}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Syllaboss Audience & Behavior Monitoring
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Google Analytics is collecting live telemetry across{" "}
              <strong className="text-foreground">syllaboss.org</strong>, including single-page
              app (SPA) route changes, material previews, search queries, study streaks, and
              SyllaPlus checkouts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <a
              href={`${GA_CONSOLE_URL}#/realtime/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background shadow-md hover:opacity-90 transition-all"
            >
              <Radio className="size-4 text-emerald-400" />
              View Realtime Users
              <ArrowUpRight className="size-3.5 opacity-70" />
            </a>
            <a
              href={`${GA_CONSOLE_URL}#/reports/acquisition-overview/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/80 px-4 py-2.5 text-xs font-semibold hover:bg-secondary transition-all"
            >
              <TrendingUp className="size-4 text-primary" />
              Traffic Acquisition
              <ArrowUpRight className="size-3.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/50 text-xs">
          <div>
            <div className="text-muted-foreground">Measurement ID</div>
            <div className="font-semibold text-foreground font-mono mt-0.5">
              {GA_MEASUREMENT_ID}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Domain Scope</div>
            <div className="font-semibold text-foreground mt-0.5">syllaboss.org</div>
          </div>
          <div>
            <div className="text-muted-foreground">SPA History Tracking</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Enabled (Auto)
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Test Pings Sent</div>
            <div className="font-semibold text-foreground mt-0.5 font-mono">
              {pingCount} in this session
            </div>
          </div>
        </div>
      </div>

      {/* Direct Report Deep-links */}
      <div>
        <h3 className="font-display text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          Direct Google Analytics Reports
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReportCard
            title="Realtime Activity"
            description="Inspect active students online right now, their current locations, and screens."
            href={`${GA_CONSOLE_URL}#/realtime/`}
            icon={Radio}
            badge="Live"
          />
          <ReportCard
            title="Traffic Acquisition"
            description="See where students come from: WhatsApp shares, Google search, direct links, or referrals."
            href={`${GA_CONSOLE_URL}#/reports/acquisition-overview/`}
            icon={Globe}
          />
          <ReportCard
            title="Pages & Engagement"
            description="Analyze top study materials visited, time spent reading, and active course notes."
            href={`${GA_CONSOLE_URL}#/reports/engagement-pages/`}
            icon={Activity}
          />
          <ReportCard
            title="Conversions & Events"
            description="Track document uploads, student registrations, wallet cashouts, and SyllaPlus subscriptions."
            href={`${GA_CONSOLE_URL}#/reports/events-overview/`}
            icon={Sparkles}
          />
        </div>
      </div>

      {/* Diagnostics and Session Information */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verification & Live Tester */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Live Telemetry Dispatcher
            </h4>
            <span className="text-xs text-muted-foreground">
              {isLiveActive ? "gtag initialized" : "checking tag..."}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Send test events right now to verify that your Google Analytics property is
            actively recording signals without delay.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendTestPing}
              className="text-xs rounded-xl"
            >
              <Send className="size-3 mr-1.5" />
              Send Ping (admin_diagnostic_ping)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendCustomEvent("admin_library_audit", "materials_check")}
              className="text-xs rounded-xl"
            >
              Simulate Library Audit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendCustomEvent("admin_broadcast_sent", "campus_alert")}
              className="text-xs rounded-xl"
            >
              Simulate Broadcast Event
            </Button>
          </div>

          <div className="rounded-xl bg-secondary/50 p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Info className="size-3.5 text-primary" />
              How to verify in Realtime:
            </div>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Click &ldquo;Send Test Ping&rdquo; above</li>
              <li>
                Open the{" "}
                <a
                  href={`${GA_CONSOLE_URL}#/realtime/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium"
                >
                  GA4 Realtime view
                </a>
              </li>
              <li>
                Look under &ldquo;Event count by Event name&rdquo; for{" "}
                <code className="text-primary">admin_diagnostic_ping</code>
              </li>
            </ol>
          </div>
        </section>

        {/* Client Environment Inspector */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Smartphone className="size-4 text-primary" />
            Current Session Telemetry
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Current URL</span>
              <span className="font-mono text-foreground truncate max-w-[240px]">
                {clientInfo.url || "/admin/analytics"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Referrer</span>
              <span className="text-foreground">{clientInfo.referrer}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Screen Resolution</span>
              <span className="text-foreground">{clientInfo.screen || "Detecting..."}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Network Status</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {clientInfo.online ? "Online (Connected)" : "Offline"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Logged Admin</span>
              <span className="text-foreground font-medium">{user?.email || "Super Admin"}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof Activity;
  badge?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary/40 hover:shadow-md"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Icon className="size-4.5" />
          </div>
          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {badge}
              </span>
            )}
            <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>

        <h4 className="mt-3 font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-4 flex items-center text-[11px] font-semibold text-primary">
        Open in Google Analytics &rarr;
      </div>
    </a>
  );
}
