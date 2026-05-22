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
