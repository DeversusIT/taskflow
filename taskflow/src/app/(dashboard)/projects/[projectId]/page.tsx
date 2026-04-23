import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Settings, Users } from 'lucide-react'
import { getProject, getProjectPhases } from '@/lib/queries/projects'
import { getProjectTasks } from '@/lib/queries/tasks'
import { getWorkspaceMembers } from '@/lib/queries/workspace'
import { TaskList } from '@/components/tasks/task-list'
import { ProjectViewTabs } from '@/components/tasks/project-view-tabs'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/queries/tasks'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ projectId: string }> }

function ProjectStats({ tasks }: { tasks: Task[] }) {
  const counts = { open: 0, in_progress: 0, on_hold: 0, completed: 0 }
  for (const t of tasks) counts[t.status]++
  const total = tasks.length
  const doneRatio = total ? counts.completed / total : 0
  const overdue = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false
    return new Date(t.due_date + 'T00:00:00Z') < new Date()
  }).length

  const stats = [
    { label: 'Totale',    value: total,               color: 'var(--tf-ink)' },
    { label: 'In corso',  value: counts.in_progress,  color: '#7C3AED' },
    { label: 'Aperte',    value: counts.open,          color: '#2E5BFF' },
    { label: 'Concluse',  value: counts.completed,     color: '#00C26E' },
    { label: 'In ritardo',value: overdue,              color: '#FF3B30' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 2fr', gap: 10, marginBottom: 22 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            border: '1px solid var(--tf-line)',
            borderRadius: 10,
            padding: '10px 14px',
            background: 'var(--tf-panel)',
          }}
        >
          <div className="uppercase-xs" style={{ fontSize: 9.5 }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: s.color, marginTop: 2 }}>
            {s.value}
          </div>
        </div>
      ))}
      <div
        style={{
          border: '1px solid var(--tf-line)',
          borderRadius: 10,
          padding: '10px 14px',
          background: 'var(--tf-panel)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="uppercase-xs" style={{ fontSize: 9.5 }}>Completamento</div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{Math.round(doneRatio * 100)}%</div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--tf-hover)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${doneRatio * 100}%`,
              height: '100%',
              background: '#D6FF3D',
              transition: 'width 400ms var(--tf-ease)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default async function ProjectPage({ params }: Props) {
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
                transition: 'background 140ms var(--tf-ease)',
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

      <ProjectStats tasks={tasks} />

      <TaskList
        initialTasks={tasks}
        projectId={projectId}
        phases={phases}
        members={members}
      />
    </div>
  )
}
