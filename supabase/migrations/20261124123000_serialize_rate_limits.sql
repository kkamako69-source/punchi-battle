-- Serialize rate-limit checks per account and content type so concurrent
-- requests cannot all pass the same count-before-insert window.
create or replace function public.enforce_submission_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    recent_count bigint;
begin
    if current_user_id is null or new.author_id is distinct from current_user_id then
        raise exception using message = 'Connexion requise pour publier.', errcode = '42501';
    end if;

    -- A transaction-level advisory lock serializes this account's submissions
    -- for the selected table until the transaction commits or rolls back.
    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(current_user_id::text || ':' || tg_table_name, 918273)
    );

    if tg_table_name = 'entries' then
        select count(*) into recent_count
        from public.entries e
        where e.author_id = current_user_id
          and e.created_at >= statement_timestamp() - interval '24 hours';

        if recent_count >= 5 then
            raise exception using message = 'Limite atteinte : 5 punchlines maximum sur 24 heures.', errcode = 'P0001';
        end if;

        new.created_at := statement_timestamp();
        new.updated_at := statement_timestamp();
    elsif tg_table_name = 'comments' then
        select count(*) into recent_count
        from public.comments c
        where c.author_id = current_user_id
          and c.created_at >= statement_timestamp() - interval '1 hour';

        if recent_count >= 20 then
            raise exception using message = 'Limite atteinte : 20 commentaires maximum par heure.', errcode = 'P0001';
        end if;

        new.created_at := statement_timestamp();
    else
        raise exception using message = 'Table non prise en charge.', errcode = '22023';
    end if;

    return new;
end;
$$;

-- Keep the helper non-callable as a direct API endpoint. The trigger invokes it.
revoke all on function public.enforce_submission_rate_limit() from public, anon, authenticated;
