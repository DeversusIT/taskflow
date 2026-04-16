-- ============================================================
-- Fix: Infinite recursion in project_members RLS
-- La policy SELECT su project_members usava EXISTS (SELECT FROM project_members)
-- dentro la policy stessa → ricorsione infinita.
-- Analogamente, projects e phases SELECT usavano EXISTS diretti su project_members.
-- Soluzione: funzione SECURITY DEFINER che bypassa RLS internamente.
-- ============================================================

-- Funzione helper: l'utente è membro del progetto?
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$;

-- Fix policy project_members SELECT (auto-referenziale)
DROP POLICY IF EXISTS "Membri progetto visibili ai membri del progetto" ON public.project_members;
CREATE POLICY "Membri progetto visibili ai membri del progetto"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

-- Fix policy projects SELECT (usava EXISTS diretto su project_members)
DROP POLICY IF EXISTS "Progetto visibile ai propri membri e ai super_admin" ON public.projects;
CREATE POLICY "Progetto visibile ai propri membri e ai super_admin"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    is_project_member(id, auth.uid())
    OR is_workspace_admin_for_project(id, auth.uid())
  );

-- Fix policy phases SELECT (usava EXISTS diretto su project_members)
DROP POLICY IF EXISTS "Fasi visibili ai membri del progetto" ON public.phases;
CREATE POLICY "Fasi visibili ai membri del progetto"
  ON public.phases FOR SELECT
  TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );
