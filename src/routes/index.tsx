import { PublicHeader } from "@/components/public-header";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  FileText,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useState } from "react";
import { SyllabossLogo } from "@/components/syllaboss-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syllaboss — Make room for your best semester." },
      {
        name: "description",
        content:
          "Your university life, a little more together. Find course materials, understand the hard stuff and learn with your people on Syllaboss.",
      },
    ],
  }),
  component: HomePage,
});

const questions = [
  [
    "What exactly is Syllaboss?",
    "Your university study workspace. Find course materials and past questions, organise your library, work through concepts with Boss AI, and connect with other students—all in one place.",
  ],
  [
    "Is it built for my university?",
    "Syllaboss is built for Nigerian tertiary students. Choose your institution, course and level to personalise your experience. Material availability depends on contributions to your course.",
  ],
  [
    "How do SyllaPoints work?",
    "You can earn points through eligible study activity and verified material contributions. Your wallet shows your balance, current reward rates and withdrawal requirements.",
  ],
  [
    "Can I use it on my phone?",
    "Absolutely. Use Syllaboss in your mobile browser or add it to your home screen for an app-like experience. Your account also works on your laptop.",
  ],
];

function StudyIllustration() {
  return (
    <div className="study-art" aria-label="Illustration of a personal study workspace" role="img">
      <div className="art-orbit" />
      <span className="art-star star-one">✳</span>
      <span className="art-star star-two">✦</span>
      <div className="art-label">
        <span className="size-2 rounded-full bg-brand" /> A little more clarity. A lot less wahala.
      </div>
      <div className="art-notebook">
        <div className="notebook-binding" />
        <span className="eyebrow">THE SEMESTER PLAN</span>
        <h3>
          Big dreams.
          <br />
          Small steps.
        </h3>
        <div className="notebook-check">
          <Check /> Find your materials
        </div>
        <div className="notebook-check">
          <Check /> Make it make sense
        </div>
        <div className="notebook-check">
          <Check /> Go at your own pace
        </div>
        <div className="notebook-bottom">
          YOU'VE GOT THIS. <span>↗</span>
        </div>
      </div>
      <div className="art-card">
        <div className="art-card-icon">
          <BookOpen size={19} />
        </div>
        <div>
          <strong>Everything, in your corner.</strong>
          <span>Your notes. Your people. Your progress.</span>
        </div>
      </div>
      <div className="art-sticky">
        <span>note to self</span>
        <p>
          Progress, not
          <br />
          perfection.
        </p>
        <span className="sticky-scribble">always.</span>
      </div>
      <div className="art-pencil" />
      <div className="art-badge">
        100%<span>your pace</span>
      </div>
    </div>
  );
}

