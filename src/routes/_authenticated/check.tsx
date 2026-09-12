import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/shell";
import { getMyProfile } from "@/lib/account.functions";
import { analyzeWithAI, type AnalyzeResponse } from "@/lib/analyze.functions";
import { buildShareText, RISK_LABEL } from "@/lib/analyze";

const TITLE = "Check a Message — Second-Look";
const DESCRIPTION =
  "Paste a suspicious text, email, or payment request — or upload a screenshot — and get a plain-language risk report you can share with family.";

export const Route = createFileRoute("/_authenticated/check")({
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
  component: CheckPage,
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
  high: { badge: "bg-risk-high text-risk-high-foreground", panel: "bg-risk-high-surface border-risk-high" },
  medium: {
    badge: "bg-risk-medium text-risk-medium-foreground",
    panel: "bg-risk-medium-surface border-risk-medium",
  },
  safe: { badge: "bg-risk-safe text-risk-safe-foreground", panel: "bg-risk-safe-surface border-risk-safe" },
} as const;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
        {n}
      </span>
      <span>{children}</span>
    </span>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => resolve(String(reader.result ?? "").replace(/^data:[^,]+,/, ""));
    reader.readAsDataURL(file);
  });
}

function CheckPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  if (profile.isLoading) {
    return (
      <PageShell>
        <p className="pt-16 text-center text-lg text-muted-foreground">Loading your account...</p>
      </PageShell>
    );
  }

  if (!profile.data?.hasPaid) {
    return (
      <PageShell>
        <section className="mx-auto max-w-2xl pt-12 text-center sm:pt-16">
          <h1 className="font-display text-[2rem] font-extrabold leading-tight text-primary sm:text-4xl">
            Unlock message checking
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Second-Look Lifetime Protection is a single $10 payment. After that you can check as many
            suspicious messages as you like, forever.
          </p>
          <Link
            to="/upgrade"
            className="mt-8 inline-block rounded-2xl bg-primary px-7 py-4 text-lg font-bold text-primary-foreground shadow-[var(--shadow-panel)] transition-colors hover:bg-primary/90"
          >
            Get Lifetime Access — $10
          </Link>
        </section>
      </PageShell>
    );
  }

  return <Checker />;
}

