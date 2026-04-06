# Store Visit Manager

App PWA per la gestione delle visite agli store da parte di un team sul campo.
Stack: React + Tailwind CSS + Supabase + Vercel.

---

## 📁 Struttura del progetto

```
store-visits/
├── public/
│   ├── index.html          # HTML con meta PWA
│   ├── manifest.json       # PWA manifest
│   └── service-worker.js   # SW per installazione
├── src/
│   ├── App.js              # Root app + routing tab
│   ├── index.js            # Entry point React
│   ├── index.css           # Tailwind + stili custom
│   ├── context/
│   │   └── AuthContext.js  # Stato auth globale
│   ├── lib/
│   │   ├── supabase.js     # Client Supabase + helpers upload
│   │   └── generatePDF.js  # Generazione PDF con jsPDF
│   ├── hooks/
│   │   └── useStores.js    # Hook dati store e attività
│   ├── pages/
│   │   ├── LoginPage.js
│   │   ├── NewVisitPage.js
│   │   ├── HistoryPage.js
│   │   ├── DashboardPage.js
│   │   └── AdminPage.js
│   └── components/
│       ├── shared/
│       │   ├── BottomNav.js
│       │   ├── Spinner.js
│       │   └── Toast.js
│       ├── visits/
│       │   ├── ActivityRow.js
│       │   └── VisitDetailModal.js
│       └── admin/
│           ├── UsersManager.js
│           ├── StoresManager.js
│           └── ActivitiesManager.js
├── supabase/
│   └── functions/
│       └── create-user/
│           └── index.ts    # Edge Function creazione utenti
├── supabase_schema.sql     # Schema DB + RLS completo
├── vercel.json             # Config deploy Vercel
├── .env.example            # Variabili d'ambiente
└── package.json
```

---

## 🚀 Setup passo per passo

### 1. Crea progetto Supabase

1. Vai su [app.supabase.com](https://app.supabase.com) → **New project**
2. Scegli nome, password DB, e regione (eu-central-1 per l'Italia)
3. Aspetta che il progetto si avvii (~2 minuti)

### 2. Configura il database

1. Vai su **SQL Editor** → **New query**
2. Incolla tutto il contenuto di `supabase_schema.sql`
3. Clicca **Run** — il database è pronto

### 3. Crea il bucket Storage

Il bucket viene creato automaticamente dallo script SQL. Se fallisce:
1. Vai su **Storage** → **New bucket**
2. Nome: `attachments`, abilita **Public bucket**
3. Applica le policies come da script SQL

### 4. Deploy Edge Function (per creare utenti)

```bash
# Installa Supabase CLI
npm install -g supabase

# Login
supabase login

# Collega al tuo progetto (trova il Project ID su Settings > General)
supabase link --project-ref YOUR_PROJECT_ID

# Deploy della funzione
supabase functions deploy create-user
```

### 5. Crea il primo admin manualmente

Dal **SQL Editor** di Supabase:

```sql
-- Prima crea l'utente su Authentication > Users > Invite user (dalla UI Supabase)
-- Poi aggiorna il ruolo:
UPDATE public.profiles
SET ruolo = 'admin'
WHERE email = 'tua-email-admin@example.com';
```

Oppure usa la UI di Supabase:
1. **Authentication** → **Users** → **Add user**
2. Inserisci email e password dell'admin
3. Vai su **Table Editor** → **profiles** → modifica la riga → `ruolo = admin`

### 6. Setup locale

```bash
# Clona/copia il progetto
cd store-visits

# Copia variabili d'ambiente
cp .env.example .env.local

# Inserisci i tuoi valori (da Supabase → Settings → API):
# REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
# REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...

# Installa dipendenze
npm install

# Avvia in sviluppo
npm start
```

### 7. Deploy su Vercel

**Metodo A — Vercel CLI:**
```bash
npm install -g vercel
vercel login
vercel --prod
# Segui le istruzioni e inserisci le env vars quando chiesto
```

**Metodo B — Vercel Dashboard (raccomandato):**
1. Vai su [vercel.com](https://vercel.com) → **New Project**
2. Importa da GitHub (carica prima il progetto su GitHub)
3. Framework: **Create React App** (auto-detect)
4. Aggiungi le variabili d'ambiente:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
5. Clicca **Deploy**

L'URL generato da Vercel è la tua app condivisibile ✅

---

## 📱 Installazione come PWA

### Android (Chrome)
1. Apri l'URL nel browser Chrome
2. Tocca **⋮** (menu) → **"Aggiungi a schermata Home"**
3. Conferma → l'icona appare nella home

### iOS (Safari)
1. Apri l'URL in Safari
2. Tocca **□↑** (condividi) → **"Aggiungi a schermata Home"**
3. Conferma → l'icona appare nella home

---

## 🔑 Variabili d'ambiente

| Variabile | Descrizione | Dove trovarla |
|-----------|-------------|---------------|
| `REACT_APP_SUPABASE_URL` | URL del progetto Supabase | Settings → API → Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Chiave pubblica anon | Settings → API → anon public |

> **Non serve** la `service_role` key nel frontend — è usata solo dall'Edge Function lato server.

---

## 🎨 Icone PWA

Il file `manifest.json` fa riferimento a `icon-192.png` e `icon-512.png`.  
Crea queste icone con il logo di Bruno e salvale in `/public/`.

Strumenti consigliati:
- [Maskable.app](https://maskable.app/editor) per icone con safe area
- [RealFaviconGenerator](https://realfavicongenerator.net) per generare tutti i formati

---

## 🛠 Note tecniche

### Creazione utenti
La creazione utenti richiede la **Admin API** di Supabase (service_role key), che non può essere esposta nel frontend. La soluzione è l'**Edge Function** `create-user` che:
1. Riceve la richiesta autenticata dall'admin
2. Verifica il ruolo admin tramite DB
3. Usa la service_role internamente per creare l'account
4. Restituisce il risultato al client

### RLS (Row Level Security)
Ogni tabella ha policies RLS che garantiscono:
- Gli utenti standard vedono/modificano **solo i propri dati**
- Gli admin vedono **tutto**
- Nessun dato è accessibile senza autenticazione

### PDF con foto
La generazione PDF con foto richiede che le immagini abbiano header CORS corretti. Il bucket Supabase con `public: true` li fornisce automaticamente.

### Offline / PWA
Il Service Worker mette in cache gli asset statici. Le operazioni che richiedono il DB (nuove visite, upload) richiedono connessione. Per full offline support, si potrebbe aggiungere IndexedDB + sync in background (fuori scope di questa versione).

---

## 📝 Aggiornamenti futuri

- [ ] Notifiche push per promemoria visite
- [ ] Firma digitale dello store manager
- [ ] Esportazione Excel delle visite
- [ ] Geolocalizzazione automatica store
- [ ] Modalità offline completa con sync