export function HomePage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="landing-page">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content">
        <section className="landing-hero page-width">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span /> FOR THE WHOLE UNIVERSITY JOURNEY
            </div>
            <h1>
              Less overwhelmed.
              <br />
              More <span className="serif-word">in your element.</span>
            </h1>
            <p>
              The notes you need. The concepts that finally click. The people who get it. Meet your
              new favourite study space.
            </p>
            <div className="hero-actions">
              <Link to="/auth" search={{ mode: "signup" }} className="action-dark">
                Make this semester yours <ArrowUpRight size={18} />
              </Link>
              <Link to="/materials" className="action-text">
                Explore the library <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-footnote">
              <span className="mini-avatars">
                <i>A</i>
                <i>T</i>
                <i>D</i>
              </span>
              <span>
                Built for student life.
                <br />
                <strong>Made for your kind of ambition.</strong>
              </span>
            </div>
          </div>
          <StudyIllustration />
        </section>
        <div className="campus-strip">
          <div className="page-width campus-strip-inner">
            <span>A LITTLE STRUCTURE. A LOT OF POSSIBILITY.</span>
            <p>
              <BookOpen size={17} /> Course-ready materials
            </p>
            <p>
              <Bot size={17} /> A patient study partner
            </p>
            <p>
              <Users size={17} /> Your campus community
            </p>
          </div>
        </div>
        <section id="your-workspace" className="page-width workspace-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">ONE SPACE. YOUR WHOLE STUDY LIFE.</p>
              <h2>
                A better place to
                <br />
                <em>get it together.</em>
              </h2>
            </div>
            <p>
              From “where do I even start?” to “I actually get this.” A little support for every
              part of the process.
            </p>
          </div>
          <div className="feature-grid">
            <Link to="/materials" className="feature-panel library-panel">
              <div className="feature-topline">
                <span>01 / THE LIBRARY</span>
                <ArrowUpRight size={21} />
              </div>
              <h3>
                Goodbye, endless
                <br />
                group-chat scrolling.
              </h3>
              <p>
                Lecture notes, past questions and course materials. Find what you need, without the
                treasure hunt.
              </p>
              <div className="library-visual">
                <div className="mock-search">
                  <Search size={15} /> What are we studying today?
                </div>
                {["Lecture notes", "Past questions", "Course summaries"].map((t, i) => (
                  <div className="mock-file" key={t}>
                    <span className={`file-icon file-${i}`}>
                      <FileText size={18} />
                    </span>
                    <div>
                      <strong>{t}</strong>
                      <span>Find your next lightbulb moment</span>
                    </div>
                    <ArrowUpRight size={15} />
                  </div>
                ))}
              </div>
            </Link>
            <Link to="/dashboard/assistant" className="feature-panel ai-panel">
              <div className="feature-topline">
                <span>02 / BOSS AI</span>
                <ArrowUpRight size={21} />
              </div>
              <h3>
                For the “explain it
                <br />
                one more time” moments.
              </h3>
              <p>
                No judgement. Just step-by-step explanations, practice questions and a fresh way to
                see the hard stuff.
              </p>
              <div className="ai-visual">
                <div className="mock-user-bubble">Okay, but why does that work?</div>
                <div className="mock-ai-bubble">
                  <span className="ai-symbol">✳</span>
                  <div>
                    <strong>Let's break it down.</strong>
                    <p>Start with what you already know. Then, we'll take it one step at a time.</p>
                    <div className="mock-ai-lines">
                      <i />
                      <i />
                    </div>
                  </div>
                </div>
                <span className="ai-footnote">A study partner. Not a shortcut.</span>
              </div>
            </Link>
          </div>
          <div className="community-panel">
            <div className="community-drawing">
              <span>you</span>
              <i>☺</i>
              <i>☺</i>
              <i>☺</i>
              <span>your people</span>
            </div>
            <div>
              <p className="section-kicker">BETTER, TOGETHER</p>
              <h3>University isn't a solo project.</h3>
              <p>
                Share what you know. Find your people. Turn your contributions into SyllaPoints, and
                build a little momentum together.
              </p>
            </div>
            <Link
              to="/dashboard/community"
              className="round-arrow"
              aria-label="Explore the community"
            >
              <ArrowUpRight />
            </Link>
          </div>
        </section>
        <section className="how-section">
          <div className="page-width">
            <div className="section-heading">
              <div>
                <p className="section-kicker">LESS SETUP. MORE SHOWING UP.</p>
                <h2>
                  Your next chapter.
                  <br />
                  <em>Three small steps.</em>
                </h2>
              </div>
              <Link to="/auth" search={{ mode: "signup" }} className="action-text">
                Let's get you started <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="steps-grid">
              {[
                {
                  title: "Make yourself at home.",
                  text: "Create your account. Tell us your school, course and level. We'll take it from there.",
                },
                {
                  title: "Find your starting point.",
                  text: "Browse your course materials, save your favourites, or bring a tricky question to Boss AI.",
                },
                {
                  title: "Build your own rhythm.",
                  text: "Focus a little. Share a little. Learn with others. Make progress that feels like you.",
                },
              ].map((s, i) => (
                <div className="step" key={s.title}>
                  <span className="step-number">
                    0{i + 1}
                    <Plus size={16} />
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="questions" className="page-width faq-section">
          <div>
            <p className="section-kicker">BEFORE YOU SETTLE IN</p>
            <h2>
              Good questions.
              <br />
              <em>Straight answers.</em>
            </h2>
            <p>
              Still curious about something?
              <br />
              <Link to="/contact">
                We're happy to help <ArrowUpRight size={14} />
              </Link>
            </p>
          </div>
          <div className="faq-list">
            {questions.map(([q, a], i) => (
              <div className="faq-item" key={q}>
                <h3>
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    aria-expanded={open === i}
                    aria-controls={`answer-${i}`}
                  >
                    {q}
                    <ChevronDown size={19} className={open === i ? "rotate-180" : ""} />
                  </button>
                </h3>
                <div
                  id={`answer-${i}`}
                  className={`faq-answer ${open === i ? "is-open" : ""}`}
                  inert={open !== i}
                >
                  <div>
                    <p>{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="page-width">
          <div className="closing-panel">
            <span className="closing-star">✳</span>
            <p className="section-kicker">YOUR AMBITION DESERVES A GOOD HOME.</p>
            <h2>
              Here's to your
              <br />
              <em>“I've got this” era.</em>
            </h2>
            <Link to="/auth" search={{ mode: "signup" }} className="action-lime">
              Find your flow. It's free. <ArrowUpRight size={18} />
            </Link>
            <p className="closing-note">On your phone. On your laptop. On your terms.</p>
          </div>
        </section>
      </main>
      <footer className="page-width landing-footer">
        <div className="footer-main">
          <div>
            <SyllabossLogo />
            <p>
              A little more together.
              <br />A little more you.
            </p>
          </div>
          <div>
            <span>YOUR WORKSPACE</span>
            <Link to="/materials">The library</Link>
            <Link to="/curriculum">Course curriculum</Link>
            <Link to="/dashboard/assistant">Boss AI</Link>
          </div>
          <div>
            <span>THE PEOPLE BEHIND IT</span>
            <Link to="/about">About Syllaboss</Link>
            <Link to="/contact">Get in touch</Link>
            <Link to="/auth" search={{ mode: "signin" }}>
              Your account
            </Link>
          </div>
          <div className="footer-note">
            Made for big dreams
            <br />
            and real student life.<span>FROM NIGERIA, WITH PURPOSE. ↗</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Syllaboss. Keep growing.</span>
          <div>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <a href="#main-content">Back to top ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
