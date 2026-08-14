-- Expose moderation_status through proposal_feed.
--
-- moderate_proposal()'s 'trash' action is a soft delete: it sets
-- status = 'blinded' AND moderation_status = 'trashed'. The feed only projected
-- `status`, so clients could not tell a restorable blind apart from a soft
-- delete, and MyPage kept listing trashed proposals to their author.
--
-- A view column cannot be added with CREATE OR REPLACE VIEW, so the view is
-- dropped and recreated. The definition below is the one from
-- 20260720_operational_hardening.sql with the single extra column.

DROP VIEW IF EXISTS public.proposal_feed;
CREATE VIEW public.proposal_feed
WITH (security_barrier = true)
AS
SELECT
  p.id,
  CASE WHEN p.author_id = auth.uid() OR public.current_user_is_admin() THEN p.author_id ELSE NULL END AS author_id,
  p.category,
  p.title,
  p.body,
  p.is_anonymous,
  p.status,
  p.moderation_status,
  p.vote_count,
  p.view_count,
  p.comment_count,
  p.created_at,
  p.updated_at,
  CASE WHEN NOT p.is_anonymous OR p.author_id = auth.uid() OR public.current_user_is_admin() THEN pr.name ELSE NULL END AS author_name,
  pr.grade AS author_grade,
  CASE WHEN public.current_user_is_admin() THEN pr.class ELSE NULL END AS author_class,
  CASE WHEN public.current_user_is_admin() THEN pr.email ELSE NULL END AS author_email,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'proposal_id', r.proposal_id,
          'content', r.content,
          'signed_by', r.signed_by,
          'created_at', r.created_at
        ) ORDER BY r.created_at ASC
      )
      FROM public.official_replies r
      WHERE r.proposal_id = p.id
    ),
    '[]'::jsonb
  ) AS official_replies
FROM public.proposals p
JOIN public.profiles pr ON pr.id = p.author_id
WHERE public.current_user_is_verified_school_member()
  AND (p.status <> 'blinded' OR p.author_id = auth.uid() OR public.current_user_is_admin());

REVOKE ALL ON public.proposal_feed FROM PUBLIC, anon;
GRANT SELECT ON public.proposal_feed TO authenticated;
