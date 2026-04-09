// Questo file viene generato automaticamente da Supabase CLI.
// Comando: supabase gen types typescript --local > src/types/database.ts
// NON modificare manualmente — rigenerare dopo ogni modifica allo schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
