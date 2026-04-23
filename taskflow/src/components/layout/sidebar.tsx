'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users, LayoutGrid } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/context/workspace-context'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import type { ProjectSummary } from '@/lib/queries/projects'

const workspaceNavItems = [
  { href: '/workspace/settings', label: 'Impostazioni', icon: Settings },
  { href: '/workspace/members', label: 'Membri', icon: Users },
]

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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link
        href={`/projects/${project.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '7px 10px',
          borderRadius: 7,
          fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          background: isActive ? 'var(--tf-selected)' : 'transparent',
          transition: 'background 140ms var(--tf-ease)',
          marginBottom: 1,
          color: 'inherit',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'var(--tf-hover)'
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: project.color,
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </span>
      </Link>
    </div>
  )
}

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

  const initial = workspaceName?.[0]?.toUpperCase() ?? 'W'

  return (
    <aside
      style={{
        width: 248,
        height: '100%',
        background: 'var(--tf-panel)',
        borderRight: '1px solid var(--tf-line)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 18px',
          borderBottom: '1px solid var(--tf-line)',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: 'var(--tf-ink)',
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <LayoutGrid style={{ width: 16, height: 16 }} strokeWidth={2.2} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.03em' }}>TaskFlow</span>
      </div>

      {/* Workspace button */}
      <div style={{ padding: '14px 14px 10px' }}>
        <div className="uppercase-xs" style={{ marginBottom: 6, paddingLeft: 6 }}>Workspace</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--tf-hover)',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'var(--tf-ink)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {workspaceName}
          </span>
        </div>
      </div>

      {/* Projects */}
      <div
        style={{
          padding: '8px 14px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="uppercase-xs" style={{ paddingLeft: 6 }}>Progetti</div>
        <CreateProjectDialog workspaceId={workspaceId} />
      </div>

      <div style={{ padding: '2px 8px', flex: 1, overflowY: 'auto' }}>
        {projects.length === 0 ? (
          <p style={{ padding: '8px 10px', fontSize: 12, color: 'var(--tf-muted)' }}>
            Nessun progetto. Creane uno!
          </p>
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

      {/* Bottom nav */}
      <div style={{ borderTop: '1px solid var(--tf-line)', padding: 10 }}>
        {workspaceNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--tf-selected)' : 'transparent',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 140ms var(--tf-ease)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--tf-hover)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
