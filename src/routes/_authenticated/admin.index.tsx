import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Coins, Download, FileStack, Users, Wallet, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader, StatCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminOverview });

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary)", "var(--muted-foreground)"];

async function all<T>(table: "profiles" | "materials" | "withdrawals" | "points_ledger", cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

type P = { id: string; created_at: string; referral_source: string | null; institution: string | null; points: number; onboarding_step: number };
type M = { id: string; created_at: string; status: string; material_type: string; course: string; page_count: number; points_awarded: number; downloads: number; verification_score: number | null };
type W = { created_at: string; status: string; amount_naira: number; points: number };

function dayKey(d: string) { return d.slice(0, 10); }

function AdminOverview() {
  const [range, setRange] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const [profiles, materials, withdrawals] = await Promise.all([
        all<P>("profiles", "id, created_at, referral_source, institution, points, onboarding_step"),
        all<M>("materials", "id, created_at, status, material_type, course, page_count, points_awarded, downloads, verification_score"),
        all<W>("withdrawals", "created_at, status, amount_naira, points"),
      ]);
      return { profiles, materials, withdrawals };
    },
  });

  const m = useMemo(() => {
    if (!data) return null;
    const { profiles, materials, withdrawals } = data;
    const days: string[] = [];
    for (let i = range - 1; i >= 0; i--) days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    const series = days.map((d) => ({
      day: d.slice(5),
      signups: profiles.filter((p) => dayKey(p.created_at) === d).length,
      uploads: materials.filter((x) => dayKey(x.created_at) === d).length,
      verified: materials.filter((x) => dayKey(x.created_at) === d && x.status === "verified").length,
      payouts: withdrawals.filter((w) => dayKey(w.created_at) === d && w.status !== "rejected").reduce((a, w) => a + w.amount_naira, 0),
    }));
    const count = (arr: (string | null)[]) => {
      const map = new Map<string, number>();
      arr.forEach((k) => map.set(k || "Not set", (map.get(k || "Not set") ?? 0) + 1));
      return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    };
    return {
      series,
      referral: count(profiles.map((p) => p.referral_source)),
      types: count(materials.map((x) => x.material_type)),
      institutions: count(profiles.map((p) => p.institution)).filter((x) => x.name !== "Not set").slice(0, 8),
      status: count(materials.map((x) => x.status)),
      courses: count(materials.filter((x) => x.status === "verified").map((x) => x.course)).slice(0, 8),
      totals: {
        users: profiles.length,
        onboarded: profiles.filter((p) => p.onboarding_step >= 3).length,
        materials: materials.length,
        verified: materials.filter((x) => x.status === "verified").length,
        pending: materials.filter((x) => x.status === "pending").length,
        rejected: materials.filter((x) => x.status === "rejected").length,
        pages: materials.filter((x) => x.status === "verified").reduce((a, x) => a + x.page_count, 0),
        downloads: materials.reduce((a, x) => a + x.downloads, 0),
        pointsOutstanding: profiles.reduce((a, p) => a + p.points, 0),
        pointsAwarded: materials.reduce((a, x) => a + x.points_awarded, 0),
        paid: withdrawals.filter((w) => w.status === "paid").reduce((a, w) => a + w.amount_naira, 0),
        pendingPayout: withdrawals.filter((w) => w.status === "pending").reduce((a, w) => a + w.amount_naira, 0),
        avgScore: Math.round(materials.filter((x) => x.verification_score !== null).reduce((a, x, _i, arr) => a + (x.verification_score ?? 0) / arr.length, 0)),
      },
    };
  }, [data, range]);

  if (isLoading || !m) return <p className="text-muted-foreground">Loading metrics…</p>;
  const t = m.totals;

  return (
    <div>
      <PageHeader eyebrow="Platform metrics" title="Admin overview">
        <div className="flex rounded-full border border-border p-1 text-sm">
          {[7, 30, 90].map((r) => <button key={r} onClick={() => setRange(r)} className={cn("rounded-full px-3 py-1", range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{r}d</button>)}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={t.users} hint={`${t.onboarded} finished setup`} icon={Users} />
        <StatCard label="Materials" value={t.materials} hint={`${t.pages} verified pages`} icon={FileStack} />
        <StatCard label="Verified" value={t.verified} hint={`Avg match score ${t.avgScore}/100`} icon={CheckCircle2} />
        <StatCard label="Awaiting review" value={t.pending} hint={`${t.rejected} rejected`} icon={Clock} />
        <StatCard label="Downloads" value={t.downloads} icon={Download} />
        <StatCard label="Points awarded" value={t.pointsAwarded} hint={`${t.pointsOutstanding} unspent`} icon={Coins} />
        <StatCard label="Paid out" value={formatNaira(t.paid)} icon={Wallet} />
        <StatCard label="Pending payouts" value={formatNaira(t.pendingPayout)} icon={XCircle} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Sign-ups & uploads">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={m.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip /><Legend />
              <Area type="monotone" dataKey="signups" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="uploads" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="verified" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Payout requests (₦)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={m.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip /><Bar dataKey="payouts" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Where students heard about us"><Donut data={m.referral} /></Panel>
        <Panel title="Material status"><Donut data={m.status} /></Panel>
        <Panel title="Material types"><HBar data={m.types} /></Panel>
        <Panel title="Top institutions"><HBar data={m.institutions} /></Panel>
        <Panel title="Top courses (verified materials)"><HBar data={m.courses} /></Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5"><h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>{children}</section>;
}

function Donut({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="py-16 text-center text-sm text-muted-foreground">No data yet</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HBar({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="py-16 text-center text-sm text-muted-foreground">No data yet</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <XAxis type="number" allowDecimals={false} fontSize={11} stroke="var(--muted-foreground)" />
        <YAxis type="category" dataKey="name" width={150} fontSize={11} stroke="var(--muted-foreground)" tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)} />
        <Tooltip /><Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
