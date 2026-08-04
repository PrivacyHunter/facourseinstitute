CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL CHECK (char_length(action) BETWEEN 2 AND 80),
  entity_type text NOT NULL CHECK (char_length(entity_type) BETWEEN 2 AND 80),
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (char_length(type) BETWEEN 2 AND 50),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','whatsapp')),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed','not_applicable')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code = upper(code) AND char_length(code) BETWEEN 3 AND 40),
  discount_type text NOT NULL CHECK (discount_type IN ('fixed','percentage')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > starts_at),
  CHECK (discount_type <> 'percentage' OR discount_value <= 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view active coupons" ON public.coupons FOR SELECT TO authenticated USING ((is_active AND starts_at <= now() AND (expires_at IS NULL OR expires_at > now())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coupon_courses (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_courses TO authenticated;
GRANT ALL ON public.coupon_courses TO service_role;
ALTER TABLE public.coupon_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view coupon eligibility" ON public.coupon_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage coupon eligibility" ON public.coupon_courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.courses ADD COLUMN access_duration_days integer CHECK (access_duration_days IS NULL OR access_duration_days > 0);
ALTER TABLE public.lectures ADD COLUMN preview_image_url text, ADD COLUMN content_type text NOT NULL DEFAULT 'video' CHECK (content_type IN ('video','drive','document','external'));
ALTER TABLE public.enrollments
  ADD COLUMN original_amount numeric,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN coupon_code text,
  ADD COLUMN approved_by uuid,
  ADD COLUMN access_started_at timestamptz,
  ADD COLUMN access_expires_at timestamptz,
  ADD COLUMN receipt_status text NOT NULL DEFAULT 'pending' CHECK (receipt_status IN ('pending','sent','failed','not_applicable')),
  ADD COLUMN whatsapp_status text NOT NULL DEFAULT 'pending' CHECK (whatsapp_status IN ('pending','sent','failed','not_applicable'));

CREATE OR REPLACE FUNCTION public.audit_admin_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row_id uuid;
BEGIN
  row_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, row_id,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;

CREATE TRIGGER audit_courses AFTER INSERT OR UPDATE OR DELETE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_lectures AFTER INSERT OR UPDATE OR DELETE ON public.lectures FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_payment_methods AFTER INSERT OR UPDATE OR DELETE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_coupons AFTER INSERT OR UPDATE OR DELETE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_enrollments AFTER UPDATE ON public.enrollments FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.audit_admin_change();

CREATE OR REPLACE FUNCTION public.notify_enrollment_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE course_title text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT title INTO course_title FROM public.courses WHERE id = NEW.course_id;
    INSERT INTO public.notifications(user_id, enrollment_id, type, title, message, channel, delivery_status)
    VALUES (
      NEW.user_id,
      NEW.id,
      'payment_' || NEW.status,
      CASE WHEN NEW.status = 'approved' THEN 'Payment approved' WHEN NEW.status = 'rejected' THEN 'Payment needs attention' ELSE 'Payment review updated' END,
      COALESCE(NEW.admin_message, CASE WHEN NEW.status = 'approved' THEN 'Your payment for ' || COALESCE(course_title, 'your course') || ' was approved.' WHEN NEW.status = 'rejected' THEN 'Your payment proof could not be verified.' ELSE 'Your payment is under review.' END),
      'in_app',
      'sent'
    );
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER enrollment_status_notification AFTER UPDATE OF status ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.notify_enrollment_status();

CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lectures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lecture_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;