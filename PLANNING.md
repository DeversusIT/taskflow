# TaskFlow — Project Planning

**Status:** 🟢 In Sviluppo — Phase 7  
**Ultimo aggiornamento:** 2026-04-16  
**Stack:** Next.js 14 + TypeScript + Supabase + Vercel  
**Documento di riferimento:** `PRD.md` | Regole sviluppo: `CLAUDE.md`

---

## Legenda stati
- `[ ]` — Da fare
- `[~]` — In corso
- `[x]` — Completato
- `[-]` — Rimandato a V2/V3

---

## Variabili d'ambiente necessarie

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

Configurare in `.env.local` (locale) e nel dashboard Vercel (produzione).

---

## Decisioni architetturali

| Data | Decisione | Motivazione |
|------|-----------|-------------|
| 2026-04-09 | Next.js 14 App Router | SSR nativo, server components, API Routes integrate, DX ottimale |
| 2026-04-09 | Supabase come backend completo | Auth + DB + Storage + Realtime in un unico servizio gestito, zero DevOps |
| 2026-04-09 | @dnd-kit invece di react-beautiful-dnd | Mantenuto attivamente, accessibile, TypeScript-first, no iframe hack |
| 2026-04-09 | Resend + React Email | Migliore DX per email transazionali con Next.js, deliverability alta |
| 2026-04-09 | shadcn/ui invece di librerie monolitiche | Componenti copiati nel progetto (no lock-in), personalizzabili, Radix UI sotto |
| 2026-04-09 | Gerarchia Workspace > Progetti > Fasi > Task | Richiesto dall'utente, scalabile per 20-100 utenti |
| 2026-04-09 | RLS su ogni tabella Supabase | Sicurezza a livello DB, permessi non aggirabili lato applicazione |
| 2026-04-09 | rrule.js per task ricorrenti | Standard RFC 5545, compatibile con calendari, matura e testata |

---

## Phase 1 — Foundation & Setup

**Obiettivo:** progetto funzionante localmente con CI/CD configurato.

- [x] Inizializzare progetto Next.js 14 con TypeScript strict
- [x] Configurare Tailwind CSS + shadcn/ui (tema base + dark mode con next-themes)
- [x] Configurare ESLint + Prettier
- [ ] Creare progetto Supabase (prod) + progetto Supabase locale per sviluppo
- [ ] Configurare `supabase/` directory con CLI
- [x] Creare `.env.example` con tutte le variabili necessarie
- [x] Setup client Supabase: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- [x] Configurare `middleware.ts` per protezione route autenticate
- [x] Struttura directory completa come da CLAUDE.md

**Verifica:** `npm run dev` funziona, Supabase locale raggiungibile, deploy preview su Vercel OK.

---

## Phase 2 — Schema Database & Migrations

**Obiettivo:** schema DB completo con RLS policies su tutte le tabelle.

- [x] Migration 001: tabelle `profiles`, `workspaces`, `workspace_members`
- [x] Migration 002: tabelle `projects`, `project_members`, `phases`
- [x] Migration 003: tabelle `tasks`, `task_assignments`, `task_dependencies`
- [x] Migration 004: tabelle `checklists`, `checklist_items`
- [x] Migration 005: tabella `comments`
- [x] Migration 006: tabella `attachments`
- [x] Migration 007: tabelle `time_entries`
- [x] Migration 008: tabelle `reminders`, `notifications`
- [x] Migration 009: tabella `activity_log`
- [x] RLS policies per tutte le tabelle (super_admin, project_admin, editor, viewer)
- [x] Indici di performance su tutti i FK e colonne critiche
- [x] Indici FTS: `tsvector` su `tasks.title` + `tasks.description`
- [x] Funzioni helper DB: `get_project_role()`, `get_workspace_role()`, `is_workspace_admin_for_project()`
- [x] Trigger DB: auto-insert in `profiles` su nuovo `auth.users`
- [x] Generare tipi TypeScript: `src/types/database.ts`
- [-] Seed data per sviluppo locale (`supabase/seed.sql`) — rimandato

