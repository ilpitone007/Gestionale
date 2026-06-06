const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/categorie - Ottieni tutte le categorie (anche per non autenticati, ma per il terminale al banco serve auth)
router.get('/', authMiddleware, (req, res) => {
  const categorie = db.getAll('categorie');
  
  // Ordina per ordine_visualizzazione
  const categorieOrdinate = [...categorie].sort((a, b) => a.ordine_visualizzazione - b.ordine_visualizzazione);
  res.json(categorieOrdinate);
});

// POST /api/categorie - Crea categoria (Solo Titolare)
router.post('/', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { nome, categoria_padre_id, ordine_visualizzazione } = req.body;

  if (!nome) {
    return res.status(400).json({ errore: 'Il nome della categoria è obbligatorio.' });
  }

  // Se viene fornito categoria_padre_id, verifica che esista
  if (categoria_padre_id) {
    const padre = db.getById('categorie', categoria_padre_id);
    if (!padre) {
      return res.status(400).json({ errore: 'La categoria padre specificata non esiste.' });
    }
  }

  const nuovaCategoria = db.insert('categorie', {
    nome,
    categoria_padre_id: categoria_padre_id ? Number(categoria_padre_id) : null,
    ordine_visualizzazione: ordine_visualizzazione ? Number(ordine_visualizzazione) : 0,
    attiva: 1
  });

  res.status(201).json(nuovaCategoria);
});

// PUT /api/categorie/:id - Modifica categoria (Solo Titolare)
router.put('/:id', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { id } = req.params;
  const { nome, categoria_padre_id, ordine_visualizzazione, attiva } = req.body;

  const categoria = db.getById('categorie', id);
  if (!categoria) {
    return res.status(404).json({ errore: 'Categoria non trovata.' });
  }

  // Previene l'assegnazione di se stessa come padre
  if (categoria_padre_id && Number(categoria_padre_id) === Number(id)) {
    return res.status(400).json({ errore: 'Una categoria non può essere padre di se stessa.' });
  }

  const datiAggiornati = {};
  if (nome !== undefined) datiAggiornati.nome = nome;
  if (categoria_padre_id !== undefined) datiAggiornati.categoria_padre_id = categoria_padre_id ? Number(categoria_padre_id) : null;
  if (ordine_visualizzazione !== undefined) datiAggiornati.ordine_visualizzazione = Number(ordine_visualizzazione);
  if (attiva !== undefined) datiAggiornati.attiva = Number(attiva);

  const categoriaAggiornata = db.update('categorie', id, datiAggiornati);
  res.json(categoriaAggiornata);
});

// DELETE /api/categorie/:id - Rimuovi categoria (Solo Titolare)
router.delete('/:id', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { id } = req.params;

  const categoria = db.getById('categorie', id);
  if (!categoria) {
    return res.status(404).json({ errore: 'Categoria non trovata.' });
  }

  // Aggiorna le sotto-categorie impostando categoria_padre_id a null
  const sottoCategorie = db.find('categorie', c => c.categoria_padre_id === Number(id));
  sottoCategorie.forEach(sc => {
    db.update('categorie', sc.id, { categoria_padre_id: null });
  });

  // Elimina la categoria
  db.delete('categorie', id);

  res.json({ messaggio: 'Categoria eliminata con successo.' });
});

module.exports = router;
