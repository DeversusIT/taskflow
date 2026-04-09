# TaskFlow — Product Requirements Document

**Versione:** 1.0  
**Data:** 2026-04-09  
**Stato:** Draft approvato

---

## 1. Overview & Obiettivi

### 1.1 Descrizione del prodotto
TaskFlow è una web application SaaS per la gestione collaborativa di attività lavorative, progettata per organizzazioni di medie dimensioni (20–100 utenti). Consente di pianificare, assegnare e monitorare task all'interno di un sistema gerarchico Workspace → Progetti → Fasi → Task → Subtask, con supporto completo per collaborazione in tempo reale, notifiche, reportistica e controllo degli accessi basato su ruoli.

### 1.2 Obiettivi di business
- Centralizzare la gestione di tutti gli impegni lavorativi in un unico strumento
- Ridurre la dispersione di informazioni tra email, chat e fogli di calcolo
- Garantire visibilità dello stato di avanzamento a tutti i livelli dell'organizzazione
- Permettere l'assegnazione chiara di responsabilità e la tracciabilità delle azioni

### 1.3 Obiettivi tecnici
- Applicazione web responsive (desktop-first, mobile-compatible)
- Architettura scalabile per 20–100 utenti concorrenti
- Tempo di risposta medio < 200ms per operazioni CRUD
- Disponibilità target: 99.5% (gestita da Vercel + Supabase SLA)

---

## 2. Utenti Target e Ruoli

### 2.1 Profilo utente principale
- Professionisti e team aziendali che gestiscono progetti multi-disciplinari
- Project manager che necessitano di visibilità su più progetti simultanei
- Collaboratori interni e consulenti esterni con accesso controllato

### 2.2 Ruoli e permessi

#### Super Admin
- Accesso completo a tutto il workspace
- Gestione di tutti gli utenti (invito, modifica ruolo, disabilitazione)
- Creazione, modifica ed eliminazione di qualsiasi progetto
- Accesso a tutti i report e audit log
- Unico ruolo che può creare nuovi workspace

#### Project Admin
- Gestione completa del/dei progetti a cui è assegnato come admin
- Invito e gestione dei membri del proprio progetto
- Creazione, modifica ed eliminazione di task e fasi nel proprio progetto
- Accesso ai report del progetto gestito
- Non può accedere ad altri progetti di cui non è membro

#### Editor
- Creazione e modifica di task nei progetti a cui è assegnato
- Aggiunta di commenti, allegati e log ore sui task assegnati
- Spostamento di task via drag & drop
- Non può eliminare task o invitare utenti
- Non può modificare la struttura del progetto (fasi, milestone)

#### Viewer (sola lettura)
- Visualizzazione di task, commenti e allegati
- Può aggiungere commenti ma non modificare task
- Non può spostare task o modificare qualsiasi dato del progetto
- Utile per stakeholder, clienti o auditor esterni

### 2.3 Matrice completa permessi

| Azione | Super Admin | Project Admin | Editor | Viewer |
|--------|-------------|---------------|--------|--------|
| Creare workspace | ✅ | ❌ | ❌ | ❌ |
| Modificare impostazioni workspace | ✅ | ❌ | ❌ | ❌ |
| Invitare utenti al workspace | ✅ | ❌ | ❌ | ❌ |
| Gestire ruoli utenti globali | ✅ | ❌ | ❌ | ❌ |
| Creare nuovi progetti | ✅ | ✅ | ❌ | ❌ |
| Modificare progetto | ✅ | ✅ (propri) | ❌ | ❌ |
| Eliminare progetto | ✅ | ✅ (propri) | ❌ | ❌ |
| Invitare membri al progetto | ✅ | ✅ (propri) | ❌ | ❌ |
| Gestire fasi di progetto | ✅ | ✅ (propri) | ❌ | ❌ |
| Creare task | ✅ | ✅ | ✅ | ❌ |
| Modificare qualsiasi task | ✅ | ✅ (propri progetto) | ✅ (assegnati) | ❌ |
| Eliminare task | ✅ | ✅ (propri progetto) | ❌ | ❌ |
| Assegnare task ad altri | ✅ | ✅ | ✅ | ❌ |
| Spostare task (DnD) | ✅ | ✅ | ✅ | ❌ |
| Spostare task tra progetti | ✅ | ✅ | ❌ | ❌ |
| Aggiungere commenti | ✅ | ✅ | ✅ | ✅ |
| Modificare propri commenti | ✅ | ✅ | ✅ | ✅ |
| Eliminare qualsiasi commento | ✅ | ✅ (propri progetto) | ❌ | ❌ |
| Caricare allegati | ✅ | ✅ | ✅ | ❌ |
| Eliminare allegati | ✅ | ✅ | ❌ | ❌ |
| Log time tracking | ✅ | ✅ | ✅ | ❌ |
| Visualizzare time tracking altrui | ✅ | ✅ (propri progetto) | ❌ | ❌ |
| Creare/configurare reminder | ✅ | ✅ | ✅ (propri) | ❌ |
| Visualizzare audit log | ✅ | ✅ (propri progetto) | ❌ | ❌ |
| Esportare CSV/PDF | ✅ | ✅ | ✅ | ❌ |
| Accedere alla dashboard globale | ✅ | ❌ | ❌ | ❌ |
| Accedere alla dashboard progetto | ✅ | ✅ | ✅ | ✅ |

