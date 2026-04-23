# CLAUDE.md — TaskFlow Project

Questo file definisce le regole di comportamento, le convenzioni tecniche e i vincoli operativi per tutte le sessioni di sviluppo di TaskFlow. Leggilo integralmente prima di iniziare qualsiasi attività di sviluppo.

---

## Ruolo e obiettivo

Sei il lead developer di TaskFlow. Il tuo obiettivo è realizzare l'applicazione esattamente come descritta nel `PRD.md`, rispettando lo stack tecnologico definito, le convenzioni di codice di questo file e il piano di avanzamento in `PLANNING.md`.

**Prima di iniziare qualsiasi task di sviluppo:**
1. Leggi la sezione corrispondente del `PRD.md`
2. Consulta `PLANNING.md` per verificare lo stato e le dipendenze
3. Identifica i file esistenti da modificare prima di crearne di nuovi

---

## Stack obbligatorio

Non deviare da questo stack senza approvazione esplicita dell'utente:

| Categoria | Tecnologia | Note |
|-----------|-----------|------|
| Framework | Next.js 14+ App Router | NO Pages Router |
| Linguaggio | TypeScript 5.x strict | NO `any`, NO `@ts-ignore` |
| Styling | Tailwind CSS + shadcn/ui | NO CSS modules, NO styled-components |
| Database/Auth | Supabase (PostgreSQL) | NO Prisma, NO Drizzle |
| Storage | Supabase Storage | NO AWS S3 diretto |
| Real-time | Supabase Realtime | NO Pusher, NO Socket.io |
| Email | Resend + React Email | NO Nodemailer, NO SendGrid |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | NO react-beautiful-dnd |
| Calendario | FullCalendar React 6.x | |
| Grafici | Recharts 2.x | NO Chart.js, NO D3 |
| Export PDF | @react-pdf/renderer | NO Puppeteer |
| Export CSV | papaparse | |
| Ricorrenza | rrule.js | |
| Validazione | Zod 3.x | su TUTTI gli endpoint |
| Date | date-fns 3.x | NO moment.js, NO dayjs |
| Deploy | Vercel | |

---

## Struttura directory

Rispetta rigorosamente questa struttura. Non creare directory aggiuntive senza motivazione.

```
taskflow/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Route group: pagine auth (no layout principale)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/            # Route group: pagine autenticate
│   │   │   ├── layout.tsx          # Layout con sidebar + header
│   │   │   ├── page.tsx            # Home/redirect
│   │   │   ├── workspace/
│   │   │   │   ├── settings/       # Impostazioni workspace
│   │   │   │   └── members/        # Gestione utenti
│   │   │   └── projects/
│   │   │       └── [projectId]/
│   │   │           ├── page.tsx    # Default vista lista
│   │   │           ├── kanban/
│   │   │           ├── calendar/
│   │   │           ├── dashboard/
│   │   │           └── settings/
│   │   ├── api/                    # Route Handlers
│   │   │   ├── tasks/
│   │   │   ├── projects/
│   │   │   ├── comments/
│   │   │   ├── attachments/
│   │   │   ├── notifications/
│   │   │   ├── time-entries/
│   │   │   ├── reminders/
│   │   │   ├── search/
│   │   │   └── cron/               # Endpoint per Vercel Cron (reminder)
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (generati, non modificare)
│   │   ├── layout/                 # Sidebar, Header, NotificationCenter
│   │   ├── tasks/                  # TaskCard, TaskPanel, TaskList, KanbanBoard
│   │   ├── projects/               # ProjectCard, ProjectForm, PhaseList
│   │   ├── comments/               # CommentList, CommentEditor (con @mention)
│   │   ├── attachments/            # AttachmentList, FileUploader
│   │   ├── time-tracking/          # TimerButton, TimeEntryList, TimeLogForm
│   │   ├── dashboard/              # DashboardCharts, KPICards, ActivityFeed
│   │   ├── search/                 # SearchPalette, SearchResults
│   │   └── shared/                 # Avatar, PriorityBadge, StatusBadge, UserSelect
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser client (createBrowserClient)
│   │   │   ├── server.ts           # Server client (createServerClient)
│   │   │   └── middleware.ts       # Refresh sessione
│   │   ├── validations/            # Schemi Zod per ogni entità
│   │   ├── hooks/                  # React hooks custom (useRealtime, useDebounce...)
│   │   ├── utils.ts                # Utility generali (cn, formatDate...)
│   │   └── constants.ts            # Costanti app (PRIORITY_LEVELS, TASK_STATUSES...)
│   └── types/
│       ├── database.ts             # Tipi generati da Supabase (supabase gen types)
│       └── app.ts                  # Tipi applicativi (estendono i tipi DB)
├── supabase/
│   ├── migrations/                 # File SQL migrazioni (numerati, mai modificare esistenti)
│   └── seed.sql                    # Dati di seed per sviluppo locale
├── emails/                         # Template React Email
│   ├── reminder.tsx
│   ├── mention.tsx
│   ├── assignment.tsx
│   └── digest.tsx
├── public/
├── docs/
│   └── schema-changelog.md         # Log modifiche schema DB
├── .env.local                      # NON committare mai
├── .env.example                    # Template variabili d'ambiente
├── middleware.ts                   # Protezione route autenticate
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Convenzioni di codice

### TypeScript
- `strict: true` in `tsconfig.json` — nessuna eccezione
- Tipi espliciti su tutti i parametri di funzione e valori di ritorno
- Usa `unknown` invece di `any`; fai type narrowing esplicito
- Usa `satisfies` per validare oggetti letterali contro un tipo
- Usa i tipi generati da Supabase (`database.ts`) come fonte di verità per le entità DB

```typescript
// ✅ Corretto
async function getTask(id: string): Promise<{ data: Task | null; error: string | null }> { ... }

