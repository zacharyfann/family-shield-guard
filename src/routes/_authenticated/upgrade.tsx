import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/shell";
import { completeTestCheckout, getMyProfile } from "@/lib/account.functions";

const TITLE = "Get Lifetime Access — Second-Look";
const DESCRIPTION =
  "One payment of $10 unlocks unlimited scam checks on Second-Look for life, for you and the family members you help.";

export const Route = createFileRoute("/_authenticated/upgrade")({
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
  component: UpgradePage,
});

const INCLUDED = [
  "Unlimited message, email, and payment-request checks",
  "Photo checks — upload a screenshot, no typing needed",
  "Plain-language risk reports you can share with family",
  "Your own private history of everything you've checked",
  "Verified Directory of official phone numbers and websites",
  "Caregiver alert settings for the people you look after",
];

function UpgradePage() {
  const fetchProfile = useServerFn(getMyProfile);
  const runCheckout = useServerFn(completeTestCheckout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  async function handleCheckout() {
    setError(null);
    setBusy(true);
    try {
      await runCheckout();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/check" });
    } catch {
      setError("That didn't go through. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl pt-10 sm:pt-14">
        <h1 className="font-display text-[2rem] font-extrabold leading-tight text-primary sm:text-4xl">
          Get Lifetime Access — $10
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          One payment. No subscription, no renewals. Second-Look Lifetime Protection stays with your
          account for good.
        </p>

        {profile.data?.hasPaid ? (
          <p className="mt-8 rounded-2xl border-2 border-risk-safe bg-risk-safe-surface px-5 py-4 text-lg font-semibold">
            You already have lifetime access. Head to Check a Message any time.
          </p>
        ) : null}

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-panel)] sm:p-8">
          <p className="font-display text-5xl font-extrabold text-primary">
            $10
            <span className="ml-2 align-middle text-lg font-semibold text-muted-foreground">
              once, forever
            </span>
          </p>

          <ul className="mt-7 space-y-3.5">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3 text-base leading-relaxed sm:text-lg">
                <span aria-hidden="true" className="text-risk-safe">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-2xl border-2 border-destructive bg-risk-high-surface px-4 py-3.5 text-base font-medium text-destructive"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={busy}
            className="mt-8 w-full rounded-2xl bg-primary px-6 py-4.5 text-lg font-bold text-primary-foreground shadow-[var(--shadow-panel)] transition-colors hover:bg-primary/90 disabled:opacity-70"
          >
            {busy ? "Unlocking your account..." : "Get Lifetime Access — $10"}
          </button>

          <p className="mt-4 rounded-2xl border-2 border-risk-medium bg-risk-medium-surface px-4 py-3.5 text-base leading-relaxed">
            <strong>Test mode:</strong> card payment isn't switched on yet, so this button unlocks
            your account right away without charging anything. Real checkout will replace it once
            payments are connected.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
