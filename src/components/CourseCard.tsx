import { Link } from "@tanstack/react-router";
import { BookOpen, Clock, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/site";

export type CourseSummary = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string | null;
  duration: string | null;
  is_free: boolean;
  price: number;
};

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <article className="group card-lux flex animate-fade-up flex-col overflow-hidden rounded-2xl hover:card-lux-hover">
      <div className="relative aspect-video overflow-hidden bg-brand">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary-foreground/70" />
          </div>
        )}
        <Badge
          variant={course.is_free ? "secondary" : "default"}
          className="absolute left-3 top-3 shadow-soft"
        >
          {formatPrice(course.price, course.is_free)}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
        <h3 className="text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">{course.title}</h3>
        {course.short_description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.short_description}</p>
        )}
        <div className="mt-auto pt-2">
          <Button asChild className="w-full">
            <Link to="/courses/$slug" params={{ slug: course.slug }}>
              View course
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
