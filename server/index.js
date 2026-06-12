const dotenv = require('dotenv');
// Configurazione variabili d'ambiente (deve essere caricata prima di ogni modulo interno)
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDb } = require('./src/db/migrations');
const { seedDb } = require('./src/db/seed');
const db = require('./src/db/database');
const { pianificaBackup } = require('./src/utils/backup');
const uploadsRoutes = require('./src/routes/uploads');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurazione Helmet per intestazioni di sicurezza (CSP disabilitato per stili locali del Single Page App)
app.use(helmet({
  contentSecurityPolicy: false
}));

// Configurazione CORS ristretta
const allowedOrigins = [
  'http://localhost:8090', // Frontend in Docker
  'http://localhost:5173', // Vite default development port
  'http://localhost:3000', // React default development port
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const matchesRender = origin.endsWith('.onrender.com');
    const matchesFrontendUrl = process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL;

    if (
      allowedOrigins.includes(origin) || 
      process.env.NODE_ENV === 'development' ||
      matchesRender ||
      matchesFrontendUrl
    ) {
      return callback(null, true);
    }
    return callback(new Error('CORS non consentito per questa origine'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Total-Pages'],
  credentials: true
}));


// Configurazione cartella di upload statico per loghi e immagini
const dbPath = process.env.DB_PATH 
  ? path.resolve(process.env.DB_PATH) 
  : path.resolve(__dirname, 'src/db/pizzeria_db.json');
const dataDir = path.dirname(dbPath);
const uploadsDir = path.join(dataDir, 'uploads');

app.use('/api/uploads', express.static(uploadsDir));
app.use('/api/uploads', uploadsRoutes);

// Protezione DoS: Limitazione della dimensione del payload a 100kb per tutte le altre rotte
app.use(express.json({ limit: '100kb' }));

// Importa Rotte
const authRoutes = require('./src/routes/auth');
const categorieRoutes = require('./src/routes/categorie');
const prodottiRoutes = require('./src/routes/prodotti');
const ingredientiRoutes = require('./src/routes/ingredienti');
const clientiRoutes = require('./src/routes/clienti');
const ordiniRoutes = require('./src/routes/ordini');
const couponRoutes = require('./src/routes/coupon');
const reportRoutes = require('./src/routes/report');
const utentiRoutes = require('./src/routes/utenti');
const logsRoutes = require('./src/routes/logs');
const impostazioniRoutes = require('./src/routes/impostazioni');

// Registra Rotte API
app.use('/api/auth', authRoutes);
app.use('/api/categorie', categorieRoutes);
app.use('/api/prodotti', prodottiRoutes);
app.use('/api/ingredienti', ingredientiRoutes);
app.use('/api/clienti', clientiRoutes);
app.use('/api/ordini', ordiniRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/utenti', utentiRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/impostazioni', impostazioniRoutes);

// Rotta di test salute
app.get('/api/health', async (req, res) => {
  try {
    const utenti = await db.getAll('utenti');
    const databaseConnesso = Array.isArray(utenti);
    res.json({ 
      stato: 'ok', 
      database: databaseConnesso ? 'connesso' : 'errore',
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    res.status(500).json({ stato: 'errore', database: 'disconnesso' });
  }
});

// Middleware gestione errori globale
app.use(async (err, req, res, next) => {
  console.error('Errore non gestito:', err.stack);
  try {
    await db.insert('logs', {
      messaggio: err.message || 'Errore non gestito',
      stack: err.stack,
      metodo: req.method,
      url: req.originalUrl,
      creato_il: new Date().toISOString()
    });
  } catch (dbErr) {
    console.error('Impossibile salvare il log degli errori:', dbErr);
  }
  res.status(500).json({ errore: 'Si è verificato un errore interno del server.' });
});

// Funzione asincrona di avvio per garantire che l'inizializzazione del db e il seed siano completati prima di accettare richieste
async function start() {
  try {
    // Inizializza Database
    await initDb();

    // Avvia il seeding automatico se il database è vuoto (attendendo il completamento)
    const utenti = await db.getAll('utenti');
    if (utenti.length === 0) {
      await seedDb();
    }
    console.log('[Startup] Inizializzazione database e seed completati con successo.');

    // Avvia pianificazione backup automatici
    pianificaBackup();

    // Avvia il server
    app.listen(PORT, () => {
      console.log(`Server Express avviato sulla porta ${PORT}`);
    });
  } catch (err) {
    console.error('[Startup] Errore critico durante l\'avvio del server:', err);
    process.exit(1);
  }
}

start();