**Verifica:** tutte le migration applicabili, tipi TS generati, RLS testata con utenti di test diversi.

---

## Phase 3 — Autenticazione & Profili Utente

**Obiettivo:** flusso auth completo funzionante.

- [x] Layout pagine auth `(auth)/layout.tsx` (no sidebar, centrato)
- [x] Pagina `/login`: form email + password, link reset password
- [x] Pagina `/register`: form nome + email + password, validazione Zod
- [x] Pagina `/reset-password`: richiesta email + form nuova password
- [x] Gestione callback Supabase Auth (`/auth/callback/route.ts`)
- [x] Redirect post-login → `/` (che redirige al workspace)
- [-] Pagina profilo utente: modifica nome, avatar (upload Supabase Storage), cambio password — rimandato a V2
- [-] Preferenze utente: tema/timezone/notifiche — rimandato a V2

**Componenti:** `LoginForm`, `RegisterForm`, `RequestResetForm`, `UpdatePasswordForm`

**Verifica:** register → email verifica → login → reset password funzionanti end-to-end. Middleware blocca route protette senza sessione. ✅ Completata 2026-04-16

---

## Phase 4 — Workspace, Utenti & Ruoli

**Obiettivo:** gestione completa del workspace e dei ruoli.

- [x] Creazione workspace automatica al primo login del super_admin
- [x] Pagina impostazioni workspace (nome, logo)
- [x] Pagina gestione membri (`/workspace/members`):
  - Lista utenti con ruolo e data iscrizione
  - Form invito via email (genera link temporaneo 7 giorni)
  - Modifica ruolo utente
  - Disabilitazione/riabilitazione account
- [-] Email di invito (template React Email) — Supabase built-in invite email usata
- [-] Pagina accettazione invito (`/invite/[token]`) — gestito via user_metadata + callback
- [x] Hook custom `useUserRole()` — accesso al ruolo corrente in qualsiasi componente
- [x] Componente `PermissionGate` — mostra/nasconde UI in base al ruolo

**Componenti:** `MemberList`, `MemberRow`, `InviteForm`, `RoleBadge`, `PermissionGate`

**Verifica:** invito via email funzionante, permessi verificati per ogni ruolo, utente non autorizzato vede 403.

---

## Phase 5 — Progetti & Fasi Sequenziali

**Obiettivo:** CRUD completo di progetti e fasi con ordinamento.

- [x] Sidebar: lista progetti con drag handle per riordinamento manuale
- [x] Pagina creazione/modifica progetto (modal nella sidebar)
  - Campi: nome, descrizione, colore, data inizio/fine
  - [-] Assegnazione membri con ruolo — rimandato a V2
- [x] Gestione fasi: drag & drop per riordino, CRUD inline
- [x] Archivio progetti (archivio via impostazioni progetto)
- [-] Correlazione tra progetti — rimandato a V2
- [x] API: `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/[id]`
- [x] API: `GET/POST/PUT/DELETE /api/projects/[id]/phases`
- [x] Pagina impostazioni progetto (`/projects/[id]/settings`): modifica, archivia, elimina, fasi

**Componenti:** `ProjectCard`, `ProjectForm`, `ProjectSidebar`, `PhaseList`, `PhaseItem`, `ProjectMemberManager`

**Verifica:** CRUD progetti e fasi funzionante, solo admin/super_admin possono creare/modificare, ordinamento persistente.

---

## Phase 6 — Task Core (CRUD + Vista Lista)

**Obiettivo:** creazione, modifica e visualizzazione task con tutti i metadati.

- [-] API task REST — usate Server Actions al posto di API Routes (stessa sicurezza, meno boilerplate)
- [-] API task assignments — idem, gestite via Server Actions
- [x] Vista Lista: tabella con colonne checkbox | titolo+assegnatari | stato | priorità | fase | scadenza
- [x] Filtri: stato, priorità, fase
- [-] Ordinamento per colonna — rimandato V2
- [-] Raggruppamento — rimandato V2
- [x] Inline edit: stato direttamente dalla lista (Select inline)
- [x] Selezione multipla + azioni bulk (cambia stato, elimina)
- [x] Pannello dettaglio task (slide-in da destra):
  - Tutti i metadati modificabili (titolo, descrizione, stato, priorità, fase, scadenza, ore stimate)
  - Assegnazione utenti con toggle
  - Sezione subtask placeholder
  - Sezione commenti placeholder
