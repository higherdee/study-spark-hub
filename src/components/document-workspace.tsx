import {NativePdfReader} from "@/components/native-web/pdf-reader";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowUp, BookOpen, Bot, Download, Grip, Loader2, Maximize2, MessageSquare, Minus, MoveDiagonal2, Share2, Star, X } from "lucide-react";
import { toast } from "sonner";
import type { Material } from "@/integrations/turso/client";
import { useMembership } from "@/hooks/use-membership";
import { getMaterialAccessUrl } from "@/lib/membership/client";
import { askDocumentQuestionServerFn, getDocumentPassageServerFn } from "@/lib/document.functions";
import { AiMessageRenderer } from "./ai-message-renderer";
import { SyllabossEmblem } from "./syllaboss-logo";
import { MaterialReviews } from "./material-reviews";
import { ForwardMaterialModal } from "./forward-material-modal";
import { Button } from "./ui/button";

type WindowBounds = { x: number; y: number; width: number; height: number };
export function DocumentWorkspace({ material, initialAssistant = false, back }: { material: Material; initialAssistant?: boolean; back: () => void }) {
  const membership = useMembership();
  const surface = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [fileBusy, setFileBusy] = useState(true);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [reviews, setReviews] = useState(false);
  const [forward, setForward] = useState(false);
  const [assistant, setAssistant] = useState(initialAssistant);
  const [minimized, setMinimized] = useState(false);
  const [bounds, setBounds] = useState<WindowBounds>({ x: 12, y: 12, width: 380, height: 520 });
  const drag = useRef<{ type: "move" | "resize"; x: number; y: number; origin: WindowBounds } | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [threadId, setThreadId] = useState<string>();
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState("");
  const [pageNumber,setPageNumber]=useState("");
  const [lineNumber,setLineNumber]=useState("");
  const [passage,setPassage]=useState("");
  const [sourceFocus,setSourceFocus]=useState("");
  const [passageBusy,setPassageBusy]=useState(false);
  const [readerPage,setReaderPage]=useState(1);
  const tail = useRef<HTMLDivElement>(null);
  async function openFile() {
    setFileBusy(true); setFileError("");
    try { setUrl(await getMaterialAccessUrl(material.id, "preview")); }
    catch (failure) { setFileError(failure instanceof Error ? failure.message : "Please open the material again."); }
    finally { setFileBusy(false); }
  }
  useEffect(() => { void openFile(); }, [material.id]);
  function fit(value: WindowBounds) {
    const width = surface.current?.clientWidth || 400;
    const height = surface.current?.clientHeight || 600;
    const nextWidth = Math.max(Math.min(280, width - 16), Math.min(value.width, width - 16));
    const nextHeight = Math.max(Math.min(240, height - 16), Math.min(value.height, height - 16));
    return { width: nextWidth, height: nextHeight, x: Math.max(8, Math.min(value.x, width - nextWidth - 8)), y: Math.max(8, Math.min(value.y, height - nextHeight - 8)) };
  }
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const update = () => setBounds((current) => fit(current));
    const observer = new ResizeObserver(update); observer.observe(element); update();
    return () => observer.disconnect();
  }, []);
  useEffect(() => { tail.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length, thinking]);
  function pointerStart(event: PointerEvent<HTMLElement>, type: "move" | "resize") {
    if (type === "move" && (event.target as HTMLElement).closest("button")) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { type, x: event.clientX, y: event.clientY, origin: bounds };
  }
  function pointerMove(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active) return;
    const dx = event.clientX - active.x; const dy = event.clientY - active.y;
    setBounds(fit(active.type === "move" ? { ...active.origin, x: active.origin.x + dx, y: active.origin.y + dy } : { ...active.origin, width: active.origin.width + dx, height: active.origin.height + dy }));
  }
  async function send() {
    const question = input.trim();
    if (!question || thinking) return;
    setInput(""); setChatError(""); setThinking(true); setMessages((current) => [...current, { role: "user", text: question }]);
    try {
      const result = await askDocumentQuestionServerFn({ data: { materialId: material.id, message: sourceFocus ? `${sourceFocus}\n${question}` : question, ...(threadId ? { threadId } : {}) } });
      setThreadId(result.threadId); setMessages((current) => [...current, { role: "assistant", text: result.answer }]);
    } catch (error) { setChatError(error instanceof Error ? error.message : "This passage could not be read. Try a clearer scan."); setInput(question); }
    finally { setThinking(false); }
  }
  async function focusPassage() {
    if(!Number.isInteger(Number(pageNumber))||Number(pageNumber)<1){setChatError("Choose a valid PDF page.");return;}
    setPassageBusy(true);setChatError("");
    try{const result=await getDocumentPassageServerFn({data:{materialId:material.id,page:Number(pageNumber),...(lineNumber?{line:Number(lineNumber)}:{})}});setPassage(result.text);setReaderPage(result.page);setSourceFocus(`Focus on PDF page ${result.page}${result.line?`, extracted line ${result.line}`:""}.`);}catch(error){setChatError(error instanceof Error?error.message:"This passage could not be loaded.");}finally{setPassageBusy(false);}
  }
  async function download() {
    setDownloadBusy(true);
    try {
      const downloadUrl = await getMaterialAccessUrl(material.id, "download");
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("The file could not be downloaded.");
      const blob = URL.createObjectURL(await response.blob()); const link = document.createElement("a");
      link.href = blob; link.download = material.file_name || `${material.title}.pdf`; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(blob), 30_000);
      toast.success("Your material has been downloaded.");
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "Download could not complete."); }
    finally { setDownloadBusy(false); }
  }
  const isImage = material.mime_type?.startsWith("image/");
  return <section ref={frame} className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2"><Button variant="ghost" size="icon" className="size-11 shrink-0 rounded-xl" onClick={back} aria-label="Back to library"><ArrowLeft className="size-5"/></Button><div className="min-w-0"><h1 className="truncate text-sm font-semibold">{material.title}</h1><p className="truncate text-xs text-muted-foreground">{material.course_code || material.course} · {material.page_count || "—"} pages</p></div></div>
      <nav aria-label="Material actions" className="flex items-center gap-1"><Button variant="ghost" size="icon" className="size-11 rounded-xl" onClick={() => setReviews(true)} aria-label={`Reviews: ${material.rating_count || 0}`}><Star className="size-4"/></Button><span className="mr-2 hidden text-xs text-muted-foreground sm:inline">{material.rating_count ? `${Number(material.rating_avg || 0).toFixed(1)} · ${material.rating_count} reviews` : "Not rated yet"}</span><Button variant="ghost" size="icon" className="size-11 rounded-xl" onClick={() => setForward(true)} aria-label="Share material with a peer or group"><Share2 className="size-4"/></Button><Button variant="ghost" size="icon" className="size-11 rounded-xl" onClick={() => void download()} disabled={downloadBusy} aria-label="Download material">{downloadBusy ? <Loader2 className="size-4 animate-spin"/> : <Download className="size-4"/>}</Button><Button variant="ghost" size="icon" className="hidden size-11 rounded-xl sm:inline-flex" onClick={() => { void frame.current?.requestFullscreen?.().catch(() => toast.error("Full screen is unavailable in this browser.")); }} aria-label="Full screen reader"><Maximize2 className="size-4"/></Button><Button className="h-11 gap-2 rounded-xl px-3" onClick={() => { setAssistant(true); setMinimized(false); }}><Bot className="size-4"/><span className="hidden sm:inline">Read with Boss AI</span><span className="sm:hidden">Boss AI</span></Button></nav>
    </header>
    <div ref={surface} className="relative min-h-0 flex-1 overflow-hidden bg-secondary/30">
      {fileBusy ? <div className="grid h-full min-h-64 place-content-center gap-3 p-6 text-center"><BookOpen className="mx-auto size-9 text-brand"/><p className="font-serif text-2xl">Your material is next.</p><p className="text-sm text-muted-foreground">Preparing your reader…</p></div> : !url ? <div className="grid h-full min-h-64 place-content-center gap-4 p-6 text-center"><p className="text-sm text-muted-foreground">{fileError || "Open this material when you are ready."}</p><Button onClick={() => void openFile()} className="mx-auto rounded-xl">Open material</Button></div> : isImage ? <div className="h-full overflow-auto overscroll-contain p-4"><img src={url} alt={material.title} className="mx-auto max-w-full"/></div> : <NativePdfReader url={url} title={material.title} page={readerPage} onPage={setReaderPage}/>}
      {assistant && minimized && <button onClick={() => setMinimized(false)} className="absolute bottom-4 right-4 flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-lg"><SyllabossEmblem className="size-6"/>Boss AI{thinking && <Loader2 className="size-4 animate-spin"/>}<Maximize2 className="ml-2 size-4"/></button>}
      {assistant && !minimized && <aside aria-label="Movable Boss AI study window" className="absolute left-0 top-0 z-20 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_60px_rgb(21_62_50/.2)]" style={{ width: bounds.width, height: bounds.height, transform: `translate3d(${bounds.x}px,${bounds.y}px,0)` }}>
        <header tabIndex={0} aria-label="Move study window. Drag or use arrow keys." className="flex shrink-0 touch-none items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand" onPointerDown={(event) => pointerStart(event, "move")} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; const delta = ({ ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] } as Record<string, [number, number]>)[event.key]; if (delta) { event.preventDefault(); setBounds(fit({ ...bounds, x: bounds.x + delta[0]!, y: bounds.y + delta[1]! })); } }}><div className="flex min-w-0 items-center gap-2"><Grip className="size-4 text-muted-foreground"/><SyllabossEmblem className="size-6"/><div><h2 className="text-sm font-semibold">Boss AI</h2><p className="text-[11px] text-muted-foreground">Alongside your material</p></div></div><div className="flex"><button className="grid size-10 place-items-center rounded-xl hover:bg-muted" aria-label="Minimize Boss AI" onClick={() => setMinimized(true)}><Minus className="size-4"/></button><button className="grid size-10 place-items-center rounded-xl hover:bg-muted" aria-label="Close Boss AI window" onClick={() => setAssistant(false)}><X className="size-4"/></button></div></header>
        {!membership.data?.paid ? <div className="flex flex-1 flex-col justify-center gap-4 p-6"><MessageSquare className="size-8 text-brand"/><h3 className="font-serif text-2xl">Keep the page and the explanation together.</h3><p className="text-sm leading-6 text-muted-foreground">Inline material study is included with SyllaPlus. Your free account can still read this material and ask about a topic in Boss AI.</p><Button className="rounded-xl" onClick={() => window.dispatchEvent(new Event("syllaboss:upgrade"))}>See SyllaPlus plans</Button></div> : <>
          <details className="shrink-0 border-b border-border bg-secondary/30 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">Focus on a page or line {sourceFocus && <span className="ml-2 text-xs text-brand">Page {pageNumber}{lineNumber ? ` · line ${lineNumber}` : ""}</span>}</summary>
            <div className="mt-3 flex items-end gap-2"><label className="text-xs">PDF page<input aria-label="PDF page number" type="number" min="1" value={pageNumber} onChange={e=>setPageNumber(e.target.value)} className="mt-1 h-11 w-20 rounded-lg border bg-background px-2 text-base"/></label><label className="text-xs">Line (optional)<input aria-label="Extracted line number" type="number" min="1" value={lineNumber} onChange={e=>setLineNumber(e.target.value)} className="mt-1 h-11 w-20 rounded-lg border bg-background px-2 text-base"/></label><Button disabled={passageBusy} className="h-11 flex-1 rounded-lg" onClick={()=>void focusPassage()}>{passageBusy?"Reading…":"Use passage"}</Button></div>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">PDF page numbers start at 1. Lines follow extracted reading order and may differ from printed line numbering.</p>
            {passage&&<pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-3 font-mono text-xs leading-5">{passage}</pre>}
            {sourceFocus&&<button className="mt-2 min-h-10 text-xs text-brand underline" onClick={()=>{setSourceFocus("");setPassage("");}}>Return to whole document</button>}
          </details>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" aria-live="polite">{!messages.length && <div className="py-4"><p className="font-serif text-2xl">Let’s make it clearer.</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Ask about a passage, a worked calculation or a diagram. You can keep reading and move this window out of the way.</p><div className="mt-4 flex flex-wrap gap-2">{["Summarize the key ideas", "Explain a worked example", "Help me understand a diagram"].map((prompt) => <button key={prompt} onClick={() => setInput(prompt)} className="min-h-10 rounded-xl border border-border px-3 text-xs">{prompt}</button>)}</div></div>}{messages.map((message, index) => <article key={index} className={message.role === "user" ? "mb-5 ml-8 rounded-2xl bg-brand/8 px-4 py-3 text-sm" : "mb-6 text-sm"}>{message.role === "user" ? <p className="whitespace-pre-wrap leading-6">{message.text}</p> : <AiMessageRenderer content={message.text}/>}</article>)}{thinking && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Reading and working through your question…</p>}<div ref={tail}/></div>
          <div className="shrink-0 border-t border-border p-3">{chatError && <p role="alert" className="mb-2 text-xs leading-5 text-destructive">{chatError}</p>}<div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2"><textarea aria-label="Ask Boss AI about this material" value={input} onChange={(event) => setInput(event.target.value)} maxLength={6000} rows={2} placeholder="Ask about this material…" className="min-w-0 flex-1 resize-none bg-transparent p-1 text-base leading-6 outline-none" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { event.preventDefault(); void send(); } }}/><Button size="icon" className="size-11 shrink-0 rounded-xl" onClick={() => void send()} disabled={thinking || !input.trim()} aria-label="Send document question"><ArrowUp className="size-5"/></Button></div><p className="mt-2 pr-6 text-[10px] leading-4 text-muted-foreground">Boss AI can make mistakes. Check important steps against your material.</p></div>
        </>}
        <button aria-label="Resize study window. Use arrow keys or drag." className="absolute bottom-0 right-0 grid size-7 touch-none place-items-center text-muted-foreground" onPointerDown={(event) => pointerStart(event, "resize")} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={(event) => { const delta = ({ ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] } as Record<string, [number, number]>)[event.key]; if (delta) { event.preventDefault(); setBounds(fit({ ...bounds, width: bounds.width + delta[0]!, height: bounds.height + delta[1]! })); } }}><MoveDiagonal2 className="size-3.5"/></button>
      </aside>}
    </div>
    <MaterialReviews materialId={material.id} open={reviews} close={() => setReviews(false)}/>
    <ForwardMaterialModal open={forward} onOpenChange={setForward} materialId={material.id} materialTitle={material.title} materialCourse={material.course}/>
  </section>;
}
