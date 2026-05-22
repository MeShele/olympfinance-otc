-- ============================================================
-- Olymp Finance OTC — combined init schema (run once on fresh Supabase)
-- Generated 2026-05-08T12:15:25Z
-- ============================================================

-- >>> 00000000000000_full_schema.sql
-- ============================================================
-- AskoInvest Exchange — Full Database Schema
-- Run this in Supabase SQL Editor on a fresh project
-- ============================================================

-- 1. Helper function for auto-updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'operator_admin');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'expired');

-- 3. Operators table (multi-tenant root)
CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_operators_updated_at
  BEFORE UPDATE ON public.operators FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- No default operator seeded here — register-operator edge function
-- creates the operator, company_settings, and currencies automatically.

-- 4. Profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  personal_id text,
  is_verified boolean NOT NULL DEFAULT false,
  kyc_required boolean NOT NULL DEFAULT false,
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. User Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Security-definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_operator_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT operator_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 7. Currencies
CREATE TABLE public.currencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  icon text NOT NULL,
  type text NOT NULL CHECK (type IN ('fiat', 'crypto')),
  rate_to_usd decimal(20, 10) NOT NULL DEFAULT 1,
  min_amount decimal(20, 10) NOT NULL DEFAULT 0,
  max_amount decimal(20, 10) NOT NULL DEFAULT 1000000,
  fee_percent numeric NOT NULL DEFAULT 2.5,
  network text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_currencies_updated_at
  BEFORE UPDATE ON public.currencies FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Orders
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  from_amount numeric NOT NULL,
  to_amount numeric NOT NULL,
  rate numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  amount_kgs numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  wallet_address text,
  contact_info text,
  notes text,
  tx_hash text DEFAULT NULL,
  network text DEFAULT NULL,
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Pending Payments (crypto sell flow)
CREATE TABLE public.pending_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id text NOT NULL,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  from_amount numeric NOT NULL,
  to_amount numeric NOT NULL,
  rate numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_url text,
  payment_wallet text,
  wallet_address text,
  contact_info text,
  network text DEFAULT NULL,
  expires_at timestamptz,
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_pending_payments_updated_at
  BEFORE UPDATE ON public.pending_payments FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. KYC Verifications
CREATE TABLE public.kyc_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status kyc_status NOT NULL DEFAULT 'pending',
  applicant_id text,
  external_user_id text,
  document_type text,
  document_country text,
  document_number text,
  document_url text,
  selfie_url text,
  rejection_reason text,
  verified_at timestamptz,
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_kyc_verifications_updated_at
  BEFORE UPDATE ON public.kyc_verifications FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Company Settings
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  company_name text NOT NULL DEFAULT '',
  legal_address text NOT NULL DEFAULT '',
  inn text NOT NULL DEFAULT '',
  okpo text NOT NULL DEFAULT '',
  license_number text NOT NULL DEFAULT '',
  license_date text NOT NULL DEFAULT '',
  tax_office text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  director_name text NOT NULL DEFAULT '',
  director_short text NOT NULL DEFAULT '',
  director_phone text NOT NULL DEFAULT '',
  accountant_name text NOT NULL DEFAULT '',
  accountant_phone text NOT NULL DEFAULT '',
  bank_details text NOT NULL DEFAULT '',
  foreign_accounts text NOT NULL DEFAULT '',
  wallets text NOT NULL DEFAULT '',
  founders text NOT NULL DEFAULT '',
  beneficiaries text NOT NULL DEFAULT '',
  branches text NOT NULL DEFAULT '',
  subsidiaries text NOT NULL DEFAULT '',
  charter_capital numeric NOT NULL DEFAULT 0,
  operator_wallet_address text NOT NULL DEFAULT '',
  fee_percent numeric NOT NULL DEFAULT 2.5,
  liquidity_provider_name text NOT NULL DEFAULT '',
  liquidity_provider_inn text NOT NULL DEFAULT '',
  liquidity_provider_residency text NOT NULL DEFAULT 'резидент КР',
  liquidity_provider_wallet text NOT NULL DEFAULT '',
  acquiring_enabled boolean NOT NULL DEFAULT true,
  manual_wallet_address text NOT NULL DEFAULT '',
  sumsub_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Compliance Data (Finnadzor reports)
