import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  Gift,
  Hourglass,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Layout, WhatsAppIcon } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SITE, formatPrice, statusLabel } from "@/lib/site";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Learning Dashboard — FA Course Institute" },
      {
        name: "description",
        content:
          "Track your enrolled courses, lecture progress, payment status and free course access at FA Course Institute.",
      },
      { property: "og:title", content: "My Learning Dashboard — FA Course Institute" },
      { property: "og:description", content: "Your courses, progress and payment status." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    enabled: !!user?.id,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const { data: enrollments } = useQuery({
    enabled: !!user?.id,
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: freeCourses } = useQuery({
    queryKey: ["free-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_free", true)
        .eq("published", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: progress } = useQuery({
    enabled: !!user?.id,
    queryKey: ["my-progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lecture_progress")
        .select("course_id, lecture_id")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const { data: lectureCounts } = useQuery({
    queryKey: ["lecture-counts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("lectures").select("id, course_id");
      const map: Record<string, number> = {};
      (data ?? []).forEach((l) => {
        map[l.course_id] = (map[l.course_id] ?? 0) + 1;
      });
      return map;
    },
  });

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim().slice(0, 80), phone: phone.trim().slice(0, 30) })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      void qc.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  if (loading) {
    return (
      <Layout>
        <p className="py-24 text-center text-muted-foreground">Loading your dashboard...</p>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl">Your learning dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to see your courses, progress and payment status.
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const progressByCourse = (progress ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.course_id] = (acc[p.course_id] ?? 0) + 1;
    return acc;
  }, {});

  const approved = (enrollments ?? []).filter((e) => e.status === "approved");
  const doneLectures = progress?.length ?? 0;

  return (
    <Layout>
      <section className="relative overflow-hidden bg-brand py-14 text-primary-foreground">
        <div className="pointer-events-none absolute -left-16 top-0 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="mx-auto w-full max-w-6xl px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            My dashboard
          </p>
          <h1 className="mt-3 font-display text-4xl">
            {profile?.full_name || user.email?.split("@")[0]}
          </h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Enrolled courses", value: approved.length },
              { label: "Lectures completed", value: doneLectures },
              { label: "Free courses open", value: freeCourses?.length ?? 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-4 py-3 backdrop-blur"
              >
                <p className="font-display text-3xl text-gold">{s.value}</p>
                <p className="text-xs uppercase tracking-wide text-primary-foreground/75">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <h2 className="font-display text-2xl">My courses</h2>
          {!enrollments?.length && (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              You have not enrolled in any paid course yet.{" "}
              <Link to="/courses" className="text-primary underline">
                Browse courses
              </Link>
            </p>
          )}
          {enrollments?.map((e) => {
            const c = e.courses;
            const total = c ? (lectureCounts?.[c.id] ?? 0) : 0;
            const done = c ? (progressByCourse[c.id] ?? 0) : 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <div
                key={e.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl">{c?.title ?? "Course"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(e.amount, false)} · {e.payment_method_name ?? "Manual payment"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      e.status === "approved"
                        ? "default"
                        : e.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {e.status === "approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {e.status === "pending" && <Hourglass className="h-3.5 w-3.5" />}
                    {e.status === "rejected" && <XCircle className="h-3.5 w-3.5" />}
                    {statusLabel(e.status)}
                  </Badge>
                </div>

                {e.admin_message && (
                  <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {e.admin_message}
                  </p>
                )}

                {e.status === "approved" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {done} of {total} lectures completed
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-2" />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {c && (
                    <Button asChild size="sm" variant={e.status === "approved" ? "default" : "outline"}>
                      <Link to="/courses/$slug" params={{ slug: c.slug }}>
                        {e.status === "approved" ? "Continue learning" : "View course"}
                      </Link>
                    </Button>
                  )}
                  {c && e.status !== "approved" && (
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/payment/$slug" params={{ slug: c.slug }}>
                        {e.status === "rejected" ? "Resubmit payment" : "Payment status"}
                      </Link>
                    </Button>
                  )}
                  {e.status === "approved" && (
                    <a
                      href={SITE.whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                    >
                      <WhatsAppIcon className="h-4 w-4 text-success" /> Live training channel
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5">
            <h3 className="inline-flex items-center gap-2 font-display text-xl">
              <Gift className="h-5 w-5 text-gold-foreground" /> My freebie access
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These courses are unlocked for every registered student.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {freeCourses?.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/courses/$slug"
                    params={{ slug: c.slug }}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <BookOpen className="h-4 w-4 text-primary" /> {c.title}
                  </Link>
                </li>
              ))}
              {!freeCourses?.length && (
                <li className="text-sm text-muted-foreground">Free courses coming soon.</li>
              )}
            </ul>
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="inline-flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-4 w-4 text-gold" /> Account details
          </h2>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="phone">WhatsApp number</Label>
            <Input
              id="phone"
              value={phone}
              placeholder="03xx xxxxxxx"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={saving} onClick={() => void saveProfile()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
        </aside>
      </div>
    </Layout>
  );
}
