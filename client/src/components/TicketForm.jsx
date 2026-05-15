import { useState } from "react";
import { Button, Card, FieldLabel, Input, Textarea } from "./ui/primitives.jsx";
import { DEMO_TICKET_FORM } from "../lib/demoTicket.js";

const initialForm = {
  customerName: "",
  customerEmail: "",
  title: "",
  category: "",
  description: ""
};

export default function TicketForm({ onSubmit, isSubmitting, showDemoFillShortcut = false }) {
  const [form, setForm] = useState(initialForm);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        {showDemoFillShortcut ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/25 bg-cyan-50/80 px-3 py-2 text-sm dark:border-[#00F7FF]/30 dark:bg-[#00F7FF]/[0.06]">
            <span className="text-zinc-700 dark:text-white/80">Walkthrough: load the Wi-Fi demo ticket.</span>
            <Button type="button" variant="secondary" className="!min-h-9 shrink-0 px-3 py-1.5 text-xs" onClick={() => setForm({ ...DEMO_TICKET_FORM })}>
              Fill demo ticket
            </Button>
          </div>
        ) : null}

        <div>
          <FieldLabel htmlFor="customerName">Name</FieldLabel>
          <Input id="customerName" name="customerName" value={form.customerName} onChange={updateField} required />
        </div>

        <div>
          <FieldLabel htmlFor="customerEmail">Email optional</FieldLabel>
          <Input id="customerEmail" name="customerEmail" type="email" value={form.customerEmail} onChange={updateField} />
        </div>

        <div>
          <FieldLabel htmlFor="title">Issue title</FieldLabel>
          <Input id="title" name="title" value={form.title} onChange={updateField} required />
        </div>

        <div>
          <FieldLabel htmlFor="category">Category optional</FieldLabel>
          <Input id="category" name="category" value={form.category} onChange={updateField} placeholder="Printer, login, network..." />
        </div>

        <div>
          <FieldLabel htmlFor="description">Describe the issue</FieldLabel>
          <Textarea id="description" name="description" value={form.description} onChange={updateField} className="min-h-32" required />
        </div>

        <Button className="w-full sm:w-auto" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Ticket"}
        </Button>
      </form>
    </Card>
  );
}