CREATE TABLE public.compliance_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  report_year integer NOT NULL,
  report_month integer NOT NULL,
  total_assets numeric NOT NULL DEFAULT 0,
  total_equity numeric NOT NULL DEFAULT 0,
  total_liabilities numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  taxes_paid numeric NOT NULL DEFAULT 0,
  aml_rejections integer NOT NULL DEFAULT 0,
  suspicious_reports integer NOT NULL DEFAULT 0,
  gsfr_reports integer NOT NULL DEFAULT 0,
  state_registration_changes text NOT NULL DEFAULT '-',
  reorganization_info text NOT NULL DEFAULT '-',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operator_id, report_year, report_month)
);
ALTER TABLE public.compliance_data ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_compliance_data_updated_at
  BEFORE UPDATE ON public.compliance_data FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Liquidity Providers
CREATE TABLE public.liquidity_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  name text NOT NULL DEFAULT '',
  inn text NOT NULL DEFAULT '',
  residency text NOT NULL DEFAULT 'резидент КР',
  wallet text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liquidity_providers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_liquidity_providers_updated_at
  BEFORE UPDATE ON public.liquidity_providers FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- OPERATORS
CREATE POLICY "Users can view their own operator"
  ON public.operators FOR SELECT
  USING (id = public.get_user_operator_id(auth.uid()));
CREATE POLICY "Operator admins can update their operator"
  ON public.operators FOR UPDATE
  USING (id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Super admins can view all operators"
  ON public.operators FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Super admins can update all operators"
  ON public.operators FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- PROFILES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Operator admins can view operator profiles"
  ON public.profiles FOR SELECT
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can update operator profiles"
  ON public.profiles FOR UPDATE
  USING (
    operator_id = public.get_user_operator_id(auth.uid())
    AND public.has_role(auth.uid(), 'operator_admin')
  );
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- USER ROLES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Super admins can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Super admins can update user roles"
  ON public.user_roles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Super admins can delete user roles"
  ON public.user_roles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- CURRENCIES
CREATE POLICY "Active currencies are publicly readable"
  ON public.currencies FOR SELECT USING (is_active = true);
CREATE POLICY "Operator admins can view all operator currencies"
  ON public.currencies FOR SELECT
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'::app_role));
CREATE POLICY "Operator admins can insert currencies"
  ON public.currencies FOR INSERT
  WITH CHECK (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can update currencies"
  ON public.currencies FOR UPDATE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can delete currencies"
  ON public.currencies FOR DELETE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Super admins can view all currencies"
  ON public.currencies FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ORDERS
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Operator admins can view operator orders"
  ON public.orders FOR SELECT
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can update operator orders"
  ON public.orders FOR UPDATE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can delete operator orders"
  ON public.orders FOR DELETE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Super admins can view all orders"
  ON public.orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- PENDING PAYMENTS
CREATE POLICY "Users can view their own pending payments"
  ON public.pending_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create pending payments"
  ON public.pending_payments FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Operator admins can view operator pending payments"
  ON public.pending_payments FOR SELECT
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can update operator pending payments"
  ON public.pending_payments FOR UPDATE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can delete operator pending payments"
  ON public.pending_payments FOR DELETE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));

-- KYC VERIFICATIONS
CREATE POLICY "Users can view their own KYC"
  ON public.kyc_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own KYC"
  ON public.kyc_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operator admins can view operator KYC"
  ON public.kyc_verifications FOR SELECT
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can update operator KYC"
  ON public.kyc_verifications FOR UPDATE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));

-- COMPANY SETTINGS
CREATE POLICY "Operator admins can view company settings"
  ON public.company_settings FOR SELECT
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can insert company settings"
  ON public.company_settings FOR INSERT
  WITH CHECK (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can update company settings"
  ON public.company_settings FOR UPDATE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Super admins can view all company settings"
  ON public.company_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view company settings"
  ON public.company_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- COMPLIANCE DATA
CREATE POLICY "Operator admins can view compliance data"
  ON public.compliance_data FOR SELECT
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can insert compliance data"
  ON public.compliance_data FOR INSERT
  WITH CHECK (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can update compliance data"
  ON public.compliance_data FOR UPDATE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));
CREATE POLICY "Operator admins can delete compliance data"
  ON public.compliance_data FOR DELETE
  USING (operator_id = public.get_user_operator_id(auth.uid()) AND public.has_role(auth.uid(), 'operator_admin'));

