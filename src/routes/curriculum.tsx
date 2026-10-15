import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, GraduationCap, CheckCircle2, Search, ArrowRight, Layers, Award } from "lucide-react";
import { useState } from "react";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/curriculum")({
  head: () => ({
    meta: [
      { title: "Nigerian University Academic Curriculum & Syllabus Guide — Syllaboss" },
      {
        name: "description",
        content: "Explore the official NUC CCMAS undergraduate syllabus outlines, course specifications, recommended textbooks, and faculty academic standards across Nigerian universities.",
      },
      { property: "og:title", content: "Academic Curriculum & Syllabus Directory — Syllaboss" },
      { property: "og:description", content: "Comprehensive syllabus guides and course specifications for Nigerian university degrees." },
    ],
  }),
  component: CurriculumPage,
});

type CourseDetail = {
  code: string;
  title: string;
  faculty: string;
  level: string;
  overview: string;
  topics: string[];
  recommendedBooks: string[];
};

const CURRICULUM_DATA: CourseDetail[] = [
  {
    code: "GST 111",
    title: "Communication in English",
    faculty: "General Studies",
    level: "100L",
    overview: "Official foundational NUC CCMAS syllabus on listening comprehension, phonetics, grammar mechanics, academic essay structuring, and citation methods.",
    topics: ["Oral English & Phonetics", "Listening Comprehension Techniques", "Sentence Structure & Concord", "Reading & Summarization", "Paragraph & Essay Development"],
    recommendedBooks: ["Effective Communication in English for Universities — Ogbulogo", "English for Academic Purposes — Babatunde"],
  },
  {
    code: "GST 112",
    title: "Nigerian Peoples and Culture",
    faculty: "General Studies",
    level: "100L",
    overview: "Comprehensive study of pre-colonial societies, ethnic zones, nationalism, indigenous scientific techniques, and constitutional governance in Nigeria.",
    topics: ["Pre-Colonial Nigerian History", "Colonial Administration & Nationalism", "Socio-Cultural Zones", "Indigenous Technologies", "Citizenship & 1999 Constitution"],
    recommendedBooks: ["Groundwork of Nigerian History — Obaro Ikime", "Nigerian Peoples and Culture — Falola & Heaton"],
  },
  {
    code: "GST 113",
    title: "Philosophy, Logic and Human Existence",
    faculty: "General Studies",
    level: "100L",
    overview: "Epistemological fundamentals, deductive vs inductive logic, symbolic truth tables, informal fallacies, and existential moral ethics in modern society.",
    topics: ["Branches of Philosophy", "Symbolic Logic & Truth Tables", "Informal Fallacies in Argumentation", "Epistemology & Rationalism", "Ethics & Human Rights"],
    recommendedBooks: ["Introduction to Logic — Copi & Cohen", "African Philosophy: An Introduction — Wiredu"],
  },
  {
    code: "MTH 101",
    title: "Elementary Mathematics I (Algebra & Trigonometry)",
    faculty: "Science & Engineering",
    level: "100L",
    overview: "Set theory, real and complex number systems, quadratic equations, binomial theorem, trigonometric identities, and algebraic progressions.",
    topics: ["Sets, Relations and Functions", "Mathematical Induction", "Binomial Theorem for Rational Indices", "Complex Numbers & De Moivre's Theorem", "Trigonometric Equations & Inverses"],
    recommendedBooks: ["Pure Mathematics for Advanced Level — B.D. Bunday", "Advanced Engineering Mathematics — K.A. Stroud"],
  },
  {
    code: "PHY 101",
    title: "General Physics I (Mechanics & Properties of Matter)",
    faculty: "Science & Engineering",
    level: "100L",
    overview: "Vectors and dimensional analysis, Newtonian mechanics, work, energy and power, circular motion, gravitation, fluid statics, and elasticity.",
    topics: ["Dimensional Analysis & Vectors", "Newton's Laws of Motion", "Conservation of Linear & Angular Momentum", "Gravitational Field Theory", "Surface Tension & Viscosity (Bernoulli's Principle)"],
    recommendedBooks: ["Fundamentals of Physics — Halliday, Resnick & Walker", "University Physics — Young & Freedman"],
  },
  {
    code: "CSC 201",
    title: "Computer Programming I (Structured & OOP Paradigms)",
    faculty: "Computing & IT",
    level: "200L",
    overview: "Structured program design, memory management, algorithmic complexity, object-oriented principles (encapsulation, inheritance, polymorphism), and debugging.",
    topics: ["Algorithm Analysis & Flowcharts", "Data Types & Control Flow", "Pointers and Dynamic Memory Allocation", "Object-Oriented Programming Constructs", "Exception Handling & File I/O"],
    recommendedBooks: ["Introduction to Algorithms — Cormen, Leiserson, Rivest & Stein", "The C++ Programming Language — Bjarne Stroustrup"],
  },
  {
    code: "GET 206",
    title: "Engineer in Society & Professional Ethics",
    faculty: "Engineering & Technology",
    level: "200L",
    overview: "Historical evolution of engineering, Council for the Regulation of Engineering in Nigeria (COREN) laws, occupational safety, intellectual property, and environmental sustainability.",
    topics: ["History of Engineering Innovations", "COREN Legal Framework & Ethics", "Occupational Health & Industrial Safety", "Environmental Impact Assessment (EIA)", "Contracts & Engineering Management"],
    recommendedBooks: ["Ethics in Engineering — Mike Martin", "Engineering Law and Practice in Nigeria — COREN"],
  },
  {
    code: "ACC 201",
    title: "Introduction to Financial Accounting I",
    faculty: "Management Sciences",
    level: "200L",
    overview: "Nature of accounting theory, double-entry bookkeeping, trial balance preparation, adjustments, final accounts for sole proprietorships, and IFRS compliance.",
    topics: ["Double Entry Bookkeeping System", "Trial Balance Extraction & Correction of Errors", "Bank Reconciliation Statements", "Depreciation Accounting & Bad Debts", "Sole Proprietor Financial Statements"],
    recommendedBooks: ["Business Accounting — Frank Wood", "Financial Accounting in West Africa — Adams"],
  },
  {
    code: "ECO 201",
    title: "Principles of Microeconomics I",
    faculty: "Social Sciences",
    level: "200L",
    overview: "Consumer behavior theory, indifference curves, price elasticity of demand and supply, production functions, law of diminishing returns, and market structures.",
    topics: ["Theory of Consumer Behavior & Utility", "Elasticity of Demand & Supply", "Short-Run and Long-Run Cost Curves", "Perfect Competition vs Monopoly", "Factor Market Pricing"],
    recommendedBooks: ["Microeconomic Analysis — Hal Varian", "Economics: An Analytical Approach — Lipsey & Chrystal"],
  },
];

