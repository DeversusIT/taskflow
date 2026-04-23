'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Upload, File, Image, FileText, Trash2, Download } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  getAttachmentsAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
  getSignedUrlAction,
} from '@/app/(dashboard)/projects/[projectId]/attachment-actions'
import type { Attachment } from '@/lib/queries/comments'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getInitials(name: string, email: string) {
  if (name.trim()) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email[0] ?? '?').toUpperCase()
}

function FileIcon({ type }: { type: string | null }) {
  const t = type ?? ''
  if (t.startsWith('image/')) return <Image style={{ width: 18, height: 18, color: '#2E5BFF' }} />
  if (t.includes('pdf')) return <FileText style={{ width: 18, height: 18, color: '#FF3B30' }} />
  return <File style={{ width: 18, height: 18, color: 'var(--tf-muted)' }} />
}

type Props = {
  taskId: string
  projectId: string
  currentUserId: string
}

export function AttachmentList({ taskId, projectId, currentUserId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    getAttachmentsAction(taskId, projectId).then(({ data, error }) => {
      if (error) toast.error(error)
      else setAttachments(data)
      setLoading(false)
    })
  }, [taskId, projectId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File troppo grande (max 10MB)'); return }

    setUploading(true)
    const fd = new FormData()
    fd.set('file', file)
    const { error, attachment } = await uploadAttachmentAction(taskId, projectId, fd)
    setUploading(false)

    if (error) { toast.error(error); return }
    if (attachment) setAttachments((prev) => [attachment, ...prev])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleDelete(att: Attachment) {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
    startTransition(async () => {
      const { error } = await deleteAttachmentAction(att.id, att.storage_path, projectId)
      if (error) {
        toast.error(error)
        setAttachments((prev) => [att, ...prev])
      }
    })
  }

  async function handleDownload(att: Attachment) {
    const { url, error } = await getSignedUrlAction(att.storage_path, projectId)
    if (error || !url) { toast.error(error ?? 'Errore download'); return }
    window.open(url, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="uppercase-xs">Allegati</div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 7,
            border: '1px solid var(--tf-line)',
            background: 'transparent',
            fontSize: 11.5, fontWeight: 700,
            color: 'var(--tf-ink)',
            cursor: uploading ? 'wait' : 'pointer',
            opacity: uploading ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.background = 'var(--tf-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <Upload style={{ width: 11, height: 11 }} />
          {uploading ? 'Caricamento…' : 'Carica'}
        </button>
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Drag zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--tf-accent)' : 'var(--tf-line)'}`,
          borderRadius: 10,
          padding: '14px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: attachments.length > 0 ? 14 : 0,
          background: dragging ? 'rgba(46,91,255,0.04)' : 'transparent',
          transition: 'all 140ms var(--tf-ease)',
        }}
      >
        <Upload style={{ width: 16, height: 16, color: 'var(--tf-muted)', margin: '0 auto 6px' }} />
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--tf-muted)', margin: 0 }}>
          Trascina qui o clicca per caricare
        </p>
        <p style={{ fontSize: 11, color: 'var(--tf-muted-2)', margin: '2px 0 0' }}>max 10 MB</p>
      </div>

      {loading && (
        <p style={{ fontSize: 12, color: 'var(--tf-muted)', fontStyle: 'italic', marginTop: 10 }}>
          Caricamento…
        </p>
      )}

      {/* List */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map((att) => (
            <div
              key={att.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                border: '1px solid var(--tf-line)',
                borderRadius: 9,
                background: 'var(--tf-panel)',
              }}
            >
              <FileIcon type={att.file_type} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 700,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {att.file_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tf-muted)', marginTop: 1 }}>
                  {formatSize(att.file_size)} · {att.uploader.full_name || att.uploader.email}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  onClick={() => handleDownload(att)}
                  title="Scarica"
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: 'none',
                    background: 'transparent', color: 'var(--tf-muted)',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)'; e.currentTarget.style.color = 'var(--tf-ink)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tf-muted)' }}
                >
                  <Download style={{ width: 13, height: 13 }} />
                </button>
                {att.uploaded_by === currentUserId && (
                  <button
                    onClick={() => handleDelete(att)}
                    title="Elimina"
                    style={{
                      width: 26, height: 26, borderRadius: 6, border: 'none',
                      background: 'transparent', color: 'var(--tf-muted)',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--tf-hover)'; e.currentTarget.style.color = 'var(--tf-red)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tf-muted)' }}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
