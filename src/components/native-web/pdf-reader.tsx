import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GalleryHorizontal, Rows3, ZoomIn, ZoomOut } from "lucide-react";

type Pdf = import("pdfjs-dist").PDFDocumentProxy;

export function NativePdfReader({
  url,
  title,
  page,
  onPage,
}: {
  url: string;
  title: string;
  page: number;
  onPage: (page: number) => void;
}) {
  const [pdf, setPdf] = useState<Pdf | null>(null);
  const [error, setError] = useState("");
  const [pageRatios, setPageRatios] = useState<number[]>([]);
  const [continuous, setContinuous] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [retry, setRetry] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const observed = useRef(page);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    try {
      setContinuous(localStorage.getItem("syllaboss-reader-mode") === "scroll");
    } catch {}
  }, []);
  useEffect(() => {
    let cancelled = false;
    let document: Pdf | null = null;
    const abort = new AbortController();
    setError("");
    setPdf(null);
    (async () => {
      try {
        const response = await fetch(url, { signal: abort.signal, cache: "no-store" });
        if (!response.ok) throw Error("This PDF could not be opened. Try again.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength === 0)
          throw new Error("The document download was empty. Please try again.");
        const { getDocument, GlobalWorkerOptions, version } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        document = await getDocument({
          data: bytes,
          standardFontDataUrl: `/pdf-assets/${version}/standard_fonts/`,
          cMapUrl: `/pdf-assets/${version}/cmaps/`,
          cMapPacked: true,
          wasmUrl: `/pdf-assets/${version}/wasm/`,
          useSystemFonts: true,
        }).promise;
        if (cancelled) {
          await document.loadingTask.destroy();
          return;
        }
        const ratios: number[] = [];
        for (let start = 1; start <= document.numPages; start += 25) {
          const batch = await Promise.all(
            Array.from({ length: Math.min(25, document.numPages - start + 1) }, (_, i) =>
              document!.getPage(start + i).then((page) => {
                const size = page.getViewport({ scale: 1 });
                return size.width / size.height;
              }),
            ),
          );
          ratios.push(...batch);
          if (cancelled) {
            await document.loadingTask.destroy();
            return;
          }
        }
        setPageRatios(ratios);
        setPdf(document);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "This PDF could not be opened.");
      }
    })();
    return () => {
      cancelled = true;
      abort.abort();
      if (document) void document.loadingTask.destroy();
    };
  }, [url, retry]);
  useEffect(() => {
    if (!continuous || !pdf || observed.current === page) return;
    observed.current = page;
    viewport.current
      ?.querySelector(`[data-pdf-page="${page}"]`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [page, continuous, pdf]);
  function mode() {
    const next = !continuous;
    setContinuous(next);
    try {
      localStorage.setItem("syllaboss-reader-mode", next ? "scroll" : "swipe");
    } catch {}
    if (next) {
      observed.current = -1;
      requestAnimationFrame(() =>
        viewport.current
          ?.querySelector(`[data-pdf-page="${page}"]`)
          ?.scrollIntoView({ block: "start" }),
      );
    }
  }
  function updateVisible() {
    if (!continuous || !viewport.current) return;
    const box = viewport.current.getBoundingClientRect();
    let best = 0;
    let chosen = page;
    viewport.current.querySelectorAll<HTMLElement>("[data-pdf-page]").forEach((el) => {
      const rect = el.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top));
      if (visible > best) {
        best = visible;
        chosen = Number(el.dataset["pdfPage"]);
      }
    });
    if (chosen !== observed.current) {
      observed.current = chosen;
      onPage(chosen);
    }
  }
  return (
    <div className="native-pdf-reader">
      <div className="native-reader-tools">
        <button
          className="native-reader-mode"
          onClick={mode}
          aria-label={continuous ? "Switch to swipe pages" : "Switch to scroll pages"}
        >
          {continuous ? <Rows3 /> : <GalleryHorizontal />}
          {continuous ? "Scroll pages" : "Swipe pages"}
        </button>
        <div className="flex items-center gap-1">
          <button
            className="native-icon-button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            disabled={zoom <= 1}
            aria-label="Zoom out"
          >
            <ZoomOut />
          </button>
          <button
            className="native-icon-button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            disabled={zoom >= 3}
            aria-label="Zoom in"
          >
            <ZoomIn />
          </button>
        </div>
      </div>
      {error ? (
        <div className="native-empty px-6" role="alert">
          <p>{error}</p>
          <button className="native-text-button" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : !pdf ? (
        <div className="native-reader-loading" role="status">
          <BookLoading />
          <p>Preparing your pages…</p>
        </div>
      ) : (
        <div
          ref={viewport}
          className="native-pdf-pages"
          onScroll={updateVisible}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t && e.touches.length === 1) touch.current = { x: t.clientX, y: t.clientY };
            else touch.current = null;
          }}
          onTouchEnd={(e) => {
            const start = touch.current;
            touch.current = null;
            const end = e.changedTouches[0];
            if (continuous || zoom > 1 || !start || !end) return;
            const dx = end.clientX - start.x,
              dy = end.clientY - start.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
              onPage(Math.max(1, Math.min(pdf.numPages, page + (dx < 0 ? 1 : -1))));
          }}
        >
          {(continuous ? Array.from({ length: pdf.numPages }, (_, i) => i + 1) : [page]).map(
            (number) => (
              <CanvasPage
                key={number}
                pdf={pdf}
                number={number}
                title={title}
                zoom={zoom}
                aspect={pageRatios[number - 1] || 1 / 1.414}
              />
            ),
          )}
        </div>
      )}
      <footer className="native-reader-pagination">
        <button
          className="native-icon-button"
          disabled={!pdf || page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </button>
        <label>
          <span className="sr-only">PDF page</span>
          <input
            aria-label="PDF page"
            type="number"
            min={1}
            max={pdf?.numPages || 1}
            value={page}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isInteger(value) && value > 0 && pdf && value <= pdf.numPages)
                onPage(value);
            }}
          />
          <span>/ {pdf?.numPages || "—"}</span>
        </label>
        <button
          className="native-icon-button"
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => onPage(Math.min(pdf?.numPages || 1, page + 1))}
          aria-label="Next page"
        >
          <ChevronRight />
        </button>
      </footer>
    </div>
  );
}
function BookLoading() {
  return <div className="native-reader-placeholder" />;
}
function CanvasPage({
  pdf,
  number,
  title,
  zoom,
  aspect,
}: {
  pdf: Pdf;
  number: number;
  title: string;
  zoom: number;
  aspect: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(800);
  const [ratio, setRatio] = useState(aspect);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible(true);
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    const resize = new ResizeObserver(() => setWidth(el.clientWidth));
    resize.observe(el);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!visible || !canvas.current) return;
    let cancelled = false;
    let task: { cancel: () => void } | undefined;
    setError("");
    (async () => {
      try {
        const page = await pdf.getPage(number);
        if (cancelled || !canvas.current) return;
        const base = page.getViewport({ scale: 1 });
        setRatio(base.width / base.height);
        const scale =
          Math.min(1800, width * Math.min(window.devicePixelRatio || 1, 2)) / base.width;
        const viewport = page.getViewport({ scale });
        const el = canvas.current;
        el.width = Math.ceil(viewport.width);
        el.height = Math.ceil(viewport.height);
        const context = el.getContext("2d");
        if (!context) throw Error("Your browser could not create the reader canvas.");
        const render = page.render({ canvas: el, canvasContext: context, viewport });
        task = render;
        await render.promise;
      } catch (e) {
        if (!cancelled) setError("Page could not be rendered. Reopen this material to retry.");
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, number, visible, width]);
  return (
    <div
      ref={holder}
      data-pdf-page={number}
      className="native-pdf-page"
      style={{
        aspectRatio: ratio,
        width: `${zoom * 100}%`,
        maxWidth: `${zoom * 100}%`,
        alignSelf: zoom > 1 ? "flex-start" : undefined,
      }}
    >
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <canvas ref={canvas} aria-label={`${title}, page ${number}`} role="img" />
      )}
    </div>
  );
}
