-- Run once in the Supabase SQL Editor (as project administrator).
begin;
create table public.affiliate_members (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.affiliate_inventory (id integer primary key check(id=1), revision bigint not null default 1, payload jsonb not null, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id));
create table public.affiliate_history (revision bigint primary key, payload jsonb not null, updated_at timestamptz not null, updated_by uuid);
alter table public.affiliate_members enable row level security;
alter table public.affiliate_inventory enable row level security;
alter table public.affiliate_history enable row level security;
revoke all on public.affiliate_members, public.affiliate_inventory, public.affiliate_history from anon, authenticated;
-- No direct table access: only bounded RPCs may read/write inventory.
create function public.affiliate_read() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.affiliate_members where user_id=auth.uid()) then raise exception 'Nutzer nicht freigegeben' using errcode='42501'; end if;
 return (select jsonb_build_object('revision',revision,'state',payload,'updatedAt',updated_at) from public.affiliate_inventory where id=1);
end $$;
create function public.affiliate_save(expected_revision bigint, new_state jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.affiliate_inventory%rowtype; entry jsonb; proposal jsonb; live_count integer; approved_count integer;
begin
 if auth.uid() is null or not exists(select 1 from public.affiliate_members where user_id=auth.uid()) then raise exception 'Nutzer nicht freigegeben' using errcode='42501'; end if;
 if jsonb_typeof(new_state->'thresholds') is distinct from 'object' or (new_state->'thresholds'->>'review')::integer<0 or (new_state->'thresholds'->>'automatic')::integer>100 or (new_state->'thresholds'->>'review')::integer >= (new_state->'thresholds'->>'automatic')::integer then raise exception 'Ungültige Schwellen'; end if;
 if pg_column_size(new_state)>2000000 then raise exception 'Bestand zu groß'; end if;
 select * into current_row from public.affiliate_inventory where id=1 for update;
 if not found then raise exception 'Initialbestand fehlt'; end if;
 if current_row.revision<>expected_revision then return jsonb_build_object('conflict',true,'revision',current_row.revision); end if;
 if jsonb_typeof(new_state->'sites') is distinct from 'array' or jsonb_typeof(new_state->'offers') is distinct from 'array' or jsonb_typeof(new_state->'proposals') is distinct from 'array' then raise exception 'Ungültiger Bestand'; end if;
 for entry in select value from jsonb_array_elements(new_state->'sites') loop
  if coalesce(entry->>'id','')='' or coalesce(btrim(entry->>'name'),'')='' or coalesce(entry->>'domain','') !~ '^https?://' or jsonb_typeof(entry->'topics') is distinct from 'array' or jsonb_array_length(entry->'topics')=0 then raise exception 'Website benötigt Name, URL und Themen'; end if;
 end loop;
 for entry in select value from jsonb_array_elements(new_state->'offers') loop
  if coalesce(entry->>'id','')='' or coalesce(btrim(entry->>'name'),'')='' or coalesce(btrim(entry->>'description'),'')='' or coalesce(entry->>'url','') !~ '^https?://' or jsonb_typeof(entry->'topics') is distinct from 'array' or jsonb_array_length(entry->'topics')=0 or coalesce(entry->>'scope','') not in ('all','selected') then raise exception 'Angebot benötigt Name, Beschreibung, URL, Themen und Nutzung'; end if;
  if jsonb_typeof(entry->'sites') is distinct from 'array' then raise exception 'Website-Freigaben fehlen'; end if;
  if entry->>'scope'='selected' and jsonb_array_length(entry->'sites')=0 then raise exception 'Website-Freigabe fehlt'; end if;
  if exists(select 1 from jsonb_array_elements_text(entry->'sites') x where not exists(select 1 from jsonb_array_elements(new_state->'sites') s where s->>'id'=x)) then raise exception 'Unbekannte Website-Freigabe'; end if;
 end loop;
 if exists(select 1 from (select value->>'id' as id,count(*) from jsonb_array_elements(new_state->'sites') group by 1 having count(*)>1) x) or exists(select 1 from (select value->>'id' as id,count(*) from jsonb_array_elements(new_state->'offers') group by 1 having count(*)>1) x) or exists(select 1 from (select value->>'id' as id,count(*) from jsonb_array_elements(new_state->'proposals') group by 1 having count(*)>1) x) then raise exception 'Doppelte IDs'; end if;
 -- Matching metadata and confirmed publications cannot be fabricated by the browser.
 if new_state->'lastRun' is distinct from current_row.payload->'lastRun' then raise exception 'Abgleichdaten sind schreibgeschützt'; end if;
 for proposal in select value from jsonb_array_elements(new_state->'proposals') loop
  if not exists(select 1 from jsonb_array_elements(new_state->'sites') s where s->>'id'=proposal->>'site') or not exists(select 1 from jsonb_array_elements(new_state->'offers') o where o->>'id'=proposal->>'offer') then raise exception 'Vorschlag verweist auf unbekannten Bestand'; end if;
  select value into entry from jsonb_array_elements(current_row.payload->'proposals') where value->>'id'=proposal->>'id';
  if not found then raise exception 'Neue KI-Vorschläge sind noch deaktiviert'; end if;
  if proposal->>'status' not in ('offen','freigegeben','verworfen','simuliert') then raise exception 'Ungültiger Freigabestatus'; end if;
  if (proposal - array['text','status','decidedAt','decisionScore']) is distinct from (entry - array['text','status','decidedAt','decisionScore']) then raise exception 'Artikel- und Bewertungsdaten sind schreibgeschützt'; end if;
  if proposal->'publication' is distinct from entry->'publication' or proposal->'aiAssessment' is distinct from entry->'aiAssessment' then raise exception 'Bewertungen und Veröffentlichungsnachweise sind schreibgeschützt'; end if;
  if proposal->>'status'='freigegeben' and entry->>'status' is distinct from 'freigegeben' then
   if not exists(select 1 from jsonb_array_elements(new_state->'offers') o where o->>'id'=proposal->>'offer' and o->>'status'='aktiv' and (o->>'scope'='all' or (o->'sites') ? (proposal->>'site'))) then raise exception 'Angebot ist für diese Website nicht freigegeben'; end if;
   select coalesce(max((r->>'existing')::integer), (entry->>'affiliateLinkCount')::integer,0) into live_count from jsonb_array_elements(coalesce(current_row.payload->'lastRun'->'linkCounts','[]'::jsonb)) r where r->>'url'=proposal->>'url';
   select count(*) into approved_count from jsonb_array_elements(new_state->'proposals') p where p->>'url'=proposal->>'url' and p->>'status' in ('freigegeben','simuliert') and p->'publication' is null;
   if live_count+approved_count>3 then raise exception 'Stopp: maximal drei Affiliate-Linkstellen pro Seite'; end if;
  end if;
 end loop;
 if new_state=current_row.payload then return jsonb_build_object('revision',current_row.revision,'updatedAt',current_row.updated_at); end if;
 insert into public.affiliate_history values(current_row.revision,current_row.payload,current_row.updated_at,current_row.updated_by);
 update public.affiliate_inventory set payload=new_state,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=1;
 return (select jsonb_build_object('revision',revision,'updatedAt',updated_at) from public.affiliate_inventory where id=1);
end $$;
revoke all on function public.affiliate_read() from public,anon;
revoke all on function public.affiliate_save(bigint,jsonb) from public,anon;
grant execute on function public.affiliate_read() to authenticated;
grant execute on function public.affiliate_save(bigint,jsonb) to authenticated;
commit;
