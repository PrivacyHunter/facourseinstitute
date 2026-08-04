import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Copy,
  Hourglass,
  Loader2,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, SITE } from "@/lib/site";
import { WhatsAppIcon } from "@/components/Layout";

export const Route = createFileRoute("/payment/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Payment — ${params.slug.replace(/-/g, " ")} | FA Course Institute` },
      {
        name: "description",
        content:
          "Send your course fee, upload the payment screenshot and transaction ID. Admin approves and your course unlocks instantly.",
      },
      { property: "og:title", content: "Course Payment — FA Course Institute" },
      {
        property: "og:description",
        content: "Submit your payment proof and get instant access after approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [methodId, setMethodId] = useState<string | null>(null);
  const [trx, setTrx] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: methods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: enrollment } = useQuery({
    enabled: !!course?.id && !!user?.id,
    queryKey: ["enrollment", course?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", course!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const active = methods?.find((m) => m.id === methodId) ?? methods?.[0] ?? null;

  const submit = async () => {
    if (!user || !course) return;
    if (!active) {
      toast.error("No payment method is available yet.");
      return;
    }
    if (trx.trim().length < 4) {
      toast.error("Please enter a valid transaction ID.");
      return;
    }
    if (!file && !enrollment?.proof_url) {
      toast.error("Please upload a screenshot of your payment.");
      return;
    }

    setSaving(true);
    try {
      let proofPath = enrollment?.proof_url ?? null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${course.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        proofPath = path;
      }

      const payload = {
        user_id: user.id,
        course_id: course.id,
        status: "pending",
        transaction_id: trx.trim(),
        proof_url: proofPath,
        payment_method_name: active.name,
        amount: course.price,
        admin_message: note.trim() ? `Student note: ${note.trim()}` : null,
      };

      if (enrollment) {
        const { error } = await supabase
          .from("enrollments")
          .update(payload)
          .eq("id", enrollment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("enrollments").insert(payload);
        if (error) throw error;
      }

      await qc.invalidateQueries({ queryKey: ["enrollment"] });
      toast.success("Payment submitted! Admin will review it shortly.");
      void navigate({ to: "/profile" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit payment.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <p className="py-24 text-center text-muted-foreground">Loading payment details...</p>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="py-24 text-center">
          <h1 className="font-display text-2xl">Course not found</h1>
          <Button asChild className="mt-4">
            <Link to="/courses">Browse courses</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl">Sign in to continue</h1>
          <p className="mt-2 text-muted-foreground">
            You need an account to submit your payment for {course.title}.
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create free account
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const approved = enrollment?.status === "approved";
  const pending = enrollment?.status === "pending";
  const rejected = enrollment?.status === "rejected";

  return (
    <Layout>
      <section className="relative overflow-hidden bg-brand py-14 text-primary-foreground">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="mx-auto w-full max-w-5xl px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            Step 1 · Pay &nbsp;→&nbsp; Step 2 · Upload proof &nbsp;→&nbsp; Step 3 · Get access
          </p>
          <h1 className="mt-3 font-display text-4xl">{course.title}</h1>
          <p className="mt-2 text-primary-foreground/80">
            Course fee:{" "}
            <span className="font-semibold text-gold">
              {formatPrice(course.price, course.is_free)}
            </span>
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl">Choose a payment method</h2>
          {!methods?.length && (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Payment methods are being updated. Please contact us on WhatsApp.
            </p>
          )}
          {methods?.map((m) => {
            const selected = active?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethodId(m.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? "border-primary bg-accent shadow-lift"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-soft"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">{m.name}</span>
                  {selected && <BadgeCheck className="h-5 w-5 text-primary" />}
                </div>
                {m.account_title && (
                  <p className="mt-1 text-sm text-muted-foreground">{m.account_title}</p>
                )}
                {m.account_number && (
                  <p
                    className="mt-2 inline-flex cursor-copy items-center gap-2 rounded-md bg-muted px-2 py-1 font-mono text-sm text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      void navigator.clipboard.writeText(m.account_number!);
                      toast.success("Account number copied");
                    }}
                  >
                    {m.account_number} <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </p>
                )}
                {m.instructions && (
                  <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
                    {m.instructions}
                  </p>
                )}
              </button>
            );
          })}

          <a
            href={SITE.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-soft transition-colors hover:bg-accent"
          >
            <WhatsAppIcon className="h-5 w-5 text-success" /> Need help? Message us on WhatsApp
          </a>
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-6 shadow-lift">
          {approved ? (
            <div className="text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-success" />
              <h2 className="mt-3 font-display text-2xl">Payment approved</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {enrollment?.admin_message ?? "You now have full access to this course."}
              </p>
              <Button asChild className="mt-5 w-full">
                <Link to="/courses/$slug" params={{ slug: course.slug }}>
                  Start learning
                </Link>
              </Button>
              <a
                href={SITE.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                <WhatsAppIcon className="h-4 w-4 text-success" /> Join live training channel
              </a>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl">Submit payment proof</h2>
              {pending && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
                  <Hourglass className="h-4 w-4" /> Your payment is under review
                </p>
              )}
              {rejected && (
                <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="inline-flex items-center gap-2 font-medium">
                    <XCircle className="h-4 w-4" /> Previous submission rejected
                  </p>
                  {enrollment?.admin_message && <p className="mt-1">{enrollment.admin_message}</p>}
                  <p className="mt-1">You can submit again below.</p>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="trx">Transaction ID / TID</Label>
                  <Input
                    id="trx"
                    value={trx}
                    maxLength={80}
                    placeholder="e.g. 1234567890"
                    onChange={(e) => setTrx(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="proof">Payment screenshot</Label>
                  <label
                    htmlFor="proof"
                    className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    <Upload className="h-6 w-6 text-primary" />
                    {file ? (
                      <span className="font-medium text-foreground">{file.name}</span>
                    ) : (
                      <span>Click to upload your receipt image</span>
                    )}
                  </label>
                  <input
                    id="proof"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div>
                  <Label htmlFor="note">Message to admin (optional)</Label>
                  <Textarea
                    id="note"
                    value={note}
                    maxLength={500}
                    rows={3}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any detail you want to share"
                  />
                </div>
                <Button className="w-full" disabled={saving} onClick={() => void submit()}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pending ? "Update submission" : "Submit for approval"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  <Badge variant="secondary">Manual verification</Badge> Approval usually takes a few
                  hours.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
