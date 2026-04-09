-- ============================================================
-- Migration 003: tasks, task_assignments, task_dependencies
-- ============================================================

CREATE TYPE public.task_status   AS ENUM ('open', 'in_progress', 'on_hold', 'completed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.dependency_type AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish');

CREATE TABLE public.tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_id         uuid REFERENCES public.phases(id) ON DELETE SET NULL,
  parent_task_id   uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  priority         public.task_priority NOT NULL DEFAULT 'medium',
  status           public.task_status NOT NULL DEFAULT 'open',
  due_date         date,
  start_date       date,
  estimated_hours  numeric(6,2),
  order_index      integer NOT NULL DEFAULT 0,
  recurrence_rule  text,      -- rrule string RFC 5545
  recurrence_end   date,
  created_by       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Full-text search vector (aggiornato da trigger)
  search_vector    tsvector GENERATED ALWAYS AS (
    to_tsvector('italian', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX tasks_project_id_idx    ON public.tasks(project_id);
CREATE INDEX tasks_phase_id_idx      ON public.tasks(phase_id);
CREATE INDEX tasks_due_date_idx      ON public.tasks(due_date);
CREATE INDEX tasks_status_idx        ON public.tasks(status);
CREATE INDEX tasks_search_vector_idx ON public.tasks USING gin(search_vector);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TASK ASSIGNMENTS
-- ============================================================

CREATE TABLE public.task_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX task_assignments_task_id_idx ON public.task_assignments(task_id);
CREATE INDEX task_assignments_user_id_idx ON public.task_assignments(user_id);

-- ============================================================
-- TASK DEPENDENCIES
-- ============================================================

CREATE TABLE public.task_dependencies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_id  uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  type           public.dependency_type NOT NULL DEFAULT 'finish_to_start',
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_id),
  -- Impedisce auto-dipendenza
  CHECK (task_id <> depends_on_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS TASKS
-- ============================================================

CREATE POLICY "Task visibili ai membri del progetto"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

CREATE POLICY "Editor e superiori possono creare task"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    get_project_role(project_id, auth.uid()) IN ('admin', 'editor')
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

CREATE POLICY "Editor può modificare task del progetto"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    get_project_role(project_id, auth.uid()) IN ('admin', 'editor')
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

CREATE POLICY "Solo admin possono eliminare task"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    get_project_role(project_id, auth.uid()) = 'admin'
    OR is_workspace_admin_for_project(project_id, auth.uid())
  );

-- RLS task_assignments (stessa visibilità del task)
CREATE POLICY "Assegnazioni visibili ai membri del progetto"
  ON public.task_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_assignments.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editor e superiori gestiscono le assegnazioni"
  ON public.task_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignments.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignments.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );

-- RLS task_dependencies
CREATE POLICY "Dipendenze visibili ai membri del progetto"
  ON public.task_dependencies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_dependencies.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editor e superiori gestiscono le dipendenze"
  ON public.task_dependencies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_dependencies.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_dependencies.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );
