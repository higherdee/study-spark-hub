import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, BookOpen, Bot, Coins, FileUp, LibraryBig, Users } from "lucide-react";

import { InstallButton } from "@/components/install-button";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Syllaboss — Your university study space" },
      {
        name: "description",
        content: "Find course materials, study with peers, and get help understanding difficult topics with Boss AI.",
      },
      { property: "og:title", content: "Syllaboss — Your university study space" },
      {
        property: "og:description",
        content: "A practical study space for course materials, peer learning, and an AI study assistant.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HomePage,
});

const studyTools = [
  {
    number: "01",
    icon: LibraryBig,
    title: "Find what your course needs",
    body: "Browse notes, summaries, and past questions shared by students. Search by institution, department, and course.",
    to: "/materials",
    action: "Browse the library",
  },
  {
    number: "02",
    icon: Bot,
    title: "Work through the hard part",
    body: "Ask Boss AI to explain a concept, help structure revision, or make a difficult topic easier to follow.",
    to: "/auth",
    action: "Meet Boss AI",
  },
  {
    number: "03",
    icon: Users,
    title: "Learn alongside your peers",
    body: "Share materials and keep study conversations with the people working through the same courses.",
    to: "/auth",
    action: "Explore study groups",
  },
];

function HomePage() {
  const { user } = useAuth();
  const appPath = user ? "/dashboard" : "/auth";
  const [compactHeader, setCompactHeader] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const updateHeader = () => setCompactHeader(window.scrollY > 12);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  return (
    <div className="home-page min-h-dvh bg-background text-ink">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="home-header" data-compact={compactHeader}>
        <motion.div layout className="home-header-inner"
          transition={{ layout: { duration: reduceMotion ? 0 : 0.26, ease: [0.77, 0, 0.175, 1] } }}>
          <motion.div layout="position" className="home-wordmark"><Link to="/" aria-label="Syllaboss home"><SyllabossLogo /></Link></motion.div>
          <motion.nav layout="position" aria-label="Main navigation" className="home-nav">
            <a href="#how-it-works">How it works</a>
            <a href="#study-tools">Study tools</a>
            <Link to="/materials">Course library</Link>
          </motion.nav>
          <motion.div layout="position" className="home-header-actions">
            <InstallButton variant="ghost" size="sm" className="home-install" />
            <Button asChild size="sm" className="home-login">
              <Link to={appPath}>{user ? "Open your space" : "Sign in"}<ArrowRight aria-hidden="true" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </header>

      <main id="main-content">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <p className="home-kicker"><span className="home-kicker-mark" aria-hidden="true" /> A study space for university life</p>
            <h1 id="home-title">Your courses,<br /><em>in good company.</em></h1>
            <div className="home-hero-bottom">
              <p>Keep course materials, study tools, and helpful conversations together—so it’s easier to know what to work on next.</p>
              <div className="home-hero-actions">
                <Button asChild size="lg" className="home-primary-action">
                  <Link to={appPath}>{user ? "Go to your dashboard" : "Start studying"}<ArrowRight aria-hidden="true" /></Link>
                </Button>
                <Link className="home-text-link" to="/materials">Browse materials <ArrowDown aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
          <div className="home-hero-art" aria-label="A sample view of the Syllaboss study space">
            <div className="home-orbit home-orbit-one" aria-hidden="true" />
            <div className="home-orbit home-orbit-two" aria-hidden="true" />
            <div className="study-preview">
              <div className="study-preview-top">
                <div className="study-preview-brand"><span className="study-preview-dot" /> YOUR STUDY SPACE</div>
                <span className="study-preview-menu" aria-hidden="true">•••</span>
              </div>
              <div className="study-preview-greeting">
                <span className="study-preview-date">A CLEARER WAY TO STUDY</span>
                <h2>Pick up where<br />you left off.</h2>
              </div>
              <div className="study-preview-course">
                <div className="course-mark"><BookOpen aria-hidden="true" /></div>
                <div className="course-copy"><span>COURSE MATERIAL</span><strong>Lecture notes &amp; past questions</strong></div>
                <ArrowRight aria-hidden="true" />
              </div>
              <div className="study-preview-footer">
                <div className="preview-stack" aria-hidden="true"><span>B</span><span>AI</span><span>+</span></div>
                <p>Materials. Explanations. People.</p>
                <span className="preview-live"><i /> READY</span>
              </div>
            </div>
            <div className="hero-side-note"><span>01 / 03</span><span>One space for the work that matters</span></div>
          </div>
        </section>

        <section className="home-intro-strip" aria-label="What you can do with Syllaboss">
          <p>Made for the rhythm of a real semester</p>
          <div><span>Find</span><i /> <span>Understand</span><i /> <span>Share</span><i /> <span>Keep going</span></div>
        </section>

        <section id="study-tools" className="home-tools-section" aria-labelledby="tools-title">
          <div className="home-section-heading">
            <div><p className="home-kicker">The study toolkit</p><h2 id="tools-title">The next useful thing,<br /><em>all in one place.</em></h2></div>
            <p className="home-section-aside">Start with what you need today. Your library, your peers, and your study assistant are a few steps away.</p>
          </div>
          <div className="home-tools-list">
            {studyTools.map(({ number, icon: Icon, title, body, to, action }) => (
              <article className="home-tool-row" key={number}>
                <span className="home-tool-number">{number}</span>
                <span className="home-tool-icon"><Icon aria-hidden="true" /></span>
                <div className="home-tool-copy"><h3>{title}</h3><p>{body}</p></div>
                <Link className="home-tool-link" to={to}>{action}<ArrowRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="home-workflow" aria-labelledby="workflow-title">
          <div className="home-workflow-heading">
            <p className="home-kicker">A little more structure</p>
            <h2 id="workflow-title">Make room for<br /><em>good study habits.</em></h2>
            <p>Bring your academic routine into one place. Save the material you need, ask when something is unclear, and share what helped you.</p>
            <Button asChild size="lg" className="home-light-action"><Link to={appPath}>Explore Syllaboss <ArrowRight aria-hidden="true" /></Link></Button>
          </div>
          <div className="home-workflow-steps">
            <article><span>01</span><div><h3>Build your course shelf</h3><p>Find shared resources and keep relevant course material close.</p></div><FileUp aria-hidden="true" /></article>
            <article><span>02</span><div><h3>Study with a little help</h3><p>Use practice tools and Boss AI to make sense of a difficult topic.</p></div><Bot aria-hidden="true" /></article>
            <article><span>03</span><div><h3>Contribute to the circle</h3><p>Share a useful resource and learn with students around you.</p></div><Users aria-hidden="true" /></article>
          </div>
          <span className="home-workflow-caption">YOUR STUDY ROUTINE, AT YOUR PACE</span>
        </section>

        <section className="home-points-section" aria-labelledby="points-title">
          <div className="points-symbol"><Coins aria-hidden="true" /></div>
          <div className="points-copy"><p className="home-kicker">A thoughtful extra</p><h2 id="points-title">Effort can add up.</h2><p>Some eligible contributions and study activities earn SyllaPoints. Your wallet shows your balance, reward activity, and the current payout options.</p></div>
          <Button asChild variant="outline" size="lg" className="points-link"><Link to={appPath}>See how it works <ArrowRight aria-hidden="true" /></Link></Button>
        </section>

        <section className="home-final-cta" aria-labelledby="final-cta-title">
          <p className="home-kicker">Your next semester starts here</p>
          <h2 id="final-cta-title">A calmer place<br /><em>to figure it out.</em></h2>
          <p>Bring your courses, questions, and study circle together.</p>
          <Button asChild size="lg" className="home-primary-action"><Link to={appPath}>{user ? "Open your study space" : "Create your account"}<ArrowRight aria-hidden="true" /></Link></Button>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer-main"><Link to="/" aria-label="Syllaboss home"><SyllabossLogo /></Link><p>A more considered study space for university students.</p><div className="home-footer-links"><Link to="/about">About</Link><Link to="/materials">Course library</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></div>
        <div className="home-footer-bottom"><span>© {new Date().getFullYear()} Syllaboss</span><span>Made for the work behind the degree.</span></div>
      </footer>
    </div>
  );
}
