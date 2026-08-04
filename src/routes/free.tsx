import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { Layout } from "@/components/Layout";
import { CourseCard, type CourseSummary } from "@/components/CourseCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/free")({
  head: () => ({
    meta: [
      { title: "Free Courses — FA Course Institute" },
      {
        name: "description",
        content:
          "Completely free courses from FA Course Institute. No payment required — sign up and start learning today.",
      },
      { property: "og:title", content: "Free Courses — FA Course Institute" },
      { property: "og:description", content: "Free skill courses, no payment required." },
    ],
  }),
  component: FreePage,
});

function FreePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["free-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,slug,short_description,thumbnail_url,category,level,duration,is_free,price")
        .eq("published", true)
        .eq("is_free", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CourseSummary[];
    },
  });

  return (
    <Layout>
      <section className="border-b border-border bg-soft">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
            <Gift className="h-3.5 w-3.5" /> Freebies
          </span>
          <h1 className="mt-4 text-4xl font-bold text-foreground">Free courses</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            These courses are 100% free. Just create an account and start watching — no payment, no
            approval needed.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        {isLoading ? (
          <p className="py-16 text-center text-muted-foreground">Loading...</p>
        ) : (data ?? []).length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No free courses right now — check back soon.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
