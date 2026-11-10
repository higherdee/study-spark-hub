import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronLeft,
  FileText,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { getMaterials, type Material } from "@/integrations/turso/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/lib/profile";
import { useSharedStudyTimer, milestoneRemaining } from "@/components/study-timer-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SyllabossEmblem, SyllabossLogo } from "@/components/syllaboss-logo";
import { NativeWebShell } from "./shell";

function subscribeSaved(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("syllaboss-saved", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("syllaboss-saved", listener);
  };
}
export function useSavedMaterials() {
  const { user } = useAuth();
  const key = "syllaboss-reading-shelf:" + (user?.id || "guest");
  const raw = useSyncExternalStore(
    subscribeSaved,
    () => {
      try {
        return localStorage.getItem(key) || "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  const saved = useMemo<Material[]>(() => {
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }, [raw]);
  function toggle(material: Material) {
    try {
      const next = saved.some((m) => m.id === material.id)
        ? saved.filter((m) => m.id !== material.id)
        : [material, ...saved];
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("syllaboss-saved"));
    } catch {
      /* The reader remains available when storage is disabled. */
    }
  }
  return { saved, toggle };
}
export function NativeMaterialRow({
  material,
  saved,
  onSave,
  guest = false,
}: {
  material: Material;
  saved: boolean;
  onSave: () => void;
  guest?: boolean;
}) {
  return (
    <article className="native-material-row">
      <Link
        className="native-material-open"
        to={guest ? "/auth" : "/dashboard/preview"}
        search={
          guest
            ? {
                mode: "signin",
                redirect: "/dashboard/preview?id=" + encodeURIComponent(material.id),
              }
            : { id: material.id }
        }
      >
        <span className="native-file-icon">
          <FileText />
        </span>
        <span className="native-material-copy">
          <span className="native-material-code">
            {material.course_code || material.material_type.replaceAll("_", " ")}
          </span>
          <strong>{material.title}</strong>
          <span>
            {material.page_count > 0
              ? `${material.page_count} pages · Verified`
              : "Verified material"}
          </span>
        </span>
      </Link>
      <button
        className="native-icon-button"
        aria-label={saved ? "Remove saved material" : "Save material"}
        aria-pressed={saved}
        onClick={onSave}
      >
        {saved ? <BookmarkCheck /> : <Bookmark />}
      </button>
    </article>
  );
}
export function NativePageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="native-page-title">
      <p className="native-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
