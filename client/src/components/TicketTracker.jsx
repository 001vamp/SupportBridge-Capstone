import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTicketDisplayLabel } from "../lib/ticketDisplay.js";

// This component shows a small, read-only "where should I look next?" panel.
export default function TicketTracker({ tickets = [], currentTicketId, className = "" }) {
  // Make sure we always deal with an array (even if someone passes `null` accidentally).
  const safeTickets = Array.isArray(tickets) ? tickets : [];

  // Each tracker section can be expanded independently.
  const [expanded, setExpanded] = useState({
    needsHumanReview: false,
    pendingCloseReview: false,
    waitingOnCustomer: false
  });

  // Split tickets into the groups the reviewer needs most often.
  const activeAiTickets = safeTickets.filter((t) => t.status === "AI_ACTIVE");
  const needsHumanReviewTickets = safeTickets.filter((t) => t.status === "HUMAN_REVIEW" || t.status === "HUMAN_TAKEOVER");
  const pendingCloseReviewTickets = safeTickets.filter((t) => t.status === "PENDING_CLOSE_REVIEW");
  const waitingOnCustomerTickets = safeTickets.filter((t) => t.status === "WAITING_CUSTOMER");

  return (
    <div className={`space-y-3 ${className}`}>
      <TicketSection
        title="Needs Human Review"
        ticketsInSection={needsHumanReviewTickets}
        sectionKey="needsHumanReview"
        currentTicketId={currentTicketId}
        expanded={expanded}
        setExpanded={setExpanded}
      />
      <TicketSection
        title="Pending Close Review"
        ticketsInSection={pendingCloseReviewTickets}
        sectionKey="pendingCloseReview"
        currentTicketId={currentTicketId}
        expanded={expanded}
        setExpanded={setExpanded}
      />
      <TicketSection
        title="Waiting on Customer"
        ticketsInSection={waitingOnCustomerTickets}
        sectionKey="waitingOnCustomer"
        currentTicketId={currentTicketId}
        expanded={expanded}
        setExpanded={setExpanded}
      />
      <TicketSection
        title="Active AI"
        ticketsInSection={activeAiTickets}
        sectionKey="activeAi"
        currentTicketId={currentTicketId}
        expanded={expanded}
        setExpanded={setExpanded}
      />
    </div>
  );
}

function TicketPreviewMeta({ ticket }) {
  const shortId = getTicketDisplayLabel(ticket.id, { includeWord: false });
  let updatedLine = "";
  if (ticket.updatedAt) {
    const d = new Date(ticket.updatedAt);
    updatedLine = !Number.isNaN(d.getTime()) ? `Updated ${d.toLocaleString()}` : "";
  }

  return (
    <p className="mt-1 text-xs text-zinc-500 dark:text-white/60">
      {shortId}
      {updatedLine ? ` · ${updatedLine}` : ""}
    </p>
  );
}

function TicketSection({ title, ticketsInSection, sectionKey, currentTicketId, expanded, setExpanded }) {
  const count = ticketsInSection.length;
  const isExpanded = expanded[sectionKey];
  const previewTickets = useMemo(() => ticketsInSection.slice(0, 3), [ticketsInSection]);
  const visibleTickets = isExpanded ? ticketsInSection : previewTickets;
  const moreCount = Math.max(0, count - previewTickets.length);

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-black/30">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-white/50">{title}</p>
        <span className="inline-flex h-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 px-2 text-xs font-semibold text-zinc-700 dark:border-white/15 dark:bg-black dark:text-white/80">
          {count}
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {count === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-white/60">No tickets.</p>
        ) : (
          <>
            {visibleTickets.map((ticket) => {
              const isCurrent = currentTicketId && ticket.id === currentTicketId;

              return (
                <Link
                  key={ticket.id}
                  to={`/reviewer/${ticket.id}`}
                  className={`group block rounded-xl border px-3 py-2.5 transition ${
                    isCurrent
                      ? "border-cyan-500/50 bg-cyan-50/80 dark:border-white/40 dark:bg-white/5"
                      : "border-zinc-200/90 bg-transparent hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/15 dark:hover:border-white/25 dark:hover:bg-white/5"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-zinc-950 dark:text-white/90 dark:group-hover:text-white">
                    {ticket.title || "Untitled ticket"}
                  </p>
                  <TicketPreviewMeta ticket={ticket} />
                </Link>
              );
            })}

            {moreCount > 0 ? (
              <button
                type="button"
                className="pt-1 text-left text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-white/55 dark:hover:text-white/80"
                onClick={() => setExpanded((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
              >
                {isExpanded ? "Show less" : `+ ${moreCount} more tickets`}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