// ❌ Sbagliato
async function getTask(id: any) { ... }
```

### Naming
- **Componenti React:** `PascalCase` (es: `TaskCard.tsx`, `ProjectList.tsx`)
- **Funzioni e variabili:** `camelCase` (es: `getTaskById`, `isLoading`)
- **File non-componenti:** `kebab-case` (es: `task-utils.ts`, `use-realtime.ts`)
- **Costanti globali:** `SCREAMING_SNAKE_CASE` (es: `MAX_FILE_SIZE`)
- **Tabelle DB:** `snake_case` plurale (es: `task_assignments`)
- **Colonne DB:** `snake_case` (es: `created_at`, `due_date`)

### Componenti Next.js
- **Default: Server Components** — usa `'use client'` solo se strettamente necessario
- Motivi validi per `'use client'`: hooks React (useState, useEffect), event handlers interattivi, librerie che richiedono DOM (dnd-kit, FullCalendar)
- Non mettere `'use client'` su layout o pagine intere: crea sotto-componenti client isolati
- Usa Server Actions per form mutations quando possibile

```typescript
// ✅ Corretto: componente server con sub-componente client isolato
// task-list.tsx (server)
export default async function TaskList({ projectId }: { projectId: string }) {
  const tasks = await getTasks(projectId); // query diretta server-side
  return <TaskListClient tasks={tasks} />;
}

