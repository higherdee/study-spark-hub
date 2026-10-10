import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2, MessageSquare, ArrowRight, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QrScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanPeer: (username: string) => void;
}

export function QrScannerModal({ open, onOpenChange, onScanPeer }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detectedUsername, setDetectedUsername] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDetectedUsername(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  async function startCamera() {
    setErrorMessage(null);
    setDetectedUsername(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setHasPermission(true);
        setScanning(true);
        scanFrame();
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setHasPermission(false);
      setErrorMessage(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser settings to scan peers."
          : "Unable to access camera on this device."
      );
    }
  }

  function stopCamera() {
    setScanning(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function handleResetScan() {
    setDetectedUsername(null);
    startCamera();
  }

  function scanFrame() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data) {
        const raw = code.data.trim();
        let targetUsername = "";

        if (raw.startsWith("syllaboss:peer:@")) {
          targetUsername = raw.replace("syllaboss:peer:@", "");
        } else if (raw.includes("/u/")) {
          targetUsername = raw.split("/u/")[1]?.split(/[?#/]/)[0] || "";
        } else if (raw.startsWith("@")) {
          targetUsername = raw.slice(1);
        } else if (/^[a-z0-9_]{3,25}$/i.test(raw)) {
          targetUsername = raw;
        }

        if (targetUsername) {
          // Trigger vibration feedback
          try {
            navigator.vibrate?.([100, 50, 100]);
          } catch {}

          stopCamera();
          setDetectedUsername(targetUsername.toLowerCase());
          return;
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6 border-border/80 bg-card text-card-foreground shadow-2xl">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold tracking-tight">
            <Camera className="size-5 text-emerald-600" />
            Scan Peer QR Code
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Point camera at a peer's SyllaID QR code to discover and message them.
          </p>
        </DialogHeader>

        <div className="mt-4 flex flex-col items-center">
          {detectedUsername ? (
            /* Confirmation card when a student QR code is successfully captured */
            <div className="w-full flex flex-col items-center text-center p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 animate-in zoom-in-95 duration-200">
              <div className="size-16 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg mb-3">
                {detectedUsername.charAt(0).toUpperCase()}
              </div>

              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
                <CheckCircle2 className="size-4" /> Student Discovered
              </div>

              <h3 className="text-lg font-bold text-foreground">
                @{detectedUsername}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                Ready to connect! Start a conversation or share verified course materials.
              </p>

              <div className="mt-5 flex flex-col gap-2 w-full">
                <Button
                  onClick={() => {
                    const peer = detectedUsername;
                    onOpenChange(false);
                    onScanPeer(peer);
                  }}
                  className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 gap-2 shadow-md"
                >
                  <MessageSquare className="size-4" /> Message @{detectedUsername}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetScan}
                  className="w-full rounded-full text-xs h-9 border-border text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="size-3.5 mr-1" /> Scan Another QR
                </Button>
              </div>
            </div>
          ) : (
            /* Live Viewfinder Frame */
            <div className="relative size-64 overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-black shadow-inner">
              <video
                ref={videoRef}
                className="size-full object-cover"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder crosshairs overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="size-48 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" />
              </div>

              {hasPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/90 text-center">
                  <AlertCircle className="size-8 text-amber-400 mb-2" />
                  <p className="text-xs text-slate-200 leading-relaxed">{errorMessage}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startCamera}
                    className="mt-3 rounded-full text-xs gap-1.5"
                  >
                    <RefreshCw className="size-3" /> Retry
                  </Button>
                </div>
              )}
            </div>
          )}

          {!detectedUsername && (
            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              Align the square with the QR code. It will detect automatically.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
