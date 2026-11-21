-- Initial Punchi Battle theme catalogue.
-- Themes are intentionally inactive until a moderator activates them.
insert into public.themes (slug, title, description, is_active)
values
    ('la-trahison', 'La Trahison', 'Confiance, loyauté et retournements de situation.', false),
    ('l-ambition', 'L’Ambition', 'Objectifs, discipline et dépassement de soi.', false),
    ('la-rue', 'La Rue', 'Vie quotidienne, débrouillardise et observation sociale.', false),
    ('l-amour-perdu', 'L’Amour Perdu', 'Relations, émotions et histoires personnelles.', false),
    ('la-victoire', 'La Victoire', 'Résilience, réussite et esprit de compétition.', false),
    ('la-solitude', 'La Solitude', 'Identité, introspection et force intérieure.', false)
on conflict (slug) do nothing;
