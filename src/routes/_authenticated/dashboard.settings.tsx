import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Building,
  Check,
  CreditCard,
  Download,
  GraduationCap,
  HelpCircle,
  Laptop,
  LogOut,
  Phone,
  Save,
  Send,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Timer,
  User,
  Zap,
  Camera,
  QrCode,
  Play,
  Pause,
  Loader2,
  Upload,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  formatNaira,
  PLAN_NAME,
  POINTS_INSTALL_APP_BONUS,
  POINTS_NAME,
  POINTS_REFERRAL_REGISTRATION,
  POINTS_REFERRAL_UPGRADE,
  POINTS_UPGRADE_BONUS,
  SYLLAPLUS_PRICE_NAIRA,
} from "@/lib/constants";
import { useProfile } from "@/lib/profile";
import { useStudyTimer } from "@/hooks/use-study-timer";
import { StudentQrModal } from "@/components/student-qr-modal";
import { QrScannerModal } from "@/components/qr-scanner-modal";
import {
  checkUsernameAvailableServerFn,
  updateUsernameServerFn,
  updateAvatarUrlServerFn,
} from "@/lib/community.functions";
import { cn } from "@/lib/utils";
import {
  claimAppInstallBonusServerFn,
  createBachsCheckoutSessionServerFn,
  upgradeToSyllaPlusServerFn,
} from "@/lib/upload.functions";
import { upsertProfile } from "@/integrations/turso/client";
import {
  isDeviceNotificationSupported,
  requestDeviceNotificationPermission,
  sendDeviceNotification,
} from "@/lib/notifications";

