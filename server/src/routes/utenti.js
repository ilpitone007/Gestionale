const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// Tutte le rotte richiedono autenticazione e ruolo Titolare
router.use(authMiddleware);
router.use(permettiRuoli('titolare'));

// GET /api/utenti - Lista dipendenti
router.get('/', (req, res) => {
  const utenti = db.getAll('utenti').map(u => {
    const { password_hash, ...resto } = u;
    return resto;
  });
  res.json(utenti);
});

// POST /api/utenti - Aggiungi dipendente
router.post('/', async (req, res) => {
  const { username, password, nome, cognome, ruolo } = req.body;

  if (!username || !password || !nome || !cognome || !ruolo) {
    return res.status(400).json({ errore: 'Tutti i campi sono obbligatori.' });
  }

  try {
    // Verifica se l'username esiste già
    const usernameEsistente = db.findOne('utenti', u => u.username === username.toLowerCase());
    if (usernameEsistente) {
      return res.status(400).json({ errore: 'Questo username è già registrato.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const nuovoUtente = db.insert('utenti', {
      username: username.toLowerCase(),
      password_hash,
      nome,
      cognome,
      ruolo,
      attivo: 1,
      creato_il: new Date().toISOString()
    });

    const { password_hash: ph, ...resto } = nuovoUtente;
    res.status(201).json(resto);
  } catch (err) {
    console.error('Errore creazione utente:', err);
    res.status(500).json({ errore: 'Errore interno durante la creazione del dipendente.' });
  }
});

// PUT /api/utenti/:id - Modifica dipendente
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { password, nome, cognome, ruolo, attivo } = req.body;

  const utenteEsistente = db.getById('utenti', id);
  if (!utenteEsistente) {
    return res.status(404).json({ errore: 'Dipendente non trovato.' });
  }

  try {
    const datiAggiornati = {};
    if (nome !== undefined) datiAggiornati.nome = nome;
    if (cognome !== undefined) datiAggiornati.cognome = cognome;
    if (ruolo !== undefined) datiAggiornati.ruolo = ruolo;
    if (attivo !== undefined) datiAggiornati.attivo = Number(attivo);

    if (password) {
      const salt = await bcrypt.genSalt(10);
      datiAggiornati.password_hash = await bcrypt.hash(password, salt);
    }

    const utenteAggiornato = db.update('utenti', id, datiAggiornati);
    const { password_hash: ph, ...resto } = utenteAggiornato;
    res.json(resto);
  } catch (err) {
    console.error('Errore aggiornamento utente:', err);
    res.status(500).json({ errore: 'Errore durante la modifica del dipendente.' });
  }
});

// DELETE /api/utenti/:id - Elimina o disattiva dipendente
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.utente.id) {
    return res.status(400).json({ errore: 'Non puoi eliminare il tuo stesso account.' });
  }

  const utente = db.getById('utenti', id);
  if (!utente) {
    return res.status(404).json({ errore: 'Dipendente non trovato.' });
  }

  // Per sicurezza, se è l'ultimo titolare, impediamo di eliminarlo
  if (utente.ruolo === 'titolare') {
    const titolari = db.find('utenti', u => u.ruolo === 'titolare' && u.attivo === 1);
    if (titolari.length <= 1) {
      return res.status(400).json({ errore: 'Impossibile disattivare l\'unico titolare attivo.' });
    }
  }

  // Invece di cancellarlo definitivamente (il che romperebbe l'integrità referenziale degli ordini passati), impostiamo attivo = 0
  db.update('utenti', id, { attivo: 0 });
  res.json({ messaggio: 'Dipendente disattivato correttamente.' });
});

module.exports = router;
