const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ errore: 'Username e password sono richiesti.' });
  }

  try {
    // Trova l'utente nel database JSON
    const utente = db.findOne('utenti', u => u.username === username.toLowerCase());

    if (!utente || utente.attivo === 0) {
      return res.status(401).json({ errore: 'Credenziali non valide o utente disattivato.' });
    }

    // Confronta la password
    const passwordValida = await bcrypt.compare(password, utente.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ errore: 'Credenziali non valide.' });
    }

    // Genera il token JWT
    const secret = process.env.JWT_SECRET || 'pizzeria_super_secret_key_2026';
    const token = jwt.sign(
      { id: utente.id, username: utente.username, ruolo: utente.ruolo },
      secret,
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
router.get('/me', authMiddleware, (req, res) => {
  const utente = db.getById('utenti', req.utente.id);
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