-- LIQUIDITY PROVIDERS
CREATE POLICY "Operator admins can view liquidity providers"
  ON public.liquidity_providers FOR SELECT
  USING (operator_id = get_user_operator_id(auth.uid()) AND has_role(auth.uid(), 'operator_admin'::app_role));
CREATE POLICY "Operator admins can insert liquidity providers"
  ON public.liquidity_providers FOR INSERT
  WITH CHECK (operator_id = get_user_operator_id(auth.uid()) AND has_role(auth.uid(), 'operator_admin'::app_role));
CREATE POLICY "Operator admins can update liquidity providers"
  ON public.liquidity_providers FOR UPDATE
  USING (operator_id = get_user_operator_id(auth.uid()) AND has_role(auth.uid(), 'operator_admin'::app_role));
CREATE POLICY "Operator admins can delete liquidity providers"
  ON public.liquidity_providers FOR DELETE
  USING (operator_id = get_user_operator_id(auth.uid()) AND has_role(auth.uid(), 'operator_admin'::app_role));
CREATE POLICY "Super admins can view all liquidity providers"
  ON public.liquidity_providers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- TRIGGERS & AUTO-PROFILE
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _operator_id uuid;
BEGIN
  -- 1. Explicit operator_id from metadata (set by register-operator)
  _operator_id := (NEW.raw_user_meta_data->>'operator_id')::uuid;

  -- 2. Fallback: pick operator that has company_settings (i.e. configured by admin)
  IF _operator_id IS NULL THEN
    SELECT cs.operator_id INTO _operator_id
    FROM public.company_settings cs
    LIMIT 1;
  END IF;

  -- 3. Last resort: any operator
  IF _operator_id IS NULL THEN
    SELECT id INTO _operator_id FROM public.operators ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, email, operator_id)
  VALUES (NEW.id, NEW.email, _operator_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- No seed currencies here — register-operator edge function seeds them
-- automatically when a new operator is created.


-- >>> 20260227200000_improve_handle_new_user.sql
-- Improve handle_new_user() to prefer operator with company_settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _operator_id uuid;
BEGIN
  -- 1. Explicit operator_id from metadata (set by register-operator)
  _operator_id := (NEW.raw_user_meta_data->>'operator_id')::uuid;

  -- 2. Fallback: pick operator that has company_settings (i.e. configured by admin)
  IF _operator_id IS NULL THEN
    SELECT cs.operator_id INTO _operator_id
    FROM public.company_settings cs
    LIMIT 1;
  END IF;

  -- 3. Last resort: any operator
  IF _operator_id IS NULL THEN
    SELECT id INTO _operator_id FROM public.operators ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, email, operator_id)
  VALUES (NEW.id, NEW.email, _operator_id);
  RETURN NEW;
END;
$$;


-- >>> 20260227201000_add_kyc_file_storage.sql
-- Add document/selfie URL columns to kyc_verifications
ALTER TABLE public.kyc_verifications
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS selfie_url text;

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own KYC docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own KYC docs
CREATE POLICY "Users can view own KYC docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role (admin via edge functions) can read all KYC docs
-- This is handled by default since service_role bypasses RLS

-- Operator admins can view KYC docs of users in their operator
-- We use a function to check this
CREATE OR REPLACE FUNCTION public.can_view_kyc_doc(file_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _file_user_id uuid;
  _viewer_operator_id uuid;
  _file_user_operator_id uuid;
BEGIN
  -- Extract user_id from file path (first folder segment)
  _file_user_id := (string_to_array(file_path, '/'))[1]::uuid;

  -- Get viewer's operator_id
  SELECT operator_id INTO _viewer_operator_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  -- Get file owner's operator_id
  SELECT operator_id INTO _file_user_operator_id
  FROM public.profiles
  WHERE user_id = _file_user_id;

  -- Allow if same operator and viewer is admin
  RETURN _viewer_operator_id = _file_user_operator_id
    AND public.has_role(auth.uid(), 'operator_admin');
END;
$$;

CREATE POLICY "Admins can view KYC docs of their operator users"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.can_view_kyc_doc(name)
  );


-- >>> 20260228100000_add_currency_bank_accounts.sql
ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS bank_accounts TEXT DEFAULT NULL;


