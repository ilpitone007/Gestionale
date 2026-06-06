const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// Ottieni gli ultimi 100 log di sistema
router.get('/', authMiddleware, permettiRuoli('titolare', 'responsabile'), (req, res) => {
  try {
    const allLogs = db.getAll('logs') || [];
    // Restituiamo i log ordinati dal più recente, max 100
    const recentLogs = [...allLogs].sort((a, b) => new Date(b.creato_il) - new Date(a.creato_il)).slice(0, 100);
    res.json(recentLogs);
  } catch (error) {
    console.error('Errore durante il recupero dei log:', error);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
});

// Pulisci tutti i log
router.delete('/', authMiddleware, permettiRuoli('titolare', 'responsabile'), (req, res) => {
  try {
    db.clear('logs');
    res.json({ messaggio: 'Log di sistema cancellati con successo' });
  } catch (error) {
    res.status(500).json({ errore: 'Errore durante la pulizia dei log' });
  }
});

// POST /api/logs - Aggiungi un log dal client
router.post('/', (req, res) => {
  const { messaggio, stack, tipo, url, metodo } = req.body;
  try {
    const nuovoLog = db.insert('logs', {
      messaggio: `[Client ${tipo || 'ERRORE'}] ${messaggio}`,
      stack: stack || null,
      metodo: metodo || null,
      url: url || null,
      creato_il: new Date().toISOString()
    });
    res.status(201).json(nuovoLog);
  } catch (error) {
    console.error('Errore durante la scrittura del log:', error);
    res.status(500).json({ errore: 'Errore interno' });
  }
});

module.exports = router;
