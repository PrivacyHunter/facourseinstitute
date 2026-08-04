
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  whatsapp text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  description text,
  thumbnail_url text,
  category text DEFAULT 'General',
  level text DEFAULT 'Beginner',
  language text DEFAULT 'Urdu',
  instructor text DEFAULT 'FA Course Institute',
  is_free boolean NOT NULL DEFAULT false,
  price numeric NOT NULL DEFAULT 0,
  duration text,
  published boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING (published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  proof_url text,
  payment_method_name text,
  amount numeric DEFAULT 0,
  admin_message text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own enrollments" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Users update own pending enrollments" ON public.enrollments FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending') WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER enrollments_updated BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.has_course_access(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.is_free AND c.published)
      OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = _course_id AND e.user_id = _user_id AND e.status = 'approved')
      OR public.has_role(_user_id,'admin')
$$;

CREATE TABLE public.lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text,
  resource_url text,
  duration text,
  is_preview boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lectures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;
GRANT ALL ON public.lectures TO service_role;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Preview lectures are public" ON public.lectures FOR SELECT USING (
  is_preview AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.published)
);
CREATE POLICY "Enrolled users view lectures" ON public.lectures FOR SELECT TO authenticated USING (public.has_course_access(auth.uid(), course_id));
CREATE POLICY "Admins manage lectures" ON public.lectures FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER lectures_updated BEFORE UPDATE ON public.lectures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  join_link text,
  starts_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  free_for_all boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active sessions" ON public.live_sessions FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage sessions" ON public.live_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER live_sessions_updated BEFORE UPDATE ON public.live_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_title text,
  account_number text,
  instructions text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage payment methods" ON public.payment_methods FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER payment_methods_updated BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a message" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage messages" ON public.contact_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users upload own proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

INSERT INTO public.site_settings (key, value) VALUES
  ('site_name','FA Course Institute'),
  ('tagline','Knowledge is Power'),
  ('since','2023'),
  ('whatsapp_channel','https://whatsapp.com/channel/0029VaDVwyD7T8bQTsUGwN1f'),
  ('contact_email','facourseinstitute@gmail.com'),
  ('contact_phone',''),
  ('about_text','FA Course Institute has been teaching students since 2023. We deliver practical, easy-to-follow courses in Urdu with free and paid options, plus live training sessions so you can learn directly from your instructor.'),
  ('approved_message','Congratulations! Your payment has been verified and your course access is now active. Happy learning!'),
  ('rejected_message','We could not verify your payment. Please check your transaction ID and screenshot, then submit again.'),
  ('pending_message','Your payment has been received and is under review. You will get access as soon as the admin approves it (usually within a few hours).'),
  ('payment_note','After sending the payment, enter your Transaction ID and upload the payment screenshot below.');

INSERT INTO public.payment_methods (name, account_title, account_number, instructions, sort_order) VALUES
  ('EasyPaisa','FA Course Institute','0300-0000000','Send the exact course fee and keep the screenshot.',1),
  ('JazzCash','FA Course Institute','0300-0000000','Send the exact course fee and keep the screenshot.',2),
  ('Bank Transfer','FA Course Institute','PK00 0000 0000 0000 0000','Use your name as the payment reference.',3);

INSERT INTO public.courses (title, slug, short_description, description, category, level, is_free, price, duration, featured, sort_order) VALUES
  ('Freelancing Basics','freelancing-basics','Start your freelancing journey from zero.','A complete beginner course covering profile creation, proposals, client handling and getting your first order.','Freelancing','Beginner', true, 0, '3 hours', true, 1),
  ('Graphic Designing Mastery','graphic-designing-mastery','Learn design tools and land clients.','From design principles to advanced brand identity projects, with practical assignments.','Design','Intermediate', false, 4500, '12 hours', true, 2),
  ('Amazon Virtual Assistant','amazon-virtual-assistant','Become a professional Amazon VA.','Product hunting, listing, PPC and account handling explained step by step in Urdu.','E-Commerce','Intermediate', false, 6000, '15 hours', false, 3),
  ('Computer Basics (Free)','computer-basics-free','Free crash course for absolute beginners.','MS Office, typing, internet, email and everyday computer skills — completely free.','Computer','Beginner', true, 0, '4 hours', false, 4);

INSERT INTO public.lectures (course_id, title, description, video_url, is_preview, sort_order, duration)
SELECT c.id, 'Introduction & Course Roadmap', 'What you will learn and how to follow this course.', '', true, 1, '10 min' FROM public.courses c;

INSERT INTO public.live_sessions (title, description, join_link, starts_at, is_active)
VALUES ('Weekly Live Q&A Session','Join the live class and ask your questions directly from the instructor.','https://whatsapp.com/channel/0029VaDVwyD7T8bQTsUGwN1f', now() + interval '3 days', true);
