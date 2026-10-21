CREATE TABLE IF NOT EXISTS public.coach_daily_audits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, audit_date)
);
ALTER TABLE public.coach_daily_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.coach_daily_audits FROM anon, authenticated;
