import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicket } from "../api/http.js";
import TicketForm from "../components/TicketForm.jsx";
import { Notice } from "../components/ui/primitives.jsx";

export default function CustomerSubmitPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(form) {
    setError("");
    setIsSubmitting(true);

    try {
      const data = await createTicket(form);
      navigate(`/tickets/${data.ticket.id}/chat`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,42rem)_minmax(18rem,1fr)]">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase text-zinc-600 dark:text-white/80">Customer support portal</p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">Submit a support ticket</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-white/70">
          Start a guided support request and continue directly into the AI troubleshooting chat.
        </p>
        {error ? <Notice className="mt-5" tone="danger">{error}</Notice> : null}
        <div className="mt-6">
          <TicketForm onSubmit={handleSubmit} isSubmitting={isSubmitting} showDemoFillShortcut />
        </div>
      </div>
      <aside className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-lg shadow-zinc-300/25 dark:border-white/25 dark:bg-black dark:shadow-2xl dark:shadow-black/40">
        <p className="text-xs font-semibold uppercase text-zinc-600 dark:text-white/80">Support flow</p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-white">What happens next</h2>
        <ol className="mt-4 grid gap-3 text-sm text-zinc-700 dark:text-white/80">
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white">
              1
            </span>
            <span>
              <span className="font-semibold text-zinc-900 dark:text-white">Submit your issue.</span>{" "}
              We create a ticket and start a chat.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white">
              2
            </span>
            <span>
              <span className="font-semibold text-zinc-900 dark:text-white">AI tries basic troubleshooting.</span>{" "}
              You’ll see steps and questions.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white">
              3
            </span>
            <span>
              <span className="font-semibold text-zinc-900 dark:text-white">A human can step in anytime.</span>{" "}
              Reviewers can take over if needed.
            </span>
          </li>
        </ol>
      </aside>
    </section>
  );
}
