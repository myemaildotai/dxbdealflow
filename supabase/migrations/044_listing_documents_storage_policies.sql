DROP POLICY IF EXISTS listing_documents_pending_insert_own ON storage.objects;
DROP POLICY IF EXISTS listing_documents_pending_select_own ON storage.objects;
DROP POLICY IF EXISTS listing_documents_pending_delete_own ON storage.objects;

CREATE POLICY listing_documents_pending_insert_own ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-documents'
  AND auth.uid() IS NOT NULL
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
  AND (storage.foldername(name))[2] = 'pending'
  AND LOWER(storage.extension(name)) IN ('pdf', 'doc', 'docx')
  AND public.current_app_user_role() = 'broker'
  AND public.current_app_user_status() IN ('active', 'approved')
);

CREATE POLICY listing_documents_pending_select_own ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-documents'
  AND auth.uid() IS NOT NULL
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
  AND (storage.foldername(name))[2] = 'pending'
  AND public.current_app_user_role() = 'broker'
);

CREATE POLICY listing_documents_pending_delete_own ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-documents'
  AND auth.uid() IS NOT NULL
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
  AND (storage.foldername(name))[2] = 'pending'
  AND public.current_app_user_role() = 'broker'
);
