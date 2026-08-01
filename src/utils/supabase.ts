import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(configuredSupabaseUrl && configuredSupabaseAnonKey);

// Keep the module importable during local UI work when the developer has not
// created a .env.local file yet. App.tsx blocks cloud auth until the real
// credentials are present, so these values are never used for a request.
const supabaseUrl = configuredSupabaseUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = configuredSupabaseAnonKey || 'local-development-placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
