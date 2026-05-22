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