- [x] Quick-add task: form inline in fondo alla lista (titolo + fase + priorità)
- [x] Validazione Zod su tutte le Server Actions task
- [x] Componente `PriorityBadge`
- [x] Componente `StatusBadge`

**Componenti:** `TaskList`, `TaskPanel`, `FilterBar`, `QuickAddTask`, `PriorityBadge`, `StatusBadge`

**Verifica:** CRUD task funzionante, filtri corretti, pannello si apre/chiude, bulk actions operative. ✅ Completata 2026-04-16

**Note implementazione:**
- Server Actions in `src/app/(dashboard)/projects/[projectId]/actions.ts` usano `createServiceClient()` per bypassare RLS sulle write
- Query read in `src/lib/queries/tasks.ts` usano `createClient()` con RLS attivo
- Quick-add usa `startTransition` + chiamata diretta alla Server Action (non `useActionState` + `<form action>`) per affidabilità
- Merge locale in `useEffect([initialTasks])`: preserva task aggiunti localmente non ancora presenti nella risposta server

---

## Phase 7 — Vista Kanban

**Obiettivo:** board Kanban con drag & drop tra colonne.

- [x] Board con 4 colonne fisse (stati task)
- [x] Card task: titolo, avatar assegnatari, badge priorità, scadenza, fase
- [x] DnD tra colonne con @dnd-kit (aggiorna stato in DB al drop)
- [-] DnD per riordinamento all'interno della stessa colonna — rimandato V2 (order_index è project-wide, non per-status)
- [x] Aggiornamento ottimistico UI (status change applicato in `onDragOver`)
- [x] Tasto "Aggiungi task" in ogni colonna (quick-add)
- [x] Filtri sulla board (priorità, fase — status implicito nelle colonne)
- [-] Limit visibile card per colonna con "load more" — rimandato V2
- [x] Indicatore visivo task in ritardo (bordo sinistro destructive)
- [x] Tab switcher Lista/Kanban nell'header del progetto

**Componenti:** `KanbanBoard`, `KanbanColumn`, `KanbanCard` (tutti in `kanban-board.tsx`), `ProjectViewTabs`, `DragOverlay`

**Verifica:** drag & drop funzionante, stato aggiornato in DB, aggiornamento ottimistico senza flickering, filtri applicati correttamente. ✅ Completata 2026-04-16

**Note implementazione:**
- `KanbanBoard` riusa pattern merge `useEffect([initialTasks])` dal `TaskList` (preserva task aggiunti localmente)
- `PointerSensor` con `activationConstraint: { distance: 5 }` per evitare che click aprano panel durante drag-intent
- `onDragOver` muta ottimisticamente lo status per feedback immediato; `onDragEnd` persiste via `updateTaskAction` solo se lo status è cambiato rispetto a `initialTasks`
- `useDroppable` su container colonna per permettere drop su colonne vuote
- Quick-add per colonna usa `createTaskAction` con `status: column.id` preset

---

## Phase 8 — Subtask e Checklist

**Obiettivo:** gestione subtask (task figlio) e checklist interne.

- [ ] API subtask: `GET/POST /api/tasks/[id]/subtasks`, `PUT/DELETE /api/tasks/[taskId]/subtasks/[id]`
- [ ] API checklist: `POST /api/tasks/[id]/checklists`, CRUD checklist items
- [ ] Nel pannello task: sezione "Subtask" (lista task figlio con mini-card)
  - Crea subtask inline (titolo + assegnatario + scadenza)
  - Mini card subtask con stato e priorità inline-editabili
  - Indicatore "X/Y subtask completati"
