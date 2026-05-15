import { useState } from "react";
import { Button, Card, FieldLabel, Input, Textarea } from "./ui/primitives.jsx";
import AIStateBadge from "./AIStateBadge.jsx";
import TicketStatusBadge from "./TicketStatusBadge.jsx";

export default function ReviewerControls({
  ticket,
  onPause,
  onResume,
  onTakeover,
  onRelease,
  onSendHumanMessage,
  onConfirmClose,
  onRejectClose,
  onReopen,
  onCloseTicket
}) {
  const [body, setBody] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const ticketStatus = ticket?.status;
  const aiState = ticket?.aiState || ticket?.ai_state;
  const canReviewClose = ticketStatus === "PENDING_CLOSE_REVIEW";
  const canReopen = ticketStatus === "CLOSED";
  const canForceClose = ticketStatus !== "CLOSED" && ticketStatus !== "PENDING_CLOSE_REVIEW";
  const canSendHumanMessage = ticketStatus !== "CLOSED" && aiState !== "ACTIVE";
  const isBusy = Boolean(pendingAction);
  const isPaused = aiState === "PAUSED";
  const isTakenOver = aiState === "TAKEN_OVER" || ticketStatus === "HUMAN_TAKEOVER";

  async function runAction(actionName, action) {
    setPendingAction(actionName);
    try {
      await action();
    } finally {
      setPendingAction("");
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    const messageBody = body.trim();
    if (!messageBody) return;
    if (messageBody.startsWith("undefined")) return;

    await runAction("send", async () => {
      await onSendHumanMessage(messageBody);
      setBody("");
    });
  }

  return (
    <Card className="sb-command-panel border-cyan-500/50 bg-white/95 dark:border-[#00F7FF]/70 dark:bg-black/40">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-white/50">Reviewer command panel</p>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-white/40">AI status</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <TicketStatusBadge status={ticket?.status} />
          <AIStateBadge state={aiState} />
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-white/55">
          AI can suggest a resolution, but only a reviewer can close the ticket.
        </p>
        {ticket?.status === "PENDING_CLOSE_REVIEW" && ticket?.aiResolutionSummary ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-black/30">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-white/45">Closure summary</p>
            <p className="mt-2 text-sm text-zinc-800 dark:text-white/75">{ticket.aiResolutionSummary}</p>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSend} className="mt-5">
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-amber-300" htmlFor="human-message">
          Human message
        </label>
        <Textarea
          id="human-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-28"
          disabled={!canSendHumanMessage || isBusy}
          required
        />
        <Button className="mt-3 w-full" type="submit" disabled={!canSendHumanMessage || isBusy || !body.trim()}>
          {pendingAction === "send" ? "Sending..." : "Send human message"}
        </Button>
      </form>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-white/40">AI controls</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={isPaused ? "dangerSoft" : "secondary"}
              className={isPaused ? "border-red-400/80" : ""}
              disabled={isBusy || isTakenOver || isPaused}
              onClick={() => runAction("pause", onPause)}
            >
              {isPaused ? "Paused" : "Pause AI"}
            </Button>
            <Button
              variant={isPaused ? "primary" : "secondary"}
              disabled={isBusy || isTakenOver || !isPaused}
              onClick={() => runAction("resume", onResume)}
            >
              Resume AI
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-white/40">Human controls</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={isTakenOver ? "primary" : "secondary"}
              disabled={isBusy || isTakenOver}
              onClick={() => runAction("takeover", onTakeover)}
            >
              {isTakenOver ? "Taken over" : "Take over"}
            </Button>
            <Button
              variant={!isTakenOver ? "secondary" : "primary"}
              disabled={isBusy || !isTakenOver}
              onClick={() => runAction("release", onRelease)}
            >
              Release
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-white/40">Resolution review</p>
          <div className="grid gap-2">
            {canReviewClose ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="danger" disabled={isBusy} onClick={() => runAction("reject-close", () => onRejectClose(rejectReason))}>
                  Reject closure
                </Button>
                <Button variant="success" disabled={isBusy} onClick={() => runAction("confirm-close", onConfirmClose)}>
                  Confirm close
                </Button>
              </div>
            ) : null}
            {canReopen ? (
              <Button variant="primary" disabled={isBusy} onClick={() => runAction("reopen", onReopen)}>
                Reopen
              </Button>
            ) : null}
            {canForceClose ? (
              <Button
                variant="danger"
                disabled={isBusy}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Close this ticket now? The customer will not be able to send more messages."
                    )
                  ) {
                    return;
                  }
                  runAction("close-ticket", onCloseTicket);
                }}
              >
                {pendingAction === "close-ticket" ? "Closing..." : "Close ticket"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {canReviewClose ? (
        <div className="mb-4">
          <FieldLabel htmlFor="reject-reason">
            Reject reason optional
          </FieldLabel>
          <Input
            id="reject-reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        </div>
      ) : null}
    </Card>
  );
}
