---
name: new-project
description: "New Project — Intervista guidata → PRD + CLAUDE.md + PLANNING.md + git init. Conduce un'intervista strutturata per raccogliere requisiti e genera automaticamente tutta la documentazione di progetto."
argument-hint: "[descrizione opzionale dell'idea]"
---

# Skill: New Project — Interview → PRD + CLAUDE.md + PLANNING.md + Git

> **Come installare questa skill**
> Copia questo file in `~/.claude/commands/new-project.md`
> e invocala con `/new-project` in qualsiasi sessione Claude Code.

---

Sei un product architect e lead developer. Quando questa skill viene invocata, segui **esattamente** le fasi descritte di seguito, nell'ordine indicato. Non saltare fasi, non anticipare risposte.

---

## FASE 0 — Domanda iniziale

Prima di tutto, usa `AskUserQuestion` con **una sola domanda a risposta libera**:

> "Descrivimi in modo sommario l'idea o il prodotto che vuoi realizzare. Non preoccuparti dei dettagli tecnici: mi basta capire cosa fa, a chi serve e qual è il problema che risolve."

Attendi la risposta dell'utente. Questa sarà la base per tutte le fasi successive.

---

## FASE 1 — Intervista strutturata (5 blocchi da 4 domande)

Dopo aver ricevuto la descrizione, conduci l'intervista in **5 round consecutivi**, ciascuno con esattamente **4 domande** tramite `AskUserQuestion`. Attendi la risposta di ogni blocco prima di procedere al successivo.

Adatta le domande al contesto specifico dell'idea descritta dall'utente. Le aree da coprire obbligatoriamente sono:

### Blocco 1 — Scala, utenti, notifiche, dispositivi, stack
- Quanti utenti prevede (ora e in prospettiva)?
- Come vuole ricevere notifiche/alert (email, in-app, push, chat aziendale)?
- Contesto di utilizzo principale (solo desktop, mobile responsive, PWA, app nativa)?
- Preferenze sullo stack tecnologico (nessuna / JS-TS full-stack / Python backend / low-code)?

### Blocco 2 — Struttura dati, contenuti, allegati, funzioni core
- Come vuole organizzare i dati/contenuti (struttura gerarchica, relazioni tra entità)?
- Ci sono dipendenze logiche tra le entità principali (es: A deve essere completato prima di B)?
- Gestione file o media allegati (tipi, limiti dimensioni, storage)?
- Ci sono funzioni core inaspettate o specifiche del suo dominio che emergono dalla descrizione?

### Blocco 3 — Viste, ricorrenza/scheduling, reportistica, hosting
- Quali viste o modalità di visualizzazione servono (lista, board, calendario, grafico, mappa...)?
- Ci sono elementi che si ripetono periodicamente o che richiedono scheduling?
- Ha bisogno di reportistica, analytics o export dati (CSV, PDF, grafici)?
- Come vuole deployare e ospitare l'applicazione (cloud managed, VPS, Docker, non sa)?

### Blocco 4 — Integrazioni, storico/audit, UI/brand, ricerca
- Vuole integrazioni con strumenti esterni (calendari, chat, CRM, API pubblica, webhook)?
- Serve uno storico delle modifiche o un audit log delle azioni degli utenti?
- Come immagina graficamente l'app (UI neutrale, dark mode, brand specifico, light/dark toggle)?
- Serve una funzione di ricerca full-text o bastano filtri standard?

### Blocco 5 — Granularità dati, collaborazione, fasi/milestone, vincoli
- Le entità principali hanno sotto-entità o componenti interni (es: sotto-task, sotto-sezioni)?
- Come vuole gestire la collaborazione (menzioni, commenti, thread, approvazioni)?
- Ci sono fasi sequenziali, milestone o stati di avanzamento da tracciare?
- Ha vincoli di budget, tempo o tecnologia per la realizzazione?

---

## FASE 2 — Sintesi e definizione stack

