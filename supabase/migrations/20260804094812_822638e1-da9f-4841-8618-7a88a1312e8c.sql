REVOKE ALL ON FUNCTION public.audit_admin_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_enrollment_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_admin_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_enrollment_status() TO service_role;