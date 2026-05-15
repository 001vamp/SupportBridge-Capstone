import { Link } from "react-router-dom";
import AIStateBadge from "./AIStateBadge.jsx";
import TicketStatusBadge from "./TicketStatusBadge.jsx";
import { EmptyState, LoadingState } from "./ui/primitives.jsx";
import { getTicketDisplayLabel } from "../lib/ticketDisplay.js";

export function TicketList({ tickets, emptyMessage }) {
  if (tickets.length === 0) {
    return <TicketListEmpty>{emptyMessage || "No tickets in this queue."}</TicketListEmpty>;
  }

  return (
    <div className="space-y-1.5">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          to={`/reviewer/${ticket.id}`}
          className="group block rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 shadow-md shadow-zinc-300/20 transition hover:border-cyan-500/40 hover:bg-cyan-50/60 dark:border-white/15 dark:bg-black dark:shadow-black/30 dark:hover:border-white dark:hover:bg-white"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs font-semibold uppercase text-zinc-500 group-hover:text-zinc-700 dark:text-white/70 dark:group-hover:text-black/70">
                  {getTicketDisplayLabel(ticket.id, { includeWord: false })}
                </p>
                {ticket.category ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 group-hover:text-zinc-600 dark:text-white/45 dark:group-hover:text-black/50">
                    {ticket.category}
                  </p>
                ) : null}
              </div>
              <h2 className="mt-1 truncate text-base font-semibold text-zinc-900 group-hover:text-zinc-950 dark:text-white dark:group-hover:text-black">
                {ticket.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 group-hover:text-zinc-800 dark:text-white/70 dark:group-hover:text-black/70">
                {ticket.customerName} · Updated {new Date(ticket.updatedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
              <div className="flex flex-wrap gap-2">
                <TicketStatusBadge status={ticket.status} />
                <AIStateBadge state={ticket.aiState} />
              </div>
              <span className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700 transition group-hover:border-black/15 group-hover:bg-zinc-900 group-hover:text-white dark:border-white/20 dark:bg-black dark:text-white/80 dark:group-hover:border-black/20 dark:group-hover:bg-black dark:group-hover:text-white">
                View
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function TicketListEmpty({ children }) {
  return <EmptyState>{children}</EmptyState>;
}

export function TicketListLoading() {
  return <LoadingState>Loading tickets...</LoadingState>;
}
