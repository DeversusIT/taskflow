# Bug Search Review — 2026-04-17

Sessione di code review completa. Bug individuati da analisi statica del codice + bug segnalato dall'utente.

---

## Bug segnalato dall'utente

### Task creato non persiste nel DB (scompare al reload)

**Sintomo confermato (2026-04-17):** creare task in Kanban quick-add → visibile nella sessione → ricaricare pagina → task scomparso. Non salvato nel DB.

**Root cause effettiva:** `createTaskAction` usava `createClient()` (user client con RLS) per l'INSERT. Se le migration di fix RLS (20260416*) non sono applicate all'istanza Supabase locale, la `tasks` SELECT policy (usata in `.insert().select()`) causa ricorsione infinita con `project_members`, restituendo un errore che impedisce il ritorno del task. L'handler `handleQuickAdd` (versione originale) non verificava `res.error`, aggiungeva il task allo stato locale anche se il server falliva, e il task appariva temporaneamente ma non era nel DB.

**Fix applicati (in ordine):**
1. `handleQuickAdd` in `kanban-board.tsx`: aggiunto check `res.error` con toast, `router.refresh()` post-insert ✅
2. `submit()` in `KanbanColumn`: reso async, attende `onQuickAdd`, aggiunto stato `saving` ✅
3. `revalidateProjectPaths`: invalida esplicitamente `/projects/[id]` e `/projects/[id]/kanban` ✅
4. `createTaskAction` e `updateTaskAction`: INSERT/UPDATE eseguiti con `serviceClient` (bypassa RLS), auth check mantenuto via `createClient().getUser()` ✅ **(fix definitivo — allineato a pattern progetto)**
5. `getProjectTasks`: aggiunto destructuring `error` con `console.error` per diagnostica errori silenti ✅

**File coinvolti:**
- `src/app/(dashboard)/projects/[projectId]/actions.ts`
- `src/components/tasks/kanban-board.tsx`
- `src/lib/queries/tasks.ts`

---

## Bug trovati da analisi statica

### CRITICAL — Security

#### 1. Auth bypass — workspace member actions
- **File:** `src/app/(dashboard)/workspace/members/actions.ts:60-95`
- `updateMemberRoleAction` e `removeMemberAction` non verificano che l'utente sia `super_admin`. Chiunque autenticato può cambiare ruoli o rimuovere membri di qualsiasi workspace.

#### 2. Auth bypass — task actions con serviceClient
- **File:** `src/app/(dashboard)/projects/[projectId]/actions.ts:121-165`
- `deleteTaskAction`, `assignTaskAction`, `unassignTaskAction`, `bulkUpdateStatusAction`, `bulkDeleteTasksAction` usano `createServiceClient()` (bypassa RLS) senza auth check. Qualsiasi utente con `projectId` può manipolare task altrui.

#### 3. Auth bypass — workspace settings
- **File:** `src/app/(dashboard)/workspace/settings/actions.ts`
- `updateWorkspaceAction` non verifica che l'utente appartenga al workspace.

#### 4. Open redirect in auth callback
- **File:** `src/app/auth/callback/route.ts`
- Parametro `next` non validato. `?next=https://evil.com` reindirizza fuori dominio.

#### 5. DB error leak al client
- **File:** multipli `src/app/api/**`
- Messaggi Supabase raw esposti (`{ error: error.message }`). Leakano struttura RLS e schema DB.

---

### MAJOR — Functional

#### 6. No rollback su drag-drop fallito
- **File:** `src/components/tasks/kanban-board.tsx:347-360`
- Ottimistico senza rollback. Se `updateTaskAction` fallisce, task rimane nella colonna sbagliata lato client, mentre il server mantiene lo stato originale.

#### 7. Delete UI eseguita prima della conferma server
- **File:** `src/components/tasks/task-panel.tsx:79-86`
- `onTaskDeleted()` chiamata immediatamente prima di `await deleteTaskAction()`. Task sparisce dalla board anche se il delete sul server fallisce.

#### 8. Assign con `assignmentId: 'pending'` stale
- **File:** `src/components/tasks/task-panel.tsx:100-107`
- Se l'utente assegna un membro e poi lo toglie prima che la revalidation completi, `unassignTaskAction` riceve `assignmentId: 'pending'` → operazione fallisce silenziosamente.

#### 9. Timezone bug nel parsing delle date
- **File:** `src/components/tasks/kanban-board.tsx:65-68`, `src/components/tasks/task-list.tsx:37-44`
- `new Date(d + 'T00:00:00')` usa timezone locale, non UTC. Date errate per utenti in fuso diverso dal server.

#### 10. useEffect in task-panel dipende solo da `task?.id`
- **File:** `src/components/tasks/task-panel.tsx:59-64`
- Se lo stesso task viene aggiornato esternamente (stessi ID, campi diversi), `setLocalTask` non si triggera → pannello mostra dati stale.

#### 11. Input `defaultValue` non controllati in task-panel
- **File:** `src/components/tasks/task-panel.tsx:143-253`
- Input titolo/descrizione usano `defaultValue` (uncontrolled). Non si aggiornano quando `localTask` cambia via `setLocalTask`.

#### 12. `Promise.all()` senza error check
- **File:** `src/app/api/projects/route.ts:104`
- Reorder progetti/fasi fallisce silenziosamente. Nessun errore propagato al client.

#### 13. Sidebar reorder fetch error ignorato
- **File:** `src/components/layout/sidebar.tsx:111-119`
- Utente vede riordino locale, ma se la fetch fallisce il server mantiene l'ordine originale. Nessuna notifica.

---

### MINOR

| # | File | Issue |
|---|------|-------|
| 14 | `kanban-board.tsx:363-372` | `handleQuickAdd` non mostra errore se `res.error` (vedi bug utente sopra) |
| 15 | `members/actions.ts:86-95` | `removeMemberAction` ritorna `void` → impossibile gestire errori lato client |
| 16 | `task-panel.tsx:74,81,84,112` | Non-null assertion `task!.id` multipli — fragili se guard bypassato |
| 17 | `projects/create-project-dialog.tsx:42-47` | Form non resettato dopo creazione progetto riuscita |
| 18 | `task-panel.tsx:100-107` | `assignmentId: 'pending'` placeholder fragile |
| 19 | `src/app/(dashboard)/projects/[projectId]/actions.ts:59-62` | Count query non controlla errore → `order_index` silenziosamente 0 se query fallisce |

---

## Priorità fix consigliata

1. **Bug utente** — `handleQuickAdd` error check (quick fix, high impact)
2. **Security #1-3** — auth bypass nelle actions (prima del deploy in produzione)
3. **Security #4** — open redirect auth callback
4. **Functional #6** — rollback drag-drop
5. **Functional #7** — delete ottimistico prematuro
6. **Functional #9** — timezone date parsing
7. **Security #5** — error message sanitization
