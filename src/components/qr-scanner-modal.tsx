import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import { Camera, X, RefreshCw, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    if (open) {
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
          ? "Camera permission was denied. Please allow camera access in your browser settings."
          : "Unable to start camera on this device."
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

  function scanFrame() {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
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
          stopCamera();
          toast.success(`Found peer @${targetUsername}!`);
          onOpenChange(false);
          onScanPeer(targetUsername);
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
            Point your camera at a course peer's Syllaboss QR Card to start chatting.
          </p>
        </DialogHeader>

        <div className="mt-4 flex flex-col items-center">
          {/* Viewport Frame */}
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

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Make sure the QR code is centered and well lit.
          </p>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="mt-3 w-full rounded-full text-xs text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
