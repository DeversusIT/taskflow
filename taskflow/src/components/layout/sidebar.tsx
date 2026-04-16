'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users, LayoutDashboard } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/context/workspace-context'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import type { ProjectSummary } from '@/lib/queries/projects'

const workspaceNavItems = [
  { href: '/workspace/settings', label: 'Impostazioni', icon: Settings },
  { href: '/workspace/members', label: 'Membri', icon: Users },
]

// ─── Sortable project item ───────────────────────────────────────────────────
function SortableProjectItem({ project }: { project: ProjectSummary }) {
  const pathname = usePathname()
  const isActive = pathname.startsWith(`/projects/${project.id}`)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group">
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab p-1 text-muted-foreground opacity-0 group-hover:opacity-100"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          'flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <span className="truncate">{project.name}</span>
      </Link>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
type Props = { projects: ProjectSummary[] }

export function Sidebar({ projects: initialProjects }: Props) {
  const pathname = usePathname()
  const { workspaceId, workspaceName } = useWorkspace()
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = projects.findIndex((p) => p.id === active.id)
    const newIndex = projects.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(projects, oldIndex, newIndex).map((p, i) => ({
      ...p,
      priority: i,
    }))

    setProjects(reordered)

    startTransition(async () => {
      await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: reordered.map(({ id, priority }) => ({ id, priority })),
        }),
      })
    })
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          TaskFlow
        </Link>
      </div>

      <Separator />

      {/* Workspace name */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <p className="mt-1 truncate text-sm font-medium">{workspaceName}</p>
      </div>

      <Separator />

      {/* Progetti */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Progetti
          </p>
          <CreateProjectDialog workspaceId={workspaceId} />
        </div>

        {projects.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">Nessun progetto. Creane uno!</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={projects.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {projects.map((project) => (
                <SortableProjectItem key={project.id} project={project} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Separator />

      {/* Nav workspace */}
      <nav className="flex flex-col gap-1 px-2 py-3">
        {workspaceNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === href
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
