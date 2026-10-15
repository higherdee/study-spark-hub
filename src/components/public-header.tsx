import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { SyllabossLogo } from "@/components/syllaboss-logo";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <div className="public-nav">
        <SyllabossLogo />
        <nav aria-label="Main navigation" className="desktop-public-links">
          <Link to="/">The experience</Link>
          <Link to="/materials">
            Explore materials <ArrowUpRight size={13} />
          </Link>
          <Link to="/curriculum">Your curriculum</Link>
        </nav>
        <div className="public-nav-actions">
          <Link to="/auth" search={{ mode: "signin" }} className="public-signin">
            Log in
          </Link>
          <Link to="/auth" search={{ mode: "signup" }} className="action-dark nav-cta">
            Find your flow <ArrowUpRight size={15} />
          </Link>
          <button
            className="mobile-menu-button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="public-mobile-menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="public-mobile-menu" className="mobile-public-links" aria-label="Mobile navigation">
          <Link to="/" onClick={() => setOpen(false)}>
            The experience
          </Link>
          <Link to="/materials" onClick={() => setOpen(false)}>
            Explore materials
          </Link>
          <Link to="/curriculum" onClick={() => setOpen(false)}>
            Your curriculum
          </Link>
          <Link to="/about" onClick={() => setOpen(false)}>
            About Syllaboss
          </Link>
          <Link to="/contact" onClick={() => setOpen(false)}>
            Get in touch
          </Link>
          <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
            Create your free account <ArrowRight size={16} />
          </Link>
        </nav>
      )}
    </header>
  );
}
