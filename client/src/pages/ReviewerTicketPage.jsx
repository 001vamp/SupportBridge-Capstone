import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import {
  closeTicketAsReviewer,
  confirmTicketClose,
  createHumanTicketMessage,
  pauseTicketAi,
  rejectTicketClose,
  releaseTicket,
  reopenTicket,
  resumeTicketAi,
  takeoverTicket
} from "../api/http.js";
import ChatWindow from "../components/ChatWindow.jsx";
import ConnectionIndicator from "../components/ConnectionIndicator.jsx";
import ReviewerControls from "../components/ReviewerControls.jsx";
import { ReviewerNav } from "../components/ReviewerShell.jsx";
import TicketActivityPanel from "../components/TicketActivityPanel.jsx";
import TicketTracker from "../components/TicketTracker.jsx";
import { Card, LoadingState, Notice } from "../components/ui/primitives.jsx";
import { useTicketThread } from "../hooks/useTicketThread.js";
import { useTickets } from "../hooks/useTickets.js";
import { getTicketDisplayLabel } from "../lib/ticketDisplay.js";

export default function ReviewerTicketPage() {
  const { ticketId } = useParams();
  const { ticket, messages, error, isLoading, connectionStatus, isAiTyping, refresh, setError } = useTicketThread(ticketId);
  const { tickets } = useTickets();
  const currentTicketId = ticket?.id || ticketId;

  const conversationMessages = useMemo(
    () => messages.filter((m) => (m.senderType || m.sender_type) !== "system"),
    [messages]
  );
  const activityMessages = useMemo(
    () => messages.filter((m) => (m.senderType || m.sender_type) === "system"),
    [messages]
  );

  async function runReviewerAction(action) {
    setError("");
    try {
      await action();
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="xl:col-start-1 xl:row-start-1">
          <ReviewerNav activeKey={null} />
        </aside>
        <section className="min-w-0 xl:col-span-2 xl:col-start-2 xl:row-start-1">
          <LoadingState>Loading ticket...</LoadingState>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="xl:col-start-1 xl:row-start-1">
        <ReviewerNav activeKey={null} />
      </aside>

      <section className="min-w-0 xl:col-span-2 xl:col-start-2 xl:row-start-1">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-white/70 dark:hover:text-white" to="/reviewer">
            <span className="text-zinc-400 dark:text-white/40">←</span>
            Back to dashboard
          </Link>
          <ConnectionIndicator status={connectionStatus} />
        </div>

        {error ? <Notice className="mb-5" tone="danger">Could not load ticket. {error}</Notice> : null}

        {ticket ? (
          <Card className="border-zinc-200/90 bg-white/90 dark:border-white/10 dark:bg-black/40">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-white/50">Ticket summary</p>
                <h1 className="mt-2 truncate text-2xl font-semibold text-zinc-900 dark:text-white">{ticket.title}</h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-white/60">{getTicketDisplayLabel(ticket.id)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCell label="Customer" value={ticket.customerName} />
              {ticket.customerEmail ? <SummaryCell label="Email" value={ticket.customerEmail} /> : null}
              <SummaryCell label="Category" value={ticket.category || "General"} />
              {ticket.createdAt ? <SummaryCell label="Created" value={new Date(ticket.createdAt).toLocaleString()} tone="muted" /> : null}
              {ticket.updatedAt ? <SummaryCell label="Updated" value={new Date(ticket.updatedAt).toLocaleString()} tone="muted" /> : null}
            </div>
          </Card>
        ) : null}
      </section>

      <aside className="min-w-0 xl:col-start-1 xl:row-start-2">
        <TicketTracker tickets={tickets} currentTicketId={currentTicketId} />
      </aside>

      <section className="min-w-0 space-y-4 xl:col-start-2 xl:row-start-2">
        <div className="flex h-[calc(100vh-300px)] min-h-[420px] flex-col rounded-2xl border border-zinc-200/90 bg-white/90 shadow-lg shadow-zinc-300/20 dark:border-white/10 dark:bg-black/40 dark:shadow-lg dark:shadow-black/30">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-white/50">Chat transcript</p>
              <p className="mt-2 truncate text-sm text-zinc-700 dark:text-white/70">
                {ticket ? `${getTicketDisplayLabel(ticket.id)} · ${ticket.title}` : ""}
              </p>
            </div>
            {isAiTyping ? <p className="mt-1 whitespace-nowrap text-xs font-semibold text-cyan-700 dark:text-[#00F7FF]">AI typing...</p> : null}
          </div>

          <div className="min-h-0 min-w-0 flex-1 p-4">
            <ChatWindow
              messages={conversationMessages}
              variant="scroll"
              className="sb-scrollbar h-full pr-2"
              smartScrollForHumanMessages
            />
          </div>
        </div>
        {ticket ? <TicketActivityPanel messages={activityMessages} /> : null}
      </section>

      <aside className="min-w-0 xl:col-start-3 xl:row-start-2 xl:sticky xl:top-6 xl:self-start">
        {ticket ? (
          <ReviewerControls
            ticket={ticket}
            onPause={() => runReviewerAction(() => pauseTicketAi(ticket.id))}
            onResume={() => runReviewerAction(() => resumeTicketAi(ticket.id))}
            onTakeover={() => runReviewerAction(() => takeoverTicket(ticket.id))}
            onRelease={() => runReviewerAction(() => releaseTicket(ticket.id))}
            onSendHumanMessage={(body) => runReviewerAction(() => createHumanTicketMessage(ticket.id, { body }))}
            onConfirmClose={() => runReviewerAction(() => confirmTicketClose(ticket.id))}
            onRejectClose={(reason) => runReviewerAction(() => rejectTicketClose(ticket.id, { reason }))}
            onReopen={() => runReviewerAction(() => reopenTicket(ticket.id))}
            onCloseTicket={() => runReviewerAction(() => closeTicketAsReviewer(ticket.id))}
          />
        ) : null}
      </aside>
    </div>
  );
}

function SummaryCell({ label, value, tone = "default" }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-white/40">{label}</p>
      <p className={`mt-1 text-sm ${tone === "muted" ? "text-zinc-600 dark:text-white/70" : "text-zinc-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}
