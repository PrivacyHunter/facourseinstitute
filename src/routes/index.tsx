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
      <section className="relative overflow-hidden bg-soft">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary shadow-soft">
              <Sparkles className="h-3.5 w-3.5" /> Teaching since {SITE.since}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Learn a real skill.{" "}
              <span className="bg-brand bg-clip-text text-transparent">Change your income.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              {SITE.name} offers easy-to-follow courses in Urdu — some completely free, others
              premium — plus live training sessions where you learn directly from your instructor.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/courses">
                  Browse courses <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/free">Start with free courses</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" /> Lifetime access
              </span>
              <span className="inline-flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" /> Live sessions
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Urdu / Hindi medium
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border shadow-lift">
              <img
                src={heroImage}
                alt="Student learning an online course at home"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 left-5 rounded-xl border border-border bg-card px-4 py-3 shadow-lift">
              <p className="text-2xl font-bold text-primary">100%</p>
              <p className="text-xs text-muted-foreground">Practical, no-fluff training</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Popular courses</h2>
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
                <h2 className="text-3xl font-bold">Live training sessions</h2>
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
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-soft">
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