---

## 3. Architettura dell'Informazione

### 3.1 Gerarchia dati

```
WORKSPACE
├── Impostazioni workspace (nome, logo, piano)
├── Membri workspace (ruolo: super_admin | member)
└── PROGETTI (N progetti per workspace)
    ├── Metadati progetto (nome, descrizione, colore, priorità, stato)
    ├── Membri progetto (ruolo: admin | editor | viewer)
    ├── FASI SEQUENZIALI (ordinate, con colore e stato)
    │   └── TASK (N task per fase)
    │       ├── Metadati (titolo, descrizione, priorità, stato, scadenza, stima)
    │       ├── Assegnazioni (N utenti assegnati)
    │       ├── SUBTASK (task figlio completi, ricorsivi 1 livello)
    │       ├── CHECKLIST (lista item spuntabili, semplice)
    │       ├── DIPENDENZE (task_id → dipende da → task_id, tipo)
    │       ├── COMMENTI (con @menzioni, rich text base)
    │       ├── ALLEGATI (file fino a 10MB, storage remoto)
    │       ├── TIME ENTRIES (timer + log manuale ore)
    │       ├── REMINDER (1..N per task, canale: email|inapp)
    │       ├── RICORRENZA (rrule string, per task ricorrenti)
    │       └── ACTIVITY LOG (ogni modifica tracciata)
    └── MILESTONE / CHECKPOINT (opzionale, per fasi)

NOTIFICHE (globali per utente)
RICERCA FULL-TEXT (globale su tutto il workspace)
DASHBOARD (aggregazioni in tempo reale)
```

### 3.2 Schema Database (ERD dettagliato)

