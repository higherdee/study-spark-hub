import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MessageSquare, MapPin, Send, HelpCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SyllabossLogo } from "@/components/syllaboss-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us & Student Support — Syllaboss" },
      {
        name: "description",
        content: "Get in touch with the Syllaboss academic support team, student campus ambassadors, or submit partner inquiries.",
      },
      { property: "og:title", content: "Contact Us — Syllaboss" },
      { property: "og:description", content: "Direct support and inquiry channels for students and universities." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    setSubmitted(true);
    toast.success("Thank you! Your inquiry has been dispatched to our student support team.");
  }

  return (
    <div className="min-h-screen bg-background text-ink font-sans selection:bg-brand selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <SyllabossLogo />
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs font-semibold rounded-full hover:bg-surface-container-low text-ink lift press">
            <Link to="/">
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-border text-xs font-semibold text-forest mb-3 shadow-xs">
            <HelpCircle className="size-3.5 text-brass" />
            <span className="eyebrow text-forest">24/7 Academic Support</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-ink">
            Get In Touch With Our Desk
          </h1>
          <p className="mt-2 text-sm text-ink-soft max-w-xl mx-auto leading-relaxed">
            Have questions about study materials, SyllaPoints withdrawals, campus ambassadorship, or academic partnerships? We're here to assist.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5 items-start">
          {/* Contact Details Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-[var(--elev-1)] space-y-6">
              <h2 className="font-display text-lg font-bold text-ink">
                Direct Contact Desks
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-2xl bg-surface-container-high text-forest flex items-center justify-center shrink-0 border border-border">
                    <Mail className="size-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink">General & Student Help</h3>
                    <p className="text-xs text-ink-soft font-mono">support@syllaboss.org</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Response within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-2xl bg-surface-container-high text-forest flex items-center justify-center shrink-0 border border-border">
                    <MessageSquare className="size-5 text-brass" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink">Campus Ambassadors & Reps</h3>
                    <p className="text-xs text-ink-soft font-mono">campus@syllaboss.org</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Faculty liaisons & university leads</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-2xl bg-surface-container-high text-forest flex items-center justify-center shrink-0 border border-border">
                    <MapPin className="size-5 text-forest" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink">Headquarters & Innovation Hub</h3>
                    <p className="text-xs text-ink-soft">Syllaboss Technologies Ltd.</p>
                    <p className="text-[11px] text-muted-foreground">Lagos & Abuja, Nigeria</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-border text-xs text-ink-soft space-y-1">
                <span className="eyebrow text-forest block">Instant Copilot</span>
                <p>Enrolled scholars can converse with Boss AI inside the dashboard for instant courseware inquiries and derivations.</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-[var(--elev-1)]">
              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="size-14 rounded-full bg-brand/15 text-brand flex items-center justify-center mx-auto border border-brand/30">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink">Inquiry Dispatched</h3>
                  <p className="text-xs text-ink-soft max-w-sm mx-auto leading-relaxed">
                    A representative from our academic support team will review your inquiry and reply to <strong className="text-ink">{email}</strong> shortly.
                  </p>
                  <Button
                    onClick={() => {
                      setSubmitted(false);
                      setMessage("");
                      setSubject("");
                    }}
                    variant="outline"
                    className="mt-4 rounded-full text-xs font-semibold border-border hover:bg-surface-container-low lift press"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-display text-lg font-bold text-ink">
                    Dispatch an Academic Support Request
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="eyebrow text-ink-soft block">Your Full Name *</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Chinua Achebe"
                        required
                        className="rounded-xl border-border text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="eyebrow text-ink-soft block">Email Address *</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. scholar@unilag.edu.ng"
                        required
                        className="rounded-xl border-border text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="eyebrow text-ink-soft block">University / Institution</label>
                      <Input
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g. University of Lagos (UNILAG)"
                        className="rounded-xl border-border text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="eyebrow text-ink-soft block">Inquiry Topic</label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Material verification, SyllaPoints, Campus Duel"
                        className="rounded-xl border-border text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="eyebrow text-ink-soft block">Detailed Message *</label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your inquiry, request, or issue with as much detail as possible..."
                      rows={5}
                      required
                      className="rounded-xl border-border text-xs bg-background"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full sm:w-auto px-6 h-11 rounded-full bg-forest hover:bg-ink text-white text-xs font-semibold gap-2 shadow-xs lift press"
                  >
                    <Send className="size-4 text-brass-soft" />
                    <span>Send Message</span>
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-container-lowest py-8 text-center text-xs text-ink-soft">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-ink">Terms of Service</Link>
          <Link to="/about" className="hover:text-ink">About Us</Link>
          <Link to="/contact" className="font-semibold text-ink">Contact Us</Link>
          <Link to="/curriculum" className="hover:text-ink">Academic Curriculum</Link>
        </div>
        <p className="text-muted-foreground">© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ContactPage;