const POPULAR_BANKS = [
  "OPay (PayCom)",
  "PalmPay",
  "Kuda Bank",
  "Guaranty Trust Bank (GTBank)",
  "Access Bank",
  "Zenith Bank",
  "United Bank for Africa (UBA)",
  "First Bank of Nigeria",
  "Fidelity Bank",
  "Stanbic IBTC Bank",
  "Moniepoint MFB",
  "Wema Bank (ALAT)",
];

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Syllaboss" },
      { name: "description", content: "Account settings, notifications, payout details, and academic preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [claimingInstall, setClaimingInstall] = useState(false);

  // Notification states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [studyReminders, setStudyReminders] = useState(true);
  const [rewardAlerts, setRewardAlerts] = useState(true);

  // Productivity & Study preferences
  const [studyGoalMinutes, setStudyGoalMinutes] = useState(60);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(60);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Bank payout states
  const [savedBank, setSavedBank] = useState("");
  const [savedAccountNum, setSavedAccountNum] = useState("");
  const [savedAccountName, setSavedAccountName] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Academic Profile edit states
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("100 Level");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Username edit states
  const [username, setUsername] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Modals for QR Code and QR Scanner
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Active study timer hook (Relocated from Header)
  const { seconds, isPaused, togglePause, totalStudyMinutes } = useStudyTimer();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Load saved bank details
    try {
      const storedBank = localStorage.getItem("syllaboss_saved_bank");
      const storedAcct = localStorage.getItem("syllaboss_saved_acct");
      const storedName = localStorage.getItem("syllaboss_saved_name");
      if (storedBank) setSavedBank(storedBank);
      if (storedAcct) setSavedAccountNum(storedAcct);
      if (storedName) setSavedAccountName(storedName);

      const storedReminders = localStorage.getItem("syllaboss_study_reminders");
      if (storedReminders !== null) setStudyReminders(storedReminders === "true");

      const storedRewards = localStorage.getItem("syllaboss_reward_alerts");
      if (storedRewards !== null) setRewardAlerts(storedRewards === "true");

      const storedGoal = localStorage.getItem("syllaboss_study_goal");
      if (storedGoal) setStudyGoalMinutes(Number(storedGoal));
    } catch {
      // localStorage may fail in restricted mode
    }
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url || "");
      setInstitution(profile.institution || "");
      setCourse(profile.course || "");
      setDepartment(profile.department || "");
      setLevel(profile.level || "100 Level");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  // Debounced check username availability
  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean || clean === (profile?.username || "").toLowerCase()) {
      setIsUsernameAvailable(null);
      setUsernameError("");
      return;
    }
    if (clean.length < 3) {
      setIsUsernameAvailable(false);
      setUsernameError("Username must be at least 3 characters.");
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
          data: { username: clean, excludeUserId: user?.id },
        });
        setIsUsernameAvailable(res.available);
        if (!res.available) {
          setUsernameError("This username is already taken.");
        }
      } catch {
        // network fallback
      } finally {
        setUsernameChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, profile?.username, user?.id]);

  const handleSaveUsername = async () => {
    if (!user || !username.trim()) return;
    const clean = username.trim().toLowerCase();
    if (isUsernameAvailable === false) {
      toast.error(usernameError || "Username is not available.");
      return;
    }
    setIsSavingUsername(true);
    try {
      const res = await updateUsernameServerFn({
        data: { userId: user.id, username: clean },
      });
      if (res.success) {
        toast.success(`Username updated to @${clean}!`);
        await qc.invalidateQueries({ queryKey: ["profile"] });
        setIsUsernameAvailable(null);
      } else {
        toast.error(res.message || "Failed to update username.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update username.");
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5 MB.");
      return;
    }

    setIsUploadingAvatar(true);
    toast.loading("Compressing & updating profile picture...", { id: "avatar-upload" });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

            await updateAvatarUrlServerFn({
              data: { userId: user.id, avatarUrl: compressedDataUrl },
            });
            setAvatarUrl(compressedDataUrl);
            await qc.invalidateQueries({ queryKey: ["profile"] });
            toast.success("Profile picture updated successfully!", { id: "avatar-upload" });
          }
          setIsUploadingAvatar(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingAvatar(false);
      toast.error("Failed to update profile picture.", { id: "avatar-upload" });
    }
  };

  const refCode = profile?.referral_code ?? `SYLLA-${(user?.id ?? "").slice(-6).toUpperCase()}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://syllaboss.org";
  const refLink = `${origin}/auth?mode=signup&ref=${refCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopiedLink(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on Syllaboss to get past questions, lecture notes and earn SyllaPoints! Use my code ${refCode} to get 200 welcome bonus points: ${refLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleUpgrade = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      toast.loading("Initiating Bachs secure payment...", { id: "bachs-sub" });
      const res = await createBachsCheckoutSessionServerFn({
        data: {
          userId: user.id,
          email: user.email || "student@syllaboss.org",
          amountNaira: SYLLAPLUS_PRICE_NAIRA,
        },
      });

      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      await upgradeToSyllaPlusServerFn({ data: { userId: user.id } });
      toast.success(`Welcome to ${PLAN_NAME}! +${POINTS_UPGRADE_BONUS} ${POINTS_NAME} credited.`, {
        id: "bachs-sub",
      });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["ledger"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upgrade", { id: "bachs-sub" });
    } finally {
      setUpgrading(false);
    }
  };

  const handleClaimInstall = async () => {
    if (!user) return;
    setClaimingInstall(true);
    try {
      const res = await claimAppInstallBonusServerFn({ data: { userId: user.id } });
      if (res.claimed) {
        toast.success(`+${POINTS_INSTALL_APP_BONUS} ${POINTS_NAME} added for app installation!`);
        await qc.invalidateQueries({ queryKey: ["profile"] });
        await qc.invalidateQueries({ queryKey: ["ledger"] });
      } else {
        toast.info("Install bonus already claimed!");
      }
    } catch {
      toast.error("Could not claim install bonus");
    } finally {
      setClaimingInstall(false);
    }
  };

  const handleEnableDeviceNotifications = async () => {
    if (!isDeviceNotificationSupported()) {
      toast.error("Device notifications are not supported on this browser.");
      return;
    }

    const permission = await requestDeviceNotificationPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      toast.success("Device notifications enabled!");
      sendDeviceNotification("Syllaboss Notifications Active", {
        body: "You will now receive study rewards, verification updates, and exam alerts directly on your device.",
      });
    } else {
      toast.error("Notification permission was denied. You can re-enable it in your device settings.");
    }
  };

  const handleSendTestNotification = () => {
    if (notificationPermission !== "granted") {
      toast.error("Please grant notification permission first.");
      return;
    }

    sendDeviceNotification("Syllaboss Study Ping", {
      body: "Your device notifications are working properly. Stay focused and keep earning points!",
    });
    toast.success("Test notification triggered on your device!");
  };

  const handleSaveBankDetails = () => {
    if (!savedBank) {
      toast.error("Please select or enter a bank.");
      return;
    }
    if (savedAccountNum.length !== 10) {
      toast.error("Please enter a valid 10-digit NUBAN account number.");
      return;
    }
    if (!savedAccountName.trim()) {
      toast.error("Please enter the account holder name.");
      return;
    }

    setIsSavingBank(true);
    try {
      localStorage.setItem("syllaboss_saved_bank", savedBank);
      localStorage.setItem("syllaboss_saved_acct", savedAccountNum);
      localStorage.setItem("syllaboss_saved_name", savedAccountName);
      toast.success("Default payout bank details saved!");
    } catch {
      toast.error("Failed to save bank details.");
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await upsertProfile({
        id: user.id,
        full_name: fullName,
        institution,
        course,
        department,
        level,
        phone,
      });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Academic profile successfully updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleScanPeer = (scannedUsername: string) => {
    setShowScannerModal(false);
    toast.success(`Scanned @${scannedUsername}! Directing to chat...`);
    window.location.href = `/dashboard/community`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <PageHeader
        eyebrow="Preferences & Account"
        title="Settings"
      />

      {/* SyllaPlus Plan Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-600">
                <Sparkles className="size-4" />
              </span>
              <h2 className="font-display text-xl font-bold text-foreground">
                {profile?.sylla_plus ? `${PLAN_NAME} Active` : `${PLAN_NAME} Membership`}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              {profile?.sylla_plus
                ? "You enjoy 1.3x reward earnings on all uploads and downloads, priority study access, and unlimited Boss AI access."
                : `Upgrade with Bachs payment to unlock +${POINTS_UPGRADE_BONUS} ${POINTS_NAME}, 1.3x points multiplier, and unlimited Boss AI.`}
            </p>
          </div>

          {!profile?.sylla_plus ? (
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700 shadow-md font-semibold text-xs px-5 h-9"
            >
              {upgrading ? "Connecting Bachs..." : `Upgrade with Bachs (${formatNaira(SYLLAPLUS_PRICE_NAIRA)})`}
            </Button>
          ) : (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-700">
              Active Member
            </span>
          )}
        </div>
      </div>

      {/* Device Push Notifications (Hardware OS Notifications) */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Bell className="size-3.5 text-primary" /> Device Push Notifications
        </p>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Device Hardware Notifications</p>
              <p className="text-xs text-muted-foreground">
                Show real notifications directly in your phone notification drawer or Windows/Mac desktop banner.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {notificationPermission === "granted" ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <Check className="size-3.5" /> Enabled
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestNotification}
                    className="h-8 rounded-xl text-xs gap-1"
                  >
                    <Send className="size-3" /> Test Alert
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleEnableDeviceNotifications}
                  className="h-8 rounded-xl text-xs bg-primary text-primary-foreground font-semibold"
                >
                  Enable on Device
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium text-foreground">Study Session Focus Reminders</p>
              <p className="text-xs text-muted-foreground">Alert you every 30 minutes of study when +5 SyllaPoints are awarded</p>
            </div>
            <input
              type="checkbox"
              checked={studyReminders}
              onChange={(e) => {
                setStudyReminders(e.target.checked);
                localStorage.setItem("syllaboss_study_reminders", String(e.target.checked));
                toast.success(e.target.checked ? "Study reminders enabled." : "Study reminders disabled.");
              }}
              className="size-4.5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium text-foreground">Verification & Peer Download Alerts</p>
              <p className="text-xs text-muted-foreground">Instant ping when your notes are verified or downloaded by students</p>
            </div>
            <input
              type="checkbox"
              checked={rewardAlerts}
              onChange={(e) => {
                setRewardAlerts(e.target.checked);
                localStorage.setItem("syllaboss_reward_alerts", String(e.target.checked));
                toast.success(e.target.checked ? "Reward alerts enabled." : "Reward alerts disabled.");
              }}
              className="size-4.5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Study Session & Timer Configuration (Relocated from Header) */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Timer className="size-3.5 text-primary" /> Study Timer & Productivity Controls
        </p>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
          {/* Active Live Stopwatch Display matching former header 16:08 pill */}
          <div className="p-5 bg-gradient-to-r from-primary/5 via-card to-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="relative flex size-2">
                  <span className={cn("absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75", !isPaused && "animate-ping")} />
                  <span className={cn("relative inline-flex size-2 rounded-full", isPaused ? "bg-amber-500" : "bg-emerald-500")} />
                </span>
                Active Study Session Timer
              </span>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="font-display text-3xl font-extrabold text-foreground tracking-tight">
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {isPaused ? "(Paused)" : "(Tracking focus)"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Earn <strong>+5 SyllaPoints</strong> automatically every 30 minutes of active reading!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isPaused ? "default" : "outline"}
                onClick={togglePause}
                className="h-9 rounded-xl text-xs gap-1.5 font-semibold px-4 shadow-xs"
              >
                {isPaused ? (
                  <>
                    <Play className="size-3.5 fill-current text-white" /> Resume Timer
                  </>
                ) : (
                  <>
                    <Pause className="size-3.5 fill-current" /> Pause Timer
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Recorded Lifetime Study Time</span>
            <span className="font-semibold text-foreground font-mono">{totalStudyMinutes} minutes ({(totalStudyMinutes / 60).toFixed(1)} hrs)</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 text-sm gap-2">
            <div>
              <span className="font-medium text-foreground">Daily Focus Target</span>
              <p className="text-xs text-muted-foreground">Set your goal to stay consistent with coursework</p>
            </div>
            <select
              value={studyGoalMinutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStudyGoalMinutes(val);
                localStorage.setItem("syllaboss_study_goal", String(val));
                toast.success(`Daily focus target set to ${val} minutes.`);
              }}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour (Recommended)</option>
              <option value={90}>1.5 Hours</option>
              <option value={120}>2 Hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Reward Rate</span>
            <span className="font-medium text-foreground">+5 {POINTS_NAME} per 30 minutes</span>
          </div>

          <div className="flex items-center justify-between p-4 text-sm">
            <span className="text-muted-foreground">Inactivity Timeout</span>
            <span className="font-medium text-emerald-600">
              Auto-pauses after 1 hour idle to protect points integrity
            </span>
          </div>
        </div>
      </div>

      {/* Payout & Bank Account Details */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <CreditCard className="size-3.5 text-primary" /> Payout Destination & Bank Details
        </p>
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
          <p className="text-xs text-muted-foreground">
            Configure your default Nigerian bank account for seamless cash-outs when redeeming SyllaPoints.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Select Bank</label>
              <select
                value={savedBank}
                onChange={(e) => setSavedBank(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Choose your Bank --</option>
                {POPULAR_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Account Number (10 digits)</label>
              <input
                type="text"
                maxLength={10}
                value={savedAccountNum}
                onChange={(e) => setSavedAccountNum(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 7012345678"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Account Holder Full Name</label>
            <input
              type="text"
              value={savedAccountName}
              onChange={(e) => setSavedAccountName(e.target.value)}
              placeholder="e.g. Olakunle Ayadi"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={handleSaveBankDetails}
              disabled={isSavingBank}
              className="rounded-xl text-xs gap-1.5 font-semibold"
            >
              <Save className="size-3.5" /> Save Payout Details
            </Button>
          </div>
        </div>
      </div>

      {/* Student Identity, Avatar & Academic Profile */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <GraduationCap className="size-3.5 text-primary" /> Student Identity & Academic Profile
        </p>
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5 shadow-xs">
          {/* Avatar & Student SyllaID / Scanner Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-border/70">
            <div className="flex items-center gap-4">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="size-16 rounded-full object-cover border-2 border-primary/40 shadow-xs"
                  />
                ) : (
                  <div className="size-16 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center border-2 border-primary/20 shadow-xs">
                    {(fullName || username || "S")[0].toUpperCase()}
                  </div>
                )}
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Upload profile picture"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-transform"
                >
                  {isUploadingAvatar ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                </button>
              </div>

              <div>
                <p className="text-sm font-bold text-foreground">Profile Picture</p>
                <p className="text-xs text-muted-foreground">
                  Upload a photo for your student card, groups, and peer chats.
                </p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="mt-1 text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Upload className="size-3" /> Change Picture
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQrModal(true)}
                className="flex-1 sm:flex-initial h-8 rounded-xl text-xs gap-1.5 font-semibold border-primary/30 text-primary hover:bg-primary/5"
              >
                <QrCode className="size-3.5" /> My SyllaID QR
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowScannerModal(true)}
                className="flex-1 sm:flex-initial h-8 rounded-xl text-xs gap-1.5 font-semibold"
              >
                <Camera className="size-3.5" /> Scan QR
              </Button>
            </div>
          </div>

          {/* Unique Username Editor with Live Availability Validation */}
          <div className="space-y-2 rounded-xl border border-border/80 bg-background p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-primary" /> Student Username (@handle)
              </label>
              <span className="text-[11px] text-muted-foreground">Unique across all students</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground select-none">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                  placeholder="e.g. adekunle_01"
                  className="w-full rounded-xl border border-border bg-background pl-7 pr-12 py-1.5 text-xs font-mono font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="absolute right-2.5 top-2 flex items-center">
                  {usernameChecking && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                  {!usernameChecking && isUsernameAvailable === true && (
                    <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                      <Check className="size-2.5" /> Available
                    </span>
                  )}
                  {!usernameChecking && isUsernameAvailable === false && (
                    <span className="text-[10px] text-destructive font-semibold bg-destructive/10 px-1.5 py-0.5 rounded-full border border-destructive/20">
                      Taken
                    </span>
                  )}
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleSaveUsername}
                disabled={isSavingUsername || isUsernameAvailable === false || !username.trim() || username === profile?.username}
                className="h-8 rounded-xl text-xs gap-1 font-semibold"
              >
                {isSavingUsername ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Save Handle
              </Button>
            </div>

            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              This username will be displayed on the Leaderboard and used by peers to message you.
            </p>
          </div>

          {/* Academic Details Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 80 000 0000"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Institution / University</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. University of Lagos (UNILAG)"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Course of Study</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Physical Sciences"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Academic Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="100 Level">100 Level</option>
                <option value="200 Level">200 Level</option>
                <option value="300 Level">300 Level</option>
                <option value="400 Level">400 Level</option>
                <option value="500 Level">500 Level</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="rounded-xl text-xs gap-1.5 font-semibold"
            >
              <Save className="size-3.5" /> Save Academic Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Refer & Earn */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Share2 className="size-3.5 text-primary" /> Referrals & Cash Rewards
        </p>
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                Share & Earn {POINTS_NAME}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Earn <strong className="text-foreground">+{POINTS_REFERRAL_REGISTRATION} {POINTS_NAME}</strong> when a friend registers, plus an extra{" "}
                <strong className="text-foreground">+{POINTS_REFERRAL_UPGRADE} {POINTS_NAME}</strong> when they upgrade to {PLAN_NAME}!
              </p>
            </div>
          </div>

          {/* Referral Code Box */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <div className="flex w-full flex-1 items-center justify-between rounded-xl border border-border bg-secondary/40 px-3.5 py-2">
              <span className="font-mono text-sm font-semibold text-foreground tracking-wider">{refCode}</span>
              <button
                onClick={copyCode}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                {copiedCode ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
                {copiedCode ? "Copied" : "Copy code"}
              </button>
            </div>

            <div className="flex w-full sm:w-auto gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="rounded-xl flex-1 sm:flex-initial text-xs h-9"
              >
                {copiedLink ? <Check className="size-3.5 mr-1" /> : <Share2 className="size-3.5 mr-1" />}
                Copy link
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={shareWhatsApp}
                className="rounded-xl flex-1 sm:flex-initial text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* App Installation */}
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Smartphone className="size-3.5 text-primary" /> Mobile App Experience
        </p>
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Home Screen App</p>
              <p className="text-xs text-muted-foreground">
                {profile?.app_installed ? "Install bonus already claimed" : `Install to earn +${POINTS_INSTALL_APP_BONUS} ${POINTS_NAME}`}
              </p>
            </div>
          </div>

          {!profile?.app_installed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClaimInstall}
              disabled={claimingInstall}
              className="rounded-full text-xs h-8"
            >
              {claimingInstall ? "Claiming..." : `Claim +${POINTS_INSTALL_APP_BONUS} pts`}
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="size-3.5" /> Claimed
            </span>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <div className="pt-2 pb-6">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden shadow-xs">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 p-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="size-4" /> Sign out of Syllaboss
          </button>
        </div>
      </div>

      {/* Personal SyllaID QR Card Modal */}
      <StudentQrModal
        open={showQrModal}
        onOpenChange={setShowQrModal}
        username={username || profile?.username || "student"}
        fullName={fullName || profile?.full_name || "Student"}
        avatarUrl={avatarUrl || profile?.avatar_url}
        institution={institution || profile?.institution}
        onOpenScanner={() => {
          setShowQrModal(false);
          setShowScannerModal(true);
        }}
      />

      {/* Live QR Camera Scanner Modal */}
      <QrScannerModal
        open={showScannerModal}
        onOpenChange={setShowScannerModal}
        onScanPeer={handleScanPeer}
      />
    </div>
  );
}
