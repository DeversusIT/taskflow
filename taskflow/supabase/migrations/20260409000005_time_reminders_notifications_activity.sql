-- ============================================================
-- Migration 007: time_entries
-- ============================================================

CREATE TABLE public.time_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at   timestamptz NOT NULL,
  ended_at     timestamptz,
  duration_secs integer GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer
    ELSE NULL END
  ) STORED,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR ended_at > started_at)
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX time_entries_task_id_idx ON public.time_entries(task_id);
CREATE INDEX time_entries_user_id_idx ON public.time_entries(user_id);

CREATE POLICY "Time entries visibili ai membri del progetto"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = time_entries.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Utente gestisce i propri time entry"
  ON public.time_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Migration 008: reminders
-- ============================================================

CREATE TYPE public.reminder_channel AS ENUM ('email', 'in_app', 'both');

CREATE TABLE public.reminders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remind_at   timestamptz NOT NULL,
  channel     public.reminder_channel NOT NULL DEFAULT 'both',
  sent        boolean NOT NULL DEFAULT false,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE INDEX reminders_user_id_idx    ON public.reminders(user_id);
CREATE INDEX reminders_remind_at_idx  ON public.reminders(remind_at) WHERE sent = false;

CREATE POLICY "Utente gestisce i propri reminder"
  ON public.reminders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Migration 008b: notifications
-- ============================================================

CREATE TYPE public.notification_type AS ENUM (
  'mention', 'assignment', 'reminder', 'comment',
  'status_change', 'dependency_unblocked'
);

CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        public.notification_type NOT NULL,
  title       text NOT NULL,
  body        text,
  link_url    text,
  payload     jsonb NOT NULL DEFAULT '{}',
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX notifications_user_id_idx    ON public.notifications(user_id);
CREATE INDEX notifications_read_at_idx    ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX notifications_created_at_idx ON public.notifications(created_at DESC);

CREATE POLICY "Utente vede solo le proprie notifiche"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utente può aggiornare (mark as read) le proprie notifiche"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Migration 009: activity_log (audit log immutabile)
-- ============================================================

CREATE TABLE public.activity_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  project_id    uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id       uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX activity_log_project_id_idx ON public.activity_log(project_id);
CREATE INDEX activity_log_task_id_idx    ON public.activity_log(task_id);
CREATE INDEX activity_log_created_at_idx ON public.activity_log(created_at DESC);

-- Log immutabile: nessun update o delete permesso agli utenti
CREATE POLICY "Log visibile agli admin del progetto"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (
    -- Super admin vede tutto il workspace
    (workspace_id IS NOT NULL AND get_workspace_role(workspace_id, auth.uid()) = 'super_admin')
    OR
    -- Project admin vede il proprio progetto
    (project_id IS NOT NULL AND get_project_role(project_id, auth.uid()) = 'admin')
    OR
    -- L'utente vede le proprie azioni
    auth.uid() = user_id
  );

-- Solo il service role può inserire nel log (via server-side)
CREATE POLICY "Solo service role può inserire nel log"
  ON public.activity_log FOR INSERT
  TO service_role
  WITH CHECK (true);
