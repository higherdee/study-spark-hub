import { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  X,
  Loader2,
  GraduationCap,
  Building2,
  User,
  ArrowRight,
  ArrowLeft,
  Zap,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect, type SearchOption } from "@/components/search-select";
import { institutionOptions, courseOptions, SYLLAPLUS_PRICING, formatNaira, formatUsd } from "@/lib/constants";
import { checkUsernameAvailableServerFn } from "@/lib/community.functions";
import { upsertProfileServerFn } from "@/lib/profile.functions";
import type { Profile } from "@/integrations/turso/client";
import { createBachsCheckoutSessionServerFn } from "@/lib/upload.functions";
import { useGeo } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface DashboardOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onComplete: () => void;
  isMandatory?: boolean;
}

export function DashboardOnboardingModal({
  isOpen,
  onClose,
  profile,
  onComplete,
  isMandatory = false,
}: DashboardOnboardingModalProps) {
  const qc = useQueryClient();

  // 3-Slide Onboarding Wizard: 1 (Personal Details) -> 2 (School Details) -> 3 (Welcome Onboard)
  // Plus optional VIP upsell slide
  const [slide, setSlide] = useState<1 | 2 | 3 | "syllaplus_upsell">(1);

  // Form inputs - Slide 1: Personal Details
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [referralCode, setReferralCode] = useState(profile.referral_source || "");

  // Form inputs - Slide 2: School Details (NO department input!)
  const [institution, setInstitution] = useState<SearchOption | null>(
    profile.institution ? { label: profile.institution } : null
  );
  const [course, setCourse] = useState<SearchOption | null>(
    profile.course ? { label: profile.course } : null
  );
  const [dailyFocusTarget, setDailyFocusTarget] = useState<number>(60); // minutes

  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const { isRegional, countryName } = useGeo();

  // Sync profile data on open
  useEffect(() => {
    if (isOpen) {
      if (profile.full_name && !fullName) setFullName(profile.full_name);
      if (profile.username && !profile.username.startsWith("student_") && !username) setUsername(profile.username);
      if (profile.institution && !institution) setInstitution({ label: profile.institution });
      if (profile.course && !course) setCourse({ label: profile.course });
      if (profile.referral_source && !referralCode) setReferralCode(profile.referral_source);
    }
  }, [isOpen, profile.id]);

  // Generate suggested handle if username is default student_...
  useEffect(() => {
    if (!username || username.startsWith("student_")) {
      const raw = (fullName || profile.email?.split("@")[0] || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 14);
      const suggested = raw ? `${raw}_${Math.floor(10 + Math.random() * 89)}` : `scholar_${Math.floor(100 + Math.random() * 899)}`;
      setUsername(suggested);
    }
  }, [fullName, profile.email]);

  // Debounced username availability validation
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
      setUsernameError("Only letters, numbers, and underscores allowed.");
      return;
    }

    setUsernameChecking(true);
    setUsernameError("");
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailableServerFn({
          data: { username: clean, excludeUserId: profile.id },
        });
        setIsUsernameAvailable(res.available);
        if (!res.available) {
          setUsernameError("Handle is already registered. Please try another.");
        }
      } catch {
        // Fallback
      } finally {
        setUsernameChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, profile.id]);

  if (!isOpen) return null;

  // Validate Slide 1 and proceed to Slide 2
  const handleProceedToSchoolDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!username.trim() || isUsernameAvailable === false) {
      toast.error("Please choose a valid unique username handle.");
      return;
    }
    setSlide(2);
  };

  // Submit Slide 2 to save academic profile and proceed to Slide 3
  const handleSaveAcademicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalInstitution = institution?.label?.trim() || "";
    if (!finalInstitution) {
      toast.error("Please select or type your university or institution.");
      return;
    }
    const finalCourse = course?.label?.trim() || "";
    if (!finalCourse) {
      toast.error("Please select or type your course or academic programme.");
      return;
    }

    setSaving(true);
    try {
      await upsertProfileServerFn({
        data: {
          id: profile.id,
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          institution: finalInstitution,
          course: finalCourse,
          department: finalCourse, // Map directly to course label - department input removed
          referral_source: referralCode.trim() || undefined,
          onboarding_step: 3,
        },
      });

      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Academic records updated!");
      setSlide(3);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradeSyllaPlus = async () => {
    setUpgrading(true);
    try {
      toast.loading("Initiating Bachs payment portal...", { id: "bachs-up" });
      const res = await createBachsCheckoutSessionServerFn({
        data: {
          userId: profile.id,
          email: profile.email || "student@syllaboss.org",
          amountNaira: SYLLAPLUS_PRICING.regional.monthly,
        },
      });

      toast.dismiss("bachs-up");
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.success("SyllaPlus membership VIP unlocked!");
        onComplete();
        onClose();
      }
    } catch (err: any) {
      toast.dismiss("bachs-up");
      toast.error(err?.message || "Payment initialization failed.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleClose = () => {
    if (isMandatory) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-lg animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMandatory) {
          handleClose();
        }
      }}
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/20 bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-scale-in">
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 size-56 rounded-full bg-gradient-to-br from-forest/20 via-brand/15 to-brass/20 blur-3xl pointer-events-none" />

        {/* Wizard Slide Step Pills (1 to 3) */}
        {slide !== "syllaplus_upsell" && (
          <div className="flex items-center justify-between border-b border-border/70 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-6 rounded-full text-xs font-mono font-bold grid place-items-center transition-all",
                  slide === 1
                    ? "bg-forest text-white shadow-xs"
                    : slide > 1
                    ? "bg-forest/20 text-forest"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {slide > 1 ? <Check className="size-3.5 stroke-[3]" /> : "1"}
              </span>
              <span className={cn("text-xs font-semibold", slide === 1 ? "text-ink" : "text-muted-foreground")}>
                Personal Details
              </span>

              <span className="text-muted-foreground/40 font-mono text-xs mx-1">/</span>

              <span
                className={cn(
                  "size-6 rounded-full text-xs font-mono font-bold grid place-items-center transition-all",
                  slide === 2
                    ? "bg-forest text-white shadow-xs"
                    : slide > 2
                    ? "bg-forest/20 text-forest"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {slide > 2 ? <Check className="size-3.5 stroke-[3]" /> : "2"}
              </span>
              <span className={cn("text-xs font-semibold", slide === 2 ? "text-ink" : "text-muted-foreground")}>
                School Details
              </span>

              <span className="text-muted-foreground/40 font-mono text-xs mx-1">/</span>

              <span
                className={cn(
                  "size-6 rounded-full text-xs font-mono font-bold grid place-items-center transition-all",
                  slide === 3 ? "bg-forest text-white shadow-xs" : "bg-secondary text-muted-foreground"
                )}
              >
                3
              </span>
              <span className={cn("text-xs font-semibold", slide === 3 ? "text-ink" : "text-muted-foreground")}>
                Verified
              </span>
            </div>

            {!isMandatory && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="Skip for now"
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 1: PERSONAL DETAILS */}
        {/* ========================================================================= */}
        {slide === 1 && (
          <div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-brand/10 border border-brand/20 text-brand">
                <User className="size-3.5" />
                <span>Step 1 of 3: Personal Details</span>
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-normal text-ink tracking-tight pt-1">
                Your Scholar Identity
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Set up your academic handle and personal profile to start interacting with peers and earning rewards.
              </p>
            </div>

            <form onSubmit={handleProceedToSchoolDetails} className="mt-6 space-y-4">
              <div className="space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fn" className="text-xs font-semibold text-ink">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="fn"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="h-10 rounded-xl pl-10 text-xs"
                    />
                  </div>
                </div>

                {/* Unique Username Handle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="un" className="text-xs font-semibold text-ink">
                      Username Handle <span className="text-destructive">*</span>
                    </Label>
                    {usernameChecking ? (
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Loader2 className="size-2.5 animate-spin" /> checking
                      </span>
                    ) : isUsernameAvailable === true ? (
                      <span className="text-[10px] text-brand font-semibold flex items-center gap-1">
                        <Check className="size-3" /> available
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="un"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="handle"
                      className={cn(
                        "h-10 rounded-xl pl-8 text-xs font-mono",
                        isUsernameAvailable === false && "border-destructive text-destructive",
                        isUsernameAvailable === true && "border-brand text-brand"
                      )}
                    />
                  </div>
                  {usernameError && <p className="text-[10px] text-destructive">{usernameError}</p>}
                </div>

                {/* Referral Code (Optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="ref" className="text-xs font-semibold text-ink">
                    Referral Code or Campus Ambassador (Optional)
                  </Label>
                  <Input
                    id="ref"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="e.g. SCHOLAR2026 or leave blank"
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div
                className={cn(
                  "pt-4 flex items-center gap-3 border-t border-border/60",
                  isMandatory ? "justify-end" : "justify-between"
                )}
              >
                {!isMandatory && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-xs font-semibold text-muted-foreground hover:text-ink transition-colors cursor-pointer"
                  >
                    Skip for now
                  </button>
                )}

                <Button
                  type="submit"
                  disabled={usernameChecking || isUsernameAvailable === false}
                  className="h-10 px-6 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest/90 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Next: School Details</span>
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 2: SCHOOL DETAILS (DEPARTMENT REMOVED) */}
        {/* ========================================================================= */}
        {slide === 2 && (
          <div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-forest/10 border border-forest/20 text-forest">
                <Building2 className="size-3.5" />
                <span>Step 2 of 3: School Details</span>
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-normal text-ink tracking-tight pt-1">
                Your Academic Affiliation
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your institution and course to browse verified university summaries, past questions, and study materials.
              </p>
            </div>

            <form onSubmit={handleSaveAcademicProfile} className="mt-6 space-y-4">
              <div className="space-y-3.5">
                {/* Institution / University */}
                <div className="space-y-1.5">
                  <Label htmlFor="inst" className="text-xs font-semibold text-ink">
                    University / Institution <span className="text-destructive">*</span>
                  </Label>
                  <SearchSelect
                    placeholder="Select or type your university / college..."
                    options={institutionOptions}
                    value={institution}
                    onChange={setInstitution}
                  />
                </div>

                {/* Course / Programme */}
                <div className="space-y-1.5">
                  <Label htmlFor="cr" className="text-xs font-semibold text-ink">
                    Course / Field of Study <span className="text-destructive">*</span>
                  </Label>
                  <SearchSelect
                    placeholder="e.g. Mechanical Engineering, Computer Science, Law..."
                    options={courseOptions}
                    value={course}
                    onChange={setCourse}
                  />
                </div>

                {/* Daily Study Target */}
                <div className="space-y-1.5">
                  <Label htmlFor="focus" className="text-xs font-semibold text-ink">
                    Daily Study Target
                  </Label>
                  <select
                    id="focus"
                    value={dailyFocusTarget}
                    onChange={(e) => setDailyFocusTarget(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={30}>30 Minutes / day (+5 pts)</option>
                    <option value={60}>1 Hour / day (Recommended)</option>
                    <option value={120}>2 Hours / day (+20 pts)</option>
                    <option value={180}>3 Hours / day (Power Scholar)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSlide(1)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold border-border text-ink hover:bg-secondary cursor-pointer"
                >
                  <ArrowLeft className="size-3.5 mr-1.5" />
                  <span>Back</span>
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest/90 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <span>Save & Complete Setup</span>
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 3: WELCOME ONBOARD MODAL & REGISTRATION PROMPT */}
        {/* ========================================================================= */}
        {slide === 3 && (
          <div className="text-center py-2 space-y-4">
            <div className="mx-auto size-16 rounded-3xl bg-forest/15 border border-forest/30 flex items-center justify-center text-forest shadow-lift">
              <Sparkles className="size-8 text-brass" />
            </div>

            <div className="space-y-1 max-w-md mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-forest/10 border border-forest/25 text-forest">
                <CheckCircle2 className="size-3.5" />
                <span>Academic Profile Activated</span>
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight pt-1">
                Welcome Onboard, @{username}!
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your academic ledger is verified. We deposited{" "}
                <strong className="font-mono text-forest font-bold">+200 SyllaPoints</strong> welcome bonus directly
                into your study wallet.
              </p>
            </div>

            {/* Academic ID Verification Card */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-border text-left space-y-2.5 text-xs shadow-xs">
              <div className="flex items-center justify-between border-b border-border/70 pb-2">
                <span className="font-semibold text-ink text-sm">{fullName}</span>
                <span className="font-mono font-bold text-forest bg-forest/10 px-2 py-0.5 rounded-md text-[11px]">
                  +200 pts bonus
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                    Institution
                  </span>
                  <span className="font-medium text-foreground truncate block">{institution?.label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                    Course
                  </span>
                  <span className="font-medium text-foreground truncate block">{course?.label}</span>
                </div>
              </div>
            </div>

            {/* Registration Security Prompt */}
            <div className="rounded-2xl border border-brass/35 bg-gradient-to-r from-brass/10 via-brass/5 to-surface-container-low p-3.5 text-left text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="size-4 text-brass shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink text-xs">Lock In Your Credentials & Sync Devices</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
                    Keep your study streak active across your devices, access unlimited AI summaries, and unlock weekend cash withdrawals.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="h-11 w-full rounded-xl text-xs font-semibold bg-forest text-white hover:bg-forest/90 shadow-lift gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>Enter Workspace & Claim Bonus</span>
                <ArrowRight className="size-4" />
              </Button>

              <button
                type="button"
                onClick={() => setSlide("syllaplus_upsell")}
                className="text-[11px] text-muted-foreground hover:text-ink font-medium py-1 cursor-pointer flex items-center justify-center gap-1"
              >
                <Zap className="size-3 text-brass" />
                <span>Optional: Explore SyllaPlus 1.3x VIP Privileges</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* OPTIONAL SLIDE: SYLLAPLUS UPSELL */}
        {/* ========================================================================= */}
        {slide === "syllaplus_upsell" && (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-brass/15 border border-brass/30 text-brass-ink">
                  <Zap className="size-3.5 text-brass" />
                  <span>VIP Academic Pass</span>
                </span>
                <h2 className="mt-2.5 font-display text-2xl sm:text-3xl font-normal text-ink tracking-tight">
                  Supercharge Your Experience with <span className="text-brass">SyllaPlus</span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Earn higher cash-out rewards, enjoy priority Boss AI derivations, and fast-track weekend withdrawals.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSlide(3)}
                aria-label="Back to Welcome"
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Benefits Cards */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-3 rounded-2xl border border-brass/25 bg-brass/5 p-3.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-brass/15 text-brass">
                  <Zap className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-ink">1.3x SyllaPoints Multiplier</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Earn 1.3x points on all study timer sessions, verified uploads, and classmate downloads.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-ink">+300 SyllaPoints Instant Bonus</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Credited immediately to accelerate your minimum withdrawal journey.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Priority AI Exam Prep & Weekend Fast-Lane</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Unlimited document summaries, LaTeX math step-by-step solutions, and instant weekend payouts.
                  </p>
                </div>
              </div>
            </div>

            {/* Localized Pricing Summary */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border flex items-center justify-between text-xs">
              <div>
                <span className="eyebrow block text-muted-foreground">
                  {isRegional
                    ? `Regional Pricing (${countryName || "Africa / Asia"})`
                    : `International Pricing (${countryName || "Global"})`}
                </span>
                <span className="font-semibold text-ink">
                  {isRegional
                    ? `${formatNaira(SYLLAPLUS_PRICING.regional.weekly)}/wk · ${formatNaira(
                        SYLLAPLUS_PRICING.regional.monthly
                      )}/mo · ${formatNaira(SYLLAPLUS_PRICING.regional.yearly)}/yr`
                    : `${formatUsd(SYLLAPLUS_PRICING.international.monthly)}/mo · ${formatUsd(
                        SYLLAPLUS_PRICING.international.yearly
                      )}/yr`}
                </span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-brass/10 px-2 py-0.5 text-[10px] font-semibold text-brass">
                  {isRegional ? "Local Currency" : "USD Tier"}
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={handleUpgradeSyllaPlus}
                disabled={upgrading}
                className="h-11 w-full rounded-xl text-xs font-semibold bg-gradient-to-r from-brass to-brass-ink text-white shadow-lift gap-2 active:scale-[0.98] cursor-pointer"
              >
                {upgrading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="size-4 text-brass-soft" />
                    <span>Upgrade to SyllaPlus (Bachs / Card)</span>
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="text-xs text-muted-foreground hover:text-ink font-semibold py-1 cursor-pointer"
              >
                Enter Dashboard Directly
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
