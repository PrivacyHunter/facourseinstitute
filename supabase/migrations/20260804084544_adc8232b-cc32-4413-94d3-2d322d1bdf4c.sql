CREATE TABLE public.lecture_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, lecture_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_progress TO authenticated;
GRANT ALL ON public.lecture_progress TO service_role;
ALTER TABLE public.lecture_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.lecture_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view progress" ON public.lecture_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
