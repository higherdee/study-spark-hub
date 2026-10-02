import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Clock, Loader2, MessageSquare, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getComplaints, type Complaint } from "@/integrations/turso/client";
import { replyToComplaintServerFn } from "@/lib/upload.functions";

export const Route = createFileRoute("/_authenticated/admin/complaints")({
  head: () => ({
    meta: [
      { title: "Student Appeals & Complaints — Syllaboss Admin" },
      { name: "description", content: "Review and respond to material upload appeals from students." },
    ],
  }),
  component: AdminComplaintsPage,
});

function AdminComplaintsPage() {
  const qc = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["admin-complaints", statusFilter],
    queryFn: async () => {
      return await getComplaints(statusFilter ? { status: statusFilter } : undefined);
    },
    refetchInterval: 15000,
  });

  async function handleSendReply(newStatus: "resolved" | "rejected") {
    if (!selectedComplaint) return;
    if (replyText.trim().length < 3) {
      toast.error("Please enter a reply message for the student.");
      return;
    }

    setReplying(true);
    try {
      await replyToComplaintServerFn({
        data: {
          complaintId: selectedComplaint.id,
          adminReply: replyText.trim(),
          newStatus,
        },
      });
      toast.success(
        `Reply sent to student! In-app notification delivered.`
      );
      setSelectedComplaint(null);
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["admin-complaints"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setReplying(false);
    }
  }

  const pendingCount = complaints.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dispute Resolution"
        title="Student Appeals & Inquiries"
      >
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="pending">Pending Appeals</option>
            <option value="resolved">Resolved Appeals</option>
            <option value="">All Appeals</option>
          </select>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Pending Review</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">Total Inquiries</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{complaints.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">Notification Dispatch</p>
          <p className="mt-1 text-xs text-muted-foreground">Direct app & web push notifications delivered upon response</p>
        </div>
      </div>

      {/* Complaints List Table */}
      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3.5">Material & Student</th>
              <th className="p-3.5">Explanation</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Date</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                  <p className="mt-2 text-xs">Loading student appeals...</p>
                </td>
              </tr>
            ) : complaints.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500/40 mb-2" />
                  <p className="font-semibold text-foreground">No pending complaints!</p>
                  <p className="mt-0.5">All uploaded material disputes have been processed.</p>
                </td>
              </tr>
            ) : (
              complaints.map((c) => (
                <tr key={c.id} className="align-top hover:bg-secondary/20 transition-colors">
                  <td className="p-3.5">
                    <p className="font-semibold text-foreground">{c.material_title || "Material Upload"}</p>
                    <p className="text-xs text-muted-foreground">{c.user_email || `User: ${c.user_id.slice(0, 8)}`}</p>
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <p className="text-xs text-foreground line-clamp-2">{c.complaint_text}</p>
                    {c.admin_reply && (
                      <p className="mt-1 text-[11px] text-primary italic truncate">
                        Reply: "{c.admin_reply}"
                      </p>
                    )}
                  </td>
                  <td className="p-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="p-3.5 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      size="sm"
                      variant={c.status === "pending" ? "default" : "outline"}
                      className="rounded-xl text-xs h-8"
                      onClick={() => {
                        setSelectedComplaint(c);
                        setReplyText(c.admin_reply || "");
                      }}
                    >
                      {c.status === "pending" ? "Review & Reply" : "View"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Admin Reply Modal Dialog */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-card p-6 sm:p-7 shadow-2xl backdrop-blur-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Appeal Review & Reply
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Student: {selectedComplaint.user_email || selectedComplaint.user_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-secondary/40 p-4 text-xs space-y-2">
              <p className="font-semibold text-foreground">
                Document: {selectedComplaint.material_title}
              </p>
              <div className="rounded-xl bg-card p-3 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                  Student's Explanation:
                </span>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  "{selectedComplaint.complaint_text}"
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <label htmlFor="reply" className="text-xs font-semibold text-foreground">
                Admin Response & Resolution Message
              </label>
              <Textarea
                id="reply"
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message to the student (e.g. 'We verified your course code and re-approved your upload with +25 SyllaPoints.')..."
                className="rounded-2xl text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                This response will be dispatched to the student's notification center and trigger an in-app alert.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedComplaint(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={replying}
                onClick={() => handleSendReply("rejected")}
                className="rounded-xl text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Reject Appeal
              </Button>
              <Button
                size="sm"
                disabled={replying}
                onClick={() => handleSendReply("resolved")}
                className="rounded-xl text-xs font-semibold gap-1.5"
              >
                {replying ? <Loader2 className="animate-spin size-3.5" /> : <Send className="size-3.5" />}
                Send Reply & Resolve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
