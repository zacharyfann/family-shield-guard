import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProfileState = {
  email: string | null;
  hasPaid: boolean;
  paidAt: string | null;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileState> => {
    const { supabase, userId, claims } = context;
    const email = typeof claims["email"] === "string" ? (claims["email"] as string) : null;

    const { data } = await supabase
      .from("profiles")
      .select("email, has_paid, paid_at")
      .eq("id", userId)
      .maybeSingle();

    if (!data) {
      await supabase.from("profiles").insert({ id: userId, email });
      return { email, hasPaid: false, paidAt: null };
    }

    return {
      email: data.email ?? email,
      hasPaid: Boolean(data.has_paid),
      paidAt: data.paid_at ?? null,
    };
  });

/**
 * Test-mode checkout. Real card payment is not connected yet, so this grants
 * lifetime access directly for testing the paid experience end to end.
 */
export const completeTestCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileState> => {
    const { supabase, userId, claims } = context;
    const email = typeof claims["email"] === "string" ? (claims["email"] as string) : null;
    const paidAt = new Date().toISOString();

    await supabase
      .from("profiles")
      .upsert({ id: userId, email, has_paid: true, paid_at: paidAt }, { onConflict: "id" });

    return { email, hasPaid: true, paidAt };
  });

export type CaregiverSettings = {
  caregiverEmail: string;
  alertEnabled: boolean;
};

export const getCaregiverSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CaregiverSettings> => {
    const { data } = await context.supabase
      .from("caregiver_settings")
      .select("caregiver_email, alert_enabled")
      .eq("user_id", context.userId)
      .maybeSingle();

    return {
      caregiverEmail: data?.caregiver_email ?? "",
      alertEnabled: Boolean(data?.alert_enabled),
    };
  });

export const saveCaregiverSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CaregiverSettings) => {
    const caregiverEmail = String(input?.caregiverEmail ?? "").trim().slice(0, 255);
    if (caregiverEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caregiverEmail)) {
      throw new Error("Please enter a valid caregiver email address.");
    }
    return { caregiverEmail, alertEnabled: Boolean(input?.alertEnabled) };
  })
  .handler(async ({ data, context }): Promise<CaregiverSettings> => {
    const { error } = await context.supabase.from("caregiver_settings").upsert(
      {
        user_id: context.userId,
        caregiver_email: data.caregiverEmail || null,
        alert_enabled: data.alertEnabled,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Could not save those settings. Please try again.");
    return data;
  });
