import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100, 'Massimo 100 caratteri'),
  description: z.string().max(500, 'Massimo 500 caratteri').optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Colore non valido')
    .default('#6366f1'),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  priority: z.number().int().min(0).optional(),
})

export const CreatePhaseSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio').max(100, 'Massimo 100 caratteri'),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Colore non valido')
    .default('#6366f1'),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
})

export const UpdatePhaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  order_index: z.number().int().min(0).optional(),
})

export const ReorderPhasesSchema = z.object({
  phases: z.array(
    z.object({ id: z.string().uuid(), order_index: z.number().int().min(0) }),
  ),
})

export const ReorderProjectsSchema = z.object({
  projects: z.array(
    z.object({ id: z.string().uuid(), priority: z.number().int().min(0) }),
  ),
})
