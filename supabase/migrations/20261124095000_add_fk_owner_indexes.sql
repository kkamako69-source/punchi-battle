-- Cover foreign keys used for per-user history and cleanup.
create index if not exists votes_voter_created_idx
    on public.votes (voter_id, created_at desc);

create index if not exists comments_author_created_idx
    on public.comments (author_id, created_at desc);
