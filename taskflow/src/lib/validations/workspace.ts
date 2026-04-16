import { z } from 'zod'

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri').max(50, 'Massimo 50 caratteri'),
})

export const InviteMemberSchema = z.object({
  email: z.string().email('Email non valida'),
  role: z.enum(['super_admin', 'member'], { error: 'Ruolo non valido' }),
})

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['super_admin', 'member'], { error: 'Ruolo non valido' }),
})
