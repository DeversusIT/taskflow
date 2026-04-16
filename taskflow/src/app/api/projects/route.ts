import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CreateProjectSchema, ReorderProjectsSchema } from '@/lib/validations/project'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, color, status, priority, description, start_date, due_date, created_at')
    .eq('workspace_id', member.workspace_id)
    .neq('status', 'archived')
    .order('priority', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const body = await request.json()
  const result = CreateProjectSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // Calcola il prossimo priority (in fondo alla lista)
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', member.workspace_id)

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      ...result.data,
      workspace_id: member.workspace_id,
      created_by: user.id,
      priority: count ?? 0,
    })
    .select('id, name, color, status, priority')
    .single()

  if (error || !project) {
    return NextResponse.json({ error: error?.message ?? 'Errore creazione progetto' }, { status: 500 })
  }

  // Aggiungi il creatore come admin del progetto (service client bypasses RLS)
  const serviceClient = createServiceClient()
  await serviceClient.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'admin',
    added_by: user.id,
  })

  return NextResponse.json({ data: project }, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = ReorderProjectsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const updates = result.data.projects.map(({ id, priority }) =>
    supabase.from('projects').update({ priority }).eq('id', id).eq('created_by', user.id),
  )
  await Promise.all(updates)

  return NextResponse.json({ data: null })
}
