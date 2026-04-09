-- ============================================================
-- Migration 002: projects, project_members, phases
-- ============================================================

CREATE TYPE public.project_status AS ENUM ('active', 'archived', 'completed');
CREATE TYPE public.project_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  color         text NOT NULL DEFAULT '#6366f1',
  priority      integer NOT NULL DEFAULT 0,
  status        public.project_status NOT NULL DEFAULT 'active',
  start_date    date,
  due_date      date,
  created_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX projects_workspace_id_idx ON public.projects(workspace_id);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================

CREATE TABLE public.project_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.project_role NOT NULL DEFAULT 'viewer',
  added_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX project_members_user_id_idx ON public.project_members(user_id);

-- Funzione helper: ruolo nel progetto
CREATE OR REPLACE FUNCTION public.get_project_role(p_project_id uuid, p_user_id uuid)
RETURNS public.project_role
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pm.role FROM public.project_members pm
  WHERE pm.project_id = p_project_id AND pm.user_id = p_user_id
  LIMIT 1;
$$;

-- Funzione helper: l'utente è super_admin nel workspace del progetto?
CREATE OR REPLACE FUNCTION public.is_workspace_admin_for_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects pr
    JOIN public.workspace_members wm ON wm.workspace_id = pr.workspace_id
    WHERE pr.id = p_project_id
      AND wm.user_id = p_user_id
      AND wm.role = 'super_admin'
  );
$$;

-- RLS projects
CREATE POLICY "Progetto visibile ai propri membri e ai super_admin"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
    OR is_workspace_admin_for_project(id, auth.uid())
  );

CREATE POLICY "Admin progetto e super_admin possono modificare"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    get_project_role(id, auth.uid()) = 'admin'
    OR is_workspace_admin_for_project(id, auth.uid())
  );

CREATE POLICY "Super_admin e admin workspace possono creare progetti"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = projects.workspace_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admin progetto e super_admin possono eliminare"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    get_project_role(id, auth.uid()) = 'admin'
    OR is_workspace_admin_for_project(id, auth.uid())
  );

-- RLS project_members
CREATE POLICY "Membri progetto visibili ai membri del progetto"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
    )
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

CREATE POLICY "Admin progetto e super_admin gestiscono i membri"
  ON public.project_members FOR ALL
  TO authenticated
  USING (
    get_project_role(project_id, auth.uid()) = 'admin'
    OR is_workspace_admin_for_project(project_id, auth.uid())
  )
  WITH CHECK (
    get_project_role(project_id, auth.uid()) = 'admin'
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

-- ============================================================
-- PHASES
-- ============================================================

CREATE TYPE public.phase_status AS ENUM ('pending', 'in_progress', 'completed');

CREATE TABLE public.phases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  color        text NOT NULL DEFAULT '#94a3b8',
  order_index  integer NOT NULL DEFAULT 0,
  status       public.phase_status NOT NULL DEFAULT 'pending',
  start_date   date,
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
CREATE INDEX phases_project_id_idx ON public.phases(project_id);

-- RLS phases: stessa logica del progetto
CREATE POLICY "Fasi visibili ai membri del progetto"
  ON public.phases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = phases.project_id AND user_id = auth.uid()
    )
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

CREATE POLICY "Admin progetto gestisce le fasi"
  ON public.phases FOR ALL
  TO authenticated
  USING (
    get_project_role(project_id, auth.uid()) = 'admin'
    OR is_workspace_admin_for_project(project_id, auth.uid())
  )
  WITH CHECK (
    get_project_role(project_id, auth.uid()) = 'admin'
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );
