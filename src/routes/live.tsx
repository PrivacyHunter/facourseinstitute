import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Radio } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Training Sessions — FA Course Institute" },
      {
        name: "description",
        content:
          "Join live online training sessions with FA Course Institute instructors. Ask questions in real time and learn faster.",
      },
      { property: "og:title", content: "Live Training Sessions — FA Course Institute" },
      { property: "og:description", content: "Join our live classes and learn in real time." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["live-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("id,title,description,join_link,starts_at,free_for_all")
        .eq("is_active", true)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Layout>
      <section className="border-b border-border bg-soft">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
            <Radio className="h-3.5 w-3.5" /> Live
          </span>
          <h1 className="mt-4 text-4xl font-bold text-foreground">Live training sessions</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Attend scheduled live classes, ask your questions directly and get personal guidance
            from the instructor.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12">
        {isLoading ? (
          <p className="py-16 text-center text-muted-foreground">Loading...</p>
        ) : (data ?? []).length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No live session scheduled right now. Follow our WhatsApp channel for announcements.
          </p>
        ) : (
          <div className="space-y-4">
            {(data ?? []).map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="min-w-[240px] flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                    {s.free_for_all && <Badge variant="secondary">Open for all</Badge>}
                  </div>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  )}
                  {s.starts_at && (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-primary">
                      <CalendarClock className="h-4 w-4" />
                      {new Date(s.starts_at).toLocaleString()}
                    </p>
                  )}
                </div>
                {s.join_link && (
                  <Button asChild>
                    <a href={s.join_link} target="_blank" rel="noreferrer">
                      Join session
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
