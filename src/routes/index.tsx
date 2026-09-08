import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeMessage,
  buildShareText,
  RISK_LABEL,
  type AnalysisResult,
} from "@/lib/analyze";

const TITLE = "FamilyShield — Check a Suspicious Text, Email, or Payment Request";
const DESCRIPTION =
  "A second opinion before your family clicks, pays, or responds. Paste a suspicious message and get a plain-language risk report you can share with relatives.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

const CATEGORIES = [
  { value: "sms", label: "Text / SMS" },
  { value: "email", label: "Email" },
  { value: "job", label: "Job Offer" },
  { value: "rental", label: "Rental Listing" },
  { value: "payment", label: "Payment Request / Zelle" },
  { value: "other", label: "Other" },
];

const RISK_STYLES = {
  high: {
    badge: "bg-risk-high text-risk-high-foreground",
    panel: "bg-risk-high-surface border-risk-high",
    text: "text-risk-high",
  },
  medium: {
    badge: "bg-risk-medium text-risk-medium-foreground",
    panel: "bg-risk-medium-surface border-risk-medium",
    text: "text-risk-medium-foreground",
  },
  safe: {
    badge: "bg-risk-safe text-risk-safe-foreground",
    panel: "bg-risk-safe-surface border-risk-safe",
    text: "text-risk-safe",
  },
} as const;

function ShieldMark() {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" fill="none">
        <path
          d="M12 2.5 4.5 5.6v6.2c0 4.5 3.1 8.3 7.5 9.7 4.4-1.4 7.5-5.2 7.5-9.7V5.6L12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="m8.6 12.1 2.4 2.4 4.4-4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Index() {
  const [category, setCategory] = useState("sms");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? "Other";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (trimmed.length < 10) {
      setError("Please paste at least a sentence or two of the message so it can be checked.");
      return;
    }
    if (trimmed.length > 8000) {
      setError("That message is too long. Please paste the most important part (under 8,000 characters).");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address, or leave it blank.");
      return;
    }

    setLoading(true);
    try {
      const analysis = analyzeMessage(trimmed, category);

      let screenshotPath: string | null = null;
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
        const path = `${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("submission-screenshots")
          .upload(path, file);
        if (!uploadError) screenshotPath = path;
      }

      await supabase.from("submissions").insert({
        user_email: email.trim() || null,
        category: categoryLabel,
        raw_content: trimmed,
        screenshot_url: screenshotPath,
        status: "analyzed",
        risk_level: analysis.risk,
      });

      setResult(analysis);
      setShowModal(true);
      setCopied(false);
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    } catch {
      setError("Something went wrong while checking that message. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!result) return;
    const text = buildShareText(result, categoryLabel);
    try {
      if (navigator.share) {
        await navigator.share({ title: "FamilyShield risk report", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      /* user cancelled sharing */
    }
  }

  const styles = result ? RISK_STYLES[result.risk] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <ShieldMark />
            <div className="min-w-0">
              <p className="font-display truncate text-lg font-bold text-primary">FamilyShield</p>
              <p className="hidden text-sm text-muted-foreground sm:block">
                A second opinion before your family clicks, pays, or responds.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Check a Message
          </button>
        </div>
        <p className="border-t border-border px-4 py-2 text-center text-sm text-muted-foreground sm:hidden">
          A second opinion before your family clicks, pays, or responds.
        </p>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        <section className="pt-8 pb-6">
          <h1 className="text-3xl font-bold leading-tight text-primary sm:text-4xl">
            Analyze a Suspicious Request
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            Paste a text, email, or payment request. In seconds you'll get a clear risk level, the
            exact warning signs, and safe steps to check it yourself.
          </p>
        </section>

        <div
          ref={formRef}
          className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-panel)] sm:p-7"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-6">
              <div>
                <label htmlFor="category" className="block text-base font-semibold">
                  What kind of message is it?
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-lg"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="content" className="block text-base font-semibold">
                  Paste the message
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={7}
                  maxLength={8000}
                  placeholder="Paste the text, link, or email here..."
                  className="mt-2 w-full resize-y rounded-xl border-2 border-input bg-background px-4 py-3 text-lg leading-relaxed"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Never paste full passwords, Social Security numbers, or complete card details.
                </p>
              </div>

              <div>
                <label htmlFor="screenshot" className="block text-base font-semibold">
                  Upload a screenshot or photo <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-2 w-full rounded-xl border-2 border-dashed border-input bg-background px-4 py-3 text-base file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-secondary-foreground"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-base font-semibold">
                  Where should we send your risk report?
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-lg"
                />
              </div>

              {error ? (
                <p role="alert" className="rounded-xl border-2 border-destructive bg-risk-high-surface px-4 py-3 text-base font-medium text-destructive">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Message Now"
                )}
              </button>
            </div>
          </form>
        </div>

        {result && styles ? (
          <section ref={resultsRef} className="mt-10 scroll-mt-24" aria-live="polite">
            <div className={`rounded-2xl border-2 p-5 sm:p-7 ${styles.panel}`}>
              <span className={`inline-block rounded-full px-4 py-1.5 text-base font-bold ${styles.badge}`}>
                {RISK_LABEL[result.risk]}
              </span>
              <h2 className="mt-4 text-2xl font-bold leading-snug">{result.headline}</h2>
              <p className="mt-2 text-base text-muted-foreground">Category checked: {categoryLabel}</p>
            </div>

            <h3 className="mt-8 text-xl font-bold">Why This Score Matters</h3>

            <ResultBlock title="Specific evidence & warning signs" items={result.evidence} />
            <ResultBlock title="What cannot be verified" items={result.unverifiable} />
            <ResultBlock title="What NOT to do" items={result.doNot} emphasis />
            <ResultBlock title="Safe next steps" items={result.nextSteps} />

            <button
              type="button"
              onClick={handleShare}
              className="mt-7 w-full rounded-xl border-2 border-primary bg-card px-6 py-4 text-lg font-bold text-primary transition-colors hover:bg-secondary"
            >
              {copied ? "Copied — paste it into a text message" : "Share with Family"}
            </button>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-border bg-secondary">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-base leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">Disclaimer:</strong> FamilyShield provides educational
            analysis and risk assessments based on common scam patterns. We do not offer legal or
            financial guarantees. Always contact your institution directly via official published
            contact information.
          </p>
          <p>
            <strong className="text-foreground">Privacy:</strong> Messages are analyzed securely and
            automatically purged after analysis. Never submit full passwords, SSNs, or complete credit
            card details.
          </p>
        </div>
      </footer>

      {showModal ? (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-foreground/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-[var(--shadow-panel)]">
            <h2 id="success-title" className="text-xl font-bold text-primary">
              Your report is ready
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              We checked the message and saved this request{email.trim() ? ` for ${email.trim()}` : ""}.
              Scroll down to read the full breakdown.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-5 w-full rounded-xl bg-primary px-5 py-3.5 text-lg font-bold text-primary-foreground hover:bg-primary/90"
            >
              See my results
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultBlock({
  title,
  items,
  emphasis = false,
}: {
  title: string;
  items: string[];
  emphasis?: boolean;
}) {
  return (
    <div
      className={`mt-4 rounded-2xl border p-5 ${
        emphasis ? "border-risk-high bg-risk-high-surface" : "border-border bg-card"
      }`}
    >
      <h4 className={`text-lg font-bold ${emphasis ? "text-risk-high" : "text-primary"}`}>{title}</h4>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-base leading-relaxed">
            <span aria-hidden="true" className={emphasis ? "text-risk-high" : "text-primary"}>
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
