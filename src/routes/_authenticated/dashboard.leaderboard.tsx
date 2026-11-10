import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Search, Share2, Timer, Trophy } from "lucide-react";
import { getLeaderboardServerFn } from "@/lib/upload.functions";
import { useProfile } from "@/lib/profile";
import { useAuth } from "@/hooks/use-auth";
import { NativeLoading, NativePageTitle } from "@/components/native-web/screens";
import { CampusWrappedModal } from "@/components/scholar/campus-wrapped-modal";
export const Route = createFileRoute("/_authenticated/dashboard/leaderboard")({
  head: () => ({ meta: [{ title: "Campus leaders — Syllaboss" }] }),
  component: CampusLeaders,
});
function CampusLeaders() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [filter, setFilter] = useState("Everyone");
  const [query, setQuery] = useState("");
  const [wrapped, setWrapped] = useState(false);
  const result = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await getLeaderboardServerFn()).leaderboard,
    refetchInterval: 60000,
  });
  const data = result.data || [];
  const list = data.filter(
    (row) =>
      (filter !== "My campus" || row.institution === profile?.institution) &&
      (filter !== "My course" || row.course === profile?.course) &&
      [row.full_name, row.institution, row.course]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const username = (row: (typeof data)[number]) =>
    row.full_name?.startsWith("@") ? row.full_name : "Student";
  return (
    <section className="native-leaderboard">
      <div className="native-leaderboard-heading">
        <Trophy />
        <NativePageTitle
          eyebrow="Built through learning"
          title="Campus leaders."
          description="Ranked by lifetime points, even after cashout."
        />
        <button
          className="native-icon-button"
          aria-label="Share your progress"
          onClick={() => setWrapped(true)}
        >
          <Share2 />
        </button>
      </div>
      <div className="native-leaderboard-hero">
        <div>
          <span className="native-eyebrow">Time well spent</span>
          <h2>
            Keep showing up.
            <br />
            It adds up.
          </h2>
        </div>
        <div className="native-leaderboard-orbit" aria-hidden="true">
          <Trophy />
          <span />
        </div>
      </div>
      <div className="native-filter-row" role="group" aria-label="Leaderboard filters">
        {["Everyone", "My campus", "My course"].map((value) => (
          <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value}>
            {value}
          </button>
        ))}
      </div>
      <label className="native-search mt-5">
        <Search />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a student, campus or course"
          aria-label="Search campus leaders"
        />
      </label>
      {result.isPending ? (
        <NativeLoading />
      ) : result.isError ? (
        <div role="alert" className="native-empty">
          <p>Rankings couldn’t load.</p>
          <button className="native-text-button" onClick={() => void result.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <ol className="native-leaderboard-list">
          {list.map((row, index) => {
            const rank = data.findIndex((s) => s.id === row.id) + 1;
            return (
              <li key={row.id} data-own={row.id === user?.id} data-podium={rank <= 3}>
                <span className="native-leader-rank">
                  {rank === 1 ? <Crown /> : String(rank).padStart(2, "0")}
                </span>
                <span className="native-leader-avatar">
                  {username(row).replace("@", "").slice(0, 1).toUpperCase()}
                </span>
                <div className="native-leader-name">
                  <strong>
                    {username(row)}
                    {row.id === user?.id && <small>You</small>}
                  </strong>
                  <span>{row.institution || "Syllaboss campus"}</span>
                  <span>
                    <Timer />
                    {Math.floor(Number(row.study_minutes || 0) / 60)}h{" "}
                    {Number(row.study_minutes || 0) % 60}m lifetime study
                  </span>
                </div>
                <div className="native-leader-points">
                  <strong>{Number(row.lifetime_points ?? row.points).toLocaleString()}</strong>
                  <span>lifetime pts</span>
                  <small>{Number(row.points).toLocaleString()} available</small>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {!result.isPending && !list.length && !result.isError && (
        <p className="native-empty">No students match this search yet.</p>
      )}
      <CampusWrappedModal
        isOpen={wrapped}
        onClose={() => setWrapped(false)}
        userId={user?.id}
        username={profile?.username || undefined}
      />
    </section>
  );
}
