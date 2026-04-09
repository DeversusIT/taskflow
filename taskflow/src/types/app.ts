// Tipi applicativi estesi — completare man mano che lo schema DB viene definito.

export type ApiResponse<T> = {
  data: T | null
  error: string | null
}
