-- Preserve shared artwork reads while binding legacy writes to the uploader.
-- Shared app branding uses its separate owner-authorized service.
-- Do not introduce user-ID folders: all eight captured avatar/rule objects
-- have existing root-level names. Both legacy and current owner columns are
-- supported, and contradictory owner values fail closed.
CREATE POLICY obedience_legacy_asset_insert_owner ON storage.objects AS RESTRICTIVE
  FOR INSERT TO anon,authenticated WITH CHECK (
    bucket_id NOT IN ('avatars','rules','logos') OR
    (bucket_id IN ('avatars','rules') AND auth.uid() IS NOT NULL
     AND coalesce(owner_id,owner::text)=auth.uid()::text AND (owner IS NULL OR owner=auth.uid())));
CREATE POLICY obedience_legacy_asset_update_owner ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO anon,authenticated USING (
    bucket_id NOT IN ('avatars','rules','logos') OR
    (bucket_id IN ('avatars','rules') AND auth.uid() IS NOT NULL
     AND coalesce(owner_id,owner::text)=auth.uid()::text AND (owner IS NULL OR owner=auth.uid())))
  WITH CHECK (
    bucket_id NOT IN ('avatars','rules','logos') OR
    (bucket_id IN ('avatars','rules') AND auth.uid() IS NOT NULL
     AND coalesce(owner_id,owner::text)=auth.uid()::text AND (owner IS NULL OR owner=auth.uid())));
CREATE POLICY obedience_legacy_asset_delete_owner ON storage.objects AS RESTRICTIVE
  FOR DELETE TO anon,authenticated USING (
    bucket_id NOT IN ('avatars','rules','logos') OR
    (bucket_id IN ('avatars','rules') AND auth.uid() IS NOT NULL
     AND coalesce(owner_id,owner::text)=auth.uid()::text AND (owner IS NULL OR owner=auth.uid())));

COMMENT ON POLICY obedience_legacy_asset_insert_owner ON storage.objects IS 'Obedience legacy asset write fence: avatars/rules uploader ownership; old logos client writes retired in favor of app-branding.';
COMMENT ON POLICY obedience_legacy_asset_update_owner ON storage.objects IS 'Obedience legacy asset write fence: avatars/rules uploader ownership; old logos client writes retired in favor of app-branding.';
COMMENT ON POLICY obedience_legacy_asset_delete_owner ON storage.objects IS 'Obedience legacy asset write fence: avatars/rules uploader ownership; old logos client writes retired in favor of app-branding.';

