CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_course_access(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
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
  ) OR private.has_role(_user_id, 'admin')
$$;