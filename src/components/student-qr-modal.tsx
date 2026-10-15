import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Copy, Check, Share2, ScanLine, X, QrCode as QrIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StudentQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  fullName: string;
  avatarUrl?: string | null | undefined;
  institution?: string | null | undefined;
  onOpenScanner?: (() => void) | undefined;
}

export function StudentQrModal({
  open,
  onOpenChange,
  username,
  fullName,
  avatarUrl,
  institution,
  onOpenScanner,
}: StudentQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/u/${username}`
    : `https://syllaboss.org/u/${username}`;

  useEffect(() => {
    if (open && username) {
      QRCode.toDataURL(
        `syllaboss:peer:@${username}`,
        {
          width: 320,
          margin: 1.5,
          color: {
            dark: "#064e3b", // Deep emerald
            light: "#ffffff",
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    }
  }, [open, username]);

  function handleCopy() {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Profile link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fullName} on Syllaboss`,
          text: `Connect with @${username} on Syllaboss for study groups, notes, and past questions.`,
          url: profileUrl,
        });
      } catch (e) {
        // user cancelled or failed
      }
    } else {
      handleCopy();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6 border-border/80 bg-card text-card-foreground shadow-2xl">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold tracking-tight">
            <QrIcon className="size-5 text-brand" />
            Your SyllaID Card
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Peers can scan this code to instantly add you to chats and study groups.
          </p>
        </DialogHeader>

        <div className="mt-4 flex flex-col items-center">
          {/* Card Container */}
          <div className="w-full rounded-2xl border border-brand/20 bg-gradient-to-b from-brand/5 via-card to-card p-5 text-center shadow-inner">
            <Avatar className="mx-auto size-16 ring-4 ring-brand/20 shadow-md">
              <AvatarImage src={avatarUrl || ""} alt={fullName} />
              <AvatarFallback className="bg-brand text-lg font-bold text-white">
                {fullName?.charAt(0)?.toUpperCase() || "S"}
              </AvatarFallback>
            </Avatar>

            <h3 className="mt-3 font-semibold text-foreground text-base leading-tight">
              {fullName}
            </h3>
            <p className="font-mono text-xs font-medium text-brand dark:text-brand">
              @{username}
            </p>
            {institution && (
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-[240px] mx-auto">
                {institution}
              </p>
            )}

            {/* QR Code Canvas */}
            <div className="mt-4 mx-auto flex justify-center rounded-xl bg-white p-3 shadow-md border border-secondary max-w-[200px]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR for @${username}`} className="size-44 object-contain" />
              ) : (
                <div className="size-44 grid place-items-center text-xs text-muted-foreground animate-pulse">
                  Generating QR...
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="rounded-full text-xs font-semibold gap-1.5"
            >
              {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleShare}
              className="rounded-full bg-brand hover:bg-brand-deep text-white text-xs font-semibold gap-1.5"
            >
              <Share2 className="size-3.5" />
              Share Card
            </Button>
          </div>

          {onOpenScanner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenScanner();
              }}
              className="mt-3 w-full rounded-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ScanLine className="size-3.5 text-brand" />
              Scan a peer's QR code instead
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