function Checker() {
  const [category, setCategory] = useState("sms");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runAnalysis = useServerFn(analyzeWithAI);

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? "Other";

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = content.trim();
    const hasText = trimmed.length >= 10;

    if (!hasText && !file) {
      setError(
        "Add something to check: paste at least a sentence of the message, or upload a screenshot of it.",
      );
      return;
    }
    if (trimmed.length > 8000) {
      setError("That message is too long. Please paste the most important part.");
      return;
    }
    if (file && file.size > MAX_IMAGE_BYTES) {
      setError("That image is larger than 6 MB. Please upload a smaller photo or screenshot.");
      return;
    }

    setLoading(true);
    try {
      let imageBase64: string | null = null;
      if (file) {
        try {
          imageBase64 = await fileToBase64(file);
        } catch {
          imageBase64 = null;
        }
      }

      const analysis = await runAnalysis({
        data: {
          content: hasText ? trimmed : "",
          category: categoryLabel,
          imageBase64,
          imageMimeType: file?.type ?? null,
        },
      });

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      let imagePath: string | null = null;
      if (file && userId) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
        const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("submission-screenshots")
          .upload(path, file);
        if (!uploadError) imagePath = path;
      }

      if (userId) {
        const { error: saveError } = await supabase.from("submissions").insert({
          user_id: userId,
          category: categoryLabel,
          raw_text: hasText ? trimmed : null,
          image_url: imagePath,
          risk_score: analysis.risk,
          domain_data: analysis.domain_data,
          ai_analysis: analysis,
        });
        if (saveError) setError("Your report is ready, but it could not be saved. Please try again later.");
      }

      setUsedFallback(analysis.source === "fallback");
      setResult(analysis);
      setCopied(false);
      window.setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        250,
      );
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
        await navigator.share({ title: "Second-Look risk report", text });
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
    <PageShell>
      <section className="pt-10 pb-8 sm:pt-12">
        <h1 className="font-display text-[2rem] font-extrabold leading-[1.15] text-primary sm:text-4xl">
          Analyze a Suspicious Request
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Paste a text, email, or payment request — or just upload a screenshot. In seconds you'll get
          a clear risk level, the exact warning signs, and safe steps to check it yourself.
        </p>
      </section>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border bg-secondary/60 px-5 py-4 sm:px-8">
          <h2 className="font-display text-lg font-bold text-primary">Check a message</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Give us the words, a screenshot, or both — whichever is easier.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-7 p-5 sm:p-8">
          <div>
            <label htmlFor="category" className="block text-base font-semibold">
              <StepLabel n={1}>What kind of message is it?</StepLabel>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-3 w-full rounded-2xl border-2 border-input bg-background px-4 py-3.5 text-lg font-medium transition-colors hover:border-ring"
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
              <StepLabel n={2}>
                Paste the message{" "}
                <span className="font-normal text-muted-foreground">(or skip and add a photo)</span>
              </StepLabel>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              maxLength={8000}
              placeholder="Paste the text, link, or email here..."
              className="mt-3 w-full resize-y rounded-2xl border-2 border-input bg-background px-4 py-3.5 text-lg leading-relaxed transition-colors hover:border-ring"
            />
            <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <span aria-hidden="true">🔒</span>
              Never paste full passwords, Social Security numbers, or complete card details.
            </p>
          </div>

          <div>
            <span className="block text-base font-semibold">
              <StepLabel n={3}>
                Upload a screenshot or photo{" "}
                <span className="font-normal text-muted-foreground">(enough on its own)</span>
              </StepLabel>
            </span>

            <input
              ref={fileInputRef}
              id="screenshot"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />

            {file && preview ? (
              <div className="mt-3 flex items-center gap-4 rounded-2xl border-2 border-input bg-background p-3">
                <img
                  src={preview}
                  alt="Preview of the screenshot you uploaded"
                  className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · ready to check
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="shrink-0 rounded-lg px-3 py-2 text-base font-semibold text-destructive underline underline-offset-4"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                htmlFor="screenshot"
                className="mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-input bg-background px-4 py-7 text-center transition-colors hover:border-ring hover:bg-secondary/50"
              >
                <span className="text-2xl" aria-hidden="true">
                  📷
                </span>
                <span className="text-lg font-semibold text-primary">Choose a photo</span>
                <span className="text-sm text-muted-foreground">
                  A picture of the text or email is enough — no typing needed
                </span>
              </label>
            )}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border-2 border-destructive bg-risk-high-surface px-4 py-3.5 text-base font-medium text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="sticky bottom-3 z-10">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground shadow-[var(--shadow-panel)] transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Checking it carefully...
                </>
              ) : (
                "Analyze Message Now"
              )}
            </button>
          </div>
        </form>
      </div>

      {result && styles ? (
        <section ref={resultsRef} className="mt-12 scroll-mt-24" aria-live="polite">
          <div className={`rounded-3xl border-2 p-6 sm:p-8 ${styles.panel}`}>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-bold uppercase tracking-wide ${styles.badge}`}
            >
              {RISK_LABEL[result.risk]}
            </span>
            <h2 className="font-display mt-5 text-2xl font-extrabold leading-snug sm:text-3xl">
              {result.headline}
            </h2>
            <p className="mt-3 text-base font-medium text-muted-foreground">
              Checked as: {categoryLabel}
              {file ? (usedFallback ? " · screenshot review unavailable" : " · screenshot reviewed") : ""}
            </p>
          </div>

          {usedFallback ? (
            <p className="mt-4 rounded-2xl border-2 border-risk-medium bg-risk-medium-surface px-4 py-3.5 text-base leading-relaxed">
              The detailed review could not be completed just now, so this report uses our built-in
              scam-pattern checks. Please treat it as a starting point and verify independently.
            </p>
          ) : null}

          <section className="mt-8 border-y border-border py-6" aria-label="Domain analysis">
            <h3 className="font-display text-xl font-bold text-primary">Domain Analysis</h3>
            {!result.domain_data.directory_available && <p className="mt-3 text-risk-medium">Official domain comparisons are unavailable right now.</p>}
            {result.domain_data.image_status === "unavailable" && <p className="mt-3">Links in the screenshot could not be checked.</p>}
            {result.domain_data.findings.length === 0 && <p className="mt-3">No readable domains were found. This does not mean the message is safe.</p>}
            <ul className="mt-4 space-y-4">
              {result.domain_data.findings.map(f => <li key={f.hostname} className="break-words">
                <p className="font-bold">{f.hostname}</p>
                <p className="text-sm text-muted-foreground">Root domain: {f.root_domain}</p>
                <p className={f.status === "mismatch" || f.status === "lookalike" ? "mt-1 font-semibold text-risk-high" : "mt-1"}>{f.explanation}</p>
              </li>)}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">{result.domain_data.limitations}</p>
            <Link to="/directory" className="mt-4 inline-block font-semibold text-primary underline">Find official contact details</Link>
          </section>

          <h3 className="font-display mt-10 text-xl font-bold text-primary sm:text-2xl">
            Why This Score Matters
          </h3>

          <div className="mt-4 space-y-4">
            <ResultBlock title="Specific evidence & warning signs" items={result.evidence} icon="🔎" />
            <ResultBlock title="What cannot be verified" items={result.unverifiable} icon="❓" />
            <ResultBlock title="What NOT to do" items={result.doNot} icon="⛔" emphasis />
            <ResultBlock title="Safe next steps" items={result.nextSteps} icon="✅" />
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="mt-8 w-full rounded-2xl border-2 border-primary bg-card px-6 py-4 text-lg font-bold text-primary transition-colors hover:bg-secondary"
          >
            {copied ? "Copied — paste it into a text message" : "Share with Family"}
          </button>
        </section>
      ) : null}
    </PageShell>
  );
}

export function ResultBlock({
  title,
  items,
  icon,
  emphasis = false,
}: {
  title: string;
  items: string[];
  icon: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border-2 p-5 sm:p-6 ${
        emphasis ? "border-risk-high bg-risk-high-surface" : "border-border bg-card"
      }`}
    >
      <h4
        className={`font-display flex items-center gap-2.5 text-lg font-bold ${
          emphasis ? "text-risk-high" : "text-primary"
        }`}
      >
        <span aria-hidden="true">{icon}</span>
        {title}
      </h4>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-base leading-relaxed">
            <span
              aria-hidden="true"
              className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                emphasis ? "bg-risk-high" : "bg-primary"
              }`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
