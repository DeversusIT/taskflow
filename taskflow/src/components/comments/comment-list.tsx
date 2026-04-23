'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { Edit2, Trash2, Send } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  getCommentsAction,
  createCommentAction,
  updateCommentAction,
  deleteCommentAction,
} from '@/app/(dashboard)/projects/[projectId]/comment-actions'
import type { Comment } from '@/lib/queries/comments'
import type { WorkspaceMember } from '@/lib/queries/workspace'

function getInitials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

function relativeTime(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: it })
}

type MentionState = { open: boolean; query: string; startPos: number }

type Props = {
  taskId: string
  projectId: string
  currentUserId: string
  members: WorkspaceMember[]
}

export function CommentList({ taskId, projectId, currentUserId, members }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [mentionIds, setMentionIds] = useState<string[]>([])
  const [mentionState, setMentionState] = useState<MentionState | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    getCommentsAction(taskId, projectId).then(({ data, error }) => {
      if (error) toast.error(error)
      else setComments(data)
      setLoading(false)
    })
  }, [taskId, projectId])

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setBody(val)

    const cursor = e.target.selectionStart ?? val.length
    const before = val.slice(0, cursor)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionState({ open: true, query: (match[1] ?? '').toLowerCase(), startPos: cursor - match[0].length })
    } else {
      setMentionState(null)
    }
  }

  function insertMention(member: WorkspaceMember) {
    if (!mentionState) return
    const firstName = member.profile.fullName?.split(' ')[0] ?? member.profile.email.split('@')[0]
    const before = body.slice(0, mentionState.startPos)
    const after = body.slice(mentionState.startPos + 1 + mentionState.query.length)
    setBody(`${before}@${firstName} ${after}`)
    setMentionIds((prev) => [...new Set([...prev, member.userId])])
    setMentionState(null)
    textareaRef.current?.focus()
  }

  const mentionMembers = mentionState
    ? members.filter((m) => {
        const first = (m.profile.fullName?.split(' ')[0] ?? '').toLowerCase()
        const email = m.profile.email.toLowerCase()
        const q = mentionState.query
        return !q || first.startsWith(q) || email.startsWith(q)
      }).slice(0, 6)
    : []

  function handleSubmit() {
    const text = body.trim()
    if (!text) return
    setBody('')
    setMentionIds([])
    setMentionState(null)
    startTransition(async () => {
      const { error, comment } = await createCommentAction(taskId, projectId, text, mentionIds)
      if (error) { toast.error(error); return }
      if (comment) {
        setComments((prev) => [...prev, comment])
        setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    })
  }

  function startEdit(c: Comment) {
    setEditingId(c.id)
    setEditBody(c.body)
  }

  function handleEditSave(commentId: string) {
    const text = editBody.trim()
    if (!text) return
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, body: text, edited_at: new Date().toISOString() } : c))
    setEditingId(null)
    startTransition(async () => {
      const { error } = await updateCommentAction(commentId, text)
      if (error) toast.error(error)
    })
  }

  function handleDelete(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    startTransition(async () => {
      const { error } = await deleteCommentAction(commentId)
      if (error) toast.error(error)
    })
  }

  return (
    <div>
      <div className="uppercase-xs" style={{ marginBottom: 12 }}>Commenti</div>

      {loading && (
        <p style={{ fontSize: 12, color: 'var(--tf-muted)', fontStyle: 'italic', marginBottom: 12 }}>
          Caricamento…
        </p>
      )}

      {!loading && comments.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--tf-muted)', fontStyle: 'italic', marginBottom: 12 }}>
          Nessun commento.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {comments.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {getInitials(c.profile.full_name, c.profile.email)}
              </AvatarFallback>
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {c.profile.full_name || c.profile.email}
                </span>
                <span style={{ fontSize: 11, color: 'var(--tf-muted)' }}>
                  {relativeTime(c.created_at)}
                  {c.edited_at && <span> · modificato</span>}
                </span>
                {c.user_id === currentUserId && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    {editingId !== c.id && (
                      <button
                        onClick={() => startEdit(c)}
                        style={{
                          width: 22, height: 22, borderRadius: 5, border: 'none',
                          background: 'transparent', color: 'var(--tf-muted)',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)'; e.currentTarget.style.color = 'var(--tf-ink)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tf-muted)' }}
                      >
                        <Edit2 style={{ width: 11, height: 11 }} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{
                        width: 22, height: 22, borderRadius: 5, border: 'none',
                        background: 'transparent', color: 'var(--tf-muted)',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)'; e.currentTarget.style.color = 'var(--tf-red)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tf-muted)' }}
                    >
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                )}
              </div>

              {editingId === c.id ? (
                <div>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%', resize: 'vertical', padding: '8px 10px',
                      border: '1px solid var(--tf-accent)',
                      borderRadius: 8, background: 'var(--tf-bg)',
                      fontSize: 13, fontWeight: 500, lineHeight: 1.5,
                      fontFamily: 'inherit', color: 'inherit',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleEditSave(c.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      onClick={() => handleEditSave(c.id)}
                      style={{
                        padding: '4px 12px', borderRadius: 7, border: 'none',
                        background: 'var(--tf-ink)', color: '#fff',
                        fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: '4px 12px', borderRadius: 7,
                        border: '1px solid var(--tf-line)',
                        background: 'transparent',
                        fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{
                  fontSize: 13, fontWeight: 500, lineHeight: 1.5, margin: 0,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {c.body}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      {/* New comment */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleBodyChange}
          placeholder="Scrivi un commento… (@ per menzionare)"
          rows={3}
          style={{
            width: '100%', resize: 'vertical', padding: '10px 12px',
            border: '1px solid var(--tf-line)',
            borderRadius: 10, background: 'var(--tf-bg)',
            fontSize: 13, fontWeight: 500, lineHeight: 1.5,
            fontFamily: 'inherit', color: 'inherit',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--tf-accent)' }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--tf-line)'
            setTimeout(() => setMentionState(null), 150)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit() }
            if (e.key === 'Escape') setMentionState(null)
          }}
        />

        {/* @mention dropdown */}
        {mentionState?.open && mentionMembers.length > 0 && (
          <div
            style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4,
              background: 'var(--tf-panel)',
              border: '1px solid var(--tf-line)',
              borderRadius: 10,
              boxShadow: 'var(--tf-shadow-pop)',
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            {mentionMembers.map((m) => {
              const firstName = m.profile.fullName?.split(' ')[0] ?? m.profile.email.split('@')[0]
              return (
                <button
                  key={m.userId}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(m) }}
                  style={{
                    width: '100%', padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: 12.5, fontWeight: 600,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px]">
                      {getInitials(m.profile.fullName, m.profile.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{m.profile.fullName || m.profile.email}</span>
                  <span style={{ fontSize: 11, color: 'var(--tf-muted)', marginLeft: 'auto' }}>
                    @{firstName}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!body.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              background: body.trim() ? 'var(--tf-ink)' : 'var(--tf-hover)',
              color: body.trim() ? '#fff' : 'var(--tf-muted)',
              border: 'none', fontSize: 12.5, fontWeight: 700,
              cursor: body.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 120ms var(--tf-ease)',
            }}
          >
            <Send style={{ width: 12, height: 12 }} />
            Invia
          </button>
        </div>
      </div>
    </div>
  )
}
