-- Migration: Smartwatch Burn & TDEE Integration
-- Datum: 2026-10-11
-- Přidává sloupce pro synchronizaci spálených kalorií ze smartwatches / Samsung Health

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS smartwatch_weekly_burn NUMERIC,
    ADD COLUMN IF NOT EXISTS smartwatch_monthly_burn NUMERIC,
    ADD COLUMN IF NOT EXISTS yesterday_tdee NUMERIC;
