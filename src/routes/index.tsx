import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/shell";

const TITLE = "Second-Look — A Second Opinion Before Your Family Responds";
const DESCRIPTION =
  "Check suspicious texts, emails, and payment requests in seconds. Second-Look explains the warning signs in plain language and shows safe ways to verify. $10 for lifetime access.";

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
  component: LandingPage,
});

const STEPS = [
  {
    n: 1,
    title: "Paste it or photograph it",
    body: "Copy the message in, or just upload a screenshot. Either one is enough — no typing required.",
  },
  {
    n: 2,
    title: "Get a plain-language verdict",
    body: "A clear risk level, the exact warning signs found, and what could not be verified.",
  },
  {
    n: 3,
    title: "Share it with family",
    body: "Send the summary to a relative or caregiver in one tap before anyone clicks or pays.",
  },
];

const SAMPLE_EVIDENCE = [
  'Claims your account is locked and demands action "within 2 hours" to rush your decision.',
  "Asks you to confirm a 6-digit security code — sharing that code hands over access to your account.",
  'The link goes to "chase-secure-verify.top", which is not a real Chase web address.',
  'Tells you not to discuss it with anyone, a strong sign of a scam in progress.',
];

const SAMPLE_STEPS = [
  "Call the number printed on the back of your bank card — never one from a message.",
  "Open your banking app directly to check whether anything is really wrong.",
  "Show the message to a family member before replying.",
];

function LandingPage() {
  return (
    <PageShell>
      <section className="pt-10 pb-4 sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-risk-safe" aria-hidden="true" />
          $10 once · lifetime access
        </span>
        <h1 className="font-display mt-4 text-[2.15rem] font-extrabold leading-[1.12] text-primary sm:text-5xl">
          A second opinion before your family clicks, pays, or responds.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Second-Look reads a suspicious text, email, or payment request and explains — in plain
          words — what's wrong with it and how to check it safely yourself.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/auth"
            className="rounded-2xl bg-primary px-7 py-4 text-center text-lg font-bold text-primary-foreground shadow-[var(--shadow-panel)] transition-colors hover:bg-primary/90"
          >
            Get Lifetime Access — $10
          </Link>
          <Link
            to="/directory"
            className="rounded-2xl border-2 border-input bg-card px-7 py-4 text-center text-lg font-bold text-primary transition-colors hover:bg-secondary"
          >
            Browse verified numbers
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-3xl border border-border bg-card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-base font-bold text-secondary-foreground">
                {step.n}
              </span>
              <h3 className="font-display mt-4 text-lg font-bold text-primary">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
          See a real breakdown
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Here's what a report looks like for a bank text a member checked last week.
        </p>

        <figure className="mt-6 rounded-3xl border-2 border-border bg-secondary/60 p-5 sm:p-6">
          <figcaption className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            The message
          </figcaption>
          <blockquote className="mt-3 text-lg leading-relaxed">
            "CHASE ALERT: Your account is locked after suspicious activity. Confirm your identity
            within 2 hours at chase-secure-verify.top and reply with the 6-digit code we send. Do not
            discuss this with anyone while the investigation is open."
          </blockquote>
        </figure>

        <div className="mt-4 rounded-3xl border-2 border-risk-high bg-risk-high-surface p-6 sm:p-8">
          <span className="inline-flex rounded-full bg-risk-high px-4 py-2 text-base font-bold uppercase tracking-wide text-risk-high-foreground">
            High Risk
          </span>
          <p className="font-display mt-5 text-2xl font-extrabold leading-snug sm:text-3xl">
            This is a bank-impersonation scam — do not reply, click, or share the code.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <SampleBlock title="Specific evidence & warning signs" icon="🔎" items={SAMPLE_EVIDENCE} />
          <SampleBlock
            title="What NOT to do"
            icon="⛔"
            emphasis
            items={[
              "Do not open the link or type anything into that page.",
              "Do not reply with the 6-digit code, even to “cancel” anything.",
              "Do not keep it secret — a real bank never asks for silence.",
            ]}
          />
          <SampleBlock title="Safe next steps" icon="✅" items={SAMPLE_STEPS} />
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-panel)] sm:p-10">
        <h2 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
          One payment. Protection for good.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          $10 unlocks unlimited checks, photo checks, your private history, and caregiver settings —
          no subscription, ever.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-block rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get Lifetime Access — $10
        </Link>
      </section>
    </PageShell>
  );
}

function SampleBlock({
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
      <h3
        className={`font-display flex items-center gap-2.5 text-lg font-bold ${
          emphasis ? "text-risk-high" : "text-primary"
        }`}
      >
        <span aria-hidden="true">{icon}</span>
        {title}
      </h3>
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
