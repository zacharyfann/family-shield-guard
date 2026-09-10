import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/shell";

const TITLE = "Verified Directory — Official Numbers and Websites | Second-Look";
const DESCRIPTION =
  "Look up the real phone numbers and websites for the IRS, Social Security, Medicare, USPS, and major banks so you can verify a caller yourself.";

export const Route = createFileRoute("/directory")({
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

type Entry = { name: string; group: string; phone: string; site: string; note?: string };

const ENTRIES: Entry[] = [
  { name: "IRS (taxes)", group: "Government", phone: "1-800-829-1040", site: "irs.gov", note: "The IRS never demands gift cards or threatens arrest by phone or text." },
  { name: "Social Security Administration", group: "Government", phone: "1-800-772-1213", site: "ssa.gov", note: "Your Social Security number is never suspended." },
  { name: "Medicare", group: "Government", phone: "1-800-633-4227", site: "medicare.gov" },
  { name: "USPS", group: "Delivery", phone: "1-800-275-8777", site: "usps.com", note: "Delivery-fee texts with links are almost always fake." },
  { name: "UPS", group: "Delivery", phone: "1-800-742-5877", site: "ups.com" },
  { name: "FedEx", group: "Delivery", phone: "1-800-463-3339", site: "fedex.com" },
  { name: "Bank of America", group: "Banks", phone: "1-800-432-1000", site: "bankofamerica.com" },
  { name: "Chase", group: "Banks", phone: "1-800-935-9935", site: "chase.com" },
  { name: "Wells Fargo", group: "Banks", phone: "1-800-869-3557", site: "wellsfargo.com" },
  { name: "Citibank", group: "Banks", phone: "1-800-374-9700", site: "citi.com" },
  { name: "Capital One", group: "Banks", phone: "1-800-227-4825", site: "capitalone.com" },
  { name: "Zelle support", group: "Payments", phone: "1-844-428-8542", site: "zellepay.com", note: "Zelle payments work like cash and are rarely refundable." },
  { name: "PayPal", group: "Payments", phone: "1-888-221-1161", site: "paypal.com" },
  { name: "Apple Support", group: "Tech", phone: "1-800-275-2273", site: "support.apple.com" },
  { name: "Amazon", group: "Tech", phone: "1-888-280-4331", site: "amazon.com" },
  { name: "FTC fraud reporting", group: "Report a scam", phone: "1-877-382-4357", site: "reportfraud.ftc.gov" },
  { name: "AARP Fraud Watch Helpline", group: "Report a scam", phone: "1-877-908-3360", site: "aarp.org/fraudwatchnetwork" },
];

function DirectoryPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENTRIES;
    return ENTRIES.filter((e) =>
      `${e.name} ${e.group} ${e.site} ${e.phone}`.toLowerCase().includes(q),
    );
  }, [query]);

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
          placeholder="Try “bank”, “Medicare”, or “USPS”"
          className="mt-3 w-full rounded-2xl border-2 border-input bg-background px-4 py-3.5 text-lg transition-colors hover:border-ring"
        />

        <ul className="mt-6 space-y-4">
          {filtered.map((entry) => (
            <li
              key={entry.name}
              className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-panel)] sm:p-6"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {entry.group}
              </p>
              <h2 className="font-display mt-1 text-xl font-bold text-primary">{entry.name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg">
                <a href={`tel:${entry.phone.replace(/[^0-9+]/g, "")}`} className="font-semibold underline underline-offset-4">
                  {entry.phone}
                </a>
                <a
                  href={`https://${entry.site}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  {entry.site}
                </a>
              </div>
              {entry.note ? (
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">{entry.note}</p>
              ) : null}
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
