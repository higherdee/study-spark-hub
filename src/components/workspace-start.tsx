import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Bot, Users, X } from "lucide-react";

/** A quiet, dismissible orientation surface. Never fabricates account activity. */
export function WorkspaceStart() {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem("syllaboss-workspace-guide") === "dismissed");
    } catch {
      setDismissed(false);
    }
  }, []);
  if (dismissed) return null;
  return (
    <section className="workspace-start" aria-label="Get started with your workspace">
      <div className="workspace-start-heading">
        <div>
          <p className="eyebrow">A LITTLE DIRECTION</p>
          <h2>Where shall we start?</h2>
          <p>You don't have to do everything. Just find your next small step.</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss getting started guide"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem("syllaboss-workspace-guide", "dismissed");
            } catch {
              /* Still dismiss for this visit. */
            }
          }}
        >
          <X size={17} />
        </button>
      </div>
      <div className="workspace-shortcuts">
        {[
          {
            to: "/dashboard/library",
            icon: BookOpen,
            title: "Find your materials",
            text: "Start with your course, code or topic.",
          },
          {
            to: "/dashboard/assistant",
            icon: Bot,
            title: "Untangle a tough topic",
            text: "Bring your questions to Boss AI.",
          },
          {
            to: "/dashboard/community",
            icon: Users,
            title: "Find your study people",
            text: "A little support goes a long way.",
          },
        ].map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to}>
            <span className="shortcut-icon">
              <Icon size={18} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}