```sql
-- UTENTI (gestiti da Supabase Auth)
profiles
  id              uuid PK (= auth.users.id)
  full_name       text
  avatar_url      text
  email           text UNIQUE
  created_at      timestamptz
  updated_at      timestamptz

-- WORKSPACE
workspaces
  id              uuid PK
  name            text NOT NULL
  slug            text UNIQUE NOT NULL
  logo_url        text
  created_by      uuid FK → profiles.id
  created_at      timestamptz
  updated_at      timestamptz

workspace_members
  id              uuid PK
  workspace_id    uuid FK → workspaces.id
  user_id         uuid FK → profiles.id
  role            enum('super_admin', 'member')
  invited_by      uuid FK → profiles.id
  joined_at       timestamptz
  UNIQUE(workspace_id, user_id)

-- PROGETTI
projects
  id              uuid PK
  workspace_id    uuid FK → workspaces.id
  name            text NOT NULL
  description     text
  color           text (hex color)
  priority        integer DEFAULT 0 (ordinamento tra progetti)
  status          enum('active', 'archived', 'completed')
  start_date      date
  due_date        date
  created_by      uuid FK → profiles.id
  created_at      timestamptz
  updated_at      timestamptz

project_members
  id              uuid PK
  project_id      uuid FK → projects.id
  user_id         uuid FK → profiles.id
  role            enum('admin', 'editor', 'viewer')
  added_by        uuid FK → profiles.id
  added_at        timestamptz
  UNIQUE(project_id, user_id)

-- FASI DEL PROGETTO
phases
  id              uuid PK
  project_id      uuid FK → projects.id
  name            text NOT NULL
  description     text
  color           text
  order_index     integer NOT NULL
  status          enum('pending', 'in_progress', 'completed')
  start_date      date
  due_date        date
  created_at      timestamptz

-- TASK
tasks
  id              uuid PK
  project_id      uuid FK → projects.id
  phase_id        uuid FK → phases.id (nullable)
  parent_task_id  uuid FK → tasks.id (nullable, per subtask)
  title           text NOT NULL
  description     text (rich text / markdown)
  priority        enum('low', 'medium', 'high', 'urgent')
  status          enum('open', 'in_progress', 'on_hold', 'completed')
  due_date        date
  start_date      date
  estimated_hours numeric(6,2)
  order_index     integer NOT NULL DEFAULT 0
  recurrence_rule text (rrule string RFC 5545, nullable)
  recurrence_end  date (nullable)
  created_by      uuid FK → profiles.id
  created_at      timestamptz
  updated_at      timestamptz

task_assignments
  id              uuid PK
  task_id         uuid FK → tasks.id
  user_id         uuid FK → profiles.id
  assigned_by     uuid FK → profiles.id
  assigned_at     timestamptz
  UNIQUE(task_id, user_id)

-- CHECKLIST (semplice, dentro un task)
checklists
  id              uuid PK
  task_id         uuid FK → tasks.id
  title           text NOT NULL DEFAULT 'Checklist'
  order_index     integer

checklist_items
  id              uuid PK
  checklist_id    uuid FK → checklists.id
  title           text NOT NULL
  completed       boolean DEFAULT false
  completed_by    uuid FK → profiles.id (nullable)
  completed_at    timestamptz
  order_index     integer

-- DIPENDENZE TRA TASK
task_dependencies
  id              uuid PK
  task_id         uuid FK → tasks.id (il task dipendente)
  depends_on_id   uuid FK → tasks.id (il task prerequisito)
  type            enum('finish_to_start', 'start_to_start', 'finish_to_finish')
  created_by      uuid FK → profiles.id
  created_at      timestamptz
  UNIQUE(task_id, depends_on_id)

-- COMMENTI
comments
  id              uuid PK
  task_id         uuid FK → tasks.id
  user_id         uuid FK → profiles.id
  body            text NOT NULL (markdown)
  mentions        uuid[] (array di user_id menzionati)
  edited_at       timestamptz (nullable)
  created_at      timestamptz

-- ALLEGATI
attachments
  id              uuid PK
  task_id         uuid FK → tasks.id
  uploaded_by     uuid FK → profiles.id
  file_name       text NOT NULL
  file_type       text (MIME type)
  file_size       integer (bytes, max 10485760 = 10MB)
  storage_path    text NOT NULL (Supabase Storage path)
  created_at      timestamptz

-- TIME TRACKING
time_entries
  id              uuid PK
  task_id         uuid FK → tasks.id
  user_id         uuid FK → profiles.id
  started_at      timestamptz NOT NULL
  ended_at        timestamptz (nullable = timer attivo)
  duration_secs   integer (calcolato, nullable se timer attivo)
  note            text
  created_at      timestamptz

-- REMINDER
reminders
  id              uuid PK
  task_id         uuid FK → tasks.id
  user_id         uuid FK → profiles.id (chi riceve il reminder)
  remind_at       timestamptz NOT NULL
  channel         enum('email', 'in_app', 'both')
  sent            boolean DEFAULT false
  sent_at         timestamptz
  created_at      timestamptz

-- NOTIFICHE IN-APP
notifications
  id              uuid PK
  user_id         uuid FK → profiles.id
  type            enum('mention', 'assignment', 'reminder', 'comment', 'status_change', 'dependency_unblocked')
  title           text NOT NULL
  body            text
  link_url        text (URL interno del task/progetto)
  payload         jsonb (dati aggiuntivi strutturati)
  read_at         timestamptz (nullable)
  created_at      timestamptz

-- AUDIT LOG
activity_log
  id              uuid PK
  workspace_id    uuid FK → workspaces.id
  project_id      uuid FK → projects.id (nullable)
  task_id         uuid FK → tasks.id (nullable)
  user_id         uuid FK → profiles.id
  action          text NOT NULL (es: 'task.created', 'task.status_changed', 'comment.added')
  payload         jsonb (before/after per modifiche, dati contestuali)
  ip_address      inet
  created_at      timestamptz
```

---

## 4. Funzionalità per Modulo

### 4.1 Autenticazione & Gestione Utenti

**Registrazione:**
- Form con: nome completo, email, password (min 8 char, 1 maiuscola, 1 numero)
- Verifica email obbligatoria via link (Supabase Auth)
- Dopo verifica: redirect al workspace di default o a quello per cui si è stati invitati

**Login:**
- Email + password
- "Ricordami" (sessione persistente 30 giorni)
- Reset password via email (magic link Supabase)
- Blocco account dopo 5 tentativi falliti (rate limiting Supabase)

**Profilo utente:**
- Modifica nome, avatar (upload immagine)
- Cambio password
- Preferenze notifiche (email digest, frequenza reminder)
- Preferenza tema (light/dark/system)
- Timezone personale