export function NativeToday({ guest = false }: { guest?: boolean }) {
  const { data: profile } = useProfile();
  const { saved, toggle } = useSavedMaterials();
  const [study, setStudy] = useState(false);
  const timer = useSharedStudyTimer();
  const {
    data: materials = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["native-library", ""],
    queryFn: () => getMaterials({ status: "verified", limit: 60 }),
    staleTime: 60000,
  });
  const shelf = saved.length ? saved : materials;
  const first = profile?.full_name?.split(" ")[0];
  return (
    <section className="native-page native-today">
      <header className="native-today-heading">
        <NativePageTitle
          eyebrow={new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date())}
          title={first && !guest ? `Hey, ${first}.` : "Your study space."}
        />
        <Link
          to={guest ? "/auth" : "/dashboard/space"}
          className="native-account-button"
          aria-label="Your account"
        >
          <UserRound />
        </Link>
      </header>
      <div className="native-today-layout">
        <div className="native-today-lead">
          <article className="native-focus-card">
            <div>
              <span className="native-eyebrow">Focus session</span>
              <ArrowUpRight />
            </div>
            <h2>
              Study with
              <br />
              direction.
            </h2>
            <p>30 minutes at a time. Keep your momentum.</p>
            <button onClick={() => setStudy(true)}>View study time</button>
          </article>
          <Link to={guest ? "/auth" : "/dashboard/assistant"} className="native-boss-prompt">
            <span className="native-prompt-icon">
              <Sparkles />
            </span>
            <span>
              <strong>Stuck on something?</strong>
              <span>Work it out with Boss AI</span>
            </span>
            <ArrowRight />
          </Link>
        </div>
        <section className="native-reading-section">
          <header className="native-section-heading">
            <h2>{saved.length ? "Your reading shelf" : "From the library"}</h2>
            <Link to={guest ? "/materials" : "/dashboard/library"}>See all</Link>
          </header>
          <div className="native-material-list">
            {isPending && !shelf.length ? (
              <NativeLoading />
            ) : isError && !shelf.length ? (
              <NativeError retry={() => void refetch()} />
            ) : (
              shelf
                .slice(0, 4)
                .map((m) => (
                  <NativeMaterialRow
                    key={m.id}
                    material={m}
                    saved={saved.some((s) => s.id === m.id)}
                    onSave={() => toggle(m)}
                    guest={guest}
                  />
                ))
            )}
            {!isPending && !shelf.length && !isError && (
              <p className="native-empty">New course materials will appear here when available.</p>
            )}
          </div>
          <p className="native-closing-note">Progress starts with showing up.</p>
        </section>
      </div>
      <Dialog open={study} onOpenChange={setStudy}>
        <DialogContent className="native-study-time">
          <DialogHeader>
            <DialogTitle>Time well spent.</DialogTitle>
            <DialogDescription>
              Study time counts automatically while you use Syllaboss.
            </DialogDescription>
          </DialogHeader>
          <div className="native-timer-face">
            {timer ? milestoneRemaining(timer.seconds).label : "30:00"}
            <span>to your next study reward</span>
          </div>
          <p>
            {guest
              ? "Sign in to save study time and earn SyllaPoints."
              : "Keep reading, practising or learning with your peers. Every 30 active minutes earns study points."}
          </p>
          {guest && (
            <Link className="native-primary-button" to="/auth">
              Sign in to save your progress
              <ArrowRight />
            </Link>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function NativeLibrary({
  guest = false,
  initialQuery = "",
}: {
  guest?: boolean;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [filter, setFilter] = useState("All materials");
  const { saved, toggle } = useSavedMaterials();
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);
  const result = useQuery({
    queryKey: ["native-library", search],
    queryFn: () => getMaterials({ q: search || undefined, status: "verified", limit: 250 }),
    staleTime: 60000,
  });
  const materials = (filter === "Saved" ? saved : result.data || []).filter(
    (m) =>
      (filter !== "Past questions" || m.material_type.includes("question")) &&
      (filter !== "Notes" || !m.material_type.includes("question")) &&
      (!search ||
        [m.title, m.course, m.course_code, m.institution]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  return (
    <section className="native-page native-library">
      <NativePageTitle
        eyebrow="Find your next read"
        title="The library."
        description="Good material. Less searching."
      />
      <Link to={guest ? "/auth" : "/dashboard/upload"} className="native-upload-invite">
        <Upload />
        <span>
          <strong>Share a material</strong>
          <span>Help other students and earn SyllaPoints</span>
        </span>
        <ArrowRight />
      </Link>
      <label className="native-search">
        <Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Course, title, or school"
          aria-label="Search materials"
          type="search"
        />
      </label>
      <div className="native-filter-row" role="group" aria-label="Material filters">
        {["All materials", "Past questions", "Notes", "Saved"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={f === filter}>
            {f}
          </button>
        ))}
      </div>
      <div className="native-library-count">
        <span className="native-eyebrow">{materials.length} materials</span>
        <button
          className="native-icon-button"
          aria-label="Refresh materials"
          onClick={() => void result.refetch()}
        >
          <RefreshCw className={result.isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      {result.isPending && filter !== "Saved" ? (
        <NativeLoading />
      ) : result.isError && filter !== "Saved" ? (
        <NativeError retry={() => void result.refetch()} />
      ) : (
        <div className="native-material-grid">
          {materials.map((m) => (
            <NativeMaterialRow
              key={m.id}
              material={m}
              saved={saved.some((s) => s.id === m.id)}
              onSave={() => toggle(m)}
              guest={guest}
            />
          ))}
        </div>
      )}
      {!result.isPending && !materials.length && (
        <p className="native-empty">
          {filter === "Saved"
            ? "Tap the bookmark on any material to build your reading shelf."
            : "No matching materials. Try a different course or title."}
        </p>
      )}
    </section>
  );
}
export function NativeLoading() {
  return (
    <div className="native-skeleton-list" role="status" aria-label="Loading materials">
      {[0, 1, 2].map((n) => (
        <div key={n} className="native-skeleton" />
      ))}
    </div>
  );
}
export function NativeError({ retry }: { retry: () => void }) {
  return (
    <div className="native-empty" role="alert">
      <p>We couldn’t load your materials. Check your connection and try again.</p>
      <button className="native-text-button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
const slides = [
  {
    eyebrow: "A study space for university life",
    title: (
      <>
        Your courses,
        <br />
        in good company.
      </>
    ),
    description: "Find verified course materials and keep your reading in one place.",
    icon: BookOpen,
  },
  {
    eyebrow: "Make the difficult feel possible",
    title: (
      <>
        A little help.
        <br />A lot of clarity.
      </>
    ),
    description: "Work through your questions with Boss AI. Practise, revise and understand.",
    icon: Sparkles,
  },
  {
    eyebrow: "Your learning, all together",
    title: (
      <>
        Find your people.
        <br />
        Keep going.
      </>
    ),
    description: "Connect with your coursemates, challenge each other and build your progress.",
    icon: UsersIcon,
  },
];
function UsersIcon() {
  return <UserRound />;
}
export function NativeWelcome() {
  const [step, setStep] = useState(0);
  const [explore, setExplore] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    try {
      if (localStorage.getItem("syllaboss-web-welcomed") === "true") setExplore(true);
    } catch {}
  }, []);
  const startExploring = () => {
    try {
      localStorage.setItem("syllaboss-web-welcomed", "true");
    } catch {}
    setExplore(true);
  };
  useEffect(() => {
    if (user) void navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);
  if (explore)
    return (
      <NativeWebShell guest>
        <NativeToday guest />
      </NativeWebShell>
    );
  const slide = slides[step] || slides[0]!;
  const Icon = slide.icon;
  return (
    <div className="native-welcome">
      <div className="native-welcome-content">
        <header>
          <Link to="/" aria-label="Syllaboss">
            <SyllabossLogo asDiv />
          </Link>
          <span>{step + 1} / 3</span>
        </header>
        <main>
          <div className="native-welcome-symbol">
            {step === 0 ? <SyllabossEmblem className="size-16" /> : <Icon />}
          </div>
          <div key={step} className="native-welcome-story">
            <p className="native-eyebrow">{slide.eyebrow}</p>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
          </div>
          <div className="native-page-dots" aria-label="Welcome pages">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Welcome page ${i + 1}`}
                aria-current={i === step ? "step" : undefined}
              />
            ))}
          </div>
        </main>
        <footer>
          {step < 2 ? (
            <button className="native-primary-button" onClick={() => setStep(step + 1)}>
              Continue
              <ArrowRight />
            </button>
          ) : (
            <Link className="native-primary-button" to="/auth" search={{ mode: "signup" }}>
              Make it yours
              <ArrowRight />
            </Link>
          )}
          <Link className="native-text-button" to="/auth" search={{ mode: "signin" }}>
            Already have an account? Sign in
          </Link>
          <button className="native-text-button" onClick={startExploring}>
            Explore the library first
          </button>
          <div className="native-legal-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <a href="/downloads/syllaboss-native.apk?v=2.2.36">Get the Android app</a>
          </div>
        </footer>
      </div>
      <div className="native-welcome-desktop" aria-hidden="true">
        <SyllabossEmblem className="size-28" />
        <p>
          Your learning.
          <br />
          All together.
        </p>
      </div>
    </div>
  );
}
