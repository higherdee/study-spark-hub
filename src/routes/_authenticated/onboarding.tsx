import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, BookOpen, GraduationCap, ShieldCheck, Clock, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SearchSelect, type SearchOption } from "@/components/search-select";
import { SyllabossEmblem, SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertProfile } from "@/integrations/turso/client";
import { courseOptions, institutionOptions, LEVELS, REFERRAL_SOURCES } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { checkUsernameAvailableServerFn } from "@/lib/community.functions";
import { cn } from "@/lib/utils";
import { PageBreathingLoader } from "@/components/syllaboss-logo";
import { SyllaPlusModal } from "@/components/syllaplus-modal";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Academic Matriculation — Syllaboss" },
      { name: "description", content: "Tell Syllaboss about your school, course and study plan." },
      { property: "og:title", content: "Academic Matriculation — Syllaboss" },
      { property: "og:description", content: "Three quick steps to personalise your Syllaboss course ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = ["Early morning", "Afternoon", "Evening", "Late night"];
const STEPS = [
  { num: "01", label: "Scholar Credentials" },
  { num: "02", label: "Source Ledger" },
  { num: "03", label: "Curricular Plan" },
];

function Onboarding() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(user?.user_metadata.full_name ?? "");
  const [username, setUsername] = useState("");
  const [usernameSuggestion, setUsernameSuggestion] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState("");

  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState<SearchOption | null>(null);
  const [course, setCourse] = useState<SearchOption | null>(null);
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("100 Level");
  const [referral, setReferral] = useState("");
  const [hours, setHours] = useState(10);
  const [days, setDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [time, setTime] = useState("Evening");
  const [cgpa, setCgpa] = useState("4.50");
  const [goals, setGoals] = useState("");

  const userId = profile?.id ?? user?.id;

  useEffect(() => {
    if (!profile) {
      if (user?.user_metadata.full_name && !fullName) {
        setFullName(user.user_metadata.full_name);
      }
      return;
    }
    if (profile.onboarding_step >= 3) {
      navigate({ to: "/dashboard" });
      return;
    }
    if (!profile.institution || !profile.course || profile.onboarding_step === 0) {
      setStep(0);
    } else {
      setStep(Math.min(profile.onboarding_step, 2));
    }
    setFullName(profile.full_name || user?.user_metadata.full_name || "");
    if (profile.username) setUsername(profile.username);
    setPhone(profile.phone ?? "");
    if (profile.institution) setInstitution({ label: profile.institution });
    if (profile.course) setCourse({ label: profile.course });
    setDepartment(profile.department ?? "");
    if (profile.level) setLevel(profile.level);
    setReferral(profile.referral_source ?? "");
  }, [profile, user, navigate]);

  // Generate suggested username from name or email
  useEffect(() => {
    const raw = (fullName || user?.user_metadata.full_name || user?.email?.split("@")[0] || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 14);
    const suggested = raw ? `${raw}_${Math.floor(10 + Math.random() * 89)}` : `student_${Math.floor(100 + Math.random() * 899)}`;
    setUsernameSuggestion(suggested);
    if (!username && (!profile?.username || profile.username.startsWith("student_"))) {
      setUsername(suggested);
    }
  }, [fullName, user, profile]);

  // Debounced check username availability
  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setIsUsernameAvailable(null);
      setUsernameError("");
      return;
    }
    if (clean.length < 3) {
      setIsUsernameAvailable(false);
      setUsernameError("Handle must be at least 3 characters.");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setIsUsernameAvailable(false);
      setUsernameError("Only lowercase letters, numbers, and underscores allowed.");
      return;
    }

    setUsernameChecking(true);
    setUsernameError("");
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailableServerFn({
          data: { username: clean, excludeUserId: userId },
        });
        setIsUsernameAvailable(res.available);
        if (!res.available) {
          setUsernameError("This handle is already registered. Try another.");
        }
      } catch {
        // network fallback
      } finally {
        setUsernameChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, userId]);

  const [showPlusModal, setShowPlusModal] = useState(false);

  async function save(values: Record<string, unknown>, nextStep: number) {
    if (!userId) {
      toast.error("User session not found");
      return;
    }
    setSaving(true);
    try {
      await upsertProfile({ id: userId, ...values, onboarding_step: nextStep });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      if (nextStep >= 3) {
        toast.success("Academic registration complete!");
        setShowPlusModal(true);
      } else {
        setStep(nextStep);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record profile");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (step === 0) {
      if (fullName.trim().length < 2 || !institution || !course) {
        toast.error("Add your full name, institution and course");
        return;
      }
      if (!username.trim() || isUsernameAvailable === false) {
        toast.error(usernameError || "Please choose a valid unique handle.");
        return;
      }
      if (phone && !/^\+?[0-9 ]{10,15}$/.test(phone)) {
        toast.error("Enter a valid phone number");
        return;
      }
      save(
        {
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          phone: phone.trim() || null,
          institution: institution.label,
          course: course.label,
          department: course.label,
          level,
        },
        1
      );
    } else if (step === 1) {
      if (!referral) {
        toast.error("Please pick one option");
        return;
      }
      save({ referral_source: referral }, 2);
    } else {
      if (days.length === 0) {
        toast.error("Pick at least one study day");
        return;
      }
      save(
        {
          study_plan: {
            hours_per_week: hours,
            days,
            preferred_time: time,
            target_cgpa: cgpa,
            goals: goals.trim(),
          },
        },
        3
      );
    }
  }

  if (isLoading && !profile && !user) {
    return <PageBreathingLoader message="Consulting academic matriculation register..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-14">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <SyllabossLogo />
          <span className="eyebrow !text-ink-soft hidden sm:inline-block">
            Matriculation Registry
          </span>
        </div>

        {/* Step Progression Bar */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {STEPS.map((s, i) => {
            const isCurrent = i === step;
            const isDone = i < step;

            return (
              <div key={s.num} className="space-y-2">
                <div
                  className={cn(
                    "h-1 rounded-full transition-colors",
                    isDone || isCurrent ? "bg-forest" : "bg-border"
                  )}
                />
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "font-mono text-[10px] font-bold tnum",
                      isCurrent ? "text-forest font-black" : "text-muted-foreground"
                    )}
                  >
                    {s.num}.
                  </span>
                  <span
                    className={cn(
                      "text-xs truncate hidden sm:inline",
                      isCurrent ? "font-semibold text-ink" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Matriculation Card */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-10">
          {/* Step 0: Scholar Details */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <p className="eyebrow">Matriculation Entry</p>
                <h1 className="mt-1 font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink">
                  Personal Academic Credentials
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  Your university records curate course materials, syllabus notes, and peer study groups.
                </p>
              </div>

              {/* Full Name & Phone */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fn" className="text-xs font-semibold text-ink">Full Name</Label>
                  <Input
                    id="fn"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Samuel Adekunle"
                    className="h-10 bg-surface-container-low border-border text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ph" className="text-xs font-semibold text-ink">
                    Phone (WhatsApp alerts, optional)
                  </Label>
                  <Input
                    id="ph"
                    value={phone}
                    placeholder="0803 000 0000"
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 bg-surface-container-low border-border text-sm"
                  />
                </div>
              </div>

              {/* Unique Handle Selection */}
              <div className="rounded-2xl border border-border bg-surface-container-low p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="un" className="text-xs font-semibold text-ink">
                    Scholar Handle
                  </Label>
                  {usernameSuggestion && username !== usernameSuggestion && (
                    <button
                      type="button"
                      onClick={() => setUsername(usernameSuggestion)}
                      className="text-xs text-brand hover:underline font-medium"
                    >
                      Use suggested: @{usernameSuggestion}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-muted-foreground select-none">
                    @
                  </span>
                  <Input
                    id="un"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))
                    }
                    placeholder="e.g. adekunle_01"
                    className="pl-8 font-mono text-sm bg-card border-border h-10"
                  />
                  <div className="absolute right-3 top-2.5 flex items-center">
                    {usernameChecking && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {!usernameChecking && isUsernameAvailable === true && (
                      <span className="flex items-center gap-1 text-[11px] text-forest font-semibold bg-accent px-2 py-0.5 rounded-full border border-brand/30">
                        <Check className="size-3" /> Available
                      </span>
                    )}
                    {!usernameChecking && isUsernameAvailable === false && (
                      <span className="text-[11px] text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                        Taken
                      </span>
                    )}
                  </div>
                </div>

                {usernameError ? (
                  <p className="text-xs text-destructive">{usernameError}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Your unique ledger identifier in group arenas, study peer chats, and campus leaderboards.
                  </p>
                )}
              </div>

              {/* School & Course SearchSelect */}
              <div className="space-y-4">
                <SearchSelect
                  id="inst"
                  label="University / Institution"
                  placeholder="Search university or polytechnic..."
                  options={institutionOptions}
                  value={institution}
                  onChange={setInstitution}
                />

                <SearchSelect
                  id="course"
                  label="Course / Field of Study"
                  placeholder="Search discipline or department..."
                  options={courseOptions}
                  value={course}
                  onChange={setCourse}
                />

                <div className="space-y-1.5">
                  <Label htmlFor="lvl" className="text-xs font-semibold text-ink">Academic Level</Label>
                  <select
                    id="lvl"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface-container-low px-3.5 text-sm text-ink focus:outline-hidden"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Referral Discovery */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="eyebrow">Registry Attribution</p>
                <h1 className="mt-1 font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink">
                  How did you discover Syllaboss?
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  Helps our academic foundation reach more scholars across West African campuses.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {REFERRAL_SOURCES.map((s) => {
                  const isSelected = referral === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReferral(s)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border p-4 text-left text-xs sm:text-sm transition-all lift press",
                        isSelected
                          ? "border-forest bg-forest text-white shadow-xs font-medium"
                          : "border-border bg-card hover:bg-surface-container-low text-ink"
                      )}
                    >
                      <span>{s}</span>
                      {isSelected && <Check className="size-4 text-[#8fd9b6]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Curricular Plan */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="eyebrow">Study Trajectory</p>
                <h1 className="mt-1 font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink">
                  Calibrate Your Semester Plan
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  Boss AI calibrates revision streaks and scheduled past-question drills to your schedule.
                </p>
              </div>

              {/* Hours per week slider */}
              <div className="rounded-2xl border border-border bg-surface-container-low p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="hrs" className="font-semibold text-ink">Dedicated Study Volume</Label>
                  <span className="font-mono font-bold text-sm text-forest tnum">
                    {hours} hrs / week
                  </span>
                </div>
                <input
                  id="hrs"
                  type="range"
                  min={2}
                  max={40}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full accent-forest"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>2 hrs (Casual)</span>
                  <span>20 hrs (Rigorous)</span>
                  <span>40 hrs (First-Class Pace)</span>
                </div>
              </div>

              {/* Study Days */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-ink">Target Study Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const isSelected = days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setDays((cur) =>
                            cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
                          )
                        }
                        className={cn(
                          "size-10 sm:size-11 rounded-xl border text-xs font-semibold transition-all press font-mono",
                          isSelected
                            ? "border-forest bg-forest text-white shadow-xs"
                            : "border-border bg-card text-ink-soft hover:bg-surface-container-low"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time & Target CGPA */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tm" className="text-xs font-semibold text-ink">Peak Focus Time</Label>
                  <select
                    id="tm"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface-container-low px-3.5 text-sm text-ink focus:outline-hidden"
                  >
                    {TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cg" className="text-xs font-semibold text-ink">Target CGPA (out of 5.0)</Label>
                  <Input
                    id="cg"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    placeholder="e.g. 4.80"
                    className="h-10 bg-surface-container-low border-border font-mono text-sm"
                  />
                </div>
              </div>

              {/* Semester Goals */}
              <div className="space-y-1.5">
                <Label htmlFor="gl" className="text-xs font-semibold text-ink">
                  Core Semester Goals
                </Label>
                <Textarea
                  id="gl"
                  value={goals}
                  placeholder="e.g. Pass Engineering Mathematics with an A, master fluid mechanics past questions, maintain a 14-day study streak..."
                  onChange={(e) => setGoals(e.target.value)}
                  rows={3}
                  className="bg-surface-container-low border-border text-sm leading-relaxed resize-none"
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-border/80 pt-6">
            <Button
              variant="ghost"
              disabled={step === 0 || saving}
              onClick={() => setStep((s) => s - 1)}
              className="text-xs font-semibold text-muted-foreground hover:text-ink gap-1.5 press"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>

            <Button
              onClick={next}
              disabled={saving}
              className="rounded-full bg-forest text-white hover:bg-forest/90 px-7 h-10 font-semibold text-xs gap-1.5 shadow-sm press"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : step === 2 ? (
                <span>Complete Registration</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* SyllaPlus Immediate Registration CTA Modal */}
      <SyllaPlusModal
        open={showPlusModal}
        onClose={() => {
          setShowPlusModal(false);
          navigate({ to: "/dashboard" });
        }}
        onSuccess={() => {
          setShowPlusModal(false);
          navigate({ to: "/dashboard" });
        }}
      />
    </div>
  );
}
