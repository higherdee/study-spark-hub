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
    overview: "Vectors, kinematics, Newton's laws of motion, work, energy and power, rotational dynamics, gravitation, elasticity, and fluid mechanics.",
    topics: ["Vector Algebra & Motion in 1D/2D", "Newtonian Mechanics & Impulse", "Conservation of Momentum & Energy", "Rigid Body Rotation & Moments of Inertia", "Surface Tension, Viscosity & Bernoulli's Principle"],
    recommendedBooks: ["University Physics with Modern Physics — Young & Freedman", "Fundamentals of Physics — Halliday, Resnick & Walker"],
  },
  {
    code: "CHM 101",
    title: "General Chemistry I (Physical & Inorganic)",
    faculty: "Science & Engineering",
    level: "100L",
    overview: "Atomic structure, periodic table trends, chemical stoichiometry, thermodynamics, chemical kinetics, chemical equilibrium, and electrochemistry.",
    topics: ["Bohr Model & Quantum Numbers", "Chemical Bonding & Molecular Shapes", "Gas Laws & Kinetic Molecular Theory", "First Law of Thermodynamics", "Acids, Bases and Buffer Systems"],
    recommendedBooks: ["General Chemistry: Principles and Modern Applications — Petrucci", "Inorganic Chemistry — J.D. Lee"],
  },
  {
    code: "BIO 101",
    title: "General Biology I (Cell Biology & Genetics)",
    faculty: "Basic Medical & Life Sciences",
    level: "100L",
    overview: "Cell ultra-structure, organelle biochemistry, mitosis and meiosis, Mendelian inheritance, DNA replication, and ecological principles.",
    topics: ["Prokaryotic vs Eukaryotic Cells", "Cellular Respiration & Photosynthesis", "Mendelian Genetics & Punnett Squares", "DNA Structure & Protein Synthesis", "Principles of Ecology & Ecosystems"],
    recommendedBooks: ["Campbell Biology — Urry, Cain, Wasserman", "Biological Science — Taylor, Green & Stout"],
  },
  {
    code: "CSC 201",
    title: "Computer Programming I (Structured & OOP Paradigms)",
    faculty: "Computing & Informatics",
    level: "200L",
    overview: "Structured programming principles, modular functions, control statements, array manipulation, pointers, and object-oriented concepts.",
    topics: ["Algorithm Formulation & Flowcharts", "Primitive Types & Control Structures", "Functions, Scope & Recursion", "Classes, Encapsulation & Polymorphism", "File Input/Output Handling"],
    recommendedBooks: ["Introduction to Java Programming — Y. Daniel Liang", "The C Programming Language — Kernighan & Ritchie"],
  },
  {
    code: "ECO 101",
    title: "Principles of Economics I (Microeconomics)",
    faculty: "Social & Management Sciences",
    level: "100L",
    overview: "Scarcity, choice and opportunity cost, price mechanism, elasticity of demand and supply, consumer utility theory, and production costs.",
    topics: ["Basic Economic Problems", "Demand & Supply Determinants", "Elasticity & Market Equilibrium", "Indifference Curve Analysis", "Market Structures (Monopoly & Perfect Competition)"],
    recommendedBooks: ["Economics — Lipsey & Chrystal", "Microeconomic Theory — Henderson & Quandt"],
  },
  {
    code: "LAW 101",
    title: "Legal Method I",
    faculty: "Law",
    level: "100L",
    overview: "The nature and functions of law, classifications of legal rules, theories of justice, judicial precedent, and interpretation of statutes in Nigeria.",
    topics: ["Definition & Theories of Law", "Sources of Nigerian Law", "Doctrines of Stare Decisis & Precedent", "Statutory Interpretation Rules", "The Nigerian Court System Hierarchy"],
    recommendedBooks: ["Introduction to Nigerian Legal Method — John O. Asein", "Learning the Law — Glanville Williams"],
  },
];

const FACULTIES = ["All Faculties", "General Studies", "Science & Engineering", "Computing & Informatics", "Basic Medical & Life Sciences", "Social & Management Sciences", "Law"];

function CurriculumPage() {
  const [selectedFaculty, setSelectedFaculty] = useState("All Faculties");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCourses = CURRICULUM_DATA.filter((c) => {
    const matchesFaculty = selectedFaculty === "All Faculties" || c.faculty === selectedFaculty;
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFaculty && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-ink font-sans selection:bg-brand selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <SyllabossLogo />
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs font-semibold rounded-full hover:bg-surface-container-low text-ink lift press">
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-border text-xs font-semibold text-forest shadow-xs">
            <Layers className="size-3.5 text-brass" />
            <span className="eyebrow text-forest">NUC CCMAS National Benchmarks</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-ink">
            Nigerian University Academic Curriculum & Syllabus Index
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            Standard syllabus topics, theoretical concepts, and core reading references approved for undergraduate degrees across federal, state, and private Nigerian universities.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3.5 rounded-3xl border border-border shadow-[var(--elev-1)]">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 size-4 text-ink-soft" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course code or topic..."
              className="w-full pl-9.5 pr-3 py-2 rounded-2xl border border-border bg-background text-xs text-ink placeholder:text-muted-foreground focus:outline-none focus:border-forest"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            {FACULTIES.map((fac) => (
              <button
                key={fac}
                onClick={() => setSelectedFaculty(fac)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all lift press ${
                  selectedFaculty === fac
                    ? "bg-forest text-white shadow-xs"
                    : "bg-surface-container-low text-ink-soft hover:bg-surface-container-high border border-border"
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
              className="rounded-3xl border border-border bg-card p-6 shadow-[var(--elev-1)] flex flex-col justify-between hover:border-forest/60 transition-all lift"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-forest px-2.5 py-1 rounded-lg bg-surface-container-high border border-border">
                    {c.code}
                  </span>
                  <span className="eyebrow text-ink-soft">{c.level}</span>
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

                <div className="space-y-2 pt-3 border-t border-border">
                  <span className="eyebrow text-ink block">
                    Core Syllabus Units:
                  </span>
                  <ul className="space-y-1.5 text-xs text-ink-soft">
                    {c.topics.slice(0, 3).map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <CheckCircle2 className="size-3.5 text-brand shrink-0 mt-0.5" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-border">
                  <span className="eyebrow text-ink block mb-1">
                    Recommended Reading:
                  </span>
                  <p className="text-[11px] text-ink-soft italic font-serif">
                    {c.recommendedBooks[0]}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <Button asChild size="sm" className="w-full rounded-2xl bg-surface-container-high hover:bg-forest hover:text-white text-forest font-semibold text-xs gap-1.5 shadow-none transition-colors lift press">
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
      <footer className="border-t border-border bg-surface-container-lowest py-8 text-center text-xs text-ink-soft">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-ink">Terms of Service</Link>
          <Link to="/about" className="hover:text-ink">About Us</Link>
          <Link to="/contact" className="hover:text-ink">Contact Us</Link>
          <Link to="/curriculum" className="font-semibold text-ink">Academic Curriculum</Link>
        </div>
        <p className="text-muted-foreground">© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default CurriculumPage;