**Gestione utenti (Super Admin):**
- Lista tutti gli utenti del workspace con ruolo e data iscrizione
- Invito via email con link temporaneo (scadenza 7 giorni)
- Modifica ruolo
- Disabilitazione account (soft delete, dati preservati)
- Rimozione permanente account

### 4.2 Workspace e Progetti

**Workspace:**
- Un workspace per organizzazione (estendibile a più workspace in V3)
- Nome, logo, slug URL univoco
- Impostazioni: timezone default, lingua, formato data

**Progetti:**
- CRUD completo
- Campi: nome, descrizione, colore identificativo, priorità (numero ordinale), stato (attivo/archiviato/completato), date inizio/fine
- Archivio progetti: i progetti archiviati non appaiono nelle viste principali ma rimangono accessibili
- Ordinamento manuale tra progetti (drag handle nella sidebar)
- Correlazione tra progetti: campo "related_projects" (array di project_id) per indicare dipendenze a livello macro

**Fasi sequenziali:**
- Ogni progetto ha fasi ordinate (es: "Analisi" → "Sviluppo" → "Test" → "Rilascio")
- Ogni fase ha: nome, colore, stato (pending/in_progress/completed), date opzionali
- La fase "In Corso" è evidenziata visivamente nella panoramica progetto
- I task sono associati a una fase; se la fase cambia stato, non cambia automaticamente lo stato dei task

### 4.3 Gestione Task

**Creazione task:**
- Titolo (obbligatorio)
- Descrizione (markdown supportato: grassetto, corsivo, liste, link, codice inline)
- Priorità: Bassa / Media / Alta / Urgente (con colore e icona)
- Stato: Aperta / In corso / Sospesa / Conclusa
- Data scadenza (date picker)
- Data inizio (opzionale)
- Stima ore (campo numerico)
- Fase del progetto (dropdown)
- Assegnatari (multi-select utenti del progetto)
- Tag (etichette libere, colore personalizzabile)

**Modifica task:**
- Pannello laterale (detail panel) aperto con click sul task — no navigazione full-page
- Modifiche in-place per titolo, priorità, stato
- Storico modifiche visibile in fondo al pannello

**Stati task:**
- **Aperta** — task creata, non ancora iniziata
- **In corso** — qualcuno ci sta lavorando attivamente
- **Sospesa** — bloccata (in attesa di dipendenza, decisione, risorsa)
- **Conclusa** — lavoro completato

**Priorità task:**
- **Urgente** (rosso) — richiede attenzione immediata
- **Alta** (arancione) — priorità elevata
- **Media** (giallo) — standard
- **Bassa** (grigio) — quando c'è tempo

### 4.4 Dipendenze tra Task

- Tipi di dipendenza supportati:
  - **Finish-to-Start (default):** B non può iniziare finché A non è conclusa
  - **Start-to-Start:** B non può iniziare finché A non è iniziata
  - **Finish-to-Finish:** B non può concludersi finché A non è conclusa
- Visualizzazione: nel pannello task, sezione "Dipende da" e "Bloccante per"
- Blocco logico: se un task ha dipendenze non soddisfatte, viene mostrato un warning visivo; non è possibile impostarlo su "In corso" o "Conclusa"
- Al completamento di un task bloccante, tutti gli utenti assegnati ai task dipendenti ricevono notifica "Task sbloccata"
- Prevenzione cicli: validazione backend che impedisce dipendenze circolari

### 4.5 Viste

#### Vista Lista
- Elenco task con colonne configurabili: titolo, assegnatari, priorità, stato, scadenza, fase
- Ordinamento per qualsiasi colonna (ascendente/discendente)
- Filtri: stato, priorità, assegnatario, fase, scadenza (range), tag
- Raggruppamento: per fase, per priorità, per stato, per assegnatario
- Inline edit per stato e priorità (senza aprire il pannello)
- Selezione multipla + azioni bulk (cambia stato, cambia priorità, elimina, sposta fase)

#### Vista Kanban
- Colonne corrispondenti agli stati: Aperta | In corso | Sospesa | Conclusa
- Card task con: titolo, avatar assegnatario, badge priorità, data scadenza, numero commenti/allegati
- Drag & Drop tra colonne (cambia stato automaticamente)
- Limite WIP (Work In Progress) configurabile per colonna (opzionale, V2)
- Filtri sopra la board (stesso set della vista lista)
- Tasto "Aggiungi task" in ogni colonna

#### Vista Calendario
- FullCalendar in modalità mese e settimana
- Task posizionati per data di scadenza
- Colore card = colore progetto di appartenenza
- Click su task apre il detail panel
- Drag & Drop per spostare la data di scadenza direttamente nel calendario
- Filtro per progetto, assegnatario

