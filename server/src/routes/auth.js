const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const jwtSecret = require('../utils/jwtSecret');

const { creaRateLimiter } = require('../middleware/rateLimiter');

const loginLimiter = creaRateLimiter({
  finestraMs: 5 * 60 * 1000, // 5 minuti
  limiteMax: 10,
  messaggio: 'Troppi tentativi di login da questo IP. Riprova tra 5 minuti.'
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ errore: 'Username e password sono richiesti.' });
  }

  // Previene crash (TypeError) se vengono passati tipi diversi da stringa (es. array o oggetti)
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ errore: 'Username e password devono essere stringhe valide.' });
  }

  try {
    // Trova l'utente nel database JSON
    const utente = await db.findOne('utenti', u => u.username === username.toLowerCase());

    if (!utente || utente.attivo === 0) {
      return res.status(401).json({ errore: 'Credenziali non valide o utente disattivato.' });
    }

    // Confronta la password
    const passwordValida = await bcrypt.compare(password, utente.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ errore: 'Credenziali non valide.' });
    }

    // Genera il token JWT
    const token = jwt.sign(
      { id: utente.id, username: utente.username, ruolo: utente.ruolo },
      jwtSecret,
      { expiresIn: '12h' } // Il token scade dopo 12 ore (turno di lavoro)
    );

    res.json({
      token,
      utente: {
        id: utente.id,
        username: utente.username,
        nome: utente.nome,
        cognome: utente.cognome,
        ruolo: utente.ruolo
      }
    });
  } catch (err) {
    console.error('Errore nel login:', err);
    res.status(500).json({ errore: 'Si è verificato un errore durante l\'autenticazione.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const utente = await db.getById('utenti', req.utente.id);
  if (!utente) {
    return res.status(404).json({ errore: 'Utente non trovato.' });
  }

  res.json({
    id: utente.id,
    username: utente.username,
    nome: utente.nome,
    cognome: utente.cognome,
    ruolo: utente.ruolo
  });
});

module.exports = router;
