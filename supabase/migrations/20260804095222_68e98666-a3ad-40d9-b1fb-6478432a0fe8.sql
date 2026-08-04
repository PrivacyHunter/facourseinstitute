CREATE OR REPLACE FUNCTION public.has_course_access(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = _course_id AND c.is_free AND c.published
  ) OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = _course_id
      AND e.user_id = _user_id
      AND e.status = 'approved'
      AND (e.access_expires_at IS NULL OR e.access_expires_at > now())
  ) OR public.has_role(_user_id, 'admin')
$$;

REVOKE ALL ON FUNCTION public.has_course_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_course_access(uuid, uuid) TO authenticated, service_role;