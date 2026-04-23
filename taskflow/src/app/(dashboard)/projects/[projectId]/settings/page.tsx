export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getProject, getProjectPhases } from '@/lib/queries/projects'
import { ProjectSettingsForm } from '@/components/projects/project-settings-form'
import { PhaseList } from '@/components/projects/phase-list'
import { Separator } from '@/components/ui/separator'

type Props = { params: Promise<{ projectId: string }> }

export default async function ProjectSettingsPage({ params }: Props) {
  const { projectId } = await params
  const [project, phases] = await Promise.all([
    getProject(projectId),
    getProjectPhases(projectId),
  ])

  if (!project) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni progetto</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Modifica nome, colore, date e fasi del progetto.
        </p>
      </div>

      <ProjectSettingsForm project={project} />

      <Separator />

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Fasi</h2>
          <p className="text-sm text-muted-foreground">
            Organizza il progetto in fasi sequenziali. Trascina per riordinare.
          </p>
        </div>
        <PhaseList initialPhases={phases} projectId={projectId} />
      </div>
    </div>
  )
}