- [ ] Nel pannello task: sezione "Checklist"
  - Crea checklist con nome
  - Aggiungi/rimuovi/riordina item (DnD)
  - Spunta item con animazione
  - Barra di avanzamento checklist
- [ ] Contatore subtask nella TaskCard (lista e Kanban)

**Componenti:** `SubtaskList`, `SubtaskItem`, `SubtaskForm`, `ChecklistBlock`, `ChecklistItem`

**Verifica:** subtask e checklist creabili/modificabili, stati indipendenti dal task padre, contatori aggiornati.

---

## Phase 9 — Commenti, @Menzioni e Allegati

**Obiettivo:** collaborazione asincrona su ogni task.

- [ ] API commenti: `GET/POST /api/tasks/[id]/comments`, `PUT/DELETE /api/comments/[id]`
- [ ] API allegati: `POST /api/tasks/[id]/attachments`, `DELETE /api/attachments/[id]`
- [ ] Editor commenti: textarea con markdown, autocomplete @mention (on `@` keypress)
- [ ] Parsing @mention: estrae user_id, li salva in `comments.mentions[]`
- [ ] Lista commenti cronologica con avatar, nome, timestamp relativo
- [ ] Modifica commento (indicatore "modificato")
- [ ] Eliminazione commento con conferma
- [ ] Upload allegati: drag & drop su area task O click su pulsante
- [ ] Validazione: max 10MB, errore se superato
- [ ] Upload a Supabase Storage con path: `attachments/{workspace_id}/{task_id}/{uuid}/{filename}`
- [ ] URL firmati per accesso (scadenza 1h, rinnovati automaticamente)
- [ ] Preview allegati: immagini thumbnail inline, PDF con iframe
- [ ] Download allegato

**Componenti:** `CommentList`, `CommentItem`, `CommentEditor`, `MentionAutocomplete`, `AttachmentList`, `AttachmentItem`, `FileUploader`

**Verifica:** commenti creabili, @mention funzionante, allegati uploadati/scaricabili, URL firmati non accessibili a utenti non autorizzati.

---

## Phase 10 — Notifiche In-App & Email

**Obiettivo:** sistema notifiche real-time completo.

- [ ] Configurare Supabase Realtime subscription su tabella `notifications` (per user_id corrente)
- [ ] Header: icona campanella con badge contatore non lette
- [ ] Dropdown centro notifiche: lista ultimi 20 eventi, "mark all as read"
- [ ] Pagina `/notifications`: storico completo con filtri
- [ ] Creazione automatica notifica in-app per: @mention, task assegnata, task sbloccata
- [ ] API: `PUT /api/notifications/[id]/read`, `PUT /api/notifications/read-all`
- [ ] Email template `mention.tsx`: "Ti hanno menzionato in [Task]"
- [ ] Email template `assignment.tsx`: "Ti è stata assegnata la task [Task]"
- [ ] Invio email immediato per @mention e assignment (Resend)
- [ ] Configurazione preferenze email utente (nel profilo)

**Componenti:** `NotificationBell`, `NotificationDropdown`, `NotificationItem`, `NotificationCenter`

**Verifica:** notifica appare in real-time senza refresh, badge si aggiorna, email ricevuta per @mention, mark as read funzionante.

---

## Phase 11 — Reminder Configurabili

**Obiettivo:** reminder personalizzabili per scadenza task.

- [ ] Nel pannello task: pulsante "Aggiungi reminder"
- [ ] Modal reminder: canale (email/in-app/entrambi), timing (X ore/giorni prima, data/ora specifica)
- [ ] Lista reminder esistenti per il task con possibilità di eliminazione
- [ ] API: `GET/POST /api/tasks/[id]/reminders`, `DELETE /api/reminders/[id]`
- [ ] Endpoint cron: `POST /api/cron/reminders` (protetto da `CRON_SECRET`)
- [ ] Configurare Vercel Cron in `vercel.json`: esegue ogni 15 minuti
- [ ] Logic cron: query reminder non inviati con `remind_at <= now()`, invia notifiche, marca come inviati
- [ ] Email template `reminder.tsx`: "Promemoria: [Task] scade tra X"
- [ ] Auto-cancellazione reminder se la scadenza del task viene rimossa

