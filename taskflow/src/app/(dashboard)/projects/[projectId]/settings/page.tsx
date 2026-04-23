export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getProject, getProjectPhases } from '@/lib/queries/projects'
import { ProjectSettingsForm } from '@/components/projects/project-settings-form'
import { PhaseList } from '@/components/projects/phase-list'

type Props = { params: Promise<{ projectId: string }> }

export default async function ProjectSettingsPage({ params }: Props) {
  const { projectId } = await params
  const [project, phases] = await Promise.all([
    getProject(projectId),
    getProjectPhases(projectId),
  ])

  if (!project) notFound()

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: 'var(--tf-ink)' }}>
        Impostazioni progetto
      </h1>
      <p style={{ color: 'var(--tf-muted)', fontSize: 14, fontWeight: 500, margin: '0 0 26px' }}>
        Modifica nome, colore, date e fasi del progetto.
      </p>

      <div style={{ background: 'var(--tf-panel)', border: '1px solid var(--tf-line)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <ProjectSettingsForm project={project} />
      </div>

      <div style={{ background: 'var(--tf-panel)', border: '1px solid var(--tf-line)', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Fasi</h2>
        <p style={{ fontSize: 13, color: 'var(--tf-muted)', margin: '0 0 18px' }}>
          Organizza il progetto in fasi sequenziali. Trascina per riordinare.
        </p>
        <PhaseList initialPhases={phases} projectId={projectId} />
      </div>
    </div>
  )
}