const FACULTIES = [
  "All Disciplines",
  "General Studies",
  "Science & Engineering",
  "Computing & IT",
  "Engineering & Technology",
  "Management Sciences",
  "Social Sciences",
];

function CurriculumPage() {
  const [selectedFaculty, setSelectedFaculty] = useState("All Disciplines");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCourses = CURRICULUM_DATA.filter((course) => {
    const matchesFaculty = selectedFaculty === "All Disciplines" || course.faculty === selectedFaculty;
    const matchesSearch =
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.overview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFaculty && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-surface-container-low text-ink font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-surface-container-high bg-surface-container-low/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <SyllabossLogo />
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs font-semibold rounded-full">
            <Link to="/">
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Header */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 sm:pt-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs font-semibold text-brand-deep">
            <Layers className="size-3.5" />
            <span>NUC CCMAS National Benchmarks</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-ink">
            Nigerian University Academic Curriculum & Syllabus Index
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            Standard syllabus topics, theoretical concepts, and core reading references approved for undergraduate degrees across federal, state, and private Nigerian universities.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-border shadow-xs">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-ink-soft" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course code or topic..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-surface-container-high text-xs focus:outline-none focus:border-brand-deep"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {FACULTIES.map((fac) => (
              <button
                key={fac}
                onClick={() => setSelectedFaculty(fac)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedFaculty === fac
                    ? "bg-forest text-white shadow-xs"
                    : "bg-muted text-ink-soft hover:bg-[#dcefe4]"
                }`}
              >
                {fac}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Syllabus Grid */}
      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((c) => (
            <article
              key={c.code}
              className="rounded-3xl border border-border bg-white p-6 shadow-xs flex flex-col justify-between hover:border-brand-deep transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-brand-deep px-2.5 py-0.5 rounded-md bg-muted border border-border">
                    {c.code}
                  </span>
                  <span className="text-[11px] font-semibold text-ink-soft">{c.level}</span>
                </div>

                <div>
                  <h2 className="font-display text-lg font-bold text-ink leading-snug">
                    {c.title}
                  </h2>
                  <p className="text-[11px] text-ink-soft mt-0.5 font-medium">{c.faculty}</p>
                </div>

                <p className="text-xs text-ink-soft leading-relaxed">
                  {c.overview}
                </p>

                <div className="space-y-2 pt-2 border-t border-[#f0f4f1]">
                  <span className="text-[11px] font-bold text-ink block uppercase tracking-wider">
                    Core Syllabus Units:
                  </span>
                  <ul className="space-y-1 text-xs text-ink-soft">
                    {c.topics.slice(0, 3).map((t) => (
                      <li key={t} className="flex items-start gap-1.5">
                        <CheckCircle2 className="size-3.5 text-brand-deep shrink-0 mt-0.5" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-[#f0f4f1]">
                  <span className="text-[11px] font-bold text-ink block uppercase tracking-wider mb-1">
                    Recommended Reading:
                  </span>
                  <p className="text-[11px] text-ink-soft italic">
                    {c.recommendedBooks[0]}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-container-high">
                <Button asChild size="sm" className="w-full rounded-2xl bg-muted hover:bg-[#dcefe4] text-forest font-bold text-xs gap-1.5 shadow-none">
                  <Link to="/materials" search={{ q: c.code }}>
                    <span>Find {c.code} Lecture Notes</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-container-high bg-white py-8 text-center text-xs text-ink-soft">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-ink">Terms of Service</Link>
          <Link to="/about" className="hover:text-ink">About Us</Link>
          <Link to="/contact" className="hover:text-ink">Contact Us</Link>
          <Link to="/curriculum" className="font-semibold text-ink">Academic Curriculum</Link>
        </div>
        <p>© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}