**Componenti:** `ReminderButton`, `ReminderModal`, `ReminderList`

**Verifica:** reminder creato, cron simulato manualmente (call diretta endpoint), notifica email + in-app ricevuta, reminder marcato come inviato.

---

## Phase 12 — Audit Log

**Obiettivo:** tracciamento completo e immutabile di tutte le azioni.

- [ ] Utility server-side `logActivity(params)` — unico punto di scrittura su `activity_log`
- [ ] Integrazione in tutti gli endpoint che modificano dati:
  - Task: created, updated, deleted, status_changed, priority_changed, assigned, moved
  - Comment: added, edited, deleted
  - Attachment: uploaded, deleted
  - Time entry: added, deleted
  - Project: created, updated, archived
  - Member: added, removed, role_changed
- [ ] Nel pannello task: tab "Attività" con timeline verticale degli eventi
- [ ] Pagina audit log progetto (`/projects/[id]/activity`): filtri per azione, utente, data
- [ ] Export CSV del log per periodo selezionato
- [ ] RLS: audit_log in sola lettura per tutti (no update, no delete)

**Componenti:** `ActivityLog`, `ActivityItem`, `ActivityFilter`

**Verifica:** ogni azione CRUD genera un log, payload before/after corretto per modifiche, audit log accessibile solo ad admin.

---

## Phase 13 — Dashboard & Report

**Obiettivo:** panoramica visiva dello stato di avanzamento.

- [ ] Dashboard progetto (`/projects/[id]/dashboard`):
  - KPI card: totali, completate, in ritardo, in scadenza oggi
  - Donut chart: distribuzione per stato
  - Barre impilate: task per fase
  - Barre orizzontali: distribuzione per priorità
  - Feed attività recente (dal log)
- [ ] Dashboard workspace (`/dashboard` — solo Super Admin):
  - KPI globali
  - Grafico a barre: task per progetto
  - Grafico linea: avanzamento settimanale
  - Tabella top task in ritardo
  - Grafico carico per utente
- [ ] Export CSV task (`/api/projects/[id]/export/csv`)
- [ ] Export PDF report progetto (`/api/projects/[id]/export/pdf`) con @react-pdf/renderer

**Componenti:** `DashboardLayout`, `KPICard`, `TasksByStatusChart`, `TasksByPhaseChart`, `WeeklyProgressChart`, `WorkloadChart`, `OverdueTasksTable`

**Verifica:** grafici renderizzati correttamente, dati aggiornati, export CSV apri in Excel, export PDF scaricabile e ben formattato.

---

## Phase 14 — Vista Calendario

**Obiettivo:** visualizzazione task per data di scadenza su calendario.

- [ ] Integrare FullCalendar React nella pagina `/projects/[id]/calendar`
- [ ] Vista mese (default) + vista settimana
- [ ] Task renderizzati come eventi con colore progetto
- [ ] Click su task → apre pannello dettaglio
- [ ] Drag & drop sul calendario per spostare la scadenza
- [ ] Filtri: per progetto (utile se vista globale), per assegnatario
- [ ] Indicatore visivo task senza scadenza (non appaiono nel calendario → messaggio info)

**Componenti:** `CalendarView`, `CalendarEventRenderer`

**Verifica:** task con scadenza appaiono nel giorno corretto, drag aggiorna la scadenza, click apre pannello.

---

## Phase 15 — Time Tracking

**Obiettivo:** timer integrato e log ore per ogni task.

- [ ] Pulsante Play/Stop nel pannello task
- [ ] Un solo timer attivo per utente (ferma il precedente se presente)
- [ ] Indicatore timer attivo nell'header con task corrente e tempo trascorso
- [ ] Timer persistente via Supabase (sopravvive al refresh)
- [ ] Form log manuale: data, inizio, fine, nota
- [ ] Tab "Log ore" nel pannello: elenco entry con modifica/cancellazione
- [ ] Barra avanzamento ore (loggato vs stimato)
- [ ] Report ore nel dashboard progetto: per utente, per fase, totali
- [ ] API: `GET/POST /api/tasks/[id]/time-entries`, `PUT/DELETE /api/time-entries/[id]`

