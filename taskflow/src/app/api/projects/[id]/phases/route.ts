import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreatePhaseSchema, ReorderPhasesSchema } from '@/lib/validations/project'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('phases')
    .select('*')
    .eq('project_id', id)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = CreatePhaseSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { count } = await supabase
    .from('phases')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id)

  const { data, error } = await supabase
    .from('phases')
    .insert({ ...result.data, project_id: id, order_index: count ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const result = ReorderPhasesSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const updates = result.data.phases.map(({ id: phaseId, order_index }) =>
    supabase.from('phases').update({ order_index }).eq('id', phaseId).eq('project_id', id),
  )
  await Promise.all(updates)

  return NextResponse.json({ data: null })
}
