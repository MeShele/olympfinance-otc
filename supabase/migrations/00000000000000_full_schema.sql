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
