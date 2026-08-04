import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, GraduationCap, Radio, Sparkles, Users } from "lucide-react";
import { Layout, WhatsAppIcon } from "@/components/Layout";
import { CourseCard, type CourseSummary } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";
import heroImage from "@/assets/hero-student.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FA Course Institute — Free & Paid Skill Courses in Urdu" },
      {
        name: "description",
        content:
          "Learn freelancing, design, e-commerce and computer skills with FA Course Institute. Free and paid courses plus live training sessions since 2023.",
      },
      { property: "og:title", content: "FA Course Institute — Knowledge is Power" },
      {
        property: "og:description",
        content: "Free and paid online courses with live training sessions. Teaching since 2023.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: courses } = useQuery({
    queryKey: ["home-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,slug,short_description,thumbnail_url,category,level,duration,is_free,price")
        .eq("published", true)
        .order("sort_order")
        .limit(6);
      if (error) throw error;
      return (data ?? []) as CourseSummary[];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["home-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("id,title,description,starts_at,join_link")
        .eq("is_active", true)
        .order("starts_at", { ascending: true })
        .limit(2);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Layout>
      <section className="relative overflow-hidden bg-mesh">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="pointer-events-none absolute -right-24 top-10 hidden h-72 w-72 hex-frame bg-brand opacity-10 lg:block" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-card/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-gold-foreground shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Since {SITE.since}
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-foreground md:text-6xl">
              Knowledge is
              <span className="block text-gold-gradient">Power.</span>
            </h1>
            <div className="rule-gold mt-6" />
            <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              {SITE.name} teaches practical, job-ready skills in Urdu — free courses to get you
              started, premium programs to take you pro, and live training where your instructor
              answers you in real time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/courses">
                  Browse courses <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/free">Start free</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                { k: "Lifetime", v: "Access" },
                { k: "Live", v: "Sessions" },
                { k: "Urdu", v: "Medium" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="font-display text-2xl text-primary">{s.k}</dt>
                  <dd className="text-xs uppercase tracking-wide text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-brand opacity-15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-gold/30 shadow-lift">
              <img
                src={heroImage}
                alt="Student learning an online course at home"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent p-6">
                <p className="font-display text-xl text-background">Practical. No fluff.</p>
                <p className="text-xs text-background/80">
                  <BadgeCheck className="mr-1 inline h-3.5 w-3.5" /> Verified enrollment &amp; admin
                  approved access
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-lift">
              <p className="font-display text-3xl text-gold-gradient">100%</p>
              <p className="text-xs text-muted-foreground">Skill-first training</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl text-foreground">Popular courses</h2>
            <div className="rule-gold mt-3" />
            <p className="mt-1 text-sm text-muted-foreground">
              Free and paid programs, updated regularly.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/courses">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </section>

      {!!sessions?.length && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-16">
          <div className="rounded-2xl bg-brand p-8 text-primary-foreground shadow-lift md:p-12">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="font-display text-4xl">Live training sessions</h2>
                <p className="mt-2 text-primary-foreground/85">
                  Join scheduled live classes, ask questions in real time and get personal guidance.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary">
                <Link to="/live">
                  See schedule <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: GraduationCap,
              title: "Free & paid options",
              text: "Start free, upgrade whenever you are ready. Fees are simple and affordable.",
            },
            {
              icon: BadgeCheck,
              title: "Manual payment verification",
              text: "Send payment, upload the screenshot and get approved access from the admin.",
            },
            {
              icon: Radio,
              title: "Live guidance",
              text: "Regular live sessions plus our WhatsApp channel for announcements.",
            },
          ].map((f) => (
            <div key={f.title} className="card-lux rounded-2xl p-6 hover:card-lux-hover">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-soft">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Stay updated on WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              New courses, free classes and live session alerts.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href={SITE.whatsapp} target="_blank" rel="noreferrer">
              <WhatsAppIcon className="h-4 w-4 text-success" /> Join channel
            </a>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
