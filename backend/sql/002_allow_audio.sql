-- Supabase SQL Editor: retain the current media kinds and also allow audio.
BEGIN;
DO $$
DECLARE
  existing_rule text;
BEGIN
  SELECT pg_get_expr(conbin, conrelid) INTO existing_rule
  FROM pg_constraint
  WHERE conrelid = 'public.media_contents'::regclass
    AND conname = 'media_contents_kind_check';

  IF existing_rule IS NULL THEN
    RAISE EXCEPTION 'media_contents_kind_check was not found; inspect the table before changing it';
  END IF;

  ALTER TABLE public.media_contents DROP CONSTRAINT media_contents_kind_check;
  EXECUTE format(
    'ALTER TABLE public.media_contents ADD CONSTRAINT media_contents_kind_check CHECK ((%s) OR kind = %L)',
    existing_rule, 'audio'
  );
END $$;
COMMIT;
