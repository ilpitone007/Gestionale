const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/impostazioni - Leggi impostazioni (tutti gli utenti autenticati)
router.get('/', authMiddleware, (req, res) => {
  const impostazioni = db.data.impostazioni || {};
  res.json(impostazioni);
});

// PUT /api/impostazioni - Aggiorna impostazioni (Solo Titolare)
router.put('/', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  try {
    const nuoveImpostazioni = {
      ...(db.data.impostazioni || {}),
      ...req.body
    };
    await db.saveImpostazioni(nuoveImpostazioni);
    res.json(db.data.impostazioni);
  } catch (err) {
    console.error('Errore salvataggio impostazioni:', err);
    res.status(500).json({ errore: 'Errore durante il salvataggio delle impostazioni.' });
  }
});

module.exports = router;
