const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/ingredienti - Ottieni tutti gli ingredienti
router.get('/', authMiddleware, (req, res) => {
  const ingredienti = db.getAll('ingredienti');
  // Ordina in ordine alfabetico
  const ingredientiOrdinati = [...ingredienti].sort((a, b) => a.nome.localeCompare(b.nome));
  res.json(ingredientiOrdinati);
});

// POST /api/ingredienti - Crea ingrediente (Solo Titolare)
router.post('/', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { nome, prezzo_aggiunta, prezzo_rimozione, tipo, disponibile } = req.body;

  if (!nome || prezzo_aggiunta === undefined) {
    return res.status(400).json({ errore: 'Il nome e il prezzo di aggiunta sono obbligatori.' });
  }

  // Verifica se l'ingrediente esiste già
  const ingredienteEsistente = db.findOne('ingredienti', i => i.nome.toLowerCase() === nome.toLowerCase());
  if (ingredienteEsistente) {
    return res.status(400).json({ errore: 'Questo ingrediente esiste già.' });
  }

  const nuovoIngrediente = db.insert('ingredienti', {
    nome,
    prezzo_aggiunta: Number(prezzo_aggiunta),
    prezzo_rimozione: prezzo_rimozione !== undefined ? Number(prezzo_rimozione) : 0.0,
    tipo: tipo || 'extra',
    disponibile: disponibile !== undefined ? Number(disponibile) : 1
  });

  res.status(201).json(nuovoIngrediente);
});

// PUT /api/ingredienti/:id - Modifica ingrediente (Solo Titolare)
router.put('/:id', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { id } = req.params;
  const { nome, prezzo_aggiunta, prezzo_rimozione, tipo, disponibile } = req.body;

  const ingrediente = db.getById('ingredienti', id);
  if (!ingrediente) {
    return res.status(404).json({ errore: 'Ingrediente non trovato.' });
  }

  const datiAggiornati = {};
  if (nome !== undefined) datiAggiornati.nome = nome;
  if (prezzo_aggiunta !== undefined) datiAggiornati.prezzo_aggiunta = Number(prezzo_aggiunta);
  if (prezzo_rimozione !== undefined) datiAggiornati.prezzo_rimozione = Number(prezzo_rimozione);
  if (tipo !== undefined) datiAggiornati.tipo = tipo;
  if (disponibile !== undefined) datiAggiornati.disponibile = Number(disponibile);

  const ingredienteAggiornato = db.update('ingredienti', id, datiAggiornati);
  res.json(ingredienteAggiornato);
});

// DELETE /api/ingredienti/:id - Rimuovi ingrediente (Solo Titolare)
router.delete('/:id', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { id } = req.params;

  const ingrediente = db.getById('ingredienti', id);
  if (!ingrediente) {
    return res.status(404).json({ errore: 'Ingrediente non trovato.' });
  }

  // Rimuovi associazioni ricette prodotti
  db.data.prodotto_ingredienti = db.data.prodotto_ingredienti.filter(pi => pi.ingrediente_id !== Number(id));

  // Elimina l'ingrediente
  db.delete('ingredienti', id);

  res.json({ messaggio: 'Ingrediente eliminato con successo.' });
});

module.exports = router;
