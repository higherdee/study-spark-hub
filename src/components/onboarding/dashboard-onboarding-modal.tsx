import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SearchSelect, type SearchOption } from "@/components/search-select";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { institutionOptions, courseOptions, LEVELS } from "@/lib/constants";
import { checkUsernameAvailableServerFn } from "@/lib/community.functions";
import { upsertProfileServerFn } from "@/lib/profile.functions";
import type { Profile } from "@/integrations/turso/client";
interface Props {
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
}: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile.full_name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [institution, setInstitution] = useState<SearchOption | null>(
    profile.institution ? { label: profile.institution } : null,
  );
  const [course, setCourse] = useState<SearchOption | null>(
    profile.course ? { label: profile.course } : null,
  );
  const [level, setLevel] = useState(profile.level || "");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError("");
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const value = username.trim().toLowerCase();
    setAvailable(null);
    if (!/^[a-z0-9_]{3,25}$/.test(value)) {
      setChecking(false);
      return;
    }
    if (value === profile.username) {
      setAvailable(true);
      setChecking(false);
      return;
    }
    setChecking(true);
    let active = true;
    const timer = setTimeout(
      () =>
        checkUsernameAvailableServerFn({ data: { username: value, excludeUserId: profile.id } })
          .then((result) => {
            if (active) setAvailable(result.available);
          })
          .catch(() => {
            if (active) setError("Could not check that username. Try again.");
          })
          .finally(() => {
            if (active) setChecking(false);
          }),
      350,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username, isOpen, profile.id, profile.username]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 1) {
      if (!name.trim() || !/^[a-z0-9_]{3,25}$/.test(username) || available !== true) {
        setError("Enter your name and choose an available username.");
        return;
      }
      setStep(2);
      return;
    }
    if (!institution?.label || !course?.label) {
      setError("Choose your institution and course.");
      return;
    }
    setSaving(true);
    try {
      await upsertProfileServerFn({
        data: {
          id: profile.id,
          full_name: name.trim(),
          username: username.trim().toLowerCase(),
          institution: institution.label,
          course: course.label,
          department: course.label,
          level: level || null,
          onboarding_step: 3,
        },
      });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Your study space is ready.");
      onComplete();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isMandatory && !saving) onClose();
      }}
    >
      <DialogContent
        className="native-onboarding"
        showCloseButton={!isMandatory}
        onEscapeKeyDown={(e) => {
          if (isMandatory || saving) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isMandatory || saving) e.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">Welcome to Syllaboss</DialogTitle>
        <DialogDescription className="sr-only">
          Set up your public username and academic profile.
        </DialogDescription>
        <SyllabossLogo asDiv />
        <div>
          <h1>Make this space yours.</h1>
          <p>
            {step} of 2 · {step === 1 ? "Your identity" : "Your studies"}
          </p>
          <div className="native-onboarding-progress">
            <span />
            <span data-active={step === 2} />
          </div>
        </div>
        <form onSubmit={submit} className="native-profile-form">
          {step === 1 ? (
            <>
              <label>
                Public @username
                <div className="native-username-field">
                  <span>@</span>
                  <input
                    autoComplete="username"
                    value={username}
                    maxLength={25}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    aria-describedby="username-help"
                  />
                  {checking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : available ? (
                    <Check className="size-5" />
                  ) : null}
                </div>
                <small id="username-help">
                  3–25 letters, numbers or underscores. Your name stays private.
                </small>
                {available === false && (
                  <small className="text-destructive">That username is already taken.</small>
                )}
              </label>
              <label>
                Your name (private)
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Institution
                <SearchSelect
                  options={institutionOptions}
                  value={institution}
                  onChange={setInstitution}
                  placeholder="Choose your institution"
                />
              </label>
              <label>
                Course
                <SearchSelect
                  options={courseOptions}
                  value={course}
                  onChange={setCourse}
                  placeholder="Choose your course"
                />
              </label>
              <label>
                Level
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="">Choose your level</option>
                  {LEVELS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="native-form-error">
              {error}
            </p>
          )}
          <button
            className="native-primary-button"
            type="submit"
            disabled={saving || checking || (step === 1 && (!name.trim() || available !== true))}
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : null}
            {step === 1 ? "Continue to your studies" : "Make it yours"}
            <ArrowRight className="size-5" />
          </button>
          {step === 2 && (
            <button
              type="button"
              className="native-text-button"
              onClick={() => setStep(1)}
              disabled={saving}
            >
              <ArrowLeft className="size-4" />
              Back to your identity
            </button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
