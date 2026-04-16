-- ============================================================
-- Fix: projects INSERT policy usa EXISTS diretto su workspace_members
-- che può innescare chain RLS. Sostituiamo con is_workspace_member()
-- SECURITY DEFINER già esistente.
-- ============================================================

DROP POLICY IF EXISTS "Super_admin e admin workspace possono creare progetti" ON public.projects;

CREATE POLICY "Super_admin e admin workspace possono creare progetti"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    is_workspace_member(workspace_id, auth.uid())
  );
