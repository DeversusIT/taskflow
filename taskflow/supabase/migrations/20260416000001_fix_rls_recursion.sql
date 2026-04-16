-- ============================================================
-- Fix: Infinite recursion in workspace_members e workspaces RLS
-- Le policy SELECT usavano EXISTS (SELECT FROM workspace_members)
-- dentro la policy di workspace_members stessa → ricorsione infinita.
-- Soluzione: funzione SECURITY DEFINER che bypassa RLS internamente.
-- ============================================================

-- Funzione helper: l'utente è membro del workspace?
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
$$;

-- Ricrea policy workspace_members SELECT (elimina auto-referenza)
DROP POLICY IF EXISTS "Membri visibili agli altri membri del workspace" ON public.workspace_members;

CREATE POLICY "Membri visibili agli altri membri del workspace"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));

-- Ricrea policy workspaces SELECT (usava anche lei workspace_members)
DROP POLICY IF EXISTS "Workspace visibile ai propri membri" ON public.workspaces;

CREATE POLICY "Workspace visibile ai propri membri"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (is_workspace_member(id, auth.uid()));
