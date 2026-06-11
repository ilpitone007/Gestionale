# SliceMaster POS - Gestionale per Pizzeria

SliceMaster POS è un sistema gestionale e POS (Point of Sale) moderno progettato specificamente per pizzerie. Permette la gestione in tempo reale degli ordini (tavoli, asporto, consegne a domicilio), fidelizzazione clienti tramite punti fedeltà, controllo del menu e degli ingredienti, monitoraggio del magazzino e reportistica finanziaria sui margini di guadagno.

Il sistema è strutturato come una Single Page Application (SPA) reattiva per il frontend ed un'API RESTful per il backend, con supporto completo a Docker per la containerizzazione.

---

## Funzionalità

- **Gestione Menu & Categorie**: Creazione, modifica ed eliminazione logica di pizze, fritti, bevande e dolci con categorizzazioni gerarchiche multilivello.
- **Personalizzazione Pizze**: Aggiunta o rimozione dinamica di ingredienti e varianti con calcolo automatico del prezzo aggiuntivo.
- **Gestione Ordini Multicanale**:
  - **Ordini al tavolo (Sala)**: Con indicazione specifica del numero di tavolo.
  - **Asporto (Take-away)**: Con orario programmato di ritiro.
  - **Consegne a domicilio (Delivery)**: Con assegnazione dei rider e calcolo delle spese di consegna.
- **Fidelizzazione Clienti**: Carta fedeltà con accumulo punti (es. accredito punti ad ordine ritirato) e gestione pizze omaggio (1 pizza in omaggio ogni 10 pizze ordinate).
- **Statistiche & Report**: Reportistica avanzata su vendite, scontrino medio, piatti più venduti e margini di guadagno (calcolati basandosi sul costo storico Snapshot salvato all'atto dell'ordine).
- **Controllo Magazzino & Ingredienti**: Monitoraggio scorte degli ingredienti e alert per scorte sotto la soglia minima.
- **Utenti e Ruoli**: Controllo degli accessi basato su ruoli predefiniti (`titolare`, `responsabile`, `dipendente`).
- **Backup Automatico**: Esecuzione notturna alle ore 03:00 del backup del database JSON.

---

## Tecnologie Usate

### Frontend
- **Framework**: React 18 (TypeScript)
- **Strumenti di Build**: Vite
- **Styling**: Tailwind CSS
- **Iconografia**: Lucide React
- **Grafici**: Recharts
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js >= 20.x
- **Framework**: Express.js
- **Sicurezza**: Helmet, CORS, BcryptJS (hashing password), JSON Web Token (JWT per autenticazione)
- **Database**: Supabase (PostgreSQL Cloud) come database principale, con fallback automatico a database JSON locale (`pizzeria_db.json`) in modalità offline.

---

## Requisiti

- **Node.js**: versione >= 20.x e npm >= 10.x
- **Docker & Docker Compose**: (Opzionale, per installazione tramite container)
- **Spazio di archiviazione**: Minimo (il database JSON occupa pochi megabyte su disco)

---

## Installazione Locale

Esegui i seguenti passaggi nel terminale per configurare il progetto in ambiente di sviluppo locale.

### 1. Clonare il repository
```bash
git clone https://github.com/tuo-username/slicemaster-pos.git
cd slicemaster-pos
```

### 2. Installare le dipendenze
Installazione delle dipendenze del backend:
```bash
cd server
npm install
```

Installazione delle dipendenze del frontend:
```bash
cd ../client
npm install
```

### 3. Configurare le variabili d'ambiente
Crea un file `.env` all'interno della cartella `server` (vedi la sezione successiva per i dettagli delle variabili).

