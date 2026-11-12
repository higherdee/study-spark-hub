import type { RefObject } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  FileText,
  Layers,
  ListChecks,
  Mic,
  Plus,
  Upload,
} from "lucide-react";
import { SyllabossEmblem } from "@/components/syllaboss-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function BossWelcome({ send }: { send: (prompt: string) => void }) {
  return (
    <section className="app-boss-welcome">
      <SyllabossEmblem className="app-boss-mark" />
      <h1>
        What are we
        <br />
        studying today?
      </h1>
      <p>
        Bring a question, a difficult concept, or a topic to revise. We’ll work through it together,
        one clear step at a time.
      </p>
      <div className="app-boss-starters">
        {[
          ["Understand a concept", "Help me understand a topic. Ask which concept I am studying."],
          [
            "Practise for an exam",
            "Help me prepare for an exam. Ask for my course and topic, then quiz me one question at a time.",
          ],
          [
            "Plan my revision",
            "Help me create a realistic revision plan. Ask about my courses, deadlines and available study time.",
          ],
        ].map(([label, prompt]) => (
          <button type="button" key={label} onClick={() => send(prompt!)}>
            {label}
            <ArrowUpRight className="size-5" />
          </button>
        ))}
      </div>
    </section>
  );
}
export function BossComposer({
  value,
  change,
  send,
  busy,
  recording,
  record,
  library,
  upload,
  mode,
  inputRef,
  mobile,
  sourceTitle,
}: {
  value: string;
  change: (value: string) => void;
  send: () => void;
  busy: boolean;
  recording: boolean;
  record: () => void;
  library: () => void;
  upload: () => void;
  mode: (mode: "flashcards" | "mcq" | "theory" | "assignment") => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  mobile: boolean;
  sourceTitle?: string;
}) {
  return (
    <div className="app-boss-compose">
      <div className="app-study-actions" aria-label="Study tools">
        <button type="button" disabled={busy} onClick={() => mode("flashcards")}>
          <Layers />
          Flashcards
        </button>
        <button type="button" disabled={busy} onClick={() => mode("mcq")}>
          <ListChecks />
          MCQ
        </button>
        <button type="button" disabled={busy} onClick={() => mode("theory")}>
          <FileText />
          Theory
        </button>
      </div>
      <div className="app-boss-input">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => {
            change(e.target.value);
            e.currentTarget.style.height = "auto";
            e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            if (!mobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (!busy && value.trim()) send();
            }
          }}
          aria-label="Message Boss AI"
          placeholder={
            sourceTitle ? `Ask about ${sourceTitle}…` : "Ask anything about your course…"
          }
          rows={1}
        />
        <div className="app-boss-input-actions">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="native-icon-button" aria-label="Add a study source">
                <Plus />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={library}>
                <BookOpen />
                Choose from library
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={upload}>
                <Upload />
                Upload a document or image
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => mode("assignment")}>
                <FileText />
                Work through an assignment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="app-composer-hint">
            {sourceTitle ? "Working with your source" : "Your study partner"}
          </span>
          <button
            type="button"
            className="native-icon-button"
            aria-label={recording ? "Stop voice note" : "Record voice note"}
            aria-pressed={recording}
            onClick={record}
          >
            <Mic />
          </button>
          <button
            type="button"
            className="app-send-button"
            disabled={busy || !value.trim()}
            onClick={send}
            aria-label="Send message"
          >
            <ArrowUp />
          </button>
        </div>
      </div>
    </div>
  );
}
