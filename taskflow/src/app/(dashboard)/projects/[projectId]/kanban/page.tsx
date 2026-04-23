import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { getProject, getProjectPhases } from '@/lib/queries/projects'
import { getProjectTasks } from '@/lib/queries/tasks'
import { getWorkspaceMembers } from '@/lib/queries/workspace'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { ProjectViewTabs } from '@/components/tasks/project-view-tabs'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ projectId: string }> }

export default async function ProjectKanbanPage({ params }: Props) {
  const { projectId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const [project, phases, tasks, members] = await Promise.all([
    getProject(projectId),
    getProjectPhases(projectId),
    getProjectTasks(projectId),
    memberRow ? getWorkspaceMembers(memberRow.workspace_id) : Promise.resolve([]),
  ])

  if (!project) notFound()

  return (
    <div>
      {/* Project header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span
            style={{ width: 14, height: 14, borderRadius: '50%', background: project.color, flexShrink: 0 }}
          />
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
              color: 'var(--tf-ink)',
            }}
          >
            {project.name}
          </h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link
              href={`/projects/${projectId}/settings`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid var(--tf-line)',
                background: 'transparent',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <Settings style={{ width: 14, height: 14 }} />
              Impostazioni
            </Link>
          </div>
        </div>
        {project.description && (
          <p
            style={{
              color: 'var(--tf-muted)',
              fontSize: 14,
              fontWeight: 500,
              margin: '0 0 18px 26px',
              maxWidth: 680,
            }}
          >
            {project.description}
          </p>
        )}
        <div style={{ paddingLeft: 26 }}>
          <ProjectViewTabs projectId={projectId} />
        </div>
      </div>

      <KanbanBoard
        initialTasks={tasks}
        projectId={projectId}
        phases={phases}
        members={members}
      />
    </div>
  )
}
