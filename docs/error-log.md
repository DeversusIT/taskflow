# TaskFlow — Error Log

Registro cronologico degli errori riscontrati, cause e soluzioni adottate.

---

## 2026-04-16

---

### ERR-001 — RLS infinite recursion su `project_members`

**Fase:** 5 (Progetti & Fasi)  
**Sintomo:** `infinite recursion detected in policy for relation "project_members"` al momento della creazione di un progetto.  
**Causa:** la policy SELECT su `project_members` usava un EXISTS che interrogava `project_members` stessa (auto-referenziale), creando un loop infinito nel motore RLS di PostgreSQL.  
**Soluzione:** creata funzione `is_project_member(project_id uuid, user_id uuid)` con `SECURITY DEFINER` (bypasssa RLS internamente). Tutte le policy che richiedono il check di membership ora usano questa funzione invece di un EXISTS diretto.  
**Migration:** `20260416000002_fix_project_members_rls.sql`

---

### ERR-002 — RLS violation su INSERT nella tabella `projects`

**Fase:** 5 (Progetti & Fasi)  
**Sintomo:** `new row violates row-level security policy for table "projects"` alla creazione di un progetto.  
**Causa:** la WITH CHECK della policy INSERT su `projects` chiamava `is_workspace_member()` che a sua volta interrogava `project_members`, indirettamente ricreando il loop. Inoltre, il "chicken-and-egg": per inserire in `projects` serviva essere membro, ma la membership veniva creata dopo l'INSERT.  
**Soluzione:** la Server Action `createProjectAction` usa `createServiceClient()` (service role key, bypassa RLS completamente) per entrambe le INSERT (`projects` e `project_members`). L'autenticazione utente è verificata manualmente prima via `supabase.auth.getUser()`.  
**Migration:** `20260416000003_fix_projects_insert_rls.sql` (parziale — soluzione finale lato app)

---

### ERR-003 — RLS violation su SELECT `tasks` dopo creazione

**Fase:** 6 (Task Core)  
**Sintomo:** task creata con successo nel DB (service client), ma non visibile nella lista dopo refresh — la query SELECT con RLS attivo non la restituiva.  
**Causa:** la policy SELECT su `tasks` usava `is_project_member()` correttamente, ma le policy sulle tabelle correlate (`task_assignments`, `task_dependencies`) usavano EXISTS diretti che potevano creare recursion.  
**Soluzione:** migration `20260416000004_fix_tasks_rls.sql` — tutte le policy SELECT di tasks e tabelle correlate usano `is_project_member()` SECURITY DEFINER.

---

### ERR-004 — Task non appare nella lista dopo creazione (prima parte)

**Fase:** 6 (Task Core)  
**Sintomo:** la task viene salvata nel DB, il form si chiude, ma la lista non si aggiorna.  
**Causa:** `router.refresh()` veniva chiamato per aggiornare la lista, ma non garantiva che i nuovi dati venissero propagati correttamente al componente client (race condition o caching Next.js).  
**Soluzione:** la Server Action `createTaskAction` ora restituisce l'intera riga del task appena creato (`newTask: Task`). Il componente client aggiunge immediatamente il task allo stato locale senza attendere il refresh dal server.

---

### ERR-005 — Task appare brevemente poi scompare (seconda parte)

**Fase:** 6 (Task Core)  
**Sintomo:** il task viene aggiunto alla lista (fix ERR-004 applicato), ma dopo pochi istanti scompare.  
**Causa:** `revalidatePath()` chiamata nella Server Action triggerava un refresh automatico dei Server Components in Next.js App Router. Il componente `TaskList` riceveva `initialTasks` aggiornati dal server (che non includevano ancora il nuovo task per problemi di RLS/context), e il `useEffect(() => { setTasks(initialTasks) }, [initialTasks])` sovrascriveva lo stato locale eliminando il task appena aggiunto.  
**Soluzione:**  
1. Rimossa chiamata `router.refresh()` dal handler di creazione task (non necessaria, il task è già in stato locale).  
2. `useEffect([initialTasks])` modificato per fare **merge** invece di replace: i task presenti in stato locale ma non nella risposta server vengono preservati.

```typescript
useEffect(() => {
  setTasks((prev) => {
    const serverIds = new Set(initialTasks.map((t) => t.id))
    const localOnly = prev.filter((t) => !serverIds.has(t.id))
    return [...initialTasks, ...localOnly]
  })
}, [initialTasks])
```

---

### ERR-006 — `useActionState` + `<form action>` inaffidabile con Base UI Button

**Fase:** 6 (Task Core)  
**Sintomo:** il form di quick-add non triggerava l'azione server o non aggiornava lo stato in modo prevedibile.  
**Causa:** il componente `Button` da `@base-ui/react` wrappa `ButtonPrimitive` che potrebbe non comportarsi identicamente a un `<button type="submit">` nativo all'interno di un `<form action={serverAction}>`. Il pattern `useActionState` + form action progressivo mostrava comportamento incoerente.  
**Soluzione:** rimosso `useActionState` e `<form action>`. Sostituito con handler `onClick` esplicito che chiama la Server Action direttamente dentro `startTransition`:

```typescript
startTransition(async () => {
  const result = await createTaskAction(projectId, { error: null }, formData)
  if (result.error) { setError(result.error) }
  else if (result.newTask) { onCreated(result.newTask); setOpen(false) }
})
```

---

### ERR-007 — Deploy Vercel sul progetto sbagliato

**Fase:** 6 (Task Core)  
**Sintomo:** le modifiche deployate non erano visibili sull'URL di produzione `taskflow-ecru-gamma.vercel.app`.  
**Causa:** il comando `vercel --prod --yes` veniva eseguito dalla directory root del repository (`/Users/luca/Desktop/Claude-Code/138507/`) invece che dalla directory del progetto Next.js (`taskflow/`). Vercel creava/aggiornava un progetto separato (`138507.vercel.app`).  
**Soluzione:** eseguire sempre `vercel --prod --yes` dall'interno di `taskflow/`. Il file `.vercel/project.json` in quella directory punta al progetto corretto (`taskflow`, `prj_XJv0Iu6KdtJXA34aebh0X1YQMA1V`).

---

## Pattern ricorrenti e lezioni apprese

| Pattern | Regola |
|---------|--------|
| RLS self-referential | Ogni policy che controlla la membership deve usare una funzione `SECURITY DEFINER`, mai un EXISTS diretto sulla stessa tabella |
| Write privilegiate | Tutte le Server Actions di INSERT/UPDATE/DELETE usano `createServiceClient()` + verifica auth manuale |
| Stato locale vs server | Non usare `router.refresh()` dopo operazioni ottimistiche già in stato locale. Usare merge in `useEffect([serverProps])` |
| Base UI + Server Actions | Preferire `startTransition` + chiamata diretta alla Server Action rispetto a `useActionState` + `<form action>` |
| Vercel deploy | Sempre eseguire da `taskflow/` — mai dalla root del repo |
