import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { CourseCard, type CourseSummary } from "@/components/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "All Courses — FA Course Institute" },
      {
        name: "description",
        content:
          "Browse every free and paid course at FA Course Institute: freelancing, graphic design, e-commerce, computer basics and more.",
      },
      { property: "og:title", content: "All Courses — FA Course Institute" },
      {
        property: "og:description",
        content: "Browse free and paid skill courses taught in Urdu.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "paid">("all");
  const [category, setCategory] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,slug,short_description,thumbnail_url,category,level,duration,is_free,price")
        .eq("published", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CourseSummary[];
    },
  });

  const categories = useMemo(
    () => ["All", ...Array.from(new Set((data ?? []).map((c) => c.category ?? "General")))],
    [data],
  );

  const list = (data ?? []).filter((c) => {
    if (filter === "free" && !c.is_free) return false;
    if (filter === "paid" && c.is_free) return false;
    if (category !== "All" && (c.category ?? "General") !== category) return false;
    if (q && !`${c.title} ${c.short_description ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });

  return (
    <Layout>
      <section className="border-b border-border bg-soft">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <h1 className="text-4xl font-bold text-foreground">All courses</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Choose a course, start free or send your payment for instant approval by the admin.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "free", "paid"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "free" ? "Free" : "Paid"}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? "secondary" : "ghost"}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-muted-foreground">Loading courses...</p>
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No courses found.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