-- >>> 20260302_000_add_staff_enum.sql
-- Add 'staff' to app_role enum (must run outside transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';


-- >>> 20260303_001_rbac_and_bank_accounts.sql
-- ============================================================
-- RBAC System: staff_roles, staff_members tables, RLS, helpers
-- Bank accounts migration: array -> single object per currency
-- NOTE: 'staff' enum value added in 20260302_000_add_staff_enum.sql
-- ============================================================

-- 1.2 Table: staff_roles — custom roles created by operator_admin
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(operator_id, name)
);

ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- 1.3 Table: staff_members — links users to custom roles
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  staff_role_id UUID NOT NULL REFERENCES public.staff_roles(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, operator_id)
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- 1.4 Helper functions

-- Check if user is a staff member of a given operator
CREATE OR REPLACE FUNCTION public.is_staff_of_operator(_user_id UUID, _operator_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = _user_id
      AND operator_id = _operator_id
      AND is_active = true
  );
$$;

-- Get staff permissions for the current user
CREATE OR REPLACE FUNCTION public.get_staff_permissions(_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT sr.permissions
  FROM public.staff_members sm
  JOIN public.staff_roles sr ON sr.id = sm.staff_role_id
  WHERE sm.user_id = _user_id
    AND sm.is_active = true
  LIMIT 1;
$$;

-- Check if user has a specific permission (section + action)
CREATE OR REPLACE FUNCTION public.has_staff_permission(_user_id UUID, _section TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT (sr.permissions -> _section ->> _action)::boolean
      FROM public.staff_members sm
      JOIN public.staff_roles sr ON sr.id = sm.staff_role_id
      WHERE sm.user_id = _user_id
        AND sm.is_active = true
      LIMIT 1
    ),
    false
  );
$$;

-- 1.5 RLS Policies

-- staff_roles: operator_admin has full CRUD; staff can SELECT
CREATE POLICY "operator_admin_full_access_staff_roles" ON public.staff_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

CREATE POLICY "staff_read_staff_roles" ON public.staff_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'staff'
    )
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

-- staff_members: operator_admin has full CRUD; staff can SELECT own row
CREATE POLICY "operator_admin_full_access_staff_members" ON public.staff_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

CREATE POLICY "staff_read_own_staff_member" ON public.staff_members
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Add staff policies to existing tables

