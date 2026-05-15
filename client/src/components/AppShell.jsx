import { Link, NavLink, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";

export default function AppShell({ children }) {
  const location = useLocation();
  const isReviewerRoute = location.pathname.startsWith("/reviewer");

  return (
    <div className="min-h-screen overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-black dark:text-white">
      <header className="relative border-b border-zinc-200/90 bg-white/90 backdrop-blur-md dark:border-white/15 dark:bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-300 bg-zinc-900 text-lg font-black text-white dark:border-white dark:bg-black dark:text-white">
              SB
            </span>
            <span>
              <span className="block text-base font-semibold leading-5 text-zinc-900 dark:text-white">SupportBridge AI</span>
              <span className="text-xs text-zinc-600 dark:text-white/70">AI-assisted service desk</span>
            </span>
          </Link>
          <nav className="flex rounded-xl border border-zinc-200 bg-zinc-50/90 p-1 text-sm dark:border-white/20 dark:bg-black">
            <NavItem to="/">Submit Ticket</NavItem>
            <NavItem to="/reviewer">Reviewer</NavItem>
          </nav>
        </div>
      </header>
      <main
        className={`relative mx-auto px-4 sm:px-6 lg:px-8 ${isReviewerRoute ? "max-w-screen-2xl py-4" : "max-w-7xl py-6"}`}
      >
        {children}
      </main>
      <ThemeToggle />
    </div>
  );
}

function NavItem({ children, to }) {
  return (
    <NavLink
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 font-medium transition ${
          isActive
            ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
            : "text-zinc-700 hover:bg-white hover:text-zinc-900 dark:text-white/80 dark:hover:bg-white dark:hover:text-black"
        }`
      }
      to={to}
    >
      {children}
    </NavLink>
  );
}
