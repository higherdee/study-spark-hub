import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FilePlus2, FileText, Loader2, Trash2 } from "lucide-react";
import { useMembership } from "@/hooks/use-membership";
import { NativePageTitle } from "@/components/native-web/screens";
export function PdfWorkshop() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [promotion, setPromotion] = useState(0);
  const [waitingForPromotion, setWaitingForPromotion] = useState(false);
  const pending = useRef<Uint8Array | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const membership = useMembership();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  function save(bytes: Uint8Array) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
    link.href = url;
    link.download = "syllaboss-study-pack.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setNote("Your PDF has been downloaded.");
    setBusy(false);
    pending.current = null;
  }
  useEffect(() => {
    if (!waitingForPromotion || promotion === 0) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && document.hasFocus())
        setPromotion((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [waitingForPromotion, promotion === 0]);
  useEffect(() => {
    if (waitingForPromotion && promotion === 0 && pending.current) {
      setWaitingForPromotion(false);
      save(pending.current);
    }
  }, [waitingForPromotion, promotion]);
  async function build() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = await membership.refetch();
      if (!result.data) throw Error("We couldn’t verify your membership. Please try again.");
      const paid = result.data.paid;
      const { combineStudyDocuments } = await import("@/lib/pdf-workshop");
      const bytes = await combineStudyDocuments(files, paid ? null : 15);
      if (!alive.current) return;
      if (paid) save(bytes);
      else {
        pending.current = bytes;
        setPromotion(30);
        setWaitingForPromotion(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "These files could not be converted.");
      setBusy(false);
    }
  }
  return (
    <section className="native-pdf-workshop">
      <NativePageTitle
        eyebrow="Your study toolkit"
        title="Make one study PDF."
        description="Combine photos, screenshots and existing PDF pages in the order you want."
      />
      <input
        ref={input}
        hidden
        type="file"
        multiple
        accept="application/pdf,image/*"
        onChange={(e) => {
          setFiles((current) => [...current, ...Array.from(e.target.files || [])]);
          e.target.value = "";
          setError("");
          setNote("");
        }}
      />
      <button className="native-pdf-add" disabled={busy} onClick={() => input.current?.click()}>
        <FilePlus2 />
        <strong>Add PDFs or images</strong>
        <span>Choose your files, put them in order, make them yours.</span>
      </button>
      <ol className="native-pdf-source-list">
        {files.map((file, index) => (
          <li key={`${file.name}-${index}`}>
            <FileText />
            <span>
              <strong>{file.name}</strong>
              <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
            </span>
            <button
              className="native-icon-button"
              aria-label={`Move ${file.name} up`}
              disabled={busy || index === 0}
              onClick={() =>
                setFiles((current) => {
                  const next = [...current];
                  [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                  return next;
                })
              }
            >
              <ArrowUp />
            </button>
            <button
              className="native-icon-button"
              aria-label={`Move ${file.name} down`}
              disabled={busy || index === files.length - 1}
              onClick={() =>
                setFiles((current) => {
                  const next = [...current];
                  [next[index + 1], next[index]] = [next[index]!, next[index + 1]!];
                  return next;
                })
              }
            >
              <ArrowDown />
            </button>
            <button
              className="native-icon-button"
              aria-label={`Remove ${file.name}`}
              disabled={busy}
              onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
            >
              <Trash2 />
            </button>
          </li>
        ))}
      </ol>
      {membership.data?.paid ? (
        <p className="native-pdf-plan">SyllaPlus workspace · unlimited pages, direct export</p>
      ) : membership.data && !promotion ? (
        <p className="native-pdf-plan">
          Up to 15 pages per PDF. Export unlocks after a 30-second Syllaboss promotion.
        </p>
      ) : null}
      {promotion > 0 && (
        <section className="native-pdf-promotion" role="status">
          <span className="native-eyebrow">Syllaboss promotion</span>
          <h2>
            Make more room
            <br />
            for learning.
          </h2>
          <p>SyllaPlus brings more room for your materials, AI study tools and ad-free exports.</p>
          <strong>Your PDF unlocks in {promotion}s</strong>
        </section>
      )}
      {error && (
        <p role="alert" className="native-form-error">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="native-pdf-plan">
          {note}
        </p>
      )}
      <button
        className="native-primary-button w-full justify-center"
        disabled={!files.length || busy || membership.isPending}
        onClick={() => void build()}
      >
        {busy && <Loader2 className="size-5 animate-spin" />}
        {busy ? "Preparing your PDF…" : "Build and save PDF"}
      </button>
      <p className="native-pdf-privacy">Your files are converted on your device.</p>
    </section>
  );
}