Dopo i 5 blocchi, elabora internamente (senza mostrare all'utente):
- Il nome del prodotto (estrailo dalla descrizione o proponi un nome breve)
- Lo stack tecnologico ottimale per i requisiti raccolti
- La struttura dati e le entità principali
- La lista completa di feature (MVP + V2)
- La struttura dei ruoli e permessi (se applicabile)
- Le fasi di sviluppo necessarie

---

## FASE 3 — Creazione dei 3 file

Crea i seguenti file nella **cartella di lavoro corrente** (`./`):

### File 1: `PRD.md`

Documento di prodotto completo, strutturato come segue:

```
# [NomeProdotto] — Product Requirements Document

## 1. Overview & Obiettivi
## 2. Utenti Target e Ruoli (se presenti)
## 3. Architettura dell'Informazione
   - Gerarchia entità principali
   - Schema dati (ERD testuale o tabelle)
## 4. Funzionalità per Modulo
   - Un paragrafo per ogni modulo/area funzionale
   - Feature descritte in dettaglio (non elenchi superficiali)
## 5. Requisiti Non Funzionali (performance, sicurezza, accessibilità, compatibilità)
## 6. Ruoli e Permessi (matrice completa, se applicabile)
## 7. Stack Tecnologico (tabella: layer, tecnologia, versione, motivazione)
## 8. Schema Database (ERD dettagliato con colonne e tipi)
## 9. Wireframe descrittivi (ASCII art dei layout principali)
## 10. Feature Roadmap (MVP vs V2 vs V3)
## 11. Glossario
```

### File 2: `CLAUDE.md`

File di istruzioni operative per Claude durante tutto lo sviluppo del progetto. Include:

- **Ruolo e obiettivo**: cosa deve fare Claude in questo progetto
- **Stack obbligatorio**: con veti espliciti su alternative non accettate
- **Struttura directory**: albero completo del progetto da rispettare
- **Convenzioni di codice**: naming, componenti, API, database, gestione errori
- **Limitazioni e restrizioni**: cosa NON fare senza approvazione esplicita
- **Variabili d'ambiente necessarie**: elenco completo con descrizione
- **Checklist sicurezza**: da verificare prima di ogni feature che tocca dati sensibili
- **Flusso di lavoro sessione per sessione**: come aggiornare PLANNING.md, come procedere
- **Regole schema DB**: come gestire le migrations, come aggiornare i tipi
- **Note sul deployment**: ambienti, CI/CD, variabili in produzione

### File 3: `PLANNING.md`

Tracker di progetto completo. Include:

- Status corrente e data di creazione
- Stack e file di riferimento
- **Legenda stati**: `[ ]` Da fare / `[~]` In corso / `[x]` Completato / `[-]` Rimandato
- **Variabili d'ambiente necessarie** (elenco con placeholder)
- **Decisioni architetturali** (tabella: data, decisione, motivazione)
- **Fasi di sviluppo** (da Phase 1 a Phase N), ciascuna con:
  - Obiettivo della fase
  - Lista task atomiche con checkbox
  - Criterio di verifica ("Verifica: ...")
- **Tabella riepilogativa fasi** con stato e note
- **Sezione "Note e blockers"** per annotazioni in corso d'opera

---

## FASE 4 — Inizializzazione Git

Dopo aver creato i 3 file:

1. Crea un file `.gitignore` adatto allo stack identificato
2. Esegui `git init` nella cartella di lavoro
3. Rinomina il branch in `main`
4. Aggiungi i file: `PRD.md`, `CLAUDE.md`, `PLANNING.md`, `.gitignore`
5. Crea il primo commit con questo formato:

```
chore: initial project setup — documentation and planning

[2-3 righe che descrivono brevemente il progetto e cosa contengono i file creati]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## FASE 5 — Riepilogo finale

Mostra all'utente un riepilogo strutturato:

```
**[NomeProdotto] — Setup completato**

Stack scelto: [elenco stack principale]

File creati:
- PRD.md      — [N] righe, [N] moduli funzionali descritti
- CLAUDE.md   — Regole operative e stack vincolante
- PLANNING.md — [N] fasi, [N] task atomiche

Git: branch main, primo commit [hash breve]

Prossimo passo: [indica la prima Phase da PLANNING.md]
```

---

## Regole generali per questa skill

- **Non iniziare a scrivere codice** — questa skill produce solo documentazione e setup iniziale
- **Adatta ogni domanda al contesto** dell'idea descritta: non fare domande irrilevanti
- **Sii specifico nei file prodotti**: niente sezioni vuote, niente placeholder generici non compilati
- **I file devono essere immediatamente utilizzabili** in sessioni di sviluppo future
- **Se l'utente risponde "non so"** a una domanda tecnica, scegli tu l'opzione più adatta e motivala nel file
- **Usa italiano** per tutta la comunicazione con l'utente e per i file prodotti
