import { z } from 'zod'

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio').max(500, 'Massimo 500 caratteri'),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['open', 'in_progress', 'on_hold', 'completed']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  phase_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  estimated_hours: z.coerce.number().min(0).max(9999).optional().nullable(),
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['open', 'in_progress', 'on_hold', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  phase_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  estimated_hours: z.coerce.number().min(0).max(9999).optional().nullable(),
})