**Componenti:** `TimerButton`, `ActiveTimerBadge`, `TimeEntryList`, `TimeEntryForm`, `TimeProgressBar`

**Verifica:** timer start/stop funzionante, persistente su refresh, log manuale salvato, ore visibili nel report.

---

## Phase 16 — Dipendenze tra Task

**Obiettivo:** blocco logico tra task interdipendenti.

- [ ] Nel pannello task: sezione "Dipendenze"
  - Aggiungi dipendenza (ricerca task per nome, selezione tipo)
  - Lista "Bloccata da" e "Blocca"
  - Rimozione dipendenza
- [ ] Validazione anti-ciclo (backend) prima di salvare
- [ ] Warning visivo se task ha dipendenze non soddisfatte (status badge arancione)
- [ ] Blocco cambio stato → "In corso" / "Conclusa" se dipendenze non soddisfatte
- [ ] Notifica agli assegnatari quando il task bloccante viene completato
- [ ] API: `POST/DELETE /api/tasks/[id]/dependencies`

**Componenti:** `DependencySection`, `DependencyItem`, `AddDependencyModal`

**Verifica:** dipendenza creata, ciclo rilevato e bloccato, warning mostrato, notifica inviata al completamento del bloccante.

---

## Phase 17 — Task Ricorrenti

**Obiettivo:** task che si ripetono automaticamente con rrule.

- [ ] Nel form task: toggle "Ricorrenza" → opzioni (giornaliera, settimanale, mensile, annuale, personalizzata)
- [ ] Personalizzata: giorni della settimana, ogni N giorni/settimane/mesi, data fine
- [ ] Salvataggio come rrule string nel DB
- [ ] Al completamento di un task ricorrente: creazione automatica dell'istanza successiva
- [ ] Visualizzazione "prossima scadenza" nel pannello
- [ ] Modifica ricorrenza: opzione "solo questa istanza" / "questa e le successive"
- [ ] Eliminazione: opzione "solo questa" / "tutte le successive"

**Componenti:** `RecurrenceSelector`, `RecurrencePreview`

**Verifica:** task ricorrente crea nuova istanza al completamento, rrule parsata correttamente, prossima data calcolata correttamente.

---

## Phase 18 — Ricerca Full-Text

**Obiettivo:** ricerca globale veloce con Cmd+K.

- [ ] Shortcut Cmd+K / Ctrl+K apre search palette (modal)
- [ ] Input con debounce 300ms
- [ ] Query PostgreSQL FTS su `tasks`, `projects`, `comments`
- [ ] Risultati raggruppati per tipo con evidenziazione testo trovato
- [ ] Filtri rapidi: solo task / solo progetti / solo commenti
- [ ] Ricerche recenti in localStorage (max 10)
- [ ] Navigazione con tastiera (frecce + Invio)
- [ ] Click su risultato → naviga al task/progetto e chiude palette
- [ ] API: `GET /api/search?q={query}&type={all|tasks|projects|comments}`

**Componenti:** `SearchPalette`, `SearchInput`, `SearchResults`, `SearchResultItem`

**Verifica:** ricerca trova task per parole parziali, evidenziazione corretta, navigazione tastiera funzionante, max 20 risultati per tipo.

---

## Phase 19 — Drag & Drop Inter-Progetto

**Obiettivo:** spostamento task tra progetti diversi via DnD.

- [ ] Nella sidebar: i progetti sono drop target
- [ ] Drag di una card task (dalla lista o Kanban) verso un altro progetto in sidebar
- [ ] Dialog conferma: "Sposta task in [Progetto]?" con selezione fase di destinazione
- [ ] Aggiornamento `project_id` e `phase_id` nel DB
- [ ] Aggiunta al log audit: `task.moved`
- [ ] Solo Super Admin e Project Admin della destinazione possono eseguire
- [ ] Feedback visivo: sidebar evidenzia il progetto mentre si trascina

