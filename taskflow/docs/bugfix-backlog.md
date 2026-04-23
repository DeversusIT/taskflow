# Bugfix Backlog

Derivato dal bug-review-2026-04-17.md. Solo bug aperti, con dettaglio fix.

---

## CRITICAL — da fixare prima del deploy multi-utente

### #2 — serviceClient senza project authorization

**File:** `src/app/(dashboard)/projects/[projectId]/actions.ts`  
**Funzioni:** `deleteTaskAction` (L121), `assignTaskAction` (L138), `unassignTaskAction` (L158), `bulkUpdateStatusAction` (L175), `bulkDeleteTasksAction` (L196)

**Problema:** Tutte usano `createServiceClient()` (bypass RLS) ma verificano solo `getUser()` — non che l'utente sia membro del progetto. Chiunque autenticato può manipolare task di qualsiasi progetto.

**Fix:** Dopo `getUser()`, aggiungere query su `project_members`:
```typescript
const { data: membership } = await supabase
  .from('project_members')
  .select('role')
  .eq('project_id', projectId)
  .eq('user_id', user.id)
  .single()

if (!membership) return { error: 'Non hai accesso a questo progetto' }
```
Per `deleteTaskAction` e bulk actions aggiungere anche check ruolo (`editor` o superiore).

---

## MAJOR — fix prima di Phase 9 (task panel viene esteso)

### #10 + #11 — useEffect stale + uncontrolled inputs (correlati)

**File:** `src/components/tasks/task-panel.tsx`

**#10 — useEffect dep errata (L60-65):**
```typescript
// APERTO
useEffect(() => { setLocalTask(task) }, [task?.id])

// FIX
useEffect(() => { setLocalTask(task) }, [task])
```

**#11 — Input uncontrolled (L151, L164, L239, L253):**
```typescript
// APERTO
<Input defaultValue={localTask.title} onBlur={...} />

// FIX — controlled
<Input value={localTask.title ?? ''} onChange={(e) => setLocalTask(prev => prev ? { ...prev, title: e.target.value } : prev)} onBlur={...} />
```
Stessa conversione per: descrizione (`Textarea`), due_date (`Input[type=date]`), estimated_hours (`Input[type=number]`).

---

### #9 — Timezone bug date "in ritardo"

**File:** `src/components/tasks/kanban-board.tsx:67`, `src/components/tasks/task-list.tsx:39`

```typescript
// APERTO
const d = new Date(due + 'T00:00:00')

// FIX — date-fns già in stack
import { parseISO, startOfDay } from 'date-fns'
const d = startOfDay(parseISO(due))
```

---

### #8 — assignmentId 'pending' stale

**File:** `src/components/tasks/task-panel.tsx:106-113`

**Problema:** toggle assegnatario usa `assignmentId: 'pending'` come placeholder ottimistico. Se l'utente clicca di nuovo prima della revalidation, `unassignTaskAction` riceve `'pending'` come ID → fallisce silenziosamente.

**Fix:** disabilitare il toggle per quel membro mentre `assignmentId === 'pending'`.
```typescript
<button
  disabled={assignee.assignmentId === 'pending'}
  onClick={() => handleUnassign(assignee.assignmentId)}
>
```

---

## MINOR — da valutare

| # | File | Issue |
|---|------|-------|
| 5 | `src/app/api/**` | Messaggi Supabase raw esposti al client (`{ error: error.message }`) |
| 12 | `src/app/api/projects/route.ts:104` | `Promise.all()` reorder senza error check |
| 13 | `src/components/layout/sidebar.tsx:111-119` | Reorder fetch error ignorato, stato locale diverge dal server |
| 15 | `workspace/members/actions.ts` | `removeMemberAction` ritorna `void` → client non può gestire errori |
| 16 | `task-panel.tsx` | Non-null assertion `task!.id` multipli — fragili |
| 17 | `projects/create-project-dialog.tsx` | Form non resettato dopo creazione progetto |
| 19 | `actions.ts:59-62` | Count query non controlla errore → `order_index` silenziosamente 0 |

---

## Priorità consigliata

1. **#2** — fix prima di qualsiasi deploy con utenti reali
2. **#10 + #11** — fix prima di estendere TaskPanel in Phase 8/9
3. **#9** — fix rapido (2 righe), alto impatto visivo
4. **#8** — fix rapido (1 prop), evita bug sottile
5. **MINOR** — quando si tocca il file di competenza
