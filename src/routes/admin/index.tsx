import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  BookOpen,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Users,
  UserRoundSearch,
  TicketPercent,
  X,
} from "lucide-react";
import { Layout, WhatsAppIcon } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { decideEnrollment, listAdminStudents } from "@/lib/admin-actions.functions";
import { useRealtimeQueries } from "@/hooks/useRealtimeQueries";
import { SITE, formatPrice, statusLabel } from "@/lib/site";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Panel — FA Course Institute" },
      {
        name: "description",
        content:
          "Manage courses, lectures, student payments, approvals, payment methods and live sessions for FA Course Institute.",
      },
      { property: "og:title", content: "Admin Panel — FA Course Institute" },
      { property: "og:description", content: "Institute management dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <p className="py-24 text-center text-muted-foreground">Checking permissions...</p>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl">Admin access</h1>
          <p className="mt-2 text-muted-foreground">Sign in with your admin account.</p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl">Not an admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is protected by account sign-in and the server-verified admin role.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="relative overflow-hidden bg-brand py-12 text-primary-foreground">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="mx-auto w-full max-w-6xl px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            Control room
          </p>
          <h1 className="mt-3 font-display text-4xl">Admin Panel</h1>
          <p className="mt-1 text-primary-foreground/80">
            Courses, lectures, approvals, payments and live sessions — all in one place.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <Tabs defaultValue="enrollments">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="enrollments">
              <Users className="h-4 w-4" /> Approvals
            </TabsTrigger>
            <TabsTrigger value="courses">
              <BookOpen className="h-4 w-4" /> Courses
            </TabsTrigger>
            <TabsTrigger value="lectures">
              <Pencil className="h-4 w-4" /> Lectures
            </TabsTrigger>
            <TabsTrigger value="methods">
              <CreditCard className="h-4 w-4" /> Payments
            </TabsTrigger>
            <TabsTrigger value="live">
              <Radio className="h-4 w-4" /> Live
            </TabsTrigger>
            <TabsTrigger value="messages">
              <Mail className="h-4 w-4" /> Messages
            </TabsTrigger>
            <TabsTrigger value="coupons"><TicketPercent className="h-4 w-4" /> Coupons</TabsTrigger>
            <TabsTrigger value="students"><UserRoundSearch className="h-4 w-4" /> Students</TabsTrigger>
            <TabsTrigger value="audit"><Activity className="h-4 w-4" /> Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="enrollments" className="mt-6">
            <EnrollmentsTab />
          </TabsContent>
          <TabsContent value="courses" className="mt-6">
            <CoursesTab />
          </TabsContent>
          <TabsContent value="lectures" className="mt-6">
            <LecturesTab />
          </TabsContent>
          <TabsContent value="methods" className="mt-6">
            <MethodsTab />
          </TabsContent>
          <TabsContent value="live" className="mt-6">
            <LiveTab />
          </TabsContent>
          <TabsContent value="messages" className="mt-6">
            <MessagesTab />
          </TabsContent>
          <TabsContent value="coupons" className="mt-6"><CouponsTab /></TabsContent>
          <TabsContent value="students" className="mt-6"><StudentsTab /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

/* ---------------- Enrollments / approvals ---------------- */

function EnrollmentsTab() {
  const qc = useQueryClient();
  const decide = useServerFn(decideEnrollment);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(title, slug), profiles:user_id(full_name, email, phone)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  useRealtimeQueries(["enrollments"], [["admin-enrollments"]]);

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 300);
    if (error || !data) { toast.error("Could not open proof image"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const setStatus = async (
    row: { id: string; user_id: string },
    status: "approved" | "rejected" | "pending",
    course?: string | null,
    phone?: string | null,
  ) => {
    setBusy(row.id);
    const custom = msg[row.id]?.trim();
    const message =
      status === "approved"
        ? custom ||
          `Congratulations! Your payment for "${course ?? "the course"}" is approved. Join our live training WhatsApp channel: ${SITE.whatsapp}`
        : status === "rejected"
          ? custom || "Your payment could not be verified. Please resubmit a clear screenshot."
          : custom || null;

    let error: Error | null = null;
    try {
      await decide({ data: { enrollmentId: row.id, status, message } });
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error("Approval failed");
    }
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
    toast.success(`Marked as ${status}`);

    if (status === "approved") {
      const digits = (phone ?? "").replace(/\D/g, "");
      const wa = digits
        ? `https://wa.me/${digits.startsWith("0") ? "92" + digits.slice(1) : digits}?text=${encodeURIComponent(message!)}`
        : SITE.whatsapp;
      window.open(wa, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      {!data?.length && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No payment submissions yet.
        </p>
      )}
      {data?.map((e) => {
        const p = e.profiles as { full_name?: string; email?: string; phone?: string } | null;
        return (
          <div key={e.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg">{e.courses?.title ?? "Course"}</h3>
                <p className="text-sm text-muted-foreground">
                  {p?.full_name ?? "Student"} · {p?.email} {p?.phone ? `· ${p.phone}` : ""}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-mono">{e.transaction_id ?? "—"}</span> ·{" "}
                  {e.payment_method_name ?? "—"} · {formatPrice(e.amount, false)}
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
                {statusLabel(e.status)}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {e.proof_url && (
                <Button size="sm" variant="outline" onClick={() => void openProof(e.proof_url!)}>
                  <ExternalLink className="h-4 w-4" /> View proof
                </Button>
              )}
              {p?.phone && (
                <a
                  href={`https://wa.me/${p.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <WhatsAppIcon className="h-4 w-4 text-success" /> Chat
                </a>
              )}
            </div>

            <Textarea
              className="mt-3"
              rows={2}
              maxLength={500}
              placeholder="Custom message for this student (optional). Approval auto-includes the WhatsApp channel link."
              value={msg[e.id] ?? ""}
              onChange={(ev) => setMsg((m) => ({ ...m, [e.id]: ev.target.value }))}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy === e.id}
                onClick={() => void setStatus(e, "approved", e.courses?.title, p?.phone)}
              >
                <Check className="h-4 w-4" /> Approve &amp; send WhatsApp
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy === e.id}
                onClick={() => void setStatus(e, "rejected", e.courses?.title, p?.phone)}
              >
                <X className="h-4 w-4" /> Unapprove
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === e.id}
                onClick={() => void setStatus(e, "pending", e.courses?.title, p?.phone)}
              >
                Reset to pending
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Courses ---------------- */

type CourseForm = {
  id?: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  thumbnail_url: string;
  category: string;
  level: string;
  language: string;
  instructor: string;
  duration: string;
  price: string;
  is_free: boolean;
  published: boolean;
  featured: boolean;
  access_duration_days: string;
};

const emptyCourse: CourseForm = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  thumbnail_url: "",
  category: "General",
  level: "Beginner",
  language: "Urdu",
  instructor: SITE.name,
  duration: "",
  price: "0",
  is_free: false,
  published: true,
  featured: false,
  access_duration_days: "",
};

function CoursesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CourseForm | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const save = async () => {
    if (!form) return;
    if (form.title.trim().length < 3) {
      toast.error("Title is too short");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug || form.title),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      category: form.category.trim() || "General",
      level: form.level.trim() || "Beginner",
      language: form.language.trim() || "Urdu",
      instructor: form.instructor.trim() || SITE.name,
      duration: form.duration.trim() || null,
      price: form.is_free ? 0 : Number(form.price) || 0,
      is_free: form.is_free,
      published: form.published,
      featured: form.featured,
      access_duration_days: form.access_duration_days ? Number(form.access_duration_days) : null,
    };
    const { error } = form.id
      ? await supabase.from("courses").update(payload).eq("id", form.id)
      : await supabase.from("courses").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? "Course updated" : "Course added");
    setForm(null);
    await qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course and all of its lectures?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Course deleted");
    await qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Courses</h2>
        <Button onClick={() => setForm({ ...emptyCourse })}>
          <Plus className="h-4 w-4" /> New course
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {data?.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg">{c.title}</h3>
                <p className="text-xs text-muted-foreground">/{c.slug}</p>
              </div>
              <Badge variant={c.is_free ? "secondary" : "default"}>
                {formatPrice(c.price, c.is_free)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">{c.category}</span>
              <span className="rounded-full bg-muted px-2 py-0.5">{c.level}</span>
              {!c.published && <span className="text-destructive">Unpublished</span>}
              {c.featured && <span className="text-gold-foreground">Featured</span>}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    id: c.id,
                    title: c.title,
                    slug: c.slug,
                    short_description: c.short_description ?? "",
                    description: c.description ?? "",
                    thumbnail_url: c.thumbnail_url ?? "",
                    category: c.category ?? "General",
                    level: c.level ?? "Beginner",
                    language: c.language ?? "Urdu",
                    instructor: c.instructor ?? SITE.name,
                    duration: c.duration ?? "",
                    price: String(c.price ?? 0),
                    is_free: c.is_free,
                    published: c.published,
                    featured: c.featured,
                    access_duration_days: c.access_duration_days ? String(c.access_duration_days) : "",
                  })
                }
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void remove(c.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit course" : "New course"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={form.slug}
                  placeholder={slugify(form.title)}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <Label>Short description</Label>
                <Input
                  value={form.short_description}
                  onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                />
              </div>
              <div>
                <Label>Full description</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Thumbnail image URL</Label>
                <Input
                  value={form.thumbnail_url}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                />
                {form.thumbnail_url && <img src={form.thumbnail_url} alt="Course thumbnail preview" className="mt-2 aspect-video w-full rounded-md border border-border object-cover" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Level</Label>
                  <Input
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Language</Label>
                  <Input
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={form.duration}
                    placeholder="e.g. 12 hours"
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Instructor</Label>
                  <Input
                    value={form.instructor}
                    onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Price (PKR)</Label>
                  <Input
                    type="number"
                    value={form.price}
                    disabled={form.is_free}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Access days</Label>
                  <Input type="number" min="1" value={form.access_duration_days} placeholder="Blank = lifetime" onChange={(e) => setForm({ ...form, access_duration_days: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.is_free}
                    onCheckedChange={(v) => setForm({ ...form, is_free: v })}
                  />
                  Free course
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.published}
                    onCheckedChange={(v) => setForm({ ...form, published: v })}
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(v) => setForm({ ...form, featured: v })}
                  />
                  Featured
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Lectures ---------------- */

type LectureForm = {
  id?: string;
  course_id: string;
  title: string;
  description: string;
  video_url: string;
  resource_url: string;
  duration: string;
  is_preview: boolean;
  sort_order: string;
  preview_image_url: string;
  content_type: "video" | "drive" | "document" | "external";
};

function LecturesTab() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<string>("");
  const [form, setForm] = useState<LectureForm | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const selected = courseId || courses?.[0]?.id || "";

  const { data: lectures } = useQuery({
    enabled: !!selected,
    queryKey: ["admin-lectures", selected],
    queryFn: async () => {
      const { data } = await supabase
        .from("lectures")
        .select("*")
        .eq("course_id", selected)
        .order("sort_order");
      return data ?? [];
    },
  });

  const save = async () => {
    if (!form) return;
    if (form.title.trim().length < 2) {
      toast.error("Lecture title is too short");
      return;
    }
    setSaving(true);
    const payload = {
      course_id: form.course_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      video_url: form.video_url.trim() || null,
      resource_url: form.resource_url.trim() || null,
      duration: form.duration.trim() || null,
      is_preview: form.is_preview,
      sort_order: Number(form.sort_order) || 0,
      preview_image_url: form.preview_image_url.trim() || null,
      content_type: form.content_type,
    };
    const { error } = form.id
      ? await supabase.from("lectures").update(payload).eq("id", form.id)
      : await supabase.from("lectures").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setForm(null);
    await qc.invalidateQueries({ queryKey: ["admin-lectures"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this lecture?")) return;
    const { error } = await supabase.from("lectures").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["admin-lectures"] });
    toast.success("Lecture deleted");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label>Course</Label>
          <select
            className="mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={selected}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <Button
          disabled={!selected}
          onClick={() =>
            setForm({
              course_id: selected,
              title: "",
              description: "",
              video_url: "",
              resource_url: "",
              duration: "",
              is_preview: false,
              sort_order: String((lectures?.length ?? 0) + 1),
              preview_image_url: "",
              content_type: "video",
            })
          }
        >
          <Plus className="h-4 w-4" /> Add lecture
        </Button>
      </div>

      <ul className="mt-6 space-y-3">
        {lectures?.map((l, i) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft"
          >
            <div className="flex items-center gap-3">
              {l.preview_image_url && <img src={l.preview_image_url} alt="" className="h-14 w-20 rounded-md object-cover" />}
              <div>
              <p className="font-medium">
                {String(i + 1).padStart(2, "0")}. {l.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {l.video_url ? l.video_url : "No video link"} {l.duration ? `· ${l.duration}` : ""}
                {l.is_preview ? " · Free preview" : ""}
              </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    id: l.id,
                    course_id: l.course_id,
                    title: l.title,
                    description: l.description ?? "",
                    video_url: l.video_url ?? "",
                    resource_url: l.resource_url ?? "",
                    duration: l.duration ?? "",
                    is_preview: l.is_preview,
                    sort_order: String(l.sort_order),
                    preview_image_url: l.preview_image_url ?? "",
                    content_type: l.content_type,
                  })
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void remove(l.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
        {!lectures?.length && (
          <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No lectures in this course yet.
          </li>
        )}
      </ul>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit lecture" : "New lecture"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Video link</Label>
                <Input
                  value={form.video_url}
                  placeholder="YouTube / Drive / Vimeo link"
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Preview image URL</Label>
                <Input value={form.preview_image_url} onChange={(e) => setForm({ ...form, preview_image_url: e.target.value })} />
                {form.preview_image_url && <img src={form.preview_image_url} alt="Lecture preview" className="mt-2 aspect-video w-full rounded-md border border-border object-cover" />}
              </div>
              <div>
                <Label>Content type</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value as LectureForm['content_type'] })}>
                  <option value="video">Video</option><option value="drive">Google Drive</option><option value="document">Document</option><option value="external">External</option>
                </select>
              </div>
              <div>
                <Label>Resource / files link</Label>
                <Input
                  value={form.resource_url}
                  onChange={(e) => setForm({ ...form, resource_url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={form.duration}
                    placeholder="e.g. 18 min"
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_preview}
                  onCheckedChange={(v) => setForm({ ...form, is_preview: v })}
                />
                Free preview lecture
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Payment methods ---------------- */

type MethodForm = {
  id?: string;
  name: string;
  account_title: string;
  account_number: string;
  instructions: string;
  is_active: boolean;
  sort_order: string;
};

function MethodsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<MethodForm | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-methods"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_methods").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Method name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      account_title: form.account_title.trim() || null,
      account_number: form.account_number.trim() || null,
      instructions: form.instructions.trim() || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = form.id
      ? await supabase.from("payment_methods").update(payload).eq("id", form.id)
      : await supabase.from("payment_methods").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setForm(null);
    await qc.invalidateQueries({ queryKey: ["admin-methods"] });
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from("payment_methods").update({ is_active }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["admin-methods"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    await supabase.from("payment_methods").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["admin-methods"] });
    toast.success("Deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Payment methods</h2>
        <Button
          onClick={() =>
            setForm({
              name: "",
              account_title: "",
              account_number: "",
              instructions: "",
              is_active: true,
              sort_order: String((data?.length ?? 0) + 1),
            })
          }
        >
          <Plus className="h-4 w-4" /> Add method
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {data?.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg">{m.name}</h3>
                <p className="text-sm text-muted-foreground">{m.account_title}</p>
                <p className="font-mono text-sm">{m.account_number}</p>
              </div>
              <Switch
                checked={m.is_active}
                onCheckedChange={(v) => void toggle(m.id, v)}
                aria-label="Active"
              />
            </div>
            {m.instructions && (
              <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
                {m.instructions}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    id: m.id,
                    name: m.name,
                    account_title: m.account_title ?? "",
                    account_number: m.account_number ?? "",
                    instructions: m.instructions ?? "",
                    is_active: m.is_active,
                    sort_order: String(m.sort_order),
                  })
                }
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void remove(m.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        ))}
        {!data?.length && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No payment methods yet. Add JazzCash, EasyPaisa or a bank account.
          </p>
        )}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit method" : "New payment method"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  placeholder="JazzCash / EasyPaisa / Bank"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Account title</Label>
                <Input
                  value={form.account_title}
                  onChange={(e) => setForm({ ...form, account_title: e.target.value })}
                />
              </div>
              <div>
                <Label>Account number / IBAN</Label>
                <Input
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea
                  rows={3}
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                Active
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Live sessions ---------------- */

type LiveForm = {
  id?: string;
  title: string;
  description: string;
  join_link: string;
  starts_at: string;
  is_active: boolean;
  free_for_all: boolean;
};

function LiveTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<LiveForm | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-live"],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .order("starts_at", { ascending: true });
      return data ?? [];
    },
  });

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      join_link: form.join_link.trim() || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      is_active: form.is_active,
      free_for_all: form.free_for_all,
    };
    const { error } = form.id
      ? await supabase.from("live_sessions").update(payload).eq("id", form.id)
      : await supabase.from("live_sessions").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setForm(null);
    await qc.invalidateQueries({ queryKey: ["admin-live"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    await supabase.from("live_sessions").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: ["admin-live"] });
    toast.success("Deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Live training sessions</h2>
        <Button
          onClick={() =>
            setForm({
              title: "",
              description: "",
              join_link: SITE.whatsapp,
              starts_at: "",
              is_active: true,
              free_for_all: true,
            })
          }
        >
          <Plus className="h-4 w-4" /> New session
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {data?.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft"
          >
            <div>
              <p className="font-display text-lg">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.starts_at ? new Date(s.starts_at).toLocaleString() : "Time TBA"} ·{" "}
                {s.is_active ? "Active" : "Hidden"} ·{" "}
                {s.free_for_all ? "Open to all" : "Enrolled only"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    id: s.id,
                    title: s.title,
                    description: s.description ?? "",
                    join_link: s.join_link ?? "",
                    starts_at: s.starts_at ? s.starts_at.slice(0, 16) : "",
                    is_active: s.is_active,
                    free_for_all: s.free_for_all,
                  })
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void remove(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {!data?.length && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No live sessions scheduled.
          </p>
        )}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit session" : "New live session"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Join link</Label>
                <Input
                  value={form.join_link}
                  onChange={(e) => setForm({ ...form, join_link: e.target.value })}
                />
              </div>
              <div>
                <Label>Starts at</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  Visible
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.free_for_all}
                    onCheckedChange={(v) => setForm({ ...form, free_for_all: v })}
                  />
                  Open to everyone
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Messages ---------------- */

function MessagesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markRead = async (id: string, is_read: boolean) => {
    await supabase.from("contact_messages").update({ is_read }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["admin-messages"] });
  };

  return (
    <div className="space-y-3">
      {!data?.length && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No messages yet.
        </p>
      )}
      {data?.map((m) => (
        <div
          key={m.id}
          className={`rounded-xl border p-4 shadow-soft ${
            m.is_read ? "border-border bg-card" : "border-primary/40 bg-accent"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {m.name} · <span className="text-muted-foreground">{m.email}</span>
              </p>
              {m.subject && <p className="text-sm text-muted-foreground">{m.subject}</p>}
            </div>
            <Button size="sm" variant="outline" onClick={() => void markRead(m.id, !m.is_read)}>
              {m.is_read ? "Mark unread" : "Mark read"}
            </Button>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(m.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
