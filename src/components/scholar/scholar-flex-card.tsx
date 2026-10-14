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
  ExternalLink,
  QrCode as QrIcon,
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
            dark: "#050811",
            light: "#ffffff",
          },
        },
        (err, url) => {
          if (!err && url) setQrDataUrl(url);
        }
      );
    }
  }, [data.user.username, publicUrl]);

  // Generate High-Res 1080x1920 PNG using HTML5 Canvas
  const generatePngBlob = async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Dark Luxury Background & Radiant Ambient Orbs
    ctx.fillStyle = "#070B14";
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing top-right gradient orb (Emerald)
    const orb1 = ctx.createRadialGradient(900, 200, 50, 900, 200, 700);
    orb1.addColorStop(0, "rgba(16, 185, 129, 0.25)");
    orb1.addColorStop(1, "rgba(7, 11, 20, 0)");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing middle-left gradient orb (Amber)
    const orb2 = ctx.createRadialGradient(150, 900, 50, 150, 900, 600);
    orb2.addColorStop(0, "rgba(245, 158, 11, 0.2)");
    orb2.addColorStop(1, "rgba(7, 11, 20, 0)");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, 1080, 1920);

    // Border framing
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 1000, 1840);

    // 2. Header Brand
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 32px sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("SYLLABOSS", 80, 120);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "bold 24px sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("CAMPUS WRAPPED • 2026", 80, 160);

    // Verified Scholar Tag
    ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
    ctx.beginPath();
    ctx.roundRect(740, 90, 260, 60, 30);
    ctx.fill();
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 22px sans-serif";
    ctx.letterSpacing = "1px";
    ctx.fillText("VERIFIED SCHOLAR", 770, 128);

    // 3. User Identity Card Container
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, 220, 920, 240, 32);
    ctx.fill();
    ctx.stroke();

    // User Avatar circle
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(180, 340, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#070B14";
    ctx.font = "bold 60px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.user.fullName[0] || "S", 180, 362);
    ctx.textAlign = "left";

    // Name & Username
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(data.user.fullName, 290, 320);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`@${data.user.username}`, 290, 370);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "26px sans-serif";
    ctx.fillText(`${data.user.institution} • ${data.user.course}`, 290, 415);

    // 4. Hero Flex Highlight: Department Rank
    const rankY = 500;
    const rankGrad = ctx.createLinearGradient(80, rankY, 1000, rankY + 280);
    rankGrad.addColorStop(0, "rgba(245, 158, 11, 0.18)");
    rankGrad.addColorStop(1, "rgba(16, 185, 129, 0.15)");
    ctx.fillStyle = rankGrad;
    ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(80, rankY, 920, 280, 36);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 30px sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText("DEPARTMENT CLOUT", 120, rankY + 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "black 88px sans-serif";
    ctx.fillText(`TOP ${data.departmentPercentile}% RANK`, 120, rankY + 160);

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(
      `#${data.departmentRank} of ${data.departmentTotal} Students in ${data.user.course}`,
      120,
      rankY + 230
    );

    // 5. AI Scholar Archetype Banner
    const archY = 820;
    ctx.fillStyle = "rgba(139, 92, 246, 0.14)";
    ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(80, archY, 920, 340, 36);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#a78bfa";
    ctx.font = "bold 26px sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText("AI SCHOLAR ARCHETYPE", 120, archY + 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "black 58px sans-serif";
    ctx.fillText(`${data.archetype.badgeEmoji} ${data.archetype.title}`, 120, archY + 140);

    ctx.fillStyle = "#c4b5fd";
    ctx.font = "italic bold 32px sans-serif";
    ctx.fillText(data.archetype.tagline, 120, archY + 195);

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "30px sans-serif";
    ctx.fillText(`"${data.archetype.quote}"`, 120, archY + 265);

    // 6. 2x2 Stat Matrix
    const stats = [
      {
        icon: "🔥",
        label: "DAILY STREAK",
        val: `${data.user.currentStreak} Days`,
        sub: "Blazing Consistency",
        color: "#f59e0b",
      },
      {
        icon: "⚡",
        label: "BATTLE WIN-RATE",
        val: `${data.battleWinRate}%`,
        sub: `${data.battlesWon} Wins / ${data.battlesEntered} Fought`,
        color: "#10b981",
      },
      {
        icon: "💰",
        label: "SYLLAPOINTS",
        val: `${data.user.points.toLocaleString()} pts`,
        sub: data.user.syllaPlus ? "SyllaPlus Diamond Tier" : "Gold Scholar Tier",
        color: "#eab308",
      },
      {
        icon: "⏱️",
        label: "STUDY SESSIONS",
        val: `${data.user.studyHours} Hours`,
        sub: `${data.user.verifiedUploads} Verified Uploads`,
        color: "#60a5fa",
      },
    ];

    const gridY = 1200;
    const colW = 445;
    const rowH = 220;

    stats.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 80 + col * (colW + 30);
      const y = gridY + row * (rowH + 20);

      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, colW, rowH, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = st.color;
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`${st.icon} ${st.label}`, x + 35, y + 55);

      ctx.fillStyle = "#ffffff";
      ctx.font = "black 54px sans-serif";
      ctx.fillText(st.val, x + 35, y + 130);

      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(st.sub, x + 35, y + 180);
    });

    // 7. Footer Watermark & QR Code
    const footY = 1690;

    // Render QR Code if generated
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
        qrImg.onerror = resolve;
      });
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(80, footY, 170, 170, 20);
      ctx.fill();
      ctx.drawImage(qrImg, 90, footY + 10, 150, 150);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("Scan to Challenge on Campus", 280, footY + 55);

    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.font = "26px sans-serif";
    ctx.fillText(`View @${data.user.username}'s public scholar portfolio & rank`, 280, footY + 105);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("syllaboss.org", 280, footY + 155);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  // Download Story Card PNG
  const handleDownloadPng = async () => {
    setIsExporting(true);
    try {
      const blob = await generatePngBlob();
      if (!blob) throw new Error("Could not render image");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `syllaboss-flex-${data.user.username}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("📸 Story Flex Card downloaded (1080x1920)!");
    } catch (err: any) {
      toast.error("Download failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Share directly to WhatsApp Status / Native Share
  const handleShareWhatsAppStatus = async () => {
    const text = `🏆 Check my Campus Wrapped on Syllaboss!\nTop ${data.departmentPercentile}% in ${data.user.course} with a ${data.user.currentStreak}-day study streak!\n\nAI Archetype: "${data.archetype.title}"\nThink you can beat my rank? Check your standing here:\n${publicUrl}`;

    try {
      const blob = await generatePngBlob();
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `syllaboss-flex-${data.user.username}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "My Syllaboss Campus Wrapped",
            text,
          });
          toast.success("Shared flex card!");
          return;
        }
      }
    } catch {}

    // Fallback: WhatsApp web link
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  // Post to Twitter / X
  const handleShareTwitter = () => {
    const tweetText = `Just dropped my Campus Wrapped on @syllaboss!\n\n🔥 Rank: Top ${data.departmentPercentile}% in ${data.user.course}\n⚡ Battle Win Rate: ${data.battleWinRate}%\n👑 Archetype: ${data.archetype.title}\n\nCan you outscore me? Check your standing:\n${publicUrl}`;
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
      {/* 9:16 Vertical Story Card (1080x1920 aspect ratio) */}
      <div
        ref={cardRef}
        className="w-full aspect-[9/16] rounded-[2.5rem] p-5 sm:p-6 bg-gradient-to-b from-[#0B111F] via-[#080D18] to-[#04060C] border-2 border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between text-white select-none"
      >
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -right-24 size-64 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-28 size-60 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 size-64 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        {/* 1. Brand Top Bar */}
        <div className="flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-widest text-emerald-400">SYLLABOSS</span>
              <span className="size-1.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[10px] font-bold text-white/50 tracking-wider uppercase">
              Campus Wrapped · {data.generatedDate}
            </p>
          </div>

          <Badge className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 text-[10px] font-black h-5 px-2">
            VERIFIED SCHOLAR
          </Badge>
        </div>

        {/* 2. User Info */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-center gap-3 z-10">
          <Avatar className="size-12 border-2 border-emerald-400/80 shadow-md shadow-emerald-500/20">
            <AvatarImage src={data.user.avatarUrl || undefined} />
            <AvatarFallback className="bg-emerald-500 text-black font-black text-base">
              {data.user.fullName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h3 className="font-black text-sm sm:text-base truncate text-white leading-tight">
              {data.user.fullName}
            </h3>
            <p className="text-[11px] font-bold text-emerald-400 truncate">@{data.user.username}</p>
            <p className="text-[10px] text-white/60 truncate mt-0.5">
              {data.user.institution} · {data.user.course}
            </p>
          </div>
        </div>

        {/* 3. Hero Clout: Department Rank */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 via-white/[0.03] to-emerald-500/15 border-2 border-amber-500/50 shadow-xl relative overflow-hidden z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Department Standing
            </span>
            <Trophy className="size-4 text-amber-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              TOP {data.departmentPercentile}%
            </span>
          </div>

          <p className="text-[11px] font-bold text-white/80 mt-1">
            #{data.departmentRank} in {data.user.course} ({data.departmentTotal} Students)
          </p>
        </div>

        {/* 4. AI Scholar Archetype Banner */}
        <div className="p-3.5 rounded-2xl bg-violet-500/15 border border-violet-500/40 backdrop-blur-md space-y-1 z-10">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-black tracking-widest text-violet-300">
              AI Scholar Archetype
            </span>
            <Sparkles className="size-3.5 text-violet-400" />
          </div>

          <h4 className="text-base font-black text-white flex items-center gap-1.5 leading-tight">
            <span>{data.archetype.badgeEmoji}</span>
            <span>{data.archetype.title}</span>
          </h4>

          <p className="text-[10px] font-bold text-violet-200">{data.archetype.tagline}</p>

          <p className="text-[10px] italic text-white/70 leading-relaxed pt-0.5">
            "{data.archetype.quote}"
          </p>
        </div>

        {/* 5. 2x2 Metric Grid */}
        <div className="grid grid-cols-2 gap-2 z-10">
          {/* Daily Streak */}
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-black uppercase">
              <Flame className="size-3 fill-amber-400" />
              <span>Streak</span>
            </div>
            <p className="text-lg font-black text-white mt-0.5">{data.user.currentStreak} Days</p>
            <span className="text-[9px] text-white/50 block font-medium">Daily reading active</span>
          </div>

          {/* Battle Win-Rate */}
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase">
              <Swords className="size-3" />
              <span>Win-Rate</span>
            </div>
            <p className="text-lg font-black text-white mt-0.5">{data.battleWinRate}%</p>
            <span className="text-[9px] text-white/50 block font-medium">
              {data.battlesWon}W / {data.battlesEntered} Battles
            </span>
          </div>

          {/* SyllaPoints */}
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-1 text-yellow-400 text-[10px] font-black uppercase">
              <Coins className="size-3" />
              <span>Points</span>
            </div>
            <p className="text-lg font-black text-white mt-0.5">{data.user.points.toLocaleString()}</p>
            <span className="text-[9px] text-white/50 block font-medium">
              {data.user.syllaPlus ? "Diamond Tier" : "Gold Tier"}
            </span>
          </div>

          {/* Study Time */}
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-1 text-sky-400 text-[10px] font-black uppercase">
              <Clock className="size-3" />
              <span>Study Hours</span>
            </div>
            <p className="text-lg font-black text-white mt-0.5">{data.user.studyHours}h</p>
            <span className="text-[9px] text-white/50 block font-medium">Recorded sessions</span>
          </div>
        </div>

        {/* 6. Footer Watermark & QR */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {qrDataUrl && (
              <div className="p-1 rounded-xl bg-white shadow-md">
                <img src={qrDataUrl} alt="QR Code" className="size-11" />
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-white">Scan to challenge rank</p>
              <p className="text-[11px] font-black text-emerald-400">syllaboss.org</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] font-extrabold text-white/40 uppercase tracking-widest block">
              SYLLABOSS
            </span>
            <span className="text-[9px] font-bold text-white/60">Nigeria Campus Engine</span>
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
              className="h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Share2 className="size-3.5" />
              <span>WhatsApp Status</span>
            </Button>

            <Button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPng}
              className="h-10 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Download className="size-3.5" />
              <span>{isExporting ? "Rendering..." : "Download Story PNG"}</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleShareTwitter}
              className="h-9 rounded-2xl border-border bg-card text-foreground font-semibold text-xs gap-1.5"
            >
              <span>Post on X / Twitter</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="h-9 rounded-2xl border-border bg-card text-foreground font-semibold text-xs gap-1.5"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied Link" : "Copy Flex Link"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
