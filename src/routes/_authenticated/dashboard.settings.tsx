import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2, Monitor, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { useTheme } from "@/lib/theme";
import { type StudyPreferences, defaultStudyGoal } from "@/lib/membership/preferences";
import { PromoCodeEntry } from "@/components/promo-code-entry";
import { Switch } from "@/components/ui/switch";
import { NativePageTitle } from "@/components/native-web/screens";
import { requestDeviceNotificationPermission } from "@/lib/notifications";
export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Your settings — Syllaboss" }] }),
  component: SettingsPage,
});
function SettingsPage() {
  const { getToken } = useAuth();
  const { data: profile, isFetched } = useProfile();
  const { theme, setTheme } = useTheme();
  const cache = useQueryClient();
  const loaded = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [localCurrency, setLocalCurrency] = useState(false);
  const [preferences, setPreferences] = useState<StudyPreferences>({
    studyReminders: true,
    rewardAlerts: true,
    soundEnabled: true,
    studyGoalMinutes: defaultStudyGoal(),
    idleTimeoutMinutes: 60,
  });
  useEffect(() => {
    try {
      setLocalCurrency(localStorage.getItem("syllaboss-billing-local-display") === "true");
    } catch {}
  }, []);
  useEffect(() => {
    if (!profile || !isFetched || loaded.current) return;
    loaded.current = true;
    const saved = profile.study_plan?.["preferences"] as StudyPreferences | undefined;
    if (saved) setPreferences((current) => ({ ...current, ...saved }));
  }, [profile, isFetched]);
  function change(patch: StudyPreferences) {
    setPreferences((current) => ({ ...current, ...patch }));
    setNotice("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const token = await getToken();
      const response = await fetch("/api/membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "preferences", preferences }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Your settings could not be saved.");
      localStorage.setItem("syllaboss_study_goal", String(preferences.studyGoalMinutes));
      localStorage.setItem("syllaboss_idle_timeout", String(preferences.idleTimeoutMinutes));
      localStorage.setItem("syllaboss_study_reminders", String(preferences.studyReminders));
      localStorage.setItem("syllaboss_reward_alerts", String(preferences.rewardAlerts));
      window.dispatchEvent(new Event("syllaboss:study-preferences"));
      await cache.invalidateQueries({ queryKey: ["profile"] });
      setNotice("Your settings are saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="native-settings-page">
      <NativePageTitle
        eyebrow="Make it work for you"
        title="Your pace. Your preferences."
        description="Your study settings are shared with your Syllaboss account in the app."
      />
      <div className="native-settings-layout">
        <form onSubmit={save} className="native-settings-form">
          <section className="native-settings-section">
            <div className="native-setting-row">
              <span>
                <strong>Show local currency first</strong>
                <small>
                  Local estimates on this device. Checkout always shows the actual payment currency.
                </small>
              </span>
              <Switch
                checked={localCurrency}
                onCheckedChange={(value) => {
                  setLocalCurrency(value);
                  try {
                    localStorage.setItem("syllaboss-billing-local-display", String(value));
                    window.dispatchEvent(new Event("syllaboss:currency-display"));
                  } catch {}
                }}
              />
            </div>
            <div className="native-setting-row">
              <span>
                <strong>Appearance</strong>
                <small>Follow your device, or choose your own.</small>
              </span>
              <select
                aria-label="Appearance"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) setTheme(e.target.value as "system" | "light" | "dark");
                }}
              >
                <option value="" disabled>
                  {theme === "dark" ? "Dark" : "Light"}
                </option>
                <option value="system">Device</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </section>
          <section className="native-settings-section">
            <h2>Your study rhythm</h2>
            {(
              [
                {
                  key: "studyReminders",
                  label: "Study reminders",
                  detail: "A gentle nudge to keep going.",
                },
                {
                  key: "rewardAlerts",
                  label: "Reward alerts",
                  detail: "Know when your learning earns points.",
                },
                {
                  key: "soundEnabled",
                  label: "Study sounds",
                  detail: "Sounds for study moments and feedback.",
                },
              ] as const
            ).map(({ key, label, detail }) => (
              <div className="native-setting-row" key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                <Switch
                  checked={preferences[key] !== false}
                  onCheckedChange={(value) => change({ [key]: value })}
                  disabled={!isFetched || busy}
                />
              </div>
            ))}
            <label className="native-setting-range">
              <span>
                Daily focus target
                <strong>
                  {preferences.studyGoalMinutes} minutes ·{" "}
                  {Number(preferences.studyGoalMinutes) / 30} rounds
                </strong>
              </span>
              <input
                type="range"
                min={30}
                max={720}
                step={30}
                value={preferences.studyGoalMinutes}
                onChange={(e) => change({ studyGoalMinutes: Number(e.target.value) })}
                disabled={!isFetched || busy}
              />
            </label>
            <label className="native-setting-range">
              <span>
                Pause after inactivity<strong>{preferences.idleTimeoutMinutes} minutes</strong>
              </span>
              <input
                type="range"
                min={15}
                max={240}
                step={15}
                value={preferences.idleTimeoutMinutes}
                onChange={(e) => change({ idleTimeoutMinutes: Number(e.target.value) })}
                disabled={!isFetched || busy}
              />
            </label>
            <button
              className="native-text-button"
              type="button"
              onClick={async () => {
                const permission = await requestDeviceNotificationPermission();
                setNotice(
                  permission === "granted"
                    ? "Device notifications are enabled."
                    : "You can manage notification permission in your browser settings.",
                );
              }}
            >
              <Bell className="size-5" />
              Enable device notifications
            </button>
          </section>
          <details className="native-settings-section">
            <summary>Saved payout details</summary>
            <p className="text-sm leading-6 text-muted-foreground mt-3">
              Gift card delivery uses the email you provide at cashout.
            </p>
            <div className="native-profile-form mt-5">
              {(
                [
                  { key: "name", label: "Bank name" },
                  { key: "accountNumber", label: "Account number" },
                  { key: "accountName", label: "Account holder" },
                ] as const
              ).map(({ key, label }) => (
                <label key={key}>
                  {label}
                  <input
                    value={preferences.bank?.[key] || ""}
                    onChange={(e) =>
                      change({
                        bank: {
                          name: preferences.bank?.name || "",
                          accountNumber: preferences.bank?.accountNumber || "",
                          accountName: preferences.bank?.accountName || "",
                          [key]:
                            key === "accountNumber"
                              ? e.target.value.replace(/\D/g, "").slice(0, 10)
                              : e.target.value,
                        },
                      })
                    }
                    maxLength={key === "accountNumber" ? 10 : 100}
                  />
                </label>
              ))}
            </div>
          </details>
          {error && (
            <p className="native-form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="native-pdf-plan" role="status">
              {notice}
            </p>
          )}
          <button
            className="native-primary-button w-full justify-center"
            disabled={!isFetched || busy}
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
        <aside className="native-settings-aside">
          <PromoCodeEntry />
          <section className="native-settings-section">
            <h2>Your account</h2>
            <Link to="/dashboard/space" className="native-text-button">
              Your profile and progress
            </Link>
            <Link to="/contact" className="native-text-button">
              Help & support
            </Link>
            <Link to="/privacy" className="native-text-button">
              Privacy
            </Link>
            <Link to="/terms" className="native-text-button">
              Terms
            </Link>
            <a className="native-text-button" href="/downloads/syllaboss-native.apk">
              Get the Android app
            </a>
          </section>
        </aside>
      </div>
    </section>
  );
}
