-- ============================================================
-- Migration 004: checklists, checklist_items
-- ============================================================

CREATE TABLE public.checklists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Checklist',
  order_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE INDEX checklists_task_id_idx ON public.checklists(task_id);

CREATE TABLE public.checklist_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  title         text NOT NULL,
  completed     boolean NOT NULL DEFAULT false,
  completed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at  timestamptz,
  order_index   integer NOT NULL DEFAULT 0
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS checklists e checklist_items: visibilità legata al task
CREATE POLICY "Checklist visibili ai membri del progetto"
  ON public.checklists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = checklists.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editor e superiori gestiscono le checklist"
  ON public.checklists FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = checklists.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = checklists.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );

CREATE POLICY "Checklist items visibili ai membri del progetto"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.tasks t ON t.id = cl.task_id
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE cl.id = checklist_items.checklist_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editor e superiori gestiscono gli item"
  ON public.checklist_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.tasks t ON t.id = cl.task_id
      WHERE cl.id = checklist_items.checklist_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.tasks t ON t.id = cl.task_id
      WHERE cl.id = checklist_items.checklist_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );

-- ============================================================
-- Migration 005: comments
-- ============================================================

CREATE TABLE public.comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        text NOT NULL,
  mentions    uuid[] NOT NULL DEFAULT '{}',
  edited_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX comments_task_id_idx ON public.comments(task_id);

CREATE POLICY "Commenti visibili ai membri del progetto"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = comments.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Tutti i membri possono commentare"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = comments.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Utente modifica i propri commenti"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utente o admin eliminano commenti"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = comments.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) = 'admin'
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );

-- ============================================================
-- Migration 006: attachments
-- ============================================================

CREATE TABLE public.attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  file_name     text NOT NULL,
  file_type     text,
  file_size     integer NOT NULL CHECK (file_size <= 10485760), -- max 10MB
  storage_path  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX attachments_task_id_idx ON public.attachments(task_id);

CREATE POLICY "Allegati visibili ai membri del progetto"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = attachments.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editor e superiori caricano allegati"
  ON public.attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = attachments.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) IN ('admin', 'editor')
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );

CREATE POLICY "Admin eliminano allegati"
  ON public.attachments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = attachments.task_id
        AND (
          get_project_role(t.project_id, auth.uid()) = 'admin'
          OR is_workspace_admin_for_project(t.project_id, auth.uid())
        )
    )
  );
