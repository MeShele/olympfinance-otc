-- Add 'staff' to app_role enum (must run outside transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