**Verifica:** drag spostamento corretto, permessi rispettati, log audit creato, task appare nel nuovo progetto.

---

## Phase 20 — QA, Performance & Deploy

**Obiettivo:** rilascio in produzione stabile.

- [ ] Audit sicurezza: verifica RLS policies su ogni tabella in Supabase prod
- [ ] Lighthouse audit: performance ≥ 80, accessibility ≥ 90
- [ ] Test manuale flusso completo:
  - [ ] Register → verify → login → create workspace → invite user
  - [ ] Create project → add phases → create tasks → assign → comment → attach file
  - [ ] Kanban DnD → status change → notification received
  - [ ] Reminder setup → cron trigger → email/in-app received
  - [ ] Export CSV e PDF
  - [ ] Ricerca globale Cmd+K
- [ ] Configurare Vercel Cron (`vercel.json`)
- [ ] Configurare variabili d'ambiente in Vercel dashboard
- [ ] Configurare dominio custom (se presente)
- [ ] Configurare Supabase prod: backup automatici, connessioni pool, email SMTP
- [ ] Deploy production → smoke test

---

## Riepilogo fasi

| # | Fase | Stato | Note |
|---|------|-------|------|
| 1 | Foundation & Setup | [x] | Completata 2026-04-09 |
| 2 | Schema Database | [x] | Completata 2026-04-09 |
| 3 | Autenticazione | [x] | Completata 2026-04-16 |
| 4 | Workspace & Ruoli | [x] | Completata 2026-04-16 |
| 5 | Progetti & Fasi | [x] | Completata 2026-04-16 |
| 6 | Task Core + Vista Lista | [x] | Completata 2026-04-16 |
| 7 | Vista Kanban | [x] | Completata 2026-04-16 |
| 8 | Subtask & Checklist | [ ] | **MVP core** |
| 9 | Commenti & Allegati | [ ] | **MVP core** |
| 10 | Notifiche In-App | [ ] | **MVP core** |
| 11 | Reminder | [ ] | **MVP core** |
| 12 | Audit Log | [ ] | **MVP core** |
| 13 | Dashboard & Report | [ ] | **MVP core** |
| 14 | Vista Calendario | [ ] | V2 |
| 15 | Time Tracking | [ ] | V2 |
| 16 | Dipendenze Task | [ ] | V2 |
| 17 | Task Ricorrenti | [ ] | V2 |
| 18 | Ricerca Full-Text | [ ] | V2 |
| 19 | DnD Inter-Progetto | [ ] | V2 |
| 20 | QA & Deploy | [ ] | |

**MVP completato con fasi 1–13.**  
**V2 completato con fasi 14–19.**

---

## Note e blockers

_Aggiornare questa sezione durante lo sviluppo con eventuali problemi, decisioni prese in itinere o dipendenze esterne da risolvere._

| Data | Nota |
|------|------|
| 2026-04-09 | Documento creato. Pronto per iniziare Phase 1. |
| 2026-04-16 | RLS infinite recursion su `project_members`: risolto con funzione SECURITY DEFINER `is_project_member()`. |
| 2026-04-16 | RLS violation su INSERT `projects`: risolto usando `createServiceClient()` nelle Server Actions di write. |
| 2026-04-16 | Task non visibile dopo creazione: `revalidatePath` triggerava refresh automatico che sovrascriveva stato locale. Risolto con merge in `useEffect([initialTasks])` e rimozione `router.refresh()` post-creazione. |
| 2026-04-16 | `useActionState` + `<form action>` con Base UI Button inaffidabile: sostituito con `startTransition` + chiamata diretta alla Server Action. |
| 2026-04-16 | Deploy Vercel errato: `vercel --prod` eseguito dalla root del repo invece che da `taskflow/`. Sempre eseguire da `taskflow/`. |