### 4.6 Time Tracking

**Timer integrato:**
- Pulsante Play/Stop nel pannello task
- Un solo timer attivo per utente alla volta (ferma automaticamente se ne avvia un altro)
- Timer persistente (sopravvive al refresh della pagina via Supabase)
- Indicatore visivo nell'header quando un timer è attivo

**Log manuale:**
- Form: data, ora inizio, ora fine (oppure durata), nota descrittiva
- Modifica/eliminazione di time entry proprie

**Riepilogo ore:**
- Nel pannello task: totale ore loggate vs stima
- Barra di avanzamento ore (loggato/stimato)
- Tab "Log ore" con elenco completo degli entry (chi, quando, quanto, nota)
- Nel report progetto: ore per utente, per fase, totali

### 4.7 Commenti, @Menzioni e Allegati

**Commenti:**
- Editor di testo con markdown base (grassetto, corsivo, lista, codice inline, link)
- @menzione: digitando @ appare autocomplete degli utenti del progetto
- Al salvataggio, notifica email + in-app a ogni utente menzionato
- Modifica commento (con indicatore "modificato alle HH:MM")
- Eliminazione commento (solo proprio oppure da admin)
- Ordinamento: cronologico con i più recenti in fondo

**Allegati:**
- Upload drag & drop sul task o click su "Aggiungi file"
- Tipi accettati: tutti (pdf, docx, xlsx, png, jpg, gif, mp4, zip, ecc.)
- Limite: 10MB per file, nessun limite al numero di allegati per task
- Storage: Supabase Storage con URL firmati (accesso solo per membri del progetto)
- Preview inline per immagini (thumbnail) e PDF (iframe)
- Download diretto
- Il nome file viene preservato, con data/ora di upload e uploader

### 4.8 Notifiche e Reminder

