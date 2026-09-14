import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisResult } from "./analyze";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function list(items: string[]): string {
  return items
    .slice(0, 5)
    .map((item) => `<li style="margin-bottom:8px;">${escapeHtml(item)}</li>`)
    .join("");
}

export type CaregiverAlertStatus = "sent" | "disabled" | "not_configured" | "failed";

/**
 * Emails the caregiver when a high-risk message is flagged.
 * Never throws — the risk report must reach the user regardless.
 */
export async function sendCaregiverAlert(
  supabase: SupabaseClient,
  userId: string,
  ownerEmail: string | null,
  report: AnalysisResult,
  category: string,
): Promise<CaregiverAlertStatus> {
  try {
    const { data: settings } = await supabase
      .from("caregiver_settings")
      .select("caregiver_email, alert_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    const caregiverEmail = settings?.caregiver_email?.trim() ?? "";
    if (!settings?.alert_enabled || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caregiverEmail)) {
      return "disabled";
    }

    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const resendApiKey = process.env["RESEND_API_KEY"];
    if (!lovableApiKey || !resendApiKey) {
      console.warn("Caregiver alert skipped: Resend email credentials are not configured.");
      return "not_configured";
    }

    const who = ownerEmail ? escapeHtml(ownerEmail) : "someone you look after";
    const html = `
      <div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1b2440;">
        <p style="font-size:20px;font-weight:bold;color:#8c1c2b;margin:0 0 12px;">
          High-risk message flagged by Second-Look
        </p>
        <p style="margin:0 0 16px;">
          ${who} just checked a suspicious ${escapeHtml(category.toLowerCase())} message and it came back
          <strong>High Risk</strong>.
        </p>
        <p style="margin:0 0 16px;"><strong>Summary:</strong> ${escapeHtml(report.headline)}</p>
        <p style="margin:0 0 6px;"><strong>Warning signs found</strong></p>
        <ul style="margin:0 0 16px;padding-left:20px;">${list(report.evidence)}</ul>
        <p style="margin:0 0 6px;"><strong>What they should not do</strong></p>
        <ul style="margin:0 0 16px;padding-left:20px;">${list(report.doNot)}</ul>
        <p style="margin:0 0 16px;background:#fdf3e3;padding:12px 14px;border-left:4px solid #b8791a;">
          Please check in with them before any money is sent, any link is opened, or any code is shared.
          Verify the request by calling the company on a number you look up yourself.
        </p>
        <p style="margin:0;color:#5a6480;font-size:14px;">
          Sent automatically because caregiver alerts are turned on in their Second-Look account.
        </p>
      </div>`;

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: "Second-Look Alerts <onboarding@resend.dev>",
        to: [caregiverEmail],
        subject: "Second-Look alert: high-risk message flagged",
        html,
      }),
    });

    if (!response.ok) {
      console.error(`Caregiver alert email failed [${response.status}]: ${(await response.text()).slice(0, 500)}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("Caregiver alert email failed", err);
    return "failed";
  }
}
