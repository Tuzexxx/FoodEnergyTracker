-- Apply this migration to an existing Supabase project before deploying Lab.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS activity_level TEXT;

CREATE TABLE IF NOT EXISTS public.favorites (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    kcal NUMERIC NOT NULL,
    protein NUMERIC NOT NULL,
    carbs NUMERIC NOT NULL,
    fat NUMERIC NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, name)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorites' AND policyname = 'Users can view own favorites.') THEN
        CREATE POLICY "Users can view own favorites." ON public.favorites FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorites' AND policyname = 'Users can insert own favorites.') THEN
        CREATE POLICY "Users can insert own favorites." ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorites' AND policyname = 'Users can update own favorites.') THEN
        CREATE POLICY "Users can update own favorites." ON public.favorites FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorites' AND policyname = 'Users can delete own favorites.') THEN
        CREATE POLICY "Users can delete own favorites." ON public.favorites FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