**Notifiche in-app (real-time):**
- Centro notifiche: icona campanella nell'header con badge contatore non lette
- Dropdown con elenco notifiche (max 20 visibili, link "vedi tutte")
- Tipi di notifiche:
  - Task assegnata a te
  - @menzione in un commento
  - Reminder scadenza (configurato dall'utente)
  - Task bloccante completata → task sbloccata
  - Cambio stato di una task che ti riguarda (assegnata o creata da te)
  - Commento aggiunto su una task che segui
- Mark as read (singola o tutte)
- Click su notifica → naviga al task

**Notifiche email:**
- Template HTML responsive (React Email)
- Invio immediato per: @menzione, task assegnata
- Invio schedulato per: reminder scadenza (X giorni/ore prima, configurabile per task)
- Digest giornaliero (opzionale, riepilogo task in scadenza oggi/domani) — opt-in nelle impostazioni utente
- Footer con link "Gestisci preferenze notifiche"

**Reminder configurabili:**
- Su ogni task: pulsante "Aggiungi reminder"
- Modal: scegli canale (email / in-app / entrambi) e quando (es: "1 giorno prima", "2 ore prima", "data e ora specifica")
- Possibilità di avere più reminder per lo stesso task
- I reminder vengono eliminati se la scadenza del task viene rimossa
- Cron job (Supabase Edge Function o Vercel Cron) che controlla ogni 15 minuti i reminder da inviare

### 4.9 Ricerca Full-Text

**Ricerca globale:**
- Shortcut tastiera: Cmd+K / Ctrl+K apre la search palette
- Cerca in: titoli task, descrizioni, commenti, nomi progetti, nomi fasi
- Risultati raggruppati per tipo (Task, Progetti, Commenti)
- Evidenziazione del termine trovato nel risultato
- Filtri rapidi: solo task / solo progetti / nel progetto X / per utente
- Ricerca recente (ultimi 10 termini cercati, in localStorage)

**Implementazione:**
- PostgreSQL `tsvector` su colonne `title` e `description` delle tabelle `tasks` e `projects`
- Funzione `to_tsvector('italian', ...)` per supporto lingua italiana
- Indice GIN per performance
- Debounce 300ms sull'input di ricerca
- Risultati massimi: 20 per tipo

### 4.10 Drag & Drop

**DnD Kanban (stessa board):**
- Drag card task tra colonne dello stesso progetto
- Il cambio colonna aggiorna automaticamente lo stato del task
- Feedback visivo: card diventa semi-trasparente durante il trascinamento, slot "drop zone" evidenziato
- Animazione smooth al rilascio

**DnD Lista (stesso progetto):**
- Drag task per riordinamento all'interno della stessa fase/lista
- Aggiornamento `order_index` in DB al drop

**DnD inter-progetto:**
- Dalla sidebar: drag di un task (dalla lista) verso un'altra card progetto
- Apre un dialog di conferma con selezione della fase di destinazione
- Solo Super Admin e Project Admin della destinazione possono eseguire questo trascinamento

**DnD Calendario:**
- Drag card nel calendario per spostare la data di scadenza
- Aggiornamento immediato ottimistico + sincronizzazione DB

### 4.11 Dashboard e Reportistica

**Dashboard workspace (Super Admin):**
- Task totali / completate / in ritardo / in scadenza oggi
- Grafico a barre: task per progetto (completate vs aperte)
- Grafico a linee: avanzamento settimanale (task completate per settimana)
- Top task in ritardo (tabella con link diretto)
- Distribuzione carico di lavoro per utente (grafico a torta o barre orizzontali)

**Dashboard progetto (tutti i ruoli con accesso):**
- Avanzamento del progetto (barra %)
- Task per stato (donut chart)
- Task per fase (barre impilate)
- Task per priorità
- Attività recente (ultimi 10 eventi di audit log)
- Ore lavorate per utente (se time tracking abilitato)

**Export CSV:**
- Esporta tutti i task di un progetto con colonne: ID, Titolo, Descrizione, Stato, Priorità, Fase, Assegnatari, Data Scadenza, Data Creazione, Ore Stimate, Ore Lavorate, Tag
- Filtri applicabili prima dell'export

**Export PDF:**
- Report progetto: intestazione con metadati, sommario fasi, lista task per fase con stato e priorità
- Dashboard PDF: grafici renderizzati (screenshot canvas) + tabelle dati
- Layout A4, professionale

### 4.12 Audit Log

**Tracking automatico per le seguenti azioni:**
- task.created, task.updated, task.deleted, task.status_changed, task.priority_changed
- task.assigned, task.unassigned
- task.moved (cambio progetto o fase)
- comment.added, comment.edited, comment.deleted
- attachment.uploaded, attachment.deleted
- time_entry.added, time_entry.deleted
- project.created, project.updated, project.archived
- member.added, member.removed, member.role_changed
- reminder.created, reminder.deleted

**Visualizzazione:**
- Tab "Attività" nel pannello task: timeline verticale degli eventi (chi, cosa, quando)
- Pagina Audit Log nel progetto (accessibile ad Admin): filtro per azione, utente, periodo
- Export CSV del log per periodo selezionato

---

## 5. Requisiti Non Funzionali

### 5.1 Performance
- TTFB (Time To First Byte) < 500ms per pagine SSR
- Rendering lista task (fino a 500 task) < 300ms
- Upload allegato 10MB < 10 secondi su connessione 10Mbps
- Ricerca full-text risultati < 200ms

### 5.2 Sicurezza
- Tutte le tabelle DB con Row Level Security (RLS) abilitata su Supabase
- Nessun dato sensibile esposto via API pubblica
- File allegati accessibili solo tramite URL firmati con scadenza (1 ora)
- HTTPS obbligatorio (gestito da Vercel)
- Input sanitizzato lato server (Zod validation)
- Rate limiting su endpoint auth (gestito da Supabase)
- Audit log immutabile (nessun update/delete sulla tabella)

### 5.3 Accessibilità
- Conformità WCAG 2.1 AA per le funzionalità core
- Navigazione da tastiera su tutte le funzionalità principali
- Etichette ARIA su componenti interattivi
- Contrasto colori sufficiente in entrambi i temi (light/dark)

### 5.4 Compatibilità browser
- Chrome 110+, Firefox 110+, Safari 16+, Edge 110+
- Mobile: iOS Safari 16+, Android Chrome 110+

### 5.5 Internazionalizzazione
- Lingua interfaccia: Italiano (default)
- Date e orari localizzati per timezone dell'utente
- Formato numeri: standard italiano
- Predisposizione per i18n in V2 (next-intl)

---

## 6. Ruoli e Permessi — già dettagliato in sezione 2.3

---

## 7. Stack Tecnologico

| Layer | Tecnologia | Versione | Note |
|-------|-----------|---------|------|
| Frontend Framework | Next.js | 14+ (App Router) | SSR, API Routes, Server Actions |
| Linguaggio | TypeScript | 5.x | strict mode abilitato |
| Styling | Tailwind CSS | 3.x | utility-first |
| Component Library | shadcn/ui | latest | built on Radix UI |
| Database | PostgreSQL via Supabase | latest | hosted, managed |
| Auth | Supabase Auth | latest | email/password + magic link |
| Storage | Supabase Storage | latest | bucket per allegati |
| Real-time | Supabase Realtime | latest | notifiche in-app |
| Email | Resend + React Email | latest | transazionale + reminder |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | latest | accessibile |
| Calendario | FullCalendar React | 6.x | vista mese/settimana |
| Grafici | Recharts | 2.x | dashboard KPI |
| Export PDF | @react-pdf/renderer | latest | report formattati |
| Export CSV | papaparse | latest | serializzazione dati |
| Ricorrenza | rrule.js | latest | RFC 5545 RRULE |
| Validazione | Zod | 3.x | schema condiviso FE/BE |
| Date | date-fns | 3.x | manipolazione date |
| Deploy | Vercel | - | CI/CD + edge CDN |

---

## 8. Wireframe Descrittivi (ASCII)

### 8.1 Layout principale

```
┌─────────────────────────────────────────────────────────────────┐
│  🔲 TaskFlow    [Ricerca Cmd+K]          🔔(3)  👤 Nome ▾       │
├─────────────────────────────────────────────────────────────────┤
│         │                                                        │
│ SIDEBAR │  CONTENUTO PRINCIPALE                                  │
│         │                                                        │
│ ○ Home  │  ┌─ Breadcrumb: Workspace / Progetto / Vista ────────┐│
│         │  │                                                    ││
│ PROGETTI│  │  [+ Nuovo Task]  [🔍 Filtri]  [📋][🎯][📅] Viste ││
│ ▼ Alpha │  │                                                    ││
│   Fase1 │  │  Lista / Kanban / Calendario                      ││
│   Fase2 │  │                                                    ││
│ ▶ Beta  │  └────────────────────────────────────────────────────┘│
│ ▶ Gamma │                                                        │
│         │                                                        │
│ ─────── │                                                        │
│ ⚙ Admin │                                                        │
│ 👥 Team │                                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Vista Kanban

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  APERTA(4) │  │IN CORSO(2) │  │SOSPESA (1) │  │CONCLUSA(7) │
│  [+ Aggiungi]  [+ Aggiungi]  [+ Aggiungi]   [+ Aggiungi]  │
├────────────┤  ├────────────┤  ├────────────┤  ├────────────┤
│ ▌ Task A  │  │ ▌ Task C  │  │ ▌ Task E  │  │ ✓ Task F  │
│ Alta  👤👤│  │ Urgente 👤│  │ Media  👤 │  │ Alta  👤  │
│ 📎2 💬3  │  │ 📎0 💬1  │  │ ⏰ 15/04  │  │ ✓ Task G  │
│ ⏰ 12/04  │  │ ⏰ 10/04  │  └────────────┘  │ ...       │
├────────────┤  ├────────────┤                  └────────────┘
│ ▌ Task B  │  │ ▌ Task D  │
│ ...       │  │ ...       │
└────────────┘  └────────────┘
```

### 8.3 Pannello dettaglio task

```
┌──────────────────────────────────────────────────────────┐
│  ✏ Titolo del task                              [✕ Chiudi]│
├──────────────────────────────────────────────────────────┤
│  Stato: [In corso ▾]    Priorità: [🔴 Urgente ▾]        │
│  Assegnato a: 👤 Mario  👤 Luca  [+ Aggiungi]            │
│  Scadenza: 📅 15 aprile 2026   [Aggiungi reminder ⏰]    │
│  Fase: [Sviluppo ▾]    Progetto: Alpha                   │
│  Ore stimate: 8h   Ore lavorate: 3h 20m  [▶ Start timer] │
├──────────────────────────────────────────────────────────┤
│  Descrizione                                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Testo markdown della descrizione...               │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  ☑ Checklist (3/5)    [+ Subtask]    [+ Checklist]      │
│  ✓ Item 1  ✓ Item 2  □ Item 3  □ Item 4  □ Item 5       │
├──────────────────────────────────────────────────────────┤
│  🔗 Dipendenze  [+ Aggiungi]                             │
│  Bloccata da: → Task X (In corso)                       │
├──────────────────────────────────────────────────────────┤
│  📎 Allegati (2)  [+ Carica file]                        │
│  📄 brief.pdf  12/04  👤Mario    🖼 mockup.png  10/04   │
├──────────────────────────────────────────────────────────┤
│  💬 Commenti                                             │
│  👤 Mario (10/04 14:32): @Luca puoi verificare questo?  │
│  👤 Luca  (10/04 15:10): Sì, ci lavoro domani           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Scrivi un commento... (@nome per menzionare)       │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  📋 Attività recente                    [Vedi tutto]     │
│  Mario ha cambiato stato: Aperta → In corso  (oggi)     │
│  Luca ha aggiunto un allegato: mockup.png    (10/04)    │
└──────────────────────────────────────────────────────────┘
```

### 8.4 Dashboard workspace

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Workspace                         [📅 Questo mese]│
├─────────────┬─────────────┬─────────────┬───────────────────┤
│ TOTALI      │ COMPLETATE  │ IN RITARDO  │ IN SCADENZA OGGI  │
│   127       │    89  70%  │    8  🔴    │   5  ⚠           │
├─────────────┴─────────────┴─────────────┴───────────────────┤
│                                                             │
│  Task per Progetto               Avanzamento settimanale    │
│  ┌──────────────────────┐       ┌─────────────────────────┐ │
│  │ Alpha  ████░░  60%   │       │  ↗ crescita completate  │ │
│  │ Beta   ██████  80%   │       │  (grafico a linee)      │ │
│  │ Gamma  ███░░░  40%   │       └─────────────────────────┘ │
│  └──────────────────────┘                                   │
│                                                             │
│  Carico per utente              Task in ritardo             │
│  ┌──────────────────────┐       ┌─────────────────────────┐ │
│  │ Mario   ████ 14 task │       │ Task X  Alpha  🔴 -3gg  │ │
│  │ Luca    ██   8 task  │       │ Task Y  Beta   🔴 -1gg  │ │
│  │ Anna    █    4 task  │       │ ...                     │ │
│  └──────────────────────┘       └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Feature Roadmap

### MVP — Phase 1 (funzionalità core)
- ✅ Setup infrastruttura (Next.js, Supabase, Vercel)
- ✅ Autenticazione completa (register, login, reset password)
- ✅ Gestione workspace e utenti con ruoli
- ✅ CRUD progetti con fasi sequenziali
- ✅ CRUD task con tutti i metadati (priorità, stato, scadenza, assegnatari)
- ✅ Subtask (task figlio) + Checklist interna
- ✅ Vista Lista con filtri e ordinamento
- ✅ Vista Kanban con Drag & Drop tra colonne
- ✅ Commenti con @menzioni
- ✅ Upload allegati (Supabase Storage)
- ✅ Notifiche in-app real-time
- ✅ Reminder configurabili (email + in-app)
- ✅ Dashboard base progetto
- ✅ Audit log completo
- ✅ Dark/light mode
- ✅ Design responsive (mobile-friendly)

### V2 — Phase 2 (funzionalità avanzate)
- ⬜ Vista Calendario (FullCalendar)
- ⬜ Time Tracking completo (timer + log + riepilogo)
- ⬜ Dipendenze tra task con blocco logico
- ⬜ Task ricorrenti (rrule.js)
- ⬜ Ricerca full-text globale avanzata
- ⬜ Export CSV e PDF
- ⬜ Drag & Drop inter-progetto
- ⬜ Dashboard workspace globale (Super Admin)
- ⬜ Notifiche email digest giornaliero
- ⬜ Tag personalizzabili su task

### V3 — Phase 3 (evoluzione futura)
- ⬜ Multi-workspace per utente
- ⬜ API pubblica REST documentata
- ⬜ Webhooks per automazioni esterne
- ⬜ Modalità offline (Service Worker + cache)
- ⬜ App mobile nativa (React Native o Expo)
- ⬜ Integrazioni (Google Calendar, Slack, Teams)
- ⬜ AI assistant (suggerimenti priorità, riassunti task)
- ⬜ Template di progetto riutilizzabili
- ⬜ Limite WIP (Work In Progress) per colonne Kanban
- ⬜ Guest access (link pubblico sola lettura per singolo progetto)

---

## 10. Glossario

| Termine | Definizione |
|---------|-------------|
| Workspace | L'organizzazione top-level che contiene tutti i progetti |
| Progetto | Unità di lavoro con fasi, task e membri propri |
| Fase | Stadio sequenziale di un progetto (es: Analisi, Sviluppo, Test) |
| Task | Attività lavorativa singola, unità atomica di lavoro |
| Subtask | Task figlio dipendente da un task padre (1 livello di profondità) |
| Checklist | Lista di voci spuntabili dentro un task, senza metadati aggiuntivi |
| Super Admin | Amministratore globale del workspace |
| Project Admin | Amministratore di uno o più progetti specifici |
| Editor | Utente con accesso in scrittura ai task (no gestione struttura) |
| Viewer | Utente con solo accesso in lettura |
| Reminder | Notifica programmata X tempo prima della scadenza di un task |
| Audit Log | Registro cronologico immutabile di tutte le azioni nel sistema |
| DnD | Drag & Drop — trascinamento con mouse o touch |
| RLS | Row Level Security — sicurezza a livello di riga nel DB PostgreSQL |
| FTS | Full-Text Search — ricerca testuale avanzata |
