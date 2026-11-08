BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL search_path=pg_catalog,public;
-- Preserve the shared signed-in guide reader; only operators/services may author it.
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.app_guide_content'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'GUIDE_RLS_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.app_guide_content'::regclass AND attnum>0 AND NOT attisdropped AND attacl IS NOT NULL) THEN RAISE EXCEPTION 'GUIDE_COLUMN_GRANTS_REQUIRE_REVIEW'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='app_guide_content')<>2 OR
 NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_guide_content' AND policyname='Authenticated users can manage guide content' AND permissive='PERMISSIVE' AND cmd='ALL' AND roles=ARRAY['authenticated']::name[] AND qual='(auth.uid() IS NOT NULL)' AND with_check='(auth.uid() IS NOT NULL)') OR
 NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_guide_content' AND policyname='Authenticated users can read guide' AND permissive='PERMISSIVE' AND cmd='SELECT' AND roles=ARRAY['authenticated']::name[] AND qual='true' AND with_check IS NULL) THEN RAISE EXCEPTION 'GUIDE_POLICY_IDENTITY_CHANGED'; END IF;
END $guard$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.app_guide_content FROM PUBLIC, anon, authenticated;
DROP POLICY "Authenticated users can manage guide content" ON public.app_guide_content;
COMMIT;
