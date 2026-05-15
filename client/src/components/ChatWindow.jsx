import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";
import { EmptyState } from "./ui/primitives.jsx";

/** How close to the bottom (px) counts as "already seeing the latest" — no scroll needed. */
const NEAR_BOTTOM_PX = 48;

/**
 * @param {object} props
 * @param {Array} props.messages
 * @param {"panel"|"scroll"} [props.variant]
 * @param {string} [props.className]
 * @param {boolean} [props.smartScrollForHumanMessages] When true (reviewer transcript): new human messages scroll into view unless focus is inside the transcript or the bottom is already visible.
 */
export default function ChatWindow({
  messages,
  variant = "panel",
  className = "",
  smartScrollForHumanMessages = false,
}) {
  const scrollContainerRef = useRef(null);
  const endAnchorRef = useRef(null);
  const prevLastMessageIdRef = useRef(null);

  useEffect(() => {
    if (variant !== "scroll" || !smartScrollForHumanMessages) return;
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    const lastId = last?.id;
    const sender = last?.senderType || last?.sender_type;

    if (prevLastMessageIdRef.current === null) {
      prevLastMessageIdRef.current = lastId;
      return;
    }
    if (prevLastMessageIdRef.current === lastId) return;
    prevLastMessageIdRef.current = lastId;

    if (sender !== "human") return;

    const el = scrollContainerRef.current;
    if (!el) return;

    const active = document.activeElement;
    if (active instanceof Node && el.contains(active)) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= NEAR_BOTTOM_PX) return;

    requestAnimationFrame(() => {
      endAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages, variant, smartScrollForHumanMessages]);

  if (messages.length === 0) {
    return <EmptyState>Conversation has not started yet.</EmptyState>;
  }

  if (variant === "scroll") {
    return (
      <div ref={scrollContainerRef} className={`h-full overflow-y-auto ${className}`}>
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={endAnchorRef} aria-hidden="true" className="h-0 w-full shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-3 rounded-2xl border border-zinc-200/90 bg-white/90 p-3.5 shadow-lg shadow-zinc-300/25 dark:border-white/10 dark:bg-black/40 dark:shadow-lg dark:shadow-black/30 ${className}`}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