-- Orders: staff with 'orders' permission
CREATE POLICY "staff_orders_select" ON public.orders
  FOR SELECT
  USING (
    public.has_staff_permission(auth.uid(), 'orders', 'view')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

CREATE POLICY "staff_orders_update" ON public.orders
  FOR UPDATE
  USING (
    public.has_staff_permission(auth.uid(), 'orders', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  )
  WITH CHECK (
    public.has_staff_permission(auth.uid(), 'orders', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

-- Currencies: staff with 'currencies' permission
CREATE POLICY "staff_currencies_select" ON public.currencies
  FOR SELECT
  USING (
    public.has_staff_permission(auth.uid(), 'currencies', 'view')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

CREATE POLICY "staff_currencies_update" ON public.currencies
  FOR UPDATE
  USING (
    public.has_staff_permission(auth.uid(), 'currencies', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  )
  WITH CHECK (
    public.has_staff_permission(auth.uid(), 'currencies', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

-- KYC verifications: staff with 'compliance' permission
CREATE POLICY "staff_kyc_select" ON public.kyc_verifications
  FOR SELECT
  USING (
    public.has_staff_permission(auth.uid(), 'compliance', 'view')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

CREATE POLICY "staff_kyc_update" ON public.kyc_verifications
  FOR UPDATE
  USING (
    public.has_staff_permission(auth.uid(), 'compliance', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  )
  WITH CHECK (
    public.has_staff_permission(auth.uid(), 'compliance', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

-- Compliance data: staff with 'compliance_data' permission
CREATE POLICY "staff_compliance_data_select" ON public.compliance_data
  FOR SELECT
  USING (
    public.has_staff_permission(auth.uid(), 'compliance_data', 'view')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

CREATE POLICY "staff_compliance_data_update" ON public.compliance_data
  FOR UPDATE
  USING (
    public.has_staff_permission(auth.uid(), 'compliance_data', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  )
  WITH CHECK (
    public.has_staff_permission(auth.uid(), 'compliance_data', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

-- Company settings: staff with 'company' permission
CREATE POLICY "staff_company_settings_select" ON public.company_settings
  FOR SELECT
  USING (
    public.has_staff_permission(auth.uid(), 'company', 'view')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

CREATE POLICY "staff_company_settings_update" ON public.company_settings
  FOR UPDATE
  USING (
    public.has_staff_permission(auth.uid(), 'company', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  )
  WITH CHECK (
    public.has_staff_permission(auth.uid(), 'company', 'edit')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

-- Liquidity providers: staff with 'company' permission
CREATE POLICY "staff_liquidity_providers_select" ON public.liquidity_providers
  FOR SELECT
  USING (
    public.has_staff_permission(auth.uid(), 'company', 'view')
    AND operator_id = (SELECT public.get_user_operator_id(auth.uid()))
  );

-- 1.6 Bank accounts migration
-- Migrate from array [{bank_name, account_number, holder_name}]
-- to single object {bank_name, account_number, swift, bik}
-- Each fiat currency gets exactly one bank account object

UPDATE public.currencies
SET bank_accounts = (
  CASE
    WHEN bank_accounts IS NULL OR bank_accounts = '' OR bank_accounts = '[]' THEN NULL
    WHEN bank_accounts::jsonb ? 'bank_name' THEN bank_accounts -- already migrated
    ELSE (
      SELECT jsonb_build_object(
        'bank_name', COALESCE(elem->>'bank_name', ''),
        'account_number', COALESCE(elem->>'account_number', ''),
        'swift', '',
        'bik', ''
      )::text
      FROM jsonb_array_elements(bank_accounts::jsonb) AS elem
      LIMIT 1
    )
  END
)
WHERE type = 'fiat' AND bank_accounts IS NOT NULL AND bank_accounts != '';

-- Updated timestamp trigger for new tables
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER staff_roles_updated_at
  BEFORE UPDATE ON public.staff_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- >>> 20260306_001_currency_pair_rates.sql
-- Currency pair rates: direct fiat→crypto rate per pair + optional markup
CREATE TABLE IF NOT EXISTS public.currency_pair_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiat_currency_id UUID NOT NULL REFERENCES public.currencies(id) ON DELETE CASCADE,
  crypto_currency_id UUID NOT NULL REFERENCES public.currencies(id) ON DELETE CASCADE,
  rate NUMERIC NOT NULL,             -- price of 1 crypto in fiat (e.g. 97500 for BTC/USD)
  operator_id UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fiat_currency_id, crypto_currency_id, operator_id)
);

ALTER TABLE public.currency_pair_rates ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for calculator)
CREATE POLICY "pair_rates_select" ON public.currency_pair_rates
  FOR SELECT USING (true);

-- Admins and staff with currencies.edit permission can manage
CREATE POLICY "pair_rates_admin_manage" ON public.currency_pair_rates
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'operator_admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'currencies', 'edit')
  );

CREATE POLICY "pair_rates_admin_update" ON public.currency_pair_rates
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'operator_admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'currencies', 'edit')
  );

CREATE POLICY "pair_rates_admin_delete" ON public.currency_pair_rates
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'operator_admin'::app_role)
    OR public.has_staff_permission(auth.uid(), 'currencies', 'edit')
  );


-- >>> 20260507_006_currencies_staff_rls.sql
-- =============================================================================
-- Currencies — let staff with `currencies.{create,edit,delete}` write rows.
-- =============================================================================
-- Existing INSERT/UPDATE/DELETE policies on `currencies` accept only
-- `app_role='operator_admin'` (or super 'admin'). Staff role permissions
-- live in `staff_roles.permissions` JSONB — has_staff_permission() reads
-- them — but the currencies policies never consult it. Result: a staff
-- user with currencies.create=true gets RLS-rejected when adding a new
-- currency from /admin/company → Валюты.
--
-- Same fix already shipped for `currency_pair_rates` in 20260306; this
-- backports the pattern to `currencies` itself, plus parallel staff
-- policies for UPDATE / DELETE.
--
-- We add NEW policies rather than rewriting the existing ones — RLS
-- evaluates as OR across policies, so granting more access is safe
-- without dropping the operator_admin / admin paths.
-- =============================================================================

CREATE POLICY "Staff with currencies.create can insert"
  ON public.currencies FOR INSERT
  WITH CHECK (
    operator_id = public.get_user_operator_id(auth.uid())
    AND public.has_staff_permission(auth.uid(), 'currencies', 'create')
  );

CREATE POLICY "Staff with currencies.edit can update"
  ON public.currencies FOR UPDATE
  USING (
    operator_id = public.get_user_operator_id(auth.uid())
    AND public.has_staff_permission(auth.uid(), 'currencies', 'edit')
  )
  WITH CHECK (
    operator_id = public.get_user_operator_id(auth.uid())
    AND public.has_staff_permission(auth.uid(), 'currencies', 'edit')
  );

CREATE POLICY "Staff with currencies.delete can delete"
  ON public.currencies FOR DELETE
  USING (
    operator_id = public.get_user_operator_id(auth.uid())
    AND public.has_staff_permission(auth.uid(), 'currencies', 'delete')
  );

-- And let staff with at least currencies.view see all operator currencies
-- (incl. inactive ones) — same as operator_admin already does. Without
-- this they only see active ones via the public-readable policy.
CREATE POLICY "Staff with currencies.view can view operator currencies"
  ON public.currencies FOR SELECT
  USING (
    operator_id = public.get_user_operator_id(auth.uid())
    AND public.has_staff_permission(auth.uid(), 'currencies', 'view')
  );


-- >>> 20260507_999_postgrest_grants.sql
-- =============================================================================
-- PostgREST grants for Supabase managed projects.
-- =============================================================================
-- DROP SCHEMA public CASCADE wipes the implicit GRANT SELECT/INSERT/etc
-- that Supabase normally adds for the anon / authenticated / service_role
-- roles. Without these, every PostgREST call returns 42501 "permission
-- denied" — RLS policies are evaluated *after* the catalog grant check.
--
-- This file restores the standard set so a fresh project can be used
-- by the JS client out of the box. Idempotent — safe to re-run.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- authenticator is the PG role GoTrue/PostgREST connect as before
-- assuming anon/authenticated. Without USAGE on public it can't even
-- resolve the schema and login fails with "Database error querying
-- schema" (HTTP 500). Granting role membership lets it `SET ROLE` later.
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT anon, authenticated, service_role TO authenticator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- =============================================================================
-- Fill in the artifacts that were missed in the initial OTC bundle.
-- =============================================================================
-- Frontend was hitting 404 on REST + RPC because these tables/buckets/
-- functions exist in the upstream platform schema but never made it
-- into `init-otc-db.sql`. Idempotent: every CREATE is `IF NOT EXISTS`
-- and storage inserts go through `ON CONFLICT DO NOTHING`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Branding columns on company_settings (logo/colors/socials)
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tagline text DEFAULT '',
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_telegram text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_twitter text DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_instagram text DEFAULT '';

-- -----------------------------------------------------------------------------
-- legal_pages — оферта, политика конфиденциальности, AML-политика
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.operators(id) NOT NULL,
  slug text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_published boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(operator_id, slug)
);

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published legal pages" ON public.legal_pages;
CREATE POLICY "Anyone can read published legal pages" ON public.legal_pages
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Operators manage own legal pages" ON public.legal_pages;
CREATE POLICY "Operators manage own legal pages" ON public.legal_pages
  FOR ALL USING (operator_id IN (
    SELECT p.operator_id FROM public.profiles p WHERE p.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- quiz_questions — KYC-онбординг квиз
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.operators(id) NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active quiz questions" ON public.quiz_questions;
CREATE POLICY "Anyone can read active quiz questions" ON public.quiz_questions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Operators manage own quiz questions" ON public.quiz_questions;
CREATE POLICY "Operators manage own quiz questions" ON public.quiz_questions
  FOR ALL USING (operator_id IN (
    SELECT p.operator_id FROM public.profiles p WHERE p.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- site_content — редактируемые тексты hero/features/stats
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id),
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(operator_id, section)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;
CREATE POLICY "Anyone can read site content"
  ON public.site_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators manage own site content" ON public.site_content;
CREATE POLICY "Operators manage own site content"
  ON public.site_content FOR ALL USING (
    operator_id IN (SELECT p.operator_id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- documents — сгенерированные PDF/Excel
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('order_pdf', 'finnadzor_report', 'cover_letter')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_operator ON public.documents(operator_id);
CREATE INDEX IF NOT EXISTS idx_documents_order ON public.documents(order_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own docs" ON public.documents;
CREATE POLICY "Users view own docs" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff view operator docs" ON public.documents;
CREATE POLICY "Staff view operator docs" ON public.documents
  FOR SELECT USING (
    operator_id IN (SELECT operator_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.staff_members WHERE user_id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS "Staff insert docs" ON public.documents;
CREATE POLICY "Staff insert docs" ON public.documents
  FOR INSERT WITH CHECK (
    operator_id IN (SELECT operator_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users insert own docs" ON public.documents;
CREATE POLICY "Users insert own docs" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Storage buckets (branding / order-documents / payment-assets)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-documents', 'order-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-assets', 'payment-assets', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Branding policies
DROP POLICY IF EXISTS "Public read branding" ON storage.objects;
CREATE POLICY "Public read branding" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Auth users manage branding" ON storage.objects;
CREATE POLICY "Auth users manage branding" ON storage.objects
  FOR ALL USING (bucket_id = 'branding' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'branding' AND auth.role() = 'authenticated');

-- order-documents policies
DROP POLICY IF EXISTS "Users upload docs" ON storage.objects;
CREATE POLICY "Users upload docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-documents');

DROP POLICY IF EXISTS "Users read order docs" ON storage.objects;
CREATE POLICY "Users read order docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'order-documents');

-- payment-assets policies
DROP POLICY IF EXISTS "Operator admins upload payment assets" ON storage.objects;
CREATE POLICY "Operator admins upload payment assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-assets' AND public.has_role(auth.uid(), 'operator_admin'));

DROP POLICY IF EXISTS "Operator admins delete payment assets" ON storage.objects;
CREATE POLICY "Operator admins delete payment assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-assets' AND public.has_role(auth.uid(), 'operator_admin'));

DROP POLICY IF EXISTS "Anyone can view payment assets" ON storage.objects;
CREATE POLICY "Anyone can view payment assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'payment-assets');

-- -----------------------------------------------------------------------------
-- is_operator_approved — anonymous approval probe used by ApprovalContext
-- -----------------------------------------------------------------------------
-- Single-tenant build: the function still exists so ApprovalContext
-- doesn't 404, but it always returns true — there's one operator and
-- the box belongs to them, so the approval gate is meaningless.
CREATE OR REPLACE FUNCTION public.is_operator_approved(_operator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true;
$$;

GRANT EXECUTE ON FUNCTION public.is_operator_approved(uuid) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- expire_stale_orders — invoked from a cron in upstream platform; here we
-- just install the function so any manual call works. No pg_cron schedule
-- (the OTC supabase project may not have the extension enabled).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders SET status = 'expired', updated_at = now()
  WHERE status = 'awaiting_payment' AND created_at + interval '30 minutes' < now();

  UPDATE public.pending_payments SET status = 'expired', updated_at = now()
  WHERE status IN ('pending', 'awaiting_payment') AND created_at + interval '30 minutes' < now();
END; $$;

-- -----------------------------------------------------------------------------
-- PostgREST sees new tables only after a NOTIFY pgrst, 'reload schema'.
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
-- =============================================================================
-- Расширение kyc_verifications под manual-KYC flow OTC.
-- =============================================================================
-- Edge function `asystem-kyc` (action=verify) сохраняет полный пакет данных
-- по заявке — оператор смотрит их в /admin/compliance чтобы принять решение.
-- Также добавляем UNIQUE(user_id) чтобы upsert работал корректно.
-- =============================================================================

ALTER TABLE public.kyc_verifications
  ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'asystem',
  ADD COLUMN IF NOT EXISTS ocr_data jsonb,
  ADD COLUMN IF NOT EXISTS liveness_passed boolean,
  ADD COLUMN IF NOT EXISTS risk_score integer,
  ADD COLUMN IF NOT EXISTS risk_factors jsonb,
  ADD COLUMN IF NOT EXISTS face_match_score numeric,
  ADD COLUMN IF NOT EXISTS sanctions_hit boolean DEFAULT false;

-- One verification row per user — UPSERT by user_id needs this index.
CREATE UNIQUE INDEX IF NOT EXISTS kyc_verifications_user_id_uniq
  ON public.kyc_verifications(user_id);

NOTIFY pgrst, 'reload schema';
