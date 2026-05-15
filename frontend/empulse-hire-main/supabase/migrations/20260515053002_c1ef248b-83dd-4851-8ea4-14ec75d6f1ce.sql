
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin','hr','panelist');
CREATE TYPE public.engineering_level AS ENUM ('E0','E1','E2','E3','E4','E5','E6','E7');
CREATE TYPE public.candidate_status AS ENUM ('pending','scheduled','in_progress','selected','rejected','manual_intervention');
CREATE TYPE public.interview_status AS ENUM ('awaiting_candidate_selection','scheduled','in_progress','completed','cancelled');
CREATE TYPE public.interview_result AS ENUM ('pending','selected','rejected','next_round');

-- engineering_levels reference table
CREATE TABLE public.engineering_levels (
  code public.engineering_level PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT
);
INSERT INTO public.engineering_levels (code, title, description) VALUES
  ('E0','Intern','Internship level'),
  ('E1','Software Engineer',NULL),
  ('E2','Senior Software Engineer',NULL),
  ('E3','Lead Engineer',NULL),
  ('E4','Principal Engineer',NULL),
  ('E5','Engineering Manager',NULL),
  ('E6','Senior Engineering Manager',NULL),
  ('E7','Head of Department',NULL);

-- allowed_users: whitelist of HR / admin / panelist accounts
CREATE TABLE public.allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  designation TEXT,
  level_code public.engineering_level,
  roles_managing TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_allowed(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_users au
    JOIN auth.users u ON u.id = _user_id
    WHERE au.email = u.email AND au.is_active = true
  );
$$;

-- candidates
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  level_code public.engineering_level NOT NULL,
  role_applied TEXT NOT NULL,
  resume_url TEXT,
  status public.candidate_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  added_by UUID,
  added_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- panelists
CREATE TABLE public.panelists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  emp_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  level_code public.engineering_level NOT NULL,
  position TEXT,
  eligible_interview_levels public.engineering_level[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_interview_date TIMESTAMPTZ,
  total_interviews INTEGER NOT NULL DEFAULT 0,
  total_selected INTEGER NOT NULL DEFAULT 0,
  added_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- hr_panelist_mapping
CREATE TABLE public.hr_panelist_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_id UUID NOT NULL,
  panelist_id UUID NOT NULL REFERENCES public.panelists(id) ON DELETE CASCADE,
  UNIQUE(hr_id, panelist_id)
);

-- interviews
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  panelist_id UUID REFERENCES public.panelists(id),
  hr_id UUID NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  interview_type TEXT NOT NULL DEFAULT 'Technical',
  scheduled_date DATE,
  slot_time TEXT,
  status public.interview_status NOT NULL DEFAULT 'awaiting_candidate_selection',
  result public.interview_result NOT NULL DEFAULT 'pending',
  feedback_url TEXT,
  selection_link_token TEXT UNIQUE,
  selection_link_expires_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- panelist_slot_offers (3 slot options sent to candidate)
CREATE TABLE public.panelist_slot_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  panelist_id UUID NOT NULL REFERENCES public.panelists(id),
  proposed_date DATE NOT NULL,
  proposed_slot TEXT NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  panelist_availability_status TEXT DEFAULT 'available',
  unavailability_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- manual_interventions
CREATE TABLE public.manual_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  hr_id UUID NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ
);

-- availability_log
CREATE TABLE public.availability_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panelist_id UUID NOT NULL REFERENCES public.panelists(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  slots_available TEXT[] DEFAULT '{}',
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- audit_logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on everything
ALTER TABLE public.engineering_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panelists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_panelist_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panelist_slot_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- engineering_levels: readable by any allowed user, only admins write
CREATE POLICY "all read levels" ON public.engineering_levels FOR SELECT TO authenticated USING (public.is_allowed(auth.uid()));
CREATE POLICY "admin manage levels" ON public.engineering_levels FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- allowed_users: admins manage all, users can read their own row
CREATE POLICY "admin all allowed_users" ON public.allowed_users FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "self read allowed_users" ON public.allowed_users FOR SELECT TO authenticated USING (user_id = auth.uid());

-- user_roles: admins manage; users can read their own
CREATE POLICY "admin manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "self read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- candidates: admin + hr full access
CREATE POLICY "admin/hr read candidates" ON public.candidates FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "admin/hr write candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "admin/hr update candidates" ON public.candidates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "admin delete candidates" ON public.candidates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- panelists: admin/hr read; admin write
CREATE POLICY "admin/hr read panelists" ON public.panelists FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR user_id = auth.uid());
CREATE POLICY "admin manage panelists" ON public.panelists FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- hr_panelist_mapping: admin manage; HR read own
CREATE POLICY "admin manage mapping" ON public.hr_panelist_mapping FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "hr read own mapping" ON public.hr_panelist_mapping FOR SELECT TO authenticated USING (hr_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- interviews
CREATE POLICY "admin/hr read interviews" ON public.interviews FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')
  OR EXISTS (SELECT 1 FROM public.panelists p WHERE p.id = interviews.panelist_id AND p.user_id = auth.uid())
);
CREATE POLICY "admin/hr write interviews" ON public.interviews FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "admin/hr update interviews" ON public.interviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR EXISTS (SELECT 1 FROM public.panelists p WHERE p.id = interviews.panelist_id AND p.user_id = auth.uid()));

-- slot offers
CREATE POLICY "admin/hr read offers" ON public.panelist_slot_offers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "admin/hr write offers" ON public.panelist_slot_offers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- manual interventions
CREATE POLICY "admin/hr read mi" ON public.manual_interventions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "admin/hr write mi" ON public.manual_interventions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- availability_log
CREATE POLICY "admin/hr read avail" ON public.availability_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "admin/hr write avail" ON public.availability_log FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- notifications: per-user
CREATE POLICY "self read notif" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "self update notif" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin/hr insert notif" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- audit logs: admin read; insert via service role
CREATE POLICY "admin read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Trigger to auto-link allowed_users.user_id when a user signs up with whitelisted email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.allowed_users SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
  -- panelists may also be linked
  UPDATE public.panelists SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for resumes + feedback
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes','resumes', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('feedback','feedback', false) ON CONFLICT DO NOTHING;

CREATE POLICY "auth read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes');
CREATE POLICY "auth write resumes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "auth read feedback" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'feedback');
CREATE POLICY "auth write feedback" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'feedback');
