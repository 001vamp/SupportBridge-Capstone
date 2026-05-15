import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

const links = [
  { label: "Dashboard", to: "/reviewer", filter: null },
  { label: "Active Tickets", to: "/reviewer?filter=active", filter: "active" },
  { label: "Human Review", to: "/reviewer?filter=human_review", filter: "human_review" },
  { label: "Pending Close", to: "/reviewer?filter=pending_close", filter: "pending_close" },
  { label: "Closed", to: "/reviewer?filter=closed", filter: "closed" }
];

export function ReviewerNav({ activeKey }) {
  return (
    <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-black">
      <p className="text-xs font-semibold uppercase text-zinc-600 dark:text-white/70">Reviewer</p>
      <nav className="mt-3 grid gap-1.5">
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeKey === (link.filter || "dashboard")
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-400 hover:bg-white dark:border-white/15 dark:bg-black dark:text-white/80 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function ReviewerShell({ children, sidebarExtra = null }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isDashboardRoute = location.pathname === "/reviewer";
  const rawFilter = searchParams.get("filter");
  const activeKey = isDashboardRoute ? (rawFilter ? rawFilter : "dashboard") : null;
  const sidebarRef = useRef(null);
  const isDraggingRef = useRef(false);
  const frameRef = useRef(null);

  const MIN_SIDEBAR_PX = 208;
  const MAX_SIDEBAR_PX = 420;
  const DEFAULT_SIDEBAR_PX = 240;

  const [sidebarWidthPx, setSidebarWidthPx] = useState(() => {
    try {
      const raw = localStorage.getItem("sb.reviewerSidebarWidthPx");
      const parsed = raw ? Number(raw) : NaN;
      if (!Number.isFinite(parsed)) return DEFAULT_SIDEBAR_PX;
      return Math.min(MAX_SIDEBAR_PX, Math.max(MIN_SIDEBAR_PX, parsed));
    } catch {
      return DEFAULT_SIDEBAR_PX;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sb.reviewerSidebarWidthPx", String(sidebarWidthPx));
    } catch {
      // ignore write failures (private mode, etc.)
    }
  }, [sidebarWidthPx]);

  function handlePointerDown(event) {
    isDraggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!isDraggingRef.current) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
    const next = event.clientX - sidebarLeft;
    frameRef.current = requestAnimationFrame(() => {
      setSidebarWidthPx((current) => {
        const clamped = Math.min(MAX_SIDEBAR_PX, Math.max(MIN_SIDEBAR_PX, next));
        return Number.isFinite(clamped) ? clamped : current;
      });
    });
  }

  function handlePointerUp() {
    isDraggingRef.current = false;
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-start">
      <aside
        ref={sidebarRef}
        className="w-full shrink-0 md:w-[var(--reviewer-sidebar-width)]"
        style={{ "--reviewer-sidebar-width": `${sidebarWidthPx}px` }}
      >
        <div className="space-y-5">
          <div className="relative">
            <ReviewerNav activeKey={activeKey} />
            <div className="absolute -right-2 top-4 hidden h-[calc(100%-2rem)] w-4 md:block">
              <button
                type="button"
                aria-label="Resize sidebar"
                title="Drag to resize"
                className="h-full w-full cursor-col-resize rounded-full bg-transparent transition hover:bg-zinc-200/80 dark:hover:bg-white/10"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            </div>
          </div>

          {sidebarExtra ? <div>{sidebarExtra}</div> : null}
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
