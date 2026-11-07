-- Preparation only. Run only after app rollback and a reviewed backup/export.
-- Refuse to discard any personal definitions or tombstones automatically.
\set ON_ERROR_STOP on
begin;
lock table public.throne_cards in access exclusive mode;
do $$ begin
  if exists(select 1 from public.throne_cards) then
    raise exception 'THRONE_ROLLBACK_REQUIRES_REVIEWED_CARD_EXPORT';
  end if;
end $$;
drop function public.commit_throne_card(uuid,uuid,uuid,bigint,text,jsonb);
drop function public.get_throne_cards();
drop function public._throne_validate_definition(jsonb);
drop function public._throne_validate_image(jsonb);
drop table public.throne_cards;
notify pgrst, 'reload schema';
commit;
