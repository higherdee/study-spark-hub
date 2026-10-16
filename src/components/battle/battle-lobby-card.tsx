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
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-forest p-4">
        <div className="skeleton h-3 w-24 rounded-full opacity-20" />
        <div className="skeleton h-6 w-3/4 rounded-md opacity-20" />
        <div className="skeleton h-14 w-full rounded-xl opacity-20" />
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

  const createdAtMs = new Date(battle.created_at).getTime();
  const fiveMinMs = 5 * 60 * 1000;
  const msElapsed = Date.now() - createdAtMs;
  const isTimedOut = battle.status === "lobby" && msElapsed > fiveMinMs;
  const remainingSec = Math.max(0, Math.floor((fiveMinMs - msElapsed) / 1000));
  const remainingMins = Math.floor(remainingSec / 60);
  const remainingSecsDisplay = String(remainingSec % 60).padStart(2, "0");

  const statusLabel = isCompleted
    ? "Final"
    : isTimedOut
    ? "Disbanded"
    : isGrading
    ? "Grading"
    : `Lobby (${remainingMins}:${remainingSecsDisplay})`;
  const modeLabel = battle.mode === "mcq" ? "MCQ Blitz" : "Theory Showdown";

  return (
    <div className="animate-rise w-full max-w-sm overflow-hidden rounded-2xl bg-forest text-white shadow-[var(--elev-3)]">
      {/* Ticket header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-soft">
          {battle.mode === "mcq" ? <Zap className="size-3.5" /> : <BookOpen className="size-3.5" />}
          {modeLabel}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
            isCompleted ? "bg-white/15 text-white" : "bg-white/10 text-white/80",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isCompleted ? "bg-white" : isGrading ? "bg-brass animate-pulse" : "bg-brand",
            )}
          />
          {statusLabel}
        </span>
      </div>

      <div className="px-4 pt-3">
        <h4 className="font-display text-xl leading-tight">{battle.title}</h4>
        <p className="mt-1 text-xs text-white/60">
          Hosted by <span className="font-semibold text-white/90">{battle.host_name}</span>
          {battle.source_summary && ` · ${battle.source_summary}`}
        </p>
      </div>

      {/* Perforation */}
      <div className="relative my-4">
        <div className="border-t border-dashed border-white/20" />
        <span className="absolute -left-2 -top-2 size-4 rounded-full bg-background" />
        <span className="absolute -right-2 -top-2 size-4 rounded-full bg-background" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 text-center">
        <div className="rounded-xl bg-white/5 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-white/50">Pot</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 font-display text-lg text-brass-soft tnum">
            <Coins className="size-3.5" />
            {battle.total_pot}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-white/50">Questions</p>
          <p className="mt-0.5 font-display text-lg tnum">{battle.question_count}</p>
        </div>
        <div className="rounded-xl bg-white/5 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-white/50">Pace</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 font-display text-lg tnum">
            <Clock className="size-3.5 text-white/60" />
            {battle.mode === "mcq" ? `${battle.time_per_question}s` : "Open"}
          </p>
        </div>
      </div>

      {/* Fighters */}
      <div className="px-4 pt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-white/60">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {joinedCount} of {fighters.length} ready
          </span>
          {battle.stake_amount > 0 && (
            <span className="font-semibold text-brass-soft tnum">
              {battle.stake_amount} pts stake
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {fighters.map((f) => {
            const hasJoined = f.status === "joined" || f.status === "submitted";
            const declined = f.status === "declined";
            return (
              <div
                key={f.id}
                title={`${f.user_name} (${f.status})`}
                className={cn(
                  "flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[11px] font-medium transition-opacity",
                  hasJoined ? "bg-brand/20 text-white" : "bg-white/8 text-white/70",
                  declined && "line-through opacity-40",
                )}
              >
                <Avatar className="size-5 border border-white/20">
                  <AvatarImage src={f.avatar_url || undefined} />
                  <AvatarFallback className="bg-white/15 text-[9px] text-white">
                    {f.user_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[84px] truncate">{f.user_name}</span>
                {hasJoined && <CheckCircle2 className="size-3 shrink-0 text-brand" />}
                {!hasJoined && !declined && <Hourglass className="size-3 shrink-0 text-white/40" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 pt-4">
        {isTimedOut ? (
          <div className="w-full text-center py-2 text-xs font-semibold text-white/60 bg-white/5 rounded-xl border border-white/10">
            Lobby expired & disbanded after 5 minutes
          </div>
        ) : isInvited && !isCompleted ? (
          <>
            <Button
              type="button"
              disabled={isJoining}
              onClick={handleJoin}
              className="h-10 flex-1 rounded-xl bg-brass text-white hover:bg-brass-ink"
            >
              {isJoining ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Swords className="size-4" />
                  Accept{battle.stake_amount > 0 ? ` · ${battle.stake_amount} pts` : " · Free"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isDeclining}
              onClick={handleDecline}
              className="h-10 rounded-xl border-white/20 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white"
            >
              Decline
            </Button>
          </>
        ) : isJoined && !isCompleted ? (
          <Button
            type="button"
            onClick={() => onOpenArena(battle.id, "fighter")}
            className="h-10 w-full rounded-xl bg-white text-forest hover:bg-white/90"
          >
            <Swords className="size-4" />
            {myParticipant?.status === "submitted" ? "View status" : "Enter the arena"}
            <ChevronRight className="size-4" />
          </Button>
        ) : isCompleted ? (
          <>
            <Button
              type="button"
              onClick={() => onOpenArena(battle.id, "spectator")}
              className="h-10 flex-1 rounded-xl bg-white text-forest hover:bg-white/90"
            >
              <Trophy className="size-4 text-brass" />
              Results
            </Button>
            {onRunItBack && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRunItBack(battle)}
                className="h-10 rounded-xl border-white/20 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="size-4" />
                Rematch
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenArena(battle.id, "spectator")}
            className="h-10 w-full rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Eye className="size-4" />
            Spectate
          </Button>
        )}
      </div>
      {isHost && !isCompleted && (
        <p className="flex items-center justify-center gap-1 pb-3 text-[10px] text-white/40">
          <ShieldCheck className="size-3" /> Stakes are held in escrow until the match ends
        </p>
      )}
    </div>
  );
}
