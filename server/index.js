const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDb } = require('./src/db/migrations');
const { seedDb } = require('./src/db/seed');
const db = require('./src/db/database');

// Configurazione variabili d'ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // In produzione specificare l'origine esatta
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Inizializza Database
initDb();

// Avvia il seeding automatico se il database è vuoto
(async () => {
  const utenti = db.getAll('utenti');
  if (utenti.length === 0) {
    await seedDb();
  }
})();

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

// Rotta di test salute
app.get('/api/health', (req, res) => {
  res.json({ stato: 'ok', data: new Date().toISOString() });
});

// Middleware gestione errori globale
app.use((err, req, res, next) => {
  console.error('Errore non gestito:', err.stack);
  try {
    db.insert('logs', {
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

// Avvia il server
app.listen(PORT, () => {
  console.log(`Server Express avviato sulla porta ${PORT}`);
});
