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
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        <Link
          href={`/projects/${projectId}/settings`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          Impostazioni
        </Link>
      </div>

      {project.description && (
        <p className="text-muted-foreground text-sm max-w-2xl">{project.description}</p>
      )}

      <ProjectViewTabs projectId={projectId} />

      <KanbanBoard
        initialTasks={tasks}
        projectId={projectId}
        phases={phases}
        members={members}
      />
    </div>
  )
}
