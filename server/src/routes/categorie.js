const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/categorie - Ottieni tutte le categorie
router.get('/', authMiddleware, async (req, res) => {
  try {
    const categorie = await db.getAll('categorie');
    // Ordina per ordine_visualizzazione
    const categorieOrdinate = [...categorie].sort((a, b) => a.ordine_visualizzazione - b.ordine_visualizzazione);
    res.json(categorieOrdinate);
  } catch (err) {
    console.error('Errore lettura categorie:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// POST /api/categorie - Crea categoria (Solo Titolare)
router.post('/', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { nome, categoria_padre_id, ordine_visualizzazione } = req.body;

  if (!nome) {
    return res.status(400).json({ errore: 'Il nome della categoria è obbligatorio.' });
  }

  try {
    // Se viene fornito categoria_padre_id, verifica che esista
    if (categoria_padre_id) {
      const padre = await db.getById('categorie', categoria_padre_id);
      if (!padre) {
        return res.status(400).json({ errore: 'La categoria padre specificata non esiste.' });
      }
    }

    const nuovaCategoria = await db.insert('categorie', {
      nome,
      categoria_padre_id: categoria_padre_id ? Number(categoria_padre_id) : null,
      ordine_visualizzazione: ordine_visualizzazione ? Number(ordine_visualizzazione) : 0,
      attiva: 1
    });

    res.status(201).json(nuovaCategoria);
  } catch (err) {
    console.error('Errore creazione categoria:', err);
    res.status(500).json({ errore: 'Errore interno durante la creazione della categoria.' });
  }
});

// PUT /api/categorie/:id - Modifica categoria (Solo Titolare)
router.put('/:id', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { id } = req.params;
  const { nome, categoria_padre_id, ordine_visualizzazione, attiva } = req.body;

  try {
    const categoria = await db.getById('categorie', id);
    if (!categoria) {
      return res.status(404).json({ errore: 'Categoria non trovata.' });
    }

    // Previene riferimenti circolari ricorsivi (es. A -> B -> C -> A)
    if (categoria_padre_id) {
      const rilevaCiclo = async (startPadreId, currentId) => {
        let nextId = startPadreId;
        const visitati = new Set();
        while (nextId) {
          if (Number(nextId) === Number(currentId)) return true;
          if (visitati.has(nextId)) return true; // Previene cicli già esistenti
          visitati.add(nextId);
          const cat = await db.getById('categorie', nextId);
          nextId = cat ? cat.categoria_padre_id : null;
        }
        return false;
      };

      const hasCiclo = await rilevaCiclo(categoria_padre_id, id);
      if (Number(categoria_padre_id) === Number(id) || hasCiclo) {
        return res.status(400).json({ errore: 'Riferimento circolare rilevato. La categoria padre specificata creerebbe un ciclo infinito.' });
      }
    }

    const datiAggiornati = {};
    if (nome !== undefined) datiAggiornati.nome = nome;
    if (categoria_padre_id !== undefined) datiAggiornati.categoria_padre_id = categoria_padre_id ? Number(categoria_padre_id) : null;
    if (ordine_visualizzazione !== undefined) datiAggiornati.ordine_visualizzazione = Number(ordine_visualizzazione);
    if (attiva !== undefined) datiAggiornati.attiva = Number(attiva);

    const categoriaAggiornata = await db.update('categorie', id, datiAggiornati);
    res.json(categoriaAggiornata);
  } catch (err) {
    console.error('Errore aggiornamento categoria:', err);
    res.status(500).json({ errore: 'Errore durante la modifica della categoria.' });
  }
});

// DELETE /api/categorie/:id - Rimuovi categoria (Solo Titolare)
router.delete('/:id', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { id } = req.params;

  try {
    const categoria = await db.getById('categorie', id);
    if (!categoria) {
      return res.status(404).json({ errore: 'Categoria non trovata.' });
    }

    // Verifica se esistono prodotti attivi associati a questa categoria
    const prodotti = await db.getAll('prodotti');
    const prodottiAttivi = prodotti.filter(p => p.categoria_id === Number(id) && p.attivo !== 0);
    if (prodottiAttivi.length > 0) {
      return res.status(400).json({ errore: 'Impossibile eliminare questa categoria perché contiene dei prodotti attivi. Sposta o elimina prima i prodotti.' });
    }

    // Aggiorna le sotto-categorie impostando categoria_padre_id a null
    const sottoCategorie = await db.find('categorie', c => c.categoria_padre_id === Number(id));
    for (const sc of sottoCategorie) {
      await db.update('categorie', sc.id, { categoria_padre_id: null });
    }

    // Elimina la categoria
    await db.delete('categorie', id);

    res.json({ messaggio: 'Categoria eliminata con successo.' });
  } catch (err) {
    console.error('Errore eliminazione categoria:', err);
    res.status(500).json({ errore: 'Errore durante l\'eliminazione della categoria.' });
  }
});

module.exports = router;