### 4. Avviare il progetto in sviluppo
Vedere la sezione [Avvio in Sviluppo](#avvio-in-sviluppo).

---

## Configurazione file .env

All'interno della cartella `server/`, crea un file denominato `.env` popolando i seguenti campi:

```env
PORT=5001
DB_PATH=./src/db/pizzeria_db.json
JWT_SECRET=cambiami_in_produzione_con_chiave_sicura_32_caratteri
NODE_ENV=development

# Credenziali Supabase (Opzionali, attiva il database cloud)
SUPABASE_URL=https://tuo-id-progetto.supabase.co
SUPABASE_KEY=tua-service-role-key-del-progetto
```

- **PORT**: Porta su cui rimarrà in ascolto il backend Express (default: `5001`).
- **DB_PATH**: Percorso del file JSON in cui verranno salvati tutti i dati (relativo a `server/` o percorso assoluto).
- **JWT_SECRET**: Chiave di cifratura per firmare i token di sessione JWT.
- **NODE_ENV**: Impostato su `development` in sviluppo per allentare i controlli CORS rigorosi dell'host d'origine.
- **SUPABASE_URL**: URL API del tuo progetto Supabase (es. `https://abc.supabase.co`).
- **SUPABASE_KEY**: Chiave API `service_role` (non anon key) del tuo progetto Supabase.

---

## Avvio in Sviluppo

Il database JSON è auto-inizializzante. All'avvio del backend, se il file indicato da `DB_PATH` non esiste o è vuoto, verrà automaticamente eseguito il seed dei dati dimostrativi (menu, utenti staff di prova, ingredienti).

### 1. Avviare il Backend
Dalla cartella principale del progetto:
```bash
cd server
npm run dev
```
Il server Express partirà su `http://localhost:5001`.

### 2. Avviare il Frontend
Apri un nuovo terminale, dalla cartella principale del progetto:
```bash
cd client
npm run dev
```
La Web App sarà accessibile su `http://localhost:8090` (o la porta alternativa mostrata da Vite).

---

## Utenti Demo

All'avvio, il database viene pre-popolato con tre account demo con differenti livelli di accesso. La schermata di login richiede **Username** (non email) e **Password**:

| Ruolo | Username | Password | Permessi |
| :--- | :--- | :--- | :--- |
| **Titolare** | `titolare` | `titolare123` | Accesso completo (inclusi Report e Impostazioni) |
| **Responsabile** | `responsabile` | `responsabile123` | Accesso a Cassa, Cucina, Inventario, Clienti, Storico, Report |
| **Dipendente** | `dipendente` | `dipendente123` | Cassa, Cucina, Consegne, Storico (Sconto max manuale: 30%) |

---

## Build Produzione

Per compilare la Web App React per la produzione:

```bash
cd client
npm run build
```

Questo comando genera la cartella compilata `client/dist/` contenente file statici HTML, CSS e JS pronti ad essere distribuiti tramite un server web statico come Nginx.

---

## Deploy

### Docker & Docker Compose (Scelta Consigliata)
Il progetto include una configurazione Docker multi-stage pronta per l'uso.

```bash
# Avvio di tutti i servizi in modalità detached (background)
docker compose up --build -d
```

- **Frontend Nginx**: Mappato su `http://localhost:8090` (esegue il reverse proxy di `/api` verso il backend).
- **Backend Node.js**: In esecuzione interna sulla porta `5001`.
- **Persistenza**: Un volume Docker nominato `db-data` mappa la cartella `/app/data` all'interno del container del backend per preservare il file `pizzeria_db.json` ed evitare perdite di dati al riavvio del container.

### Deploy su Render
1. **Database JSON & Backend (Web Service)**:
   - Crea un **Web Service** collegato al repository GitHub.
   - Root Directory: `server`.
   - Build Command: `npm install`.
   - Start Command: `node index.js`.
   - Aggiungi un **Disk/Mount Volume** (es. `/app/data`) per non perdere i dati ad ogni riavvio del dyno. Imposta la variabile `DB_PATH=/app/data/pizzeria_db.json`.
   - Imposta le altre variabili ambiente: `PORT=10000`, `JWT_SECRET`, `NODE_ENV=production`.
2. **Frontend (Static Site)**:
   - Crea un **Static Site** collegato al repository GitHub.
   - Root Directory: `client`.
   - Build Command: `npm run build`.
   - Publish Directory: `dist`.
   - Aggiungi le regole di routing/redirect su Render per inoltrare tutte le richieste non-statiche ad `index.html` (Rewrite `/*` to `/index.html`).

### Deploy su Railway
1. **Servizio Unico o Multiplo**:
   - Collega il tuo repository GitHub a Railway.
   - Puoi deployare direttamente usando il file `docker-compose.yml` rilevato da Railway, configurando le variabili d'ambiente nel pannello di controllo.
   - Assicurati di aggiungere un volume persistente per la directory del database se deployi il backend autonomamente.

### VPS Ubuntu (Deploy Classico)
Per ospitare l'applicazione su una macchina virtuale Ubuntu pulita:

#### 1. Installare le dipendenze di sistema
```bash
sudo apt update
sudo apt install -y nodejs npm nginx git certbot python3-certbot-nginx
sudo npm install -g pm2
```

#### 2. Configurare l'applicazione
```bash
cd /var/www
git clone https://github.com/tuo-username/slicemaster-pos.git
cd slicemaster-pos

# Backend config
cd server
npm install --production
cp .env.example .env # Compila con i dati reali
pm2 start index.js --name "slicemaster-backend" --watch

# Frontend config
cd ../client
npm install
npm run build
```

#### 3. Configurare Nginx (/etc/nginx/sites-available/default)
Sostituisci il file di configurazione di Nginx per servire la SPA ed inoltrare le chiamate API:
```nginx
server {
    listen 80;
    server_name pizzeria.tuodominio.it;

    location / {
        root /var/www/slicemaster-pos/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Verifica e riavvia Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. Abilitare HTTPS con Certbot
```bash
sudo certbot --nginx -d pizzeria.tuodominio.it
```

---

## Database (Backup & Ripristino)

### Come Funziona
Il database è un file JSON (`pizzeria_db.json`). Le modifiche vengono salvate in memoria ed allineate asincronamente su disco tramite un sistema a coda di scrittura asincrona per evitare la corruzione dei dati.

### Backup Automatico
Il backend esegue un cron job interno ogni giorno alle **03:00 AM** per creare una copia del file del database corrente all'interno della cartella `backups/`, rinominandolo con timestamp corrente (es. `pizzeria_db_backup_2026-06-07T03-00-00.json`).

### Eseguire un Backup Manuale
È sufficiente copiare il file del database configurato nella variabile `DB_PATH`:
```bash
cp server/src/db/pizzeria_db.json backups/manual_backup_$(date +%F).json
```

### Ripristino di un Backup
1. Arrestare il server backend (PM2 o Docker container).
2. Sostituire il file `pizzeria_db.json` con la copia di backup desiderata.
3. Riavviare il server.

---

## Test

Il progetto include suite di test automatici all'interno della cartella `scratch/`.

### Esecuzione Test Suite (Funzionali)
Verifica la corretta creazione degli ordini, l'applicazione delle promozioni, e la logica del programma fedeltà:
```bash
node scratch/test_suite.js
```

### Esecuzione Test di Sicurezza & Limiti
Verifica la robustezza contro attacchi a dizionario (rate limiter), payload di dimensioni eccessive, e modifiche di stato non autorizzate:
```bash
node scratch/security_stress_test.js
```

---

## Sicurezza

- **Variabili d'ambiente**: Non inserire mai le credenziali e i token reali nei file del repository. Il file `.env` è escluso via `.gitignore`.
- **JWT Secret**: Cambiare sempre la chiave `JWT_SECRET` in produzione. Usare stringhe ad alta entropia.
- **Helmet**: Integrato nel backend per configurare correttamente le intestazioni HTTP di sicurezza e mitigare attacchi XSS.
- **Payload Limit**: Il body parser di Express è limitato a `100kb` globalmente per prevenire attacchi di tipo Denial of Service (DoS) tramite invio di payload enormi (con l'eccezione dell'upload dei loghi, limitato a `2MB` e protetto).
- **Controllo Accessi**: Ogni operazione sensibile (es. eliminazione categorie, report finanziari, modifica impostazioni) è protetta a livello di API dal middleware `auth` e verifica rigorosamente il ruolo dell'utente registrato.

---

## Troubleshooting

| Problema | Causa Probabile | Soluzione |
| :--- | :--- | :--- |
| **Porta 5001 già in uso** | Un'istanza precedente del server o un altro servizio è attivo sulla porta. | Trova e uccidi il processo (`kill -9 $(lsof -t -i:5001)`) oppure cambia porta in `.env`. |
| **Database: errore di avvio** | La cartella specificata per ospitare il database in `DB_PATH` non ha i permessi di scrittura. | Assicurati che l'utente che esegue Node (o l'utente del container Docker) abbia i permessi di scrittura sulla cartella di destinazione. |
| **Login fallito per utenti demo** | Il database conteneva già record preesistenti e il seeding automatico è stato saltato. | Rimuovi il file `pizzeria_db.json` temporaneamente per forzare la riesecuzione del seeding iniziale all'avvio. |
| **Errore CORS sul client** | La variabile `NODE_ENV` non è impostata a `development` in locale, o l'indirizzo del client non è presente in `allowedOrigins`. | Configura `NODE_ENV=development` in `.env` e riavvia il backend. |
| **Schermata Bianca al caricamento delle pagine** | Rotte della SPA non risolte correttamente dal server web. | Configura Nginx con la direttiva `try_files $uri $uri/ /index.html;` per intercettare le rotte lato client. |

---

## Struttura Progetto

```text
slicemaster/
├── client/                      # Frontend SPA React
│   ├── src/
│   │   ├── api/                 # Chiamate API (ordini, menu, clienti...)
│   │   ├── components/          # Componenti condivisi (badges, layout...)
│   │   ├── contexts/            # React Contexts (Auth, Toast, Settings...)
│   │   ├── modules/             # Moduli di pagina (Cassa, Cucina, Storico...)
│   │   └── types/               # Definizioni TypeScript
│   ├── Dockerfile               # Build multi-stage (React compile + Nginx)
│   ├── nginx.conf               # Configurazione Nginx per Docker
│   └── package.json             # Dipendenze Frontend
├── server/                      # Backend API RESTful
│   ├── src/
│   │   ├── db/                  # Database in memoria JSON, migrazioni e seed
│   │   ├── middleware/          # Autenticazione e controllo ruoli
│   │   ├── routes/              # Endpoint API suddivisi per risorsa
│   │   └── utils/               # Logica di utilità (backup, punti fedeltà...)
│   ├── Dockerfile               # Dockerfile backend Node.js
│   ├── index.js                 # Punto d'ingresso Express
│   └── package.json             # Dipendenze Backend
├── scratch/                     # Test automatici di integrità e stress test
├── docker-compose.yml           # Configurazione multi-container
└── README.md                    # Questa documentazione
```

---

## Comandi Utili

- `docker compose up --build -d`: Avvia l'intera applicazione in locale tramite Docker.
- `docker compose down`: Ferma i container Docker senza cancellare i volumi dei dati.
- `node scratch/test_suite.js`: Esegue la suite di test funzionali.
- `node scratch/security_stress_test.js`: Esegue i test di sicurezza e robustezza API.

---

## Contribuire

1. Esegui il fork del progetto.
2. Crea un branch per la tua funzionalità (`git checkout -b feature/nuova-funzionalita`).
3. Effettua i commit delle tue modifiche (`git commit -m 'Aggiunta nuova funzionalità'`).
4. Esegui il push del branch (`git push origin feature/nuova-funzionalita`).
5. Apri una Pull Request descrivendo accuratamente le modifiche apportate.

---

## Licenza

Questo progetto è distribuito sotto la Licenza Proprietaria Interna. Tutti i diritti riservati.
