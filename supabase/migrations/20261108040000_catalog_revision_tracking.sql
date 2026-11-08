BEGIN;
-- Server-owned catalog revisions support bounded lightweight change polling.
-- Existing updated_at columns and stored rows are retained; shared timestamp helpers are untouched.
CREATE FUNCTION public._catalog_stamp_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.updated_at:=pg_catalog.clock_timestamp();
  ELSE
    NEW.updated_at:=GREATEST(pg_catalog.clock_timestamp(),OLD.updated_at+INTERVAL '1 microsecond');
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public._catalog_stamp_revision() FROM PUBLIC,anon,authenticated,service_role;
-- PostgreSQL runs same-event triggers alphabetically. Existing permission, session,
-- identity and accounting guards run first; this trigger changes only updated_at.
CREATE TRIGGER zzz_catalog_revision_stamp BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public._catalog_stamp_revision();
CREATE TRIGGER zzz_catalog_revision_stamp BEFORE INSERT OR UPDATE ON public.rules FOR EACH ROW EXECUTE FUNCTION public._catalog_stamp_revision();
CREATE TRIGGER zzz_catalog_revision_stamp BEFORE INSERT OR UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public._catalog_stamp_revision();
CREATE TRIGGER zzz_catalog_revision_stamp BEFORE INSERT OR UPDATE ON public.punishments FOR EACH ROW EXECUTE FUNCTION public._catalog_stamp_revision();
COMMIT;
