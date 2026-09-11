import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/shell";
import { getCaregiverSettings, saveCaregiverSettings } from "@/lib/account.functions";

const TITLE = "Caregiver Alerts — Second-Look";
const DESCRIPTION =
  "Save a trusted caregiver's email address and choose whether they should be looped in when a risky message is checked.";

export const Route = createFileRoute("/_authenticated/caregivers")({
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
  component: CaregiversPage,
});

function CaregiversPage() {
  const fetchSettings = useServerFn(getCaregiverSettings);
  const save = useServerFn(saveCaregiverSettings);
  const queryClient = useQueryClient();

  const settings = useQuery({ queryKey: ["caregiver-settings"], queryFn: () => fetchSettings() });

  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setCaregiverEmail(settings.data.caregiverEmail);
    setAlertEnabled(settings.data.alertEnabled);
  }, [settings.data]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const trimmed = caregiverEmail.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address, or leave it blank.");
      return;
    }

    setBusy(true);
    try {
      await save({ data: { caregiverEmail: trimmed, alertEnabled } });
      await queryClient.invalidateQueries({ queryKey: ["caregiver-settings"] });
      setSaved(true);
    } catch {
      setError("Those settings couldn't be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl pt-10 sm:pt-14">
        <h1 className="font-display text-[2rem] font-extrabold leading-tight text-primary sm:text-4xl">
          Caregiver Alerts
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Name someone you trust — an adult child, a relative, a friend — so there's always a second
          pair of eyes on a suspicious request.
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 space-y-7 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-panel)] sm:p-8"
        >
          <div>
            <label htmlFor="caregiver-email" className="block text-base font-semibold">
              Caregiver's email address
            </label>
            <input
              id="caregiver-email"
              type="email"
              value={caregiverEmail}
              onChange={(e) => setCaregiverEmail(e.target.value)}
              maxLength={255}
              placeholder="caregiver@example.com"
              className="mt-3 w-full rounded-2xl border-2 border-input bg-background px-4 py-3.5 text-lg transition-colors hover:border-ring"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-4 rounded-2xl border-2 border-input bg-background p-4">
            <input
              type="checkbox"
              checked={alertEnabled}
              onChange={(e) => setAlertEnabled(e.target.checked)}
              className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-lg font-semibold">Turn caregiver alerts on</span>
              <span className="mt-1 block text-base leading-relaxed text-muted-foreground">
                Keep this on so your caregiver is included as soon as alerts start going out.
              </span>
            </span>
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border-2 border-destructive bg-risk-high-surface px-4 py-3.5 text-base font-medium text-destructive"
            >
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="rounded-2xl border-2 border-risk-safe bg-risk-safe-surface px-4 py-3.5 text-base font-medium">
              Saved. Your caregiver settings are stored on your account.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || settings.isLoading}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
          >
            {busy ? "Saving..." : "Save caregiver settings"}
          </button>
        </form>

        <p className="mt-6 rounded-2xl border-2 border-risk-medium bg-risk-medium-surface px-5 py-4 text-base leading-relaxed">
          <strong>Please note:</strong> no emails are being sent yet. Your caregiver's details and
          your on/off choice are saved now, and alerts will use them once sending is switched on.
        </p>
      </section>
    </PageShell>
  );
}