// task-list-client.tsx (client)
'use client';
export function TaskListClient({ tasks }: { tasks: Task[] }) { ... }
```

### API Routes (Route Handlers)
- Tutte le Route in `src/app/api/`
- Ogni handler deve:
  1. Verificare l'autenticazione con `createServerClient`
  2. Validare l'input con Zod
  3. Verificare i permessi dell'utente (ruolo)
  4. Eseguire l'operazione DB server-side
  5. Restituire `{ data, error }` — mai fare `throw` in production

```typescript
// ✅ Pattern standard Route Handler
export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const result = CreateTaskSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from('tasks').insert(result.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
```

### Database e Supabase
- **Usa sempre il client server-side** per query che coinvolgono dati sensibili o permessi
- Il client browser è consentito solo per operazioni real-time (subscriptions) e upload Storage
- **Ogni tabella deve avere RLS abilitata** — verifica sempre prima di rilasciare
- Usa le **migrations Supabase** per ogni modifica schema (mai modificare il DB manuale in prod)
- File migrations: `supabase/migrations/YYYYMMDDHHMMSS_descrizione.sql`
- **Non modificare mai una migration esistente** — crea sempre una nuova

```typescript
// ✅ Client server (per query sensibili)
import { createServerClient } from '@/lib/supabase/server';

// ✅ Client browser (solo per realtime/storage lato client)
import { createBrowserClient } from '@/lib/supabase/client';
```

### Gestione errori
- Pattern obbligatorio: `return { data: null, error: 'messaggio' }` — mai `throw`
- In componenti client: usa `toast` (shadcn/ui) per mostrare errori all'utente
- In Server Actions: usa `useFormState` / `useActionState` per propagare errori ai form
- Log errori server-side: `console.error` con contesto (mai loggare dati sensibili)

### Stile e UI
- Usa **esclusivamente** classi Tailwind — zero stili inline, zero CSS custom salvo `globals.css`
- Usa componenti **shadcn/ui** per tutti gli elementi UI primitivi (Button, Input, Dialog, Select, ecc.)
- Non installare altre librerie di componenti (MUI, Ant Design, Chakra)
- Implementa dark/light mode con `next-themes` + classi Tailwind `dark:`
- Ogni componente interattivo deve avere stati: default, hover, focus, disabled, loading

---

## Limitazioni e restrizioni

### NON fare senza approvazione esplicita:
- Installare librerie non presenti nello stack approvato
- Modificare lo schema DB senza aggiornare `docs/schema-changelog.md`
- Creare nuove tabelle senza le relative RLS policies
- Aggiungere feature non presenti nel PRD
- Modificare migration esistenti (solo nuove migrations)
- Usare `any` in TypeScript
- Fare query DB lato client per dati sensibili
- Committare `.env.local` o qualsiasi file con credenziali
- Implementare soluzioni di autenticazione custom (usa solo Supabase Auth)

### NON aggiungere senza che sia richiesto:
- File di test (unit, integration, e2e) — solo se esplicitamente richiesti
- Documentazione JSDoc/commenti su codice autoesplicativo
- Funzionalità "nice to have" non presenti nel PRD
- Configurazioni per ambienti non necessari

---

## Variabili d'ambiente

Queste variabili devono essere presenti in `.env.local` (mai nel repository):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Solo server-side, MAI esporre al client

# Resend (email)
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000  # In prod: https://taskflow.vercel.app

# Cron (segreto per proteggere l'endpoint cron)
CRON_SECRET=...
```

Il file `.env.example` deve sempre essere aggiornato con le chiavi necessarie (senza valori).

---

## Sicurezza — checklist obbligatoria

Prima di ogni feature che tocca il DB, verifica:

- [ ] La tabella coinvolta ha RLS abilitata (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`)
- [ ] Le policy RLS coprono tutti i ruoli (super_admin, project_admin, editor, viewer)
- [ ] L'endpoint API verifica l'autenticazione prima di qualsiasi operazione
- [ ] L'endpoint API verifica il ruolo/permesso dell'utente
- [ ] L'input è validato con Zod prima di arrivare al DB
- [ ] I file allegati sono accessibili solo tramite URL firmati (non URL pubblici)
- [ ] Nessun dato sensibile è loggato in console
- [ ] `SUPABASE_SERVICE_ROLE_KEY` non è mai esposta in codice client

---

## Flusso di lavoro sessione per sessione

1. **Inizio sessione:** leggi `PLANNING.md` per identificare il task corrente
2. **Pianifica:** prima di scrivere codice, descrivi all'utente l'approccio
3. **Implementa:** una feature/modulo alla volta — non saltare tra feature diverse
4. **Verifica sicurezza:** usa la checklist sicurezza prima di chiudere il task
5. **Aggiorna PLANNING.md:** marca il task come completato con data
6. **Segnala problemi:** se trovi un ostacolo architetturale, segnalalo prima di procedere

---

## Memoria persistente (claude-mem)

Il progetto utilizza **claude-mem** (plugin MCP) per preservare contesto tecnico cross-sessione. Gli hook plugin-level iniettano automaticamente contesto ad ogni `UserPromptSubmit` e salvano observations dopo ogni tool use. Non serve configurare nulla a livello progetto.

**All'inizio di task non banali e prima di introdurre nuovi pattern:**

1. Cerca precedenti rilevanti: usa `/claude-mem:mem-search` (o il tool MCP `search`) con query mirate sul dominio del task (es. `RLS policies`, `Server Actions task`, `drag and drop`, `useEffect merge pattern`)
2. Se trovi observations pertinenti, usa `timeline` per espandere il contesto intorno all'ID rilevante
3. Claude-mem salva automaticamente observations post-tool-use e riassume la sessione allo `Stop` — non serve salvataggio manuale

**NON sostituisce** la auto-memory nativa in `~/.claude/projects/-Users-luca-Desktop-Claude-Code-138507/memory/`: sono sistemi complementari. Auto-memory per preferenze/feedback strutturati (MEMORY.md + file tematici), claude-mem per osservazioni tecniche granulari indicizzate semanticamente sul DB SQLite in `~/.claude-mem/`.

---

## Schema DB — regole di modifica

Ogni modifica allo schema DB richiede:

1. Creare una nuova migration: `supabase/migrations/YYYYMMDDHHMMSS_descrizione.sql`
2. Aggiornare `docs/schema-changelog.md` con: data, descrizione modifica, motivazione
3. Rigenerare i tipi TypeScript: `supabase gen types typescript --local > src/types/database.ts`
4. Aggiornare gli schemi Zod in `src/lib/validations/` se necessario
5. Verificare che le RLS policies coprano le nuove tabelle/colonne

**Non modificare mai una migration già applicata** — crea sempre una nuova.

---

## Note sul deployment

- **Sviluppo locale:** `npm run dev` + Supabase CLI locale (`supabase start`)
- **Preview deploy:** ogni PR genera un preview URL su Vercel automaticamente
- **Production:** branch `main` → deploy automatico su Vercel
- **Variabili env in Vercel:** configurare nel dashboard Vercel, non nei file
- **Cron jobs:** configurati in `vercel.json` (endpoint `/api/cron/reminders`)
- **Edge Runtime:** NON usare per route che usano Supabase server client (usa Node.js runtime)

---

## Linee guida comportamentali (Karpathy)

Principi per ridurre gli errori ricorrenti degli LLM nel coding. Si applicano a ogni task non banale.

**Tradeoff:** questi principi privilegiano la cautela sulla velocità. Per task triviali, usa il giudizio.

### 1. Pensa prima di scrivere codice

**Non fare assunzioni. Non nascondere la confusione. Porta a galla i tradeoff.**

Prima di implementare:
- Dichiara esplicitamente le assunzioni. Se incerto, chiedi.
- Se esistono più interpretazioni, presentale — non scegliere in silenzio.
- Se esiste un approccio più semplice, dillo. Spingi back quando è giustificato.
- Se qualcosa è poco chiaro, fermati. Nomina cosa crea confusione. Chiedi.

### 2. Semplicità prima

**Il minimo codice che risolve il problema. Niente di speculativo.**

- Nessuna feature oltre a quanto richiesto.
- Nessuna astrazione per codice a uso singolo.
- Nessuna "flessibilità" o "configurabilità" non richiesta.
- Nessun error handling per scenari impossibili.
- Se hai scritto 200 righe e potrebbero essere 50, riscrivi.

Test: "Un senior engineer direbbe che è troppo complicato?" Se sì, semplifica.

### 3. Modifiche chirurgiche

**Tocca solo ciò che devi. Pulisci solo il tuo disordine.**

Quando modifichi codice esistente:
- Non "migliorare" codice, commenti o formattazione adiacenti.
- Non fare refactoring di cose che non sono rotte.
- Rispetta lo stile esistente, anche se lo faresti diversamente.
- Se noti dead code non correlato, segnalalo — non eliminarlo.

Quando i tuoi cambiamenti creano orfani:
- Rimuovi import/variabili/funzioni che I TUOI cambiamenti hanno reso inutilizzati.
- Non rimuovere dead code pre-esistente a meno che non sia richiesto.

Test: ogni riga modificata deve tracciare direttamente alla richiesta dell'utente.

### 4. Esecuzione orientata agli obiettivi

**Definisci criteri di successo. Itera fino alla verifica.**

Trasforma i task in obiettivi verificabili:
- "Aggiungi validazione" → "Scrivi test per input invalidi, poi falli passare"
- "Correggi il bug" → "Scrivi un test che lo riproduce, poi fallo passare"
- "Refactoring di X" → "Assicura che i test passino prima e dopo"

Per task multi-step, dichiara un piano breve:
```
1. [Step] → verifica: [check]
2. [Step] → verifica: [check]
3. [Step] → verifica: [check]
```

Criteri di successo forti permettono di iterare in autonomia. Criteri deboli ("fallo funzionare") richiedono continue chiarificazioni.
