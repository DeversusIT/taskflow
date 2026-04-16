import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password di almeno 8 caratteri'),
})

export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password di almeno 8 caratteri'),
})

export const ResetPasswordRequestSchema = z.object({
  email: z.string().email('Email non valida'),
})

export const ResetPasswordUpdateSchema = z
  .object({
    password: z.string().min(8, 'Password di almeno 8 caratteri'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })
