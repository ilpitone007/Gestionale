const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/prodotti - Ottieni tutti i prodotti (con ingredienti per pizze)
router.get('/', authMiddleware, (req, res) => {
  const prodotti = db.getAll('prodotti');
  const prodottoIngredienti = db.getAll('prodotto_ingredienti');
  const ingredienti = db.getAll('ingredienti');

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
});

// POST /api/prodotti - Crea prodotto (Solo Titolare)
router.post('/', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { categoria_id, nome, descrizione, prezzo, costo, personalizzabile, disponibile, immagine_url, ordine_visualizzazione, ingredienti_ids } = req.body;

  if (!categoria_id || !nome || prezzo === undefined || costo === undefined) {
    return res.status(400).json({ errore: 'Categoria, nome, prezzo e costo sono campi obbligatori.' });
  }

  // Verifica che la categoria esista
  const categoria = db.getById('categorie', categoria_id);
  if (!categoria) {
    return res.status(400).json({ errore: 'La categoria specificata non esiste.' });
  }

  // Inserisce il prodotto
  const nuovoProdotto = db.insert('prodotti', {
    categoria_id: Number(categoria_id),
    nome,
    descrizione: descrizione || '',
    prezzo: Number(prezzo),
    costo: Number(costo),
    personalizzabile: personalizzabile ? 1 : 0,
    disponibile: disponibile !== undefined ? Number(disponibile) : 1,
    immagine_url: immagine_url || null,
    ordine_visualizzazione: ordine_visualizzazione ? Number(ordine_visualizzazione) : 0
  });

  // Se ci sono ingredienti associati e il prodotto è personalizzabile, inserisci nella ricetta base
  if (nuovoProdotto.personalizzabile === 1 && Array.isArray(ingredienti_ids)) {
    ingredienti_ids.forEach(ingId => {
      const ingrediente = db.getById('ingredienti', ingId);
      if (ingrediente) {
        db.insertRelation('prodotto_ingredienti', {
          prodotto_id: nuovoProdotto.id,
          ingrediente_id: Number(ingId),
          predefinito: 1
        });
      }
    });
  }

  // Restituisce il prodotto con i suoi ingredienti
  const ingredientiInseriti = db.getAll('prodotto_ingredienti')
    .filter(pi => pi.prodotto_id === nuovoProdotto.id)
    .map(pi => db.getById('ingredienti', pi.ingrediente_id))
    .filter(Boolean);

  res.status(201).json({
    ...nuovoProdotto,
    ingredienti_predefiniti: ingredientiInseriti
  });
});

// PUT /api/prodotti/:id - Modifica prodotto (Solo Titolare)
router.put('/:id', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { id } = req.params;
  const { categoria_id, nome, descrizione, prezzo, costo, personalizzabile, disponibile, immagine_url, ordine_visualizzazione, ingredienti_ids } = req.body;

  const prodotto = db.getById('prodotti', id);
  if (!prodotto) {
    return res.status(404).json({ errore: 'Prodotto non trovato.' });
  }

  const datiAggiornati = {};
  if (categoria_id !== undefined) {
    const categoria = db.getById('categorie', categoria_id);
    if (!categoria) return res.status(400).json({ errore: 'La categoria specificata non esiste.' });
    datiAggiornati.categoria_id = Number(categoria_id);
  }
  if (nome !== undefined) datiAggiornati.nome = nome;
  if (descrizione !== undefined) datiAggiornati.descrizione = descrizione;
  if (prezzo !== undefined) datiAggiornati.prezzo = Number(prezzo);
  if (costo !== undefined) datiAggiornati.costo = Number(costo);
  if (personalizzabile !== undefined) datiAggiornati.personalizzabile = Number(personalizzabile);
  if (disponibile !== undefined) datiAggiornati.disponibile = Number(disponibile);
  if (immagine_url !== undefined) datiAggiornati.immagine_url = immagine_url;
  if (ordine_visualizzazione !== undefined) datiAggiornati.ordine_visualizzazione = Number(ordine_visualizzazione);

  // Aggiorna il prodotto
  const prodottoAggiornato = db.update('prodotti', id, datiAggiornati);

  // Se viene fornita la lista di ingredienti, aggiorna la ricetta base
  if (Array.isArray(ingredienti_ids)) {
    // Rimuove tutte le vecchie associazioni
    db.data.prodotto_ingredienti = db.data.prodotto_ingredienti.filter(pi => pi.prodotto_id !== Number(id));
    
    // Aggiunge le nuove associazioni
    ingredienti_ids.forEach(ingId => {
      const ingrediente = db.getById('ingredienti', ingId);
      if (ingrediente) {
        db.insertRelation('prodotto_ingredienti', {
          prodotto_id: Number(id),
          ingrediente_id: Number(ingId),
          predefinito: 1
        });
      }
    });
  }

  // Restituisce il prodotto con i suoi ingredienti aggiornati
  const ingredientiAggiornati = db.getAll('prodotto_ingredienti')
    .filter(pi => pi.prodotto_id === Number(id))
    .map(pi => db.getById('ingredienti', pi.ingrediente_id))
    .filter(Boolean);

  res.json({
    ...prodottoAggiornato,
    ingredienti_predefiniti: ingredientiAggiornati
  });
});

// DELETE /api/prodotti/:id - Rimuovi prodotto (Solo Titolare)
router.delete('/:id', authMiddleware, permettiRuoli('titolare'), (req, res) => {
  const { id } = req.params;

  const prodotto = db.getById('prodotti', id);
  if (!prodotto) {
    return res.status(404).json({ errore: 'Prodotto non trovato.' });
  }

  // Rimuove le associazioni ingredienti
  db.data.prodotto_ingredienti = db.data.prodotto_ingredienti.filter(pi => pi.prodotto_id !== Number(id));

  // Elimina il prodotto
  db.delete('prodotti', id);

  res.json({ messaggio: 'Prodotto eliminato con successo.' });
});

module.exports = router;
