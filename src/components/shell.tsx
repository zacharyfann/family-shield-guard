import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function ShieldMark({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-panel)] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-2/3 w-2/3" aria-hidden="true" fill="none">
        <path
          d="M12 2.5 4.5 5.6v6.2c0 4.5 3.1 8.3 7.5 9.7 4.4-1.4 7.5-5.2 7.5-9.7V5.6L12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m8.6 12.1 2.4 2.4 4.4-4.7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

const TABS = [
  { to: "/check", label: "Check a Message" },
  { to: "/directory", label: "Verified Directory" },
  { to: "/caregivers", label: "Caregiver Alerts" },
] as const;

export function SiteHeader() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <ShieldMark className="h-10 w-10" />
          <span className="min-w-0">
            <span className="font-display block truncate text-lg font-extrabold tracking-tight text-primary sm:text-xl">
              Second-Look
            </span>
            <span className="hidden text-sm text-muted-foreground lg:block">
              A second opinion before your family clicks, pays, or responds.
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <span className="hidden max-w-[14rem] truncate text-sm font-medium text-muted-foreground md:inline">
                {user.email}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border-2 border-input px-4 py-2 text-base font-semibold text-primary transition-colors hover:bg-secondary"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-primary px-5 py-2.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="shrink-0 rounded-full px-4 py-2 text-base font-semibold text-muted-foreground transition-colors hover:bg-secondary"
            activeProps={{ className: "bg-secondary text-primary" }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 text-base leading-relaxed text-muted-foreground sm:px-6">
        <div className="flex items-center gap-3">
          <ShieldMark className="h-9 w-9" />
          <p className="font-display text-lg font-bold text-primary">Second-Look</p>
        </div>
        <p>
          <strong className="text-foreground">Disclaimer:</strong> Second-Look provides educational
          analysis and risk assessments based on common scam patterns. We do not offer legal or
          financial guarantees. Always contact your institution directly via official published
          contact information.
        </p>
        <p>
          <strong className="text-foreground">Privacy:</strong> Messages are analyzed securely and
          only ever visible to your own account. Never submit full passwords, SSNs, or complete
          credit card details.
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
