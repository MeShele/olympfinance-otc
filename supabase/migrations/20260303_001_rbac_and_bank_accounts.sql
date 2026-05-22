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
