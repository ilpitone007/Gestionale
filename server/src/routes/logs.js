const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// Ottieni gli ultimi 100 log di sistema
router.get('/', authMiddleware, permettiRuoli('titolare', 'responsabile'), async (req, res) => {
  try {
    const allLogs = await db.getAll('logs') || [];
    // Restituiamo i log ordinati dal più recente, max 100
    const recentLogs = [...allLogs].sort((a, b) => new Date(b.creato_il) - new Date(a.creato_il)).slice(0, 100);
    res.json(recentLogs);
  } catch (error) {
    console.error('Errore durante il recupero dei log:', error);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
});

// Pulisci tutti i log
router.delete('/', authMiddleware, permettiRuoli('titolare', 'responsabile'), async (req, res) => {
  try {
    await db.clear('logs');
    res.json({ messaggio: 'Log di sistema cancellati con successo' });
  } catch (error) {
    res.status(500).json({ errore: 'Errore durante la pulizia dei log' });
  }
});

const { creaRateLimiter } = require('../middleware/rateLimiter');

const logPostLimiter = creaRateLimiter({
  finestraMs: 60 * 1000, // 1 minuto
  limiteMax: 5,
  messaggio: 'Spam di log rilevato da questo IP. Invio log sospeso temporaneamente.'
});

// POST /api/logs - Aggiungi un log dal client (richiede autenticazione)
router.post('/', authMiddleware, logPostLimiter, async (req, res) => {
  const { messaggio, stack, tipo, url, metodo } = req.body;

  if (!messaggio || typeof messaggio !== 'string' || messaggio.trim().length === 0) {
    return res.status(400).json({ errore: 'Il messaggio di log è obbligatorio e deve essere una stringa.' });
  }
  if (messaggio.length > 1000) {
    return res.status(400).json({ errore: 'Il messaggio di log non può superare i 1000 caratteri.' });
  }
  if (stack && (typeof stack !== 'string' || stack.length > 5000)) {
    return res.status(400).json({ errore: 'Lo stack trace non è valido o supera i 5000 caratteri.' });
  }
  if (tipo && (typeof tipo !== 'string' || tipo.length > 50)) {
    return res.status(400).json({ errore: 'Il tipo di log non è valido.' });
  }
  if (url && (typeof url !== 'string' || url.length > 500)) {
    return res.status(400).json({ errore: 'L\'URL non è valido.' });
  }
  if (metodo && (typeof metodo !== 'string' || metodo.length > 10)) {
    return res.status(400).json({ errore: 'Il metodo HTTP non è valido.' });
  }

  try {
    const nuovoLog = await db.insert('logs', {
      messaggio: `[Client ${tipo || 'ERRORE'}] ${messaggio.trim()}`,
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
