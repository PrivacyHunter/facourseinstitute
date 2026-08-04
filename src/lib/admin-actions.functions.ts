import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enrollmentDecisionSchema } from "@/lib/admin.schemas";

export const decideEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => enrollmentDecisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !adminRole) throw new Error("Admin access required");

    const now = new Date();
    const { data: enrollment, error: readError } = await context.supabase
      .from("enrollments")
      .select("id,course_id,user_id,courses(access_duration_days)")
      .eq("id", data.enrollmentId)
      .single();
    if (readError || !enrollment) throw new Error("Enrollment not found");

    const duration = enrollment.courses?.access_duration_days;
    const expiry = data.status === "approved" && duration
      ? new Date(now.getTime() + duration * 86_400_000).toISOString()
      : null;
    const { error } = await context.supabase
      .from("enrollments")
      .update({
        status: data.status,
        admin_message: data.message,
        reviewed_at: now.toISOString(),
        approved_by: data.status === "approved" ? context.userId : null,
        access_started_at: data.status === "approved" ? now.toISOString() : null,
        access_expires_at: expiry,
        receipt_status: data.status === "approved" ? "pending" : "not_applicable",
        whatsapp_status: data.status === "approved" ? "pending" : "not_applicable",
      })
      .eq("id", data.enrollmentId);
    if (error) throw new Error(error.message);
    return { ok: true, expiry };
  });

export const listAdminStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError || !adminRole) throw new Error("Admin access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    if (error) throw new Error(error.message);
    return data.users.map((user) => ({
      id: user.id,
      email: user.email ?? null,
      fullName: typeof user.user_metadata?.['full_name'] === "string" ? user.user_metadata['full_name'] : null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      provider: user.app_metadata?.provider ?? "email",
    }));
  });