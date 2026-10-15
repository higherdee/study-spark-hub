import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import {
  Flame,
  Swords,
  Coins,
  Clock,
  Sparkles,
  Trophy,
  Share2,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ScholarFlexData } from "@/integrations/turso/scholar";

interface ScholarFlexCardProps {
  data: ScholarFlexData;
  className?: string;
  showActions?: boolean;
}

export function ScholarFlexCard({ data, className, showActions = true }: ScholarFlexCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/scholar/${data.user.username}`
    : data.shareUrl;

  // Generate QR Code
  useEffect(() => {
    if (data.user.username) {
      QRCode.toDataURL(
        publicUrl,
        {
          width: 280,
          margin: 1.5,
          color: {
            dark: "#0b2e22",
            light: "#f4f3ee",
          },
        },
        (err, url) => {
          if (!err && url) setQrDataUrl(url);
        }
      );
    }
  }, [data.user.username, publicUrl]);

  // Generate High-Res 1080x1920 PNG using HTML5 Canvas (Scholar's Ledger Aesthetic)
  const generatePngBlob = async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Deep Imperial Forest Background
    ctx.fillStyle = "#071811";
    ctx.fillRect(0, 0, 1080, 1920);

    // Warm Brass & Emerald radial ambient glows
    const orb1 = ctx.createRadialGradient(900, 260, 40, 900, 260, 750);
    orb1.addColorStop(0, "rgba(31, 138, 91, 0.22)");
    orb1.addColorStop(1, "rgba(7, 24, 17, 0)");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, 1080, 1920);

    const orb2 = ctx.createRadialGradient(160, 980, 40, 160, 980, 680);
    orb2.addColorStop(0, "rgba(169, 121, 26, 0.18)");
    orb2.addColorStop(1, "rgba(7, 24, 17, 0)");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, 1080, 1920);

    // Guilloche / Hairline Brass Framing
    ctx.strokeStyle = "rgba(169, 121, 26, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 1000, 1840);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, 984, 1824);

    // Corner Accents
    const drawCorner = (x: number, y: number, dirX: number, dirY: number) => {
      ctx.strokeStyle = "#a9791a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + dirY * 24);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dirX * 24, y);
      ctx.stroke();
    };
    drawCorner(44, 44, 1, 1);
    drawCorner(1036, 44, -1, 1);
    drawCorner(44, 1876, 1, -1);
    drawCorner(1036, 1876, -1, -1);

    // 2. Header Brand & Seal
    ctx.fillStyle = "#a9791a";
    ctx.font = "bold 24px Georgia, serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("SYLLABOSS SCHOLAR'S LEDGER", 80, 120);

    ctx.fillStyle = "rgba(244, 243, 238, 0.6)";
    ctx.font = "bold 20px sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("OFFICIAL ACADEMIC STANDING • 2026", 80, 156);

    // Verified Scholar Tag
    ctx.fillStyle = "rgba(31, 138, 91, 0.25)";
    ctx.strokeStyle = "rgba(31, 138, 91, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(720, 95, 280, 56, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#2ec484";
    ctx.font = "bold 18px sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("VERIFIED SCHOLAR", 755, 130);

    // 3. User Identity Docket
    ctx.fillStyle = "rgba(244, 243, 238, 0.04)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(80, 215, 920, 240, 28);
    ctx.fill();
    ctx.stroke();

    // User Avatar circle with gilded ring
    ctx.strokeStyle = "#a9791a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(180, 335, 68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#0f3627";
    ctx.beginPath();
    ctx.arc(180, 335, 66, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4f3ee";
    ctx.font = "bold 58px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(data.user.fullName[0] || "S", 180, 355);
    ctx.textAlign = "left";

    // Name & Institution
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px Georgia, serif";
    ctx.fillText(data.user.fullName, 285, 315);

    ctx.fillStyle = "#a9791a";
    ctx.font = "bold 28px monospace";
    ctx.fillText(`@${data.user.username}`, 285, 360);

    ctx.fillStyle = "rgba(244, 243, 238, 0.65)";
    ctx.font = "24px sans-serif";
    ctx.fillText(`${data.user.institution} • ${data.user.course}`, 285, 405);

    // 4. Hero Flex Highlight: Department Standing
    const rankY = 495;
    const rankGrad = ctx.createLinearGradient(80, rankY, 1000, rankY + 280);
    rankGrad.addColorStop(0, "rgba(169, 121, 26, 0.18)");
    rankGrad.addColorStop(1, "rgba(31, 138, 91, 0.16)");
    ctx.fillStyle = rankGrad;
    ctx.strokeStyle = "rgba(169, 121, 26, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, rankY, 920, 280, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#d4a34b";
    ctx.font = "bold 24px sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText("DEPARTMENT STANDING", 120, rankY + 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 82px Georgia, serif";
    ctx.fillText(`TOP ${data.departmentPercentile}% RANK`, 120, rankY + 160);

    ctx.fillStyle = "rgba(244, 243, 238, 0.85)";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(
      `#${data.departmentRank} of ${data.departmentTotal} Scholars in ${data.user.course}`,
      120,
      rankY + 230
    );

    // 5. AI Scholar Archetype Banner
    const archY = 815;
    ctx.fillStyle = "rgba(244, 243, 238, 0.03)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(80, archY, 920, 340, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#a9791a";
    ctx.font = "bold 22px sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText("ACADEMIC ARCHETYPE", 120, archY + 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px Georgia, serif";
    ctx.fillText(`${data.archetype.badgeEmoji} ${data.archetype.title}`, 120, archY + 140);

    ctx.fillStyle = "#2ec484";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(data.archetype.tagline, 120, archY + 195);

    ctx.fillStyle = "rgba(244, 243, 238, 0.75)";
    ctx.font = "italic 28px Georgia, serif";
    ctx.fillText(`"${data.archetype.quote}"`, 120, archY + 265);

    // 6. 2x2 Metric Ledger Grid
    const stats = [
      {
        icon: "🔥",
        label: "DAILY STREAK",
        val: `${data.user.currentStreak} Days`,
        sub: "Continuous Reading Ledger",
        color: "#a9791a",
      },
      {
        icon: "⚔️",
        label: "BATTLE WIN-RATE",
        val: `${data.battleWinRate}%`,
        sub: `${data.battlesWon} Won / ${data.battlesEntered} Contested`,
        color: "#2ec484",
      },
      {
        icon: "🪙",
        label: "SYLLAPOINTS",
        val: `${data.user.points.toLocaleString()} pts`,
        sub: data.user.syllaPlus ? "SyllaPlus Laureate Tier" : "Honors Scholar Tier",
        color: "#d4a34b",
      },
      {
        icon: "⏱️",
        label: "STUDY HOURS",
        val: `${data.user.studyHours}h`,
        sub: `${data.user.verifiedUploads} Verified Contributions`,
        color: "#6ee7b7",
      },
    ];

    const gridY = 1195;
    const colW = 445;
    const rowH = 220;

    stats.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 80 + col * (colW + 30);
      const y = gridY + row * (rowH + 20);

      ctx.fillStyle = "rgba(244, 243, 238, 0.035)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, colW, rowH, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = st.color;
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`${st.icon} ${st.label}`, x + 35, y + 55);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 50px monospace";
      ctx.fillText(st.val, x + 35, y + 130);

      ctx.fillStyle = "rgba(244, 243, 238, 0.55)";
      ctx.font = "20px sans-serif";
      ctx.fillText(st.sub, x + 35, y + 175);
    });

    // 7. Footer Watermark & Official Verification QR Code
    const footY = 1690;

    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
        qrImg.onerror = resolve;
      });
      ctx.fillStyle = "#f4f3ee";
      ctx.beginPath();
      ctx.roundRect(80, footY, 170, 170, 18);
      ctx.fill();
      ctx.drawImage(qrImg, 90, footY + 10, 150, 150);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px Georgia, serif";
    ctx.fillText("Scan to Verify Standing", 280, footY + 55);

    ctx.fillStyle = "rgba(244, 243, 238, 0.6)";
    ctx.font = "24px sans-serif";
    ctx.fillText(`View @${data.user.username}'s public folio & past questions`, 280, footY + 100);

    ctx.fillStyle = "#a9791a";
    ctx.font = "bold 32px monospace";
    ctx.fillText("syllaboss.org", 280, footY + 148);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  // Download Story Card PNG
  const handleDownloadPng = async () => {
    setIsExporting(true);
    try {
      const blob = await generatePngBlob();
      if (!blob) throw new Error("Could not render card image");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `syllaboss-scholar-${data.user.username}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("📸 High-resolution Story Card downloaded (1080x1920)!");
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Share directly to WhatsApp Status
  const handleShareWhatsAppStatus = async () => {
    const text = `🏆 Syllaboss Campus Wrapped 2026\nTop ${data.departmentPercentile}% in ${data.user.course} with a ${data.user.currentStreak}-day study streak!\n\nAI Archetype: "${data.archetype.title}"\nReview standing or challenge my rank:\n${publicUrl}`;

    try {
      const blob = await generatePngBlob();
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `syllaboss-scholar-${data.user.username}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "My Syllaboss Academic Standing",
            text,
          });
          toast.success("Shared folio flex card!");
          return;
        }
      }
    } catch {}

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const handleShareTwitter = () => {
    const tweetText = `My verified standing on @syllaboss Campus Wrapped:\n\n📜 Rank: Top ${data.departmentPercentile}% in ${data.user.course}\n⚡ Battle Win Rate: ${data.battleWinRate}%\n👑 Archetype: ${data.archetype.title}\n\nReview folio & rank:\n${publicUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Scholar profile link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex flex-col items-center gap-4 w-full max-w-sm sm:max-w-md mx-auto", className)}>
      {/* 9:16 Vertical Story Card */}
      <div
        ref={cardRef}
        className="w-full aspect-[9/16] rounded-3xl p-5 sm:p-6 bg-forest text-white border border-border shadow-[var(--elev-3)] relative overflow-hidden flex flex-col justify-between select-none"
      >
        {/* Subtle Ambient Depth */}
        <div className="absolute -top-20 -right-20 size-60 rounded-full bg-brand/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 size-56 rounded-full bg-brass/10 blur-3xl pointer-events-none" />

        {/* 1. Brand Top Bar */}
        <div className="flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm tracking-widest text-brass-soft">SYLLABOSS</span>
              <span className="size-1 rounded-full bg-brass-soft" />
            </div>
            <p className="eyebrow text-white/50 mt-0.5">
              Academic Ledger · {data.generatedDate}
            </p>
          </div>

          <Badge className="bg-white/10 hover:bg-white/15 text-white/90 border-white/20 text-[10px] font-semibold h-5 px-2.5">
            VERIFIED SCHOLAR
          </Badge>
        </div>

        {/* 2. User Info Docket */}
        <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md flex items-center gap-3 z-10">
          <Avatar className="size-12 border border-brass-soft/60 shadow-xs">
            <AvatarImage src={data.user.avatarUrl || undefined} />
            <AvatarFallback className="bg-forest-deep text-white font-serif text-lg font-bold">
              {data.user.fullName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-base truncate text-white leading-tight">
              {data.user.fullName}
            </h3>
            <p className="text-[11px] font-mono text-brass-soft truncate">@{data.user.username}</p>
            <p className="text-[10px] text-white/60 truncate mt-0.5">
              {data.user.institution} · {data.user.course}
            </p>
          </div>
        </div>

        {/* 3. Hero Clout: Department Standing */}
        <div className="p-4 rounded-2xl bg-white/[0.06] border border-brass/40 shadow-md relative overflow-hidden z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="eyebrow text-brass-soft">
              Department Standing
            </span>
            <Trophy className="size-4 text-brass-soft" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              TOP {data.departmentPercentile}%
            </span>
          </div>

          <p className="text-xs text-white/80 mt-1 font-medium">
            #{data.departmentRank} of {data.departmentTotal} in {data.user.course}
          </p>
        </div>

        {/* 4. AI Scholar Archetype Banner */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-1 z-10">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-white/50">
              Scholar Archetype
            </span>
            <Sparkles className="size-3.5 text-brass-soft" />
          </div>

          <h4 className="font-display text-base font-bold text-white flex items-center gap-2 leading-tight">
            <span>{data.archetype.badgeEmoji}</span>
            <span>{data.archetype.title}</span>
          </h4>

          <p className="text-[11px] font-medium text-brand">{data.archetype.tagline}</p>

          <p className="text-[10px] italic font-serif text-white/70 leading-relaxed pt-0.5">
            "{data.archetype.quote}"
          </p>
        </div>

        {/* 5. 2x2 Metric Grid */}
        <div className="grid grid-cols-2 gap-2 z-10">
          {/* Daily Streak */}
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-1 text-brass-soft text-[10px] font-bold uppercase tracking-wider">
              <Flame className="size-3" />
              <span>Streak</span>
            </div>
            <p className="text-lg font-bold text-white mt-0.5 tnum font-mono">{data.user.currentStreak} Days</p>
            <span className="text-[9px] text-white/50 block">Daily study active</span>
          </div>

          {/* Battle Win-Rate */}
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-1 text-brand text-[10px] font-bold uppercase tracking-wider">
              <Swords className="size-3" />
              <span>Win-Rate</span>
            </div>
            <p className="text-lg font-bold text-white mt-0.5 tnum font-mono">{data.battleWinRate}%</p>
            <span className="text-[9px] text-white/50 block">
              {data.battlesWon}W / {data.battlesEntered} Battles
            </span>
          </div>

          {/* SyllaPoints */}
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-1 text-brass-soft text-[10px] font-bold uppercase tracking-wider">
              <Coins className="size-3" />
              <span>Balance</span>
            </div>
            <p className="text-lg font-bold text-white mt-0.5 tnum font-mono">{data.user.points.toLocaleString()} pts</p>
            <span className="text-[9px] text-white/50 block">
              {data.user.syllaPlus ? "SyllaPlus Laureate" : "Honors Scholar"}
            </span>
          </div>

          {/* Study Time */}
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-1 text-white/70 text-[10px] font-bold uppercase tracking-wider">
              <Clock className="size-3" />
              <span>Study Hours</span>
            </div>
            <p className="text-lg font-bold text-white mt-0.5 tnum font-mono">{data.user.studyHours}h</p>
            <span className="text-[9px] text-white/50 block">Recorded sessions</span>
          </div>
        </div>

        {/* 6. Footer Watermark & QR */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            {qrDataUrl && (
              <div className="p-1 rounded-xl bg-background shadow-xs border border-white/20">
                <img src={qrDataUrl} alt="QR Code" className="size-10" />
              </div>
            )}
            <div>
              <p className="text-[10px] text-white/80 font-medium">Scan to verify rank</p>
              <p className="text-[11px] font-mono text-brass-soft font-bold">syllaboss.org</p>
            </div>
          </div>

          <div className="text-right">
            <span className="eyebrow text-white/50 block">
              SYLLABOSS
            </span>
            <span className="text-[9px] text-white/70 font-serif">Campus Register</span>
          </div>
        </div>
      </div>

      {/* Share / Flex Action Toolbar */}
      {showActions && (
        <div className="w-full space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={handleShareWhatsAppStatus}
              className="h-10 rounded-2xl bg-brand hover:bg-brand/90 text-white font-bold text-xs gap-1.5 shadow-sm lift press"
            >
              <Share2 className="size-3.5" />
              <span>WhatsApp Status</span>
            </Button>

            <Button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPng}
              className="h-10 rounded-2xl bg-forest hover:bg-ink text-white font-bold text-xs gap-1.5 shadow-sm lift press"
            >
              <Download className="size-3.5 text-brass-soft" />
              <span>{isExporting ? "Rendering..." : "Download Story PNG"}</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleShareTwitter}
              className="h-9 rounded-2xl border-border bg-card text-ink font-semibold text-xs gap-1.5 hover:bg-surface-container-low lift press"
            >
              <span>Post on X / Twitter</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="h-9 rounded-2xl border-border bg-card text-ink font-semibold text-xs gap-1.5 hover:bg-surface-container-low lift press"
            >
              {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied Link" : "Copy Flex Link"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
