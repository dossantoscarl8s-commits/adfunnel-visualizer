-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles readable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- AD ACCOUNTS
CREATE TABLE public.ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id TEXT NOT NULL UNIQUE,
  unit_name TEXT NOT NULL,
  whatsapp_number TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_accounts TO authenticated;
GRANT ALL ON public.ad_accounts TO service_role;
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad accounts readable" ON public.ad_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ad accounts admin write" ON public.ad_accounts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- APP SETTINGS (admin only)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings admin only" ON public.app_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PUBLIC (non secret) SETTINGS readable by all authenticated
CREATE TABLE public.public_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_settings TO authenticated;
GRANT ALL ON public.public_settings TO service_role;
ALTER TABLE public.public_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public settings readable" ON public.public_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "public settings admin write" ON public.public_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- WHATSAPP LEADS
CREATE TABLE public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT,
  name TEXT,
  phone TEXT NOT NULL,
  unit_name TEXT,
  ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE SET NULL,
  first_contact_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  replied BOOLEAN NOT NULL DEFAULT false,
  replied_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'novo',
  first_message TEXT,
  source_type TEXT,
  ctwa_clid TEXT,
  campaign_name TEXT,
  adset_name TEXT,
  ad_name TEXT,
  campaign_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  headline TEXT,
  source_url TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_leads_first_contact_idx ON public.whatsapp_leads (first_contact_at DESC);
CREATE UNIQUE INDEX whatsapp_leads_phone_unit_idx ON public.whatsapp_leads (phone, COALESCE(unit_name, ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_leads TO authenticated;
GRANT ALL ON public.whatsapp_leads TO service_role;
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads readable" ON public.whatsapp_leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads write authenticated" ON public.whatsapp_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.whatsapp_leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'in',
  body TEXT,
  wa_message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX whatsapp_messages_lead_idx ON public.whatsapp_messages (lead_id, sent_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages readable" ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages write authenticated" ON public.whatsapp_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER ad_accounts_updated BEFORE UPDATE ON public.ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.whatsapp_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();