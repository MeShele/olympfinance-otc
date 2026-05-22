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
