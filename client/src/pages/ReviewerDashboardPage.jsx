import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ConnectionIndicator from "../components/ConnectionIndicator.jsx";
import ReviewerShell from "../components/ReviewerShell.jsx";
import { TicketList, TicketListLoading } from "../components/TicketList.jsx";
import { Card, Notice } from "../components/ui/primitives.jsx";
import { useTickets } from "../hooks/useTickets.js";

const filters = [
  { id: "active", label: "Active" },
  { id: "pending_close", label: "Pending close" },
  { id: "closed", label: "Closed" },
  { id: "human_review", label: "Human review" }
];

const ACTIVE_STATUSES = new Set(["NEW", "AI_ACTIVE", "WAITING_CUSTOMER"]);

export default function ReviewerDashboardPage() {
  const { tickets, error, isLoading, connectionStatus } = useTickets();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get("filter") || "active";

  function setActiveFilter(nextFilter) {
    const next = new URLSearchParams(searchParams);
    if (!nextFilter || nextFilter === "active") next.delete("filter");
    else next.set("filter", nextFilter);
    setSearchParams(next);
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (activeFilter === "pending_close") return ticket.status === "PENDING_CLOSE_REVIEW";
      if (activeFilter === "closed") return ticket.status === "CLOSED";
      if (activeFilter === "human_review") return ticket.status === "HUMAN_REVIEW" || ticket.status === "HUMAN_TAKEOVER";
      return ACTIVE_STATUSES.has(ticket.status);
    });
  }, [activeFilter, tickets]);

  const metrics = useMemo(() => {
    const counts = {
      active: 0,
      human_review: 0,
      pending_close: 0,
      closed: 0
    };

    tickets.forEach((ticket) => {
      if (ticket.status === "CLOSED") counts.closed += 1;
      if (ACTIVE_STATUSES.has(ticket.status)) counts.active += 1;

      if (ticket.status === "PENDING_CLOSE_REVIEW") counts.pending_close += 1;
      if (ticket.status === "HUMAN_REVIEW" || ticket.status === "HUMAN_TAKEOVER") counts.human_review += 1;
    });

    counts.max = Math.max(counts.active, counts.human_review, counts.pending_close, counts.closed, 1);

    return counts;
  }, [tickets]);

  return (
    <ReviewerShell>
      <section className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-zinc-600 dark:text-white/70">Human reviewer dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-white">Ticket queue</h1>
          </div>
          <ConnectionIndicator status={connectionStatus} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Active" value={metrics.active} maxValue={metrics.max} accent="border border-cyan-500/40 text-cyan-700 dark:border-[#00F7FF]/40 dark:text-[#00F7FF]" />
              <SummaryCard label="Human review" value={metrics.human_review} maxValue={metrics.max} accent="border border-amber-400/50 text-amber-800 dark:border-amber-400/35 dark:text-amber-300" />
              <SummaryCard label="Pending close" value={metrics.pending_close} maxValue={metrics.max} accent="border border-zinc-300 text-zinc-800 dark:border-white/25 dark:text-white/80" />
              <SummaryCard label="Closed" value={metrics.closed} maxValue={metrics.max} accent="border border-zinc-200 text-zinc-600 dark:border-white/15 dark:text-white/70" />
            </div>

            <Card className="mb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setActiveFilter(filter.id)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        activeFilter === filter.id
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/20 dark:bg-black dark:text-white/80 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-zinc-600 dark:text-white/70">
                  Showing <span className="font-semibold text-zinc-900 dark:text-white">{filteredTickets.length}</span>
                </p>
              </div>
            </Card>

            {error ? <Notice className="mb-4" tone="danger">{error}</Notice> : null}
            {isLoading ? (
              <TicketListLoading />
            ) : (
              <TicketList
                tickets={filteredTickets}
                emptyMessage={activeFilter === "human_review" ? "No tickets need human review right now." : "No tickets in this queue."}
              />
            )}
          </div>

          <aside className="hidden xl:block">
            <Card className="sticky top-6">
              <p className="text-xs font-semibold uppercase text-zinc-600 dark:text-white/70">Demo workflow</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">How reviewers operate</h2>

              <ol className="mt-4 grid gap-2 text-sm text-zinc-700 dark:text-white/80">
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/15 dark:bg-black dark:text-white/90">
                    1
                  </span>
                  <span>Customer submits a ticket</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/15 dark:bg-black dark:text-white/90">
                    2
                  </span>
                  <span>AI starts troubleshooting</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/15 dark:bg-black dark:text-white/90">
                    3
                  </span>
                  <span>Reviewer monitors the chat</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/15 dark:bg-black dark:text-white/90">
                    4
                  </span>
                  <span>Reviewer can pause or take over</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/15 dark:bg-black dark:text-white/90">
                    5
                  </span>
                  <span>AI can suggest closure</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/15 dark:bg-black dark:text-white/90">
                    6
                  </span>
                  <span>Reviewer confirms final close</span>
                </li>
              </ol>

              <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-white/10">
                <p className="text-xs font-semibold uppercase text-zinc-600 dark:text-white/70">Reviewer focus</p>
                <ul className="mt-3 grid gap-2 text-sm text-zinc-700 dark:text-white/80">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-600 dark:bg-[#00F7FF]" />
                    <span>Watch Human Review tickets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-500 dark:bg-white/70" />
                    <span>Check Pending Close tickets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-300" />
                    <span>Step in when AI is paused or taken over</span>
                  </li>
                </ul>
              </div>
            </Card>
          </aside>
        </div>
      </section>
    </ReviewerShell>
  );
}

function SummaryCard({ label, value, maxValue, accent }) {
  const widthPercent = Math.round((value / Math.max(maxValue, 1)) * 100);

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-md shadow-zinc-300/20 dark:bg-black dark:shadow-lg dark:shadow-black/30 ${accent}`}>
      <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">{value}</p>
      <div className="mt-3 h-1 w-full rounded-full bg-zinc-200/80 dark:bg-white/5">
        <div className="h-1 rounded-full bg-current opacity-60" style={{ width: `${widthPercent}%` }} />
      </div>
    </div>
  );
}
