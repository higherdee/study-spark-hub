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
    <div className="min-h-screen bg-[#f6faf7] text-[#00110a] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e1eae3] bg-[#f6faf7]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <SyllabossLogo />
          <Button asChild variant="ghost" size="sm" className="gap-2 text-xs font-semibold rounded-full">
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf6f0] border border-[#d6e3db] text-xs font-semibold text-[#155e3e] mb-3">
            <HelpCircle className="size-3.5" />
            <span>24/7 Academic Support</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#00110a]">
            Get In Touch With Us
          </h1>
          <p className="mt-2 text-sm text-[#526359] max-w-xl mx-auto">
            Have questions about study materials, SyllaPoints withdrawals, campus ambassadorship, or academic partnerships? We're here to help.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5 items-start">
          {/* Contact Details Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-[#d2e0d7] bg-white p-6 sm:p-7 shadow-xs space-y-6">
              <h2 className="font-display text-lg font-bold text-[#00110a]">
                Direct Contact Desks
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-2xl bg-[#edf6f0] text-[#155e3e] flex items-center justify-center shrink-0">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#00110a]">General & Student Help</h3>
                    <p className="text-xs text-[#526359]">support@syllaboss.org</p>
                    <p className="text-[11px] text-[#526359] mt-0.5">Response within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-2xl bg-[#edf6f0] text-[#155e3e] flex items-center justify-center shrink-0">
                    <MessageSquare className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#00110a]">Campus Ambassadors & Reps</h3>
                    <p className="text-xs text-[#526359]">campus@syllaboss.org</p>
                    <p className="text-[11px] text-[#526359] mt-0.5">Faculty liaisons & university leads</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-2xl bg-[#edf6f0] text-[#155e3e] flex items-center justify-center shrink-0">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#00110a]">Headquarters & Innovation Hub</h3>
                    <p className="text-xs text-[#526359]">Syllaboss Technologies Ltd.</p>
                    <p className="text-[11px] text-[#526359]">Lagos & Abuja, Nigeria</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#f6faf7] border border-[#e1eae3] text-xs text-[#3f4d45] space-y-1">
                <span className="font-bold text-[#00110a] block">Instant Study Chat:</span>
                <p>Registered students can use Boss AI inside the dashboard for real-time syllabus inquiry and study problem solving.</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-[#d2e0d7] bg-white p-6 sm:p-8 shadow-xs">
              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="size-14 rounded-full bg-[#edf6f0] text-[#155e3e] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#00110a]">Message Received</h3>
                  <p className="text-xs text-[#526359] max-w-sm mx-auto">
                    A representative from our academic support team will review your message and reply to <strong>{email}</strong> shortly.
                  </p>
                  <Button
                    onClick={() => {
                      setSubmitted(false);
                      setMessage("");
                      setSubject("");
                    }}
                    variant="outline"
                    className="mt-4 rounded-full text-xs font-semibold"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-display text-lg font-bold text-[#00110a]">
                    Send a Support Request
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#00110a]">Your Full Name *</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Chinua Achebe"
                        required
                        className="rounded-xl border-[#d6e3db] text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#00110a]">Email Address *</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. student@unilag.edu.ng"
                        required
                        className="rounded-xl border-[#d6e3db] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#00110a]">University / Institution</label>
                      <Input
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g. University of Lagos (UNILAG)"
                        className="rounded-xl border-[#d6e3db] text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#00110a]">Inquiry Topic</label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Material verification, SyllaPoints, Bug"
                        className="rounded-xl border-[#d6e3db] text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#00110a]">Message *</label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your question, request, or issue with as much detail as possible..."
                      rows={5}
                      required
                      className="rounded-xl border-[#d6e3db] text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full sm:w-auto px-6 h-11 rounded-full bg-[#0d281e] hover:bg-[#00110a] text-white text-xs font-semibold gap-2 shadow-xs"
                  >
                    <Send className="size-4" />
                    <span>Send Message</span>
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e1eae3] bg-white py-8 text-center text-xs text-[#526359]">
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap justify-center gap-6 mb-3">
          <Link to="/privacy" className="hover:text-[#00110a]">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-[#00110a]">Terms of Service</Link>
          <Link to="/about" className="hover:text-[#00110a]">About Us</Link>
          <Link to="/contact" className="font-semibold text-[#00110a]">Contact Us</Link>
          <Link to="/curriculum" className="hover:text-[#00110a]">Academic Curriculum</Link>
        </div>
        <p>© 2026 Syllaboss Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}
