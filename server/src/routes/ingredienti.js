const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/ingredienti - Ottieni tutti gli ingredienti
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ingredienti = await db.getAll('ingredienti');
    // Ordina in ordine alfabetico
    const ingredientiOrdinati = [...ingredienti].sort((a, b) => a.nome.localeCompare(b.nome));
    res.json(ingredientiOrdinati);
  } catch (err) {
    console.error('Errore lettura ingredienti:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// POST /api/ingredienti - Crea ingrediente (Solo Titolare)
router.post('/', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { nome, prezzo_aggiunta, prezzo_rimozione, tipo, disponibile } = req.body;

  if (!nome || prezzo_aggiunta === undefined) {
    return res.status(400).json({ errore: 'Il nome e il prezzo di aggiunta sono obbligatori.' });
  }

  if (Number(prezzo_aggiunta) < 0 || (prezzo_rimozione !== undefined && Number(prezzo_rimozione) < 0)) {
    return res.status(400).json({ errore: 'I prezzi di aggiunta e rimozione dell\'ingrediente non possono essere negativi.' });
  }

  try {
    // Verifica se l'ingrediente esiste già
    const ingredienteEsistente = await db.findOne('ingredienti', i => i.nome.toLowerCase() === nome.toLowerCase());
    if (ingredienteEsistente) {
      return res.status(400).json({ errore: 'Questo ingrediente esiste già.' });
    }

    const nuovoIngrediente = await db.insert('ingredienti', {
      nome,
      prezzo_aggiunta: Number(prezzo_aggiunta),
      prezzo_rimozione: prezzo_rimozione !== undefined ? Number(prezzo_rimozione) : 0.0,
      tipo: tipo || 'extra',
      disponibile: disponibile !== undefined ? Number(disponibile) : 1
    });

    res.status(201).json(nuovoIngrediente);
  } catch (err) {
    console.error('Errore creazione ingrediente:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// PUT /api/ingredienti/:id - Modifica ingrediente (Solo Titolare)
router.put('/:id', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { id } = req.params;
  const { nome, prezzo_aggiunta, prezzo_rimozione, tipo, disponibile } = req.body;

  try {
    const ingrediente = await db.getById('ingredienti', id);
    if (!ingrediente) {
      return res.status(404).json({ errore: 'Ingrediente non trovato.' });
    }

    const datiAggiornati = {};
    if (nome !== undefined) datiAggiornati.nome = nome;
    if (prezzo_aggiunta !== undefined) {
      if (Number(prezzo_aggiunta) < 0) return res.status(400).json({ errore: 'Il prezzo di aggiunta non può essere negativo.' });
      datiAggiornati.prezzo_aggiunta = Number(prezzo_aggiunta);
    }
    if (prezzo_rimozione !== undefined) {
      if (Number(prezzo_rimozione) < 0) return res.status(400).json({ errore: 'Il prezzo di rimozione non può essere negativo.' });
      datiAggiornati.prezzo_rimozione = Number(prezzo_rimozione);
    }
    if (tipo !== undefined) datiAggiornati.tipo = tipo;
    if (disponibile !== undefined) datiAggiornati.disponibile = Number(disponibile);

    const ingredienteAggiornato = await db.update('ingredienti', id, datiAggiornati);
    res.json(ingredienteAggiornato);
  } catch (err) {
    console.error('Errore aggiornamento ingrediente:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// DELETE /api/ingredienti/:id - Rimuovi ingrediente (Solo Titolare)
router.delete('/:id', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { id } = req.params;

  try {
    const ingrediente = await db.getById('ingredienti', id);
    if (!ingrediente) {
      return res.status(404).json({ errore: 'Ingrediente non trovato.' });
    }

    // Rimuovi associazioni ricette prodotti
    await db.deleteWhere('prodotto_ingredienti', 'ingrediente_id', Number(id));

    // Elimina l'ingrediente
    await db.delete('ingredienti', id);

    res.json({ messaggio: 'Ingrediente eliminato con successo.' });
  } catch (err) {
    console.error('Errore eliminazione ingrediente:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

module.exports = router;
