import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Swords,
  Zap,
  BookOpen,
  Coins,
  Clock,
  Users,
  CheckCircle2,
  Hourglass,
  Trophy,
  RotateCcw,
  Eye,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  getBattleDetailsServerFn,
  joinBattleEscrowServerFn,
  declineBattleServerFn,
} from "@/lib/battle.functions";
import { battleAudio } from "@/lib/battle-audio";

interface BattleLobbyCardProps {
  battleId: string;
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  onOpenArena: (battleId: string, role: "fighter" | "spectator") => void;
  onRunItBack?: (battle: any) => void;
}

export function BattleLobbyCard({
  battleId,
  groupId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onOpenArena,
  onRunItBack,
}: BattleLobbyCardProps) {
  const queryClient = useQueryClient();
  const [isJoining, setIsJoining] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Fetch live battle status and participants
  const { data, isLoading } = useQuery({
    queryKey: ["battle-lobby", battleId],
    queryFn: async () => {
      return await getBattleDetailsServerFn({ data: { battleId } });
    },
    refetchInterval: 4000,
  });

  const battle = data?.battle;
  const participants = data?.participants || [];

  if (isLoading && !battle) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-card p-4 shadow-lg flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-amber-500" />
        <span>Loading battle lobby...</span>
      </div>
    );
  }

  if (!battle) return null;

  const myParticipant = participants.find((p) => p.user_id === currentUserId);
  const isHost = battle.host_id === currentUserId;
  const isJoined = myParticipant?.status === "joined" || myParticipant?.status === "submitted";
  const isInvited = myParticipant?.status === "invited";
  const isCompleted = battle.status === "completed";
  const isGrading = battle.status === "grading";

  const fighters = participants.filter((p) => p.role === "fighter");
  const joinedCount = fighters.filter((p) => p.status === "joined" || p.status === "submitted").length;

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const res = await joinBattleEscrowServerFn({
        data: {
          battleId,
          groupId,
          userId: currentUserId,
          userName: currentUserName,
          avatarUrl: currentUserAvatar,
          role: "fighter",
        },
      });

      if (res.success) {
        battleAudio.playCoins();
        toast.success(`Joined match! ${battle.stake_amount} pts locked in escrow.`);
        queryClient.invalidateQueries({ queryKey: ["battle-lobby", battleId] });
      } else {
        toast.error(res.error || "Failed to join battle.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Join failed.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await declineBattleServerFn({
        data: {
          battleId,
          groupId,
          userId: currentUserId,
        },
      });
      toast.info("Declined battle invitation.");
      queryClient.invalidateQueries({ queryKey: ["battle-lobby", battleId] });
    } catch {
      toast.error("Failed to decline.");
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-gradient-to-b from-card via-card to-amber-500/5 p-4 shadow-xl text-xs space-y-3 relative overflow-hidden">
      {/* Top Banner & Mode */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="size-6 rounded-lg bg-amber-500/20 text-amber-500 grid place-items-center">
            {battle.mode === "mcq" ? <Zap className="size-3.5 fill-current" /> : <BookOpen className="size-3.5" />}
          </div>
          <span className="font-extrabold uppercase tracking-wider text-[10px] text-amber-500">
            {battle.mode === "mcq" ? "MCQ Blitz" : "Theory Showdown"}
          </span>
        </div>

        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-bold h-5 px-2 capitalize",
            isCompleted
              ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
              : isGrading
              ? "border-amber-500/40 text-amber-600 bg-amber-500/10 animate-pulse"
              : "border-primary/40 text-primary bg-primary/10"
          )}
        >
          {isCompleted ? "Completed 🏆" : isGrading ? "Grading Solutions..." : "Lobby Open"}
        </Badge>
      </div>

      {/* Battle Title & Host */}
      <div>
        <h4 className="font-black text-sm text-foreground leading-tight">
          {battle.title}
        </h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Hosted by <strong className="text-foreground">{battle.host_name}</strong>
          {battle.source_summary && ` · ${battle.source_summary}`}
        </p>
      </div>

      {/* Stats Bar (Pot, Time, Questions) */}
      <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 rounded-2xl bg-secondary/30 border border-border/60 text-center">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Total Pot</span>
          <span className="font-black text-xs text-amber-500 flex items-center justify-center gap-1">
            <Coins className="size-3" />
            {battle.total_pot} pts
          </span>
        </div>

        <div>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Format</span>
          <span className="font-bold text-xs text-foreground">
            {battle.question_count} Questions
          </span>
        </div>

        <div>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Pacing</span>
          <span className="font-bold text-xs text-foreground flex items-center justify-center gap-1">
            <Clock className="size-3 text-muted-foreground" />
            {battle.mode === "mcq" ? `${battle.time_per_question}s` : "Untimed"}
          </span>
        </div>
      </div>

      {/* Fighter Status / Avatars */}
      <div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5 font-semibold">
          <span>Fighters ({joinedCount}/{fighters.length} Joined)</span>
          {battle.stake_amount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              Stake: {battle.stake_amount} pts each
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {fighters.map((f) => {
            const hasJoined = f.status === "joined" || f.status === "submitted";
            const isSponsored = Boolean(f.sponsored_by);

            return (
              <div
                key={f.id}
                title={`${f.user_name} (${f.status})`}
                className={cn(
                  "flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all",
                  hasJoined
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : f.status === "declined"
                    ? "border-border/40 opacity-40 line-through text-muted-foreground"
                    : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                )}
              >
                <Avatar className="size-4.5 border border-border">
                  <AvatarImage src={f.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {f.user_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[80px]">{f.user_name}</span>
                {hasJoined && <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />}
                {isSponsored && <span className="text-[8px] opacity-75">🤝</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-1 flex items-center gap-2">
        {isInvited && !isCompleted ? (
          <>
            <Button
              type="button"
              disabled={isJoining}
              onClick={handleJoin}
              className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              {isJoining ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  <Swords className="size-3.5" />
                  <span>
                    Accept & Stake ({battle.stake_amount > 0 ? `${battle.stake_amount} pts` : "Free"})
                  </span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isDeclining}
              onClick={handleDecline}
              className="h-9 px-3 rounded-xl border-border text-muted-foreground hover:text-foreground text-xs"
            >
              Decline
            </Button>
          </>
        ) : isJoined && !isCompleted ? (
          <Button
            type="button"
            onClick={() => onOpenArena(battle.id, "fighter")}
            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Swords className="size-3.5" />
            <span>🚀 Enter Battle Arena ({myParticipant?.status === "submitted" ? "View Status" : "Play Now"})</span>
          </Button>
        ) : isCompleted ? (
          <div className="w-full flex items-center gap-2">
            <Button
              type="button"
              onClick={() => onOpenArena(battle.id, "spectator")}
              className="flex-1 h-9 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs gap-1.5"
            >
              <Trophy className="size-3.5 text-amber-500" />
              <span>Review Solutions & Scores</span>
            </Button>

            {onRunItBack && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRunItBack(battle)}
                className="h-9 px-3 rounded-xl border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs gap-1"
              >
                <RotateCcw className="size-3.5" />
                <span>Run It Back 🔄</span>
              </Button>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenArena(battle.id, "spectator")}
            className="w-full h-9 rounded-xl border-border text-foreground hover:bg-secondary font-bold text-xs gap-1.5"
          >
            <Eye className="size-3.5 text-primary" />
            <span>Spectate Arena</span>
          </Button>
        )}
      </div>
    </div>
  );
}
