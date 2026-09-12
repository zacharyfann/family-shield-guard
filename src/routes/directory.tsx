import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDirectory } from "@/lib/directory.functions";
import { PageShell } from "@/components/shell";

const TITLE = "Verified Directory — Official Numbers and Websites | Second-Look";
const DESCRIPTION =
  "Look up the real phone numbers and websites for the USPS, Chase Bank, Amazon, FedEx, and the IRS so you can verify a caller yourself.";

const directoryQuery = queryOptions({ queryKey: ["institutional-directory"], queryFn: () => getDirectory() });

export const Route = createFileRoute("/directory")({
  loader: ({ context }) => context.queryClient.ensureQueryData(directoryQuery),
  errorComponent: () => <PageShell><p role="alert" className="py-12 text-lg">The official directory is unavailable. Please try again later.</p></PageShell>,
  notFoundComponent: () => <PageShell><p>Directory not found.</p></PageShell>,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const { data: entries } = useSuspenseQuery(directoryQuery);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      `${e.brand_name} ${e.verified_domain} ${e.verified_phone}`.toLowerCase().includes(q),
    );
  }, [query, entries]);

  return (
    <PageShell>
      <section className="pt-10 sm:pt-14">
        <h1 className="font-display text-[2rem] font-extrabold leading-tight text-primary sm:text-4xl">
          Verified Directory
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Never call a number from a suspicious message. Look the real one up here, then call it
          yourself.
        </p>

        <label htmlFor="search" className="mt-8 block text-base font-semibold">
          Search for a company or agency
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “Chase”, “Amazon”, or “USPS”"
          className="mt-3 w-full rounded-2xl border-2 border-input bg-background px-4 py-3.5 text-lg transition-colors hover:border-ring"
        />

        <ul className="mt-6 space-y-4">
          {filtered.map((entry) => (
            <li
              key={entry.brand_name}
              className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-panel)] sm:p-6"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Official contact
              </p>
              <h2 className="font-display mt-1 text-xl font-bold text-primary">{entry.brand_name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg">
                <a href={`tel:${entry.verified_phone.replace(/[^0-9+]/g, "")}`} className="font-semibold underline underline-offset-4">
                  {entry.verified_phone}
                </a>
                <a
                  href={`https://${entry.verified_domain}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  {entry.verified_domain}
                </a>
              </div>
              <a href={entry.safe_portal_url} target="_blank" rel="noreferrer noopener" className="mt-4 inline-block font-semibold text-primary underline underline-offset-4">Open official portal ↗</a>
            </li>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="mt-6 rounded-3xl border-2 border-dashed border-input p-6 text-lg text-muted-foreground">
            Nothing matched that search. Try a shorter word, or look the company up on a bill or the
            back of your card.
          </p>
        ) : null}
      </section>
    </PageShell>
  );
}
