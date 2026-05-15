import { useState } from "react";
import { useParams } from "react-router-dom";
import { createTicketMessage, customerEscalateToHuman } from "../api/http.js";
import ChatWindow from "../components/ChatWindow.jsx";
import ConnectionIndicator from "../components/ConnectionIndicator.jsx";
import TicketStatusBadge from "../components/TicketStatusBadge.jsx";
import { Button, Card, FieldLabel, LoadingState, Notice, Textarea } from "../components/ui/primitives.jsx";
import { useTicketThread } from "../hooks/useTicketThread.js";
import { getTicketDisplayLabel } from "../lib/ticketDisplay.js";

export default function CustomerChatPage() {
  const { ticketId } = useParams();
  const { ticket, messages, error, isLoading, connectionStatus, isAiTyping, refresh, setError } = useTicketThread(ticketId);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  async function handleSend(event) {
    event.preventDefault();
    const messageBody = body.trim();
    if (!messageBody) return;
    if (ticket?.status === "CLOSED") return;

    setError("");
    setIsSending(true);

    try {
      if (messageBody.startsWith("undefined")) {
        throw new Error("Message body is malformed.");
      }
      await createTicketMessage(ticketId, { body: messageBody });
      setBody("");
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) return <LoadingState>Loading chat...</LoadingState>;

  const isClosed = ticket?.status === "CLOSED";
  const canRequestHuman =
    !isClosed && ticket?.status !== "HUMAN_TAKEOVER" && ticket?.status !== "HUMAN_REVIEW";

  async function handleEscalate() {
    if (!ticketId || isClosed) return;
    setError("");
    setIsEscalating(true);
    try {
      await customerEscalateToHuman(ticketId, {});
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsEscalating(false);
    }
  }

  return (
    <section>
      {error ? <Notice className="mb-4" tone="danger">{error}</Notice> : null}
      {ticket ? (
        <Card className="mb-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-600 dark:text-white/80">{getTicketDisplayLabel(ticket.id)}</p>
              <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">{ticket.title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <TicketStatusBadge status={ticket.status} />
              <ConnectionIndicator status={connectionStatus} />
            </div>
          </div>
          <p className="text-sm leading-6 text-zinc-600 dark:text-white/70">{ticket.description}</p>
          {ticket.status === "HUMAN_REVIEW" ? (
            <Notice className="mt-3" tone="warning">
              A human reviewer will help you next. The AI assistant is paused for this ticket.
            </Notice>
          ) : null}
          {ticket.status === "PENDING_CLOSE_REVIEW" ? (
            <Notice className="mt-3" tone="warning">
              The AI thinks this issue is resolved. A human reviewer must confirm before the ticket is closed.
            </Notice>
          ) : null}
          {ticket.status === "HUMAN_TAKEOVER" ? (
            <Notice className="mt-3" tone="success">
              A human reviewer has taken over this ticket. The AI assistant is paused while they respond.
            </Notice>
          ) : null}
          {isClosed ? (
            <Notice className="mt-3" tone="muted">
              This ticket is closed. New customer messages are disabled.
            </Notice>
          ) : null}
        </Card>
      ) : null}

      <div className="mb-4 min-w-0">
        <ChatWindow messages={messages} />
        {isAiTyping ? <p className="mt-2 text-sm text-zinc-700 dark:text-white/80">AI Assistant is typing...</p> : null}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-white/60">Need a person?</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-white/70">
              Request a human reviewer. The AI will stop replying until a person takes the ticket.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={isEscalating || !canRequestHuman}
            onClick={handleEscalate}
          >
            {isEscalating ? "Requesting..." : "Talk to a human"}
          </Button>
        </div>
        <form onSubmit={handleSend}>
          <FieldLabel htmlFor="message">Message</FieldLabel>
          <Textarea
            id="message"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-24"
            disabled={isClosed}
            required
          />
          <Button className="mt-3 w-full sm:w-auto" type="submit" disabled={isSending || isClosed || !body.trim()}>
            {isSending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
