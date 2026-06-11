const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/prodotti - Ottieni tutti i prodotti (con ingredienti per pizze)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const allProdotti = await db.getAll('prodotti');
    const prodotti = allProdotti.filter(p => p.attivo !== 0);
    const prodottoIngredienti = await db.getAll('prodotto_ingredienti');
    const ingredienti = await db.getAll('ingredienti');

    // Arricchisce ogni prodotto con i suoi ingredienti predefiniti
    const prodottiArricchiti = prodotti.map(p => {
      // Trova gli id degli ingredienti associati a questo prodotto
      const associazioni = prodottoIngredienti.filter(pi => pi.prodotto_id === p.id && pi.predefinito === 1);
      
      // Trova gli oggetti ingrediente completi
      const ingrPredefiniti = associazioni.map(assoc => {
        return ingredienti.find(i => i.id === assoc.ingrediente_id);
      }).filter(Boolean);

      return {
        ...p,
        ingredienti_predefiniti: ingrPredefiniti
      };
    });

    // Ordina per ordine visualizzazione
    const prodottiOrdinati = prodottiArricchiti.sort((a, b) => a.ordine_visualizzazione - b.ordine_visualizzazione);
    res.json(prodottiOrdinati);
  } catch (err) {
    console.error('Errore lettura prodotti:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// POST /api/prodotti - Crea prodotto (Solo Titolare)
router.post('/', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { categoria_id, nome, descrizione, prezzo, costo, personalizzabile, disponibile, immagine_url, ordine_visualizzazione, ingredienti_ids } = req.body;

  if (!categoria_id || !nome || prezzo === undefined || costo === undefined) {
    return res.status(400).json({ errore: 'Categoria, nome, prezzo e costo sono campi obbligatori.' });
  }

  if (Number(prezzo) < 0 || Number(costo) < 0) {
    return res.status(400).json({ errore: 'Il prezzo e il costo del prodotto non possono essere negativi.' });
  }

  try {
    // Verifica che la categoria esista
    const categoria = await db.getById('categorie', categoria_id);
    if (!categoria) {
      return res.status(400).json({ errore: 'La categoria specificata non esiste.' });
    }

    // Inserisce il prodotto
    const nuovoProdotto = await db.insert('prodotti', {
      categoria_id: Number(categoria_id),
      nome,
      descrizione: descrizione || '',
      prezzo: Number(prezzo),
      costo: Number(costo),
      personalizzabile: personalizzabile ? 1 : 0,
      disponibile: disponibile !== undefined ? Number(disponibile) : 1,
      immagine_url: immagine_url || null,
      ordine_visualizzazione: ordine_visualizzazione ? Number(ordine_visualizzazione) : 0,
      attivo: 1
    });

    // Se ci sono ingredienti associati e il prodotto è personalizzabile, inserisci nella ricetta base
    if (nuovoProdotto.personalizzabile === 1 && Array.isArray(ingredienti_ids)) {
      for (const ingId of ingredienti_ids) {
        const ingrediente = await db.getById('ingredienti', ingId);
        if (ingrediente) {
          await db.insertRelation('prodotto_ingredienti', {
            prodotto_id: nuovoProdotto.id,
            ingrediente_id: Number(ingId),
            predefinito: 1
          });
        }
      }
    }

    // Restituisce il prodotto con i suoi ingredienti
    const allProdottoIngredienti = await db.getAll('prodotto_ingredienti');
    const allIngredienti = await db.getAll('ingredienti');
    const ingredientiInseriti = allProdottoIngredienti
      .filter(pi => pi.prodotto_id === nuovoProdotto.id)
      .map(pi => allIngredienti.find(i => i.id === pi.ingrediente_id))
      .filter(Boolean);

    res.status(201).json({
      ...nuovoProdotto,
      ingredienti_predefiniti: ingredientiInseriti
    });
  } catch (err) {
    console.error('Errore creazione prodotto:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// PUT /api/prodotti/:id - Modifica prodotto (Solo Titolare)
router.put('/:id', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { id } = req.params;
  const { categoria_id, nome, descrizione, prezzo, costo, personalizzabile, disponibile, immagine_url, ordine_visualizzazione, ingredienti_ids } = req.body;

  try {
    const prodotto = await db.getById('prodotti', id);
    if (!prodotto) {
      return res.status(404).json({ errore: 'Prodotto non trovato.' });
    }

    const datiAggiornati = {};
    if (categoria_id !== undefined) {
      const categoria = await db.getById('categorie', categoria_id);
      if (!categoria) return res.status(400).json({ errore: 'La categoria specificata non esiste.' });
      datiAggiornati.categoria_id = Number(categoria_id);
    }
    if (nome !== undefined) datiAggiornati.nome = nome;
    if (descrizione !== undefined) datiAggiornati.descrizione = descrizione;
    if (prezzo !== undefined) {
      if (Number(prezzo) < 0) return res.status(400).json({ errore: 'Il prezzo del prodotto non può essere negativo.' });
      datiAggiornati.prezzo = Number(prezzo);
    }
    if (costo !== undefined) {
      if (Number(costo) < 0) return res.status(400).json({ errore: 'Il costo del prodotto non può essere negativo.' });
      datiAggiornati.costo = Number(costo);
    }
    if (personalizzabile !== undefined) datiAggiornati.personalizzabile = Number(personalizzabile);
    if (disponibile !== undefined) datiAggiornati.disponibile = Number(disponibile);
    if (immagine_url !== undefined) datiAggiornati.immagine_url = immagine_url;
    if (ordine_visualizzazione !== undefined) datiAggiornati.ordine_visualizzazione = Number(ordine_visualizzazione);

    // Aggiorna il prodotto
    const prodottoAggiornato = await db.update('prodotti', id, datiAggiornati);

    // Se viene fornita la lista di ingredienti, aggiorna la ricetta base
    if (Array.isArray(ingredienti_ids)) {
      // Rimuove tutte le vecchie associazioni
      await db.deleteWhere('prodotto_ingredienti', 'prodotto_id', Number(id));
      
      // Aggiunge le nuove associazioni
      for (const ingId of ingredienti_ids) {
        const ingrediente = await db.getById('ingredienti', ingId);
        if (ingrediente) {
          await db.insertRelation('prodotto_ingredienti', {
            prodotto_id: Number(id),
            ingrediente_id: Number(ingId),
            predefinito: 1
          });
        }
      }
    }

    // Restituisce il prodotto con i suoi ingredienti aggiornati
    const allProdottoIngredienti = await db.getAll('prodotto_ingredienti');
    const allIngredienti = await db.getAll('ingredienti');
    const ingredientiAggiornati = allProdottoIngredienti
      .filter(pi => pi.prodotto_id === Number(id))
      .map(pi => allIngredienti.find(i => i.id === pi.ingrediente_id))
      .filter(Boolean);

    res.json({
      ...prodottoAggiornato,
      ingredienti_predefiniti: ingredientiAggiornati
    });
  } catch (err) {
    console.error('Errore aggiornamento prodotto:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// DELETE /api/prodotti/:id - Rimuovi prodotto (Solo Titolare)
router.delete('/:id', authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { id } = req.params;

  try {
    const prodotto = await db.getById('prodotti', id);
    if (!prodotto) {
      return res.status(404).json({ errore: 'Prodotto non trovato.' });
    }

    // Soft-delete per preservare la consistenza referenziale dello storico ordini
    await db.update('prodotti', id, { attivo: 0 });

    res.json({ messaggio: 'Prodotto eliminato con successo.' });
  } catch (err) {
    console.error('Errore eliminazione prodotto:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

module.exports = router;
