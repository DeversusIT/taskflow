-- ============================================================
-- Fix: tasks e task_assignments SELECT policies usano EXISTS
-- diretto su project_members. Sostituiamo con is_project_member()
-- SECURITY DEFINER già esistente (più pulito e sicuro).
-- ============================================================

-- tasks SELECT
DROP POLICY IF EXISTS "Task visibili ai membri del progetto" ON public.tasks;
CREATE POLICY "Task visibili ai membri del progetto"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

-- task_assignments SELECT
DROP POLICY IF EXISTS "Assegnazioni visibili ai membri del progetto" ON public.task_assignments;
CREATE POLICY "Assegnazioni visibili ai membri del progetto"
  ON public.task_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignments.task_id
        AND (
          is_project_member(t.project_id, auth.uid())
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );

-- task_dependencies SELECT
DROP POLICY IF EXISTS "Dipendenze visibili ai membri del progetto" ON public.task_dependencies;
CREATE POLICY "Dipendenze visibili ai membri del progetto"
  ON public.task_dependencies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_dependencies.task_id
        AND (
          is_project_member(t.project_id, auth.uid())
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );
