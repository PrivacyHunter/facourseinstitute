import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileDown,
  Hourglass,
  Lock,
  PlayCircle,
  Signal,
  XCircle,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/site";
import { useRealtimeQueries } from "@/hooks/useRealtimeQueries";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — FA Course Institute` },
      {
        name: "description",
        content: `Course details, lectures and enrollment for ${params.slug.replace(/-/g, " ")} at FA Course Institute.`,
      },
      { property: "og:title", content: `Course — FA Course Institute` },
      { property: "og:description", content: "Course details, lectures and enrollment." },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  const { data: lectures } = useQuery({
    enabled: !!course?.id,
    queryKey: ["lectures", course?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .eq("course_id", course!.id)
        .order("sort_order");
      if (error) throw error;
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

  const { data: progress } = useQuery({
    enabled: !!course?.id && !!user?.id,
    queryKey: ["progress", course?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lecture_progress")
        .select("lecture_id")
        .eq("user_id", user!.id)
        .eq("course_id", course!.id);
      return (data ?? []).map((r) => r.lecture_id);
    },
  });
  useRealtimeQueries(["lectures", "lecture_progress", "enrollments"], [["lectures", course?.id, user?.id], ["progress", course?.id, user?.id], ["enrollment", course?.id, user?.id]]);

  const toggleDone = async (lectureId: string, done: boolean) => {
    if (!user || !course) return;
    if (done) {
      await supabase
        .from("lecture_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("lecture_id", lectureId);
    } else {
      await supabase
        .from("lecture_progress")
        .insert({ user_id: user.id, course_id: course.id, lecture_id: lectureId });
    }
    await qc.invalidateQueries({ queryKey: ["progress"] });
  };

  if (isLoading) {
    return (
      <Layout>
        <p className="py-24 text-center text-muted-foreground">Loading course...</p>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="py-24 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Course not found</h1>
          <Button asChild className="mt-4">
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const hasAccess =
    isAdmin || course.is_free || (!!enrollment && enrollment.status === "approved");

  return (
    <Layout>
      <section className="border-b border-border bg-soft">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={course.is_free ? "secondary" : "default"}>
                {formatPrice(course.price, course.is_free)}
              </Badge>
              {course.category && <span className="rounded-full bg-muted px-2 py-1">{course.category}</span>}
              {course.level && (
                <span className="inline-flex items-center gap-1">
                  <Signal className="h-3 w-3" /> {course.level}
                </span>
              )}
              {course.duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {course.duration}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-4xl font-bold text-foreground">{course.title}</h1>
            {course.short_description && (
              <p className="mt-3 text-lg text-muted-foreground">{course.short_description}</p>
            )}
            {course.description && (
              <p className="mt-4 whitespace-pre-line text-foreground/90">{course.description}</p>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Instructor: <span className="text-foreground">{course.instructor}</span> · Language:{" "}
              {course.language}
            </p>
          </div>

          <aside className="h-fit rounded-xl border border-border bg-card p-6 shadow-lift">
            <div className="aspect-video overflow-hidden rounded-lg bg-brand">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpen className="h-10 w-10 text-primary-foreground/70" />
                </div>
              )}
            </div>

            <p className="mt-4 text-3xl font-bold text-foreground">
              {formatPrice(course.price, course.is_free)}
            </p>

            {hasAccess ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> You have full access
              </p>
            ) : enrollment?.status === "pending" ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
                <Hourglass className="h-4 w-4" /> Payment under review
              </p>
            ) : enrollment?.status === "rejected" ? (
              <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <p className="inline-flex items-center gap-2 font-medium">
                  <XCircle className="h-4 w-4" /> Payment not approved
                </p>
                {enrollment.admin_message && <p className="mt-1">{enrollment.admin_message}</p>}
              </div>
            ) : null}

            <div className="mt-5">
              {course.is_free ? (
                user ? (
                  <Button className="w-full" disabled>
                    Free — scroll to lectures
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() =>
                      void navigate({ to: "/auth", search: { mode: "signup" } })
                    }
                  >
                    Sign up to watch free
                  </Button>
                )
              ) : hasAccess ? (
                <Button className="w-full" disabled>
                  Enrolled
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() =>
                    user
                      ? void navigate({ to: "/payment/$slug", params: { slug: course.slug } })
                      : void navigate({ to: "/auth", search: { mode: "signup" } })
                  }
                >
                  {enrollment?.status === "pending" ? "View payment status" : "Enroll & pay"}
                </Button>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12">
        <h2 className="text-2xl font-bold text-foreground">Course content</h2>
        {!lectures?.length ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {hasAccess
              ? "Lectures will be added soon."
              : "Lectures are locked. Enroll to unlock the full course."}
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {lectures.map((l, i) => {
              const unlocked = hasAccess || l.is_preview;
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex min-w-[200px] flex-1 items-start gap-3">
                    <span className="mt-0.5 text-sm font-semibold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {l.preview_image_url && <img src={l.preview_image_url} alt={`${l.title} preview`} className="h-16 w-24 rounded-md object-cover" loading="lazy" />}
                    <div>
                      <p className="font-medium text-foreground">{l.title}</p>
                      {l.description && (
                        <p className="text-sm text-muted-foreground">{l.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {l.duration && <span>{l.duration}</span>}
                        {l.is_preview && <Badge variant="secondary">Free preview</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {unlocked && l.video_url ? (
                      <Button asChild size="sm">
                        <a href={l.video_url} target="_blank" rel="noreferrer" download={false}>
                          <PlayCircle className="h-4 w-4" /> View lesson
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        <Lock className="h-4 w-4" /> Locked
                      </Button>
                    )}
                    {unlocked && user && (
                      <Button
                        size="sm"
                        variant={progress?.includes(l.id) ? "secondary" : "outline"}
                        onClick={() => void toggleDone(l.id, !!progress?.includes(l.id))}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {progress?.includes(l.id) ? "Completed" : "Mark done"}
                      </Button>
                    )}
                    {unlocked && l.resource_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={l.resource_url} target="_blank" rel="noreferrer">
                          <FileDown className="h-4 w-4" /> Files
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Layout>
  );
}
