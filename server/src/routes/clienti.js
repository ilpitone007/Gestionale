const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/clienti - Lista clienti con ricerca (es. per telefono)
router.get('/', authMiddleware, (req, res) => {
  const { cerca } = req.query;
  const clienti = db.getAll('clienti');

  if (!cerca) {
    // Ritorna i clienti più recenti di default (ordinati per ID decrescente)
    const ordinati = [...clienti].sort((a, b) => b.id - a.id);
    return res.json(ordinati);
  }

  const query = cerca.toLowerCase();
  const risultati = clienti.filter(c => {
    return (
      c.nome.toLowerCase().includes(query) ||
      c.cognome.toLowerCase().includes(query) ||
      c.telefono.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  });

  res.json(risultati);
});

// GET /api/clienti/:id - Dettaglio cliente, storico punti e coupon attivi
router.get('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const cliente = db.getById('clienti', id);

  if (!cliente) {
    return res.status(404).json({ errore: 'Cliente non trovato.' });
  }

  // Recupera lo storico punti
  const storicoPunti = db.find('storico_punti', sp => sp.cliente_id === Number(id))
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  // Recupera i coupon assegnati e non ancora utilizzati
  const couponClienti = db.find('coupon_clienti', cc => cc.cliente_id === Number(id) && cc.utilizzato === 0);
  const couponDati = db.getAll('coupon');
  
  const couponAttivi = couponClienti.map(cc => {
    const cp = couponDati.find(c => c.id === cc.coupon_id);
    if (!cp || cp.attivo === 0) return null;
    
    // Controlla data validità
    const oggi = new Date().toISOString().split('T')[0];
    if (oggi < cp.valido_dal || oggi > cp.valido_al) return null;

    return {
      coupon_cliente_id: cc.id,
      codice: cp.codice,
      tipo: cp.tipo,
      valore: cp.valore,
      prodotto_gratis_id: cp.prodotto_gratis_id,
      valido_al: cp.valido_al
    };
  }).filter(Boolean);

  // Recupera gli ordini storici del cliente
  const ordini = db.find('ordini', o => o.cliente_id === Number(id))
    .sort((a, b) => new Date(b.creato_il) - new Date(a.creato_il));

  res.json({
    ...cliente,
    storico_punti: storicoPunti,
    coupon_attivi: couponAttivi,
    storico_ordini: ordini
  });
});

// POST /api/clienti - Crea cliente (Accessibile a tutti gli utenti loggati per ordini rapidi)
router.post('/', authMiddleware, (req, res) => {
  const { nome, cognome, telefono, email, note } = req.body;

  if (!nome || !cognome || !telefono) {
    return res.status(400).json({ errore: 'Nome, cognome e telefono sono obbligatori.' });
  }

  // Verifica se il numero di telefono è già registrato
  const telefonoEsistente = db.findOne('clienti', c => c.telefono === telefono);
  if (telefonoEsistente) {
    return res.status(400).json({ errore: 'Questo numero di telefono è già associato a un cliente.' });
  }

  const nuovoCliente = db.insert('clienti', {
    nome,
    cognome,
    telefono,
    email: email || null,
    note: note || '',
    punti_fedelta: 0,
    contatore_pizze: 0,
    creato_il: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ultimo_ordine: null
  });

  res.status(201).json(nuovoCliente);
});

// PUT /api/clienti/:id - Modifica cliente (Titolare e Responsabile, o Dipendente)
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { nome, cognome, telefono, email, note, punti_fedelta, contatore_pizze } = req.body;

  const cliente = db.getById('clienti', id);
  if (!cliente) {
    return res.status(404).json({ errore: 'Cliente non trovato.' });
  }

  // Se cambia il telefono, verifica che non appartenga a un altro cliente
  if (telefono && telefono !== cliente.telefono) {
    const telefonoEsistente = db.findOne('clienti', c => c.telefono === telefono && c.id !== Number(id));
    if (telefonoEsistente) {
      return res.status(400).json({ errore: 'Il numero di telefono è già in uso da un altro cliente.' });
    }
  }

  const datiAggiornati = {};
  if (nome !== undefined) datiAggiornati.nome = nome;
  if (cognome !== undefined) datiAggiornati.cognome = cognome;
  if (telefono !== undefined) datiAggiornati.telefono = telefono;
  if (email !== undefined) datiAggiornati.email = email;
  if (note !== undefined) datiAggiornati.note = note;

  // I punti e la carta fedeltà possono essere modificati manualmente solo da Titolare o Responsabile
  if (punti_fedelta !== undefined) {
    if (req.utente.ruolo === 'dipendente') {
      return res.status(403).json({ errore: 'I dipendenti non possono modificare manualmente i punti fedeltà.' });
    }
    datiAggiornati.punti_fedelta = Number(punti_fedelta);
  }
  if (contatore_pizze !== undefined) {
    if (req.utente.ruolo === 'dipendente') {
      return res.status(403).json({ errore: 'I dipendenti non possono modificare il contatore pizze.' });
    }
    datiAggiornati.contatore_pizze = Number(contatore_pizze);
  }

  const clienteAggiornato = db.update('clienti', id, datiAggiornati);
  res.json(clienteAggiornato);
});

// DELETE /api/clienti/:id - Elimina cliente (Solo Titolare o Responsabile)
router.delete('/:id', authMiddleware, permettiRuoli('titolare', 'responsabile'), (req, res) => {
  const { id } = req.params;

  const cliente = db.getById('clienti', id);
  if (!cliente) {
    return res.status(404).json({ errore: 'Cliente non trovato.' });
  }

  // Elimina storico punti
  db.data.storico_punti = db.data.storico_punti.filter(sp => sp.cliente_id !== Number(id));
  
  // Elimina associazioni coupon
  db.data.coupon_clienti = db.data.coupon_clienti.filter(cc => cc.cliente_id !== Number(id));

  // Rimuove il riferimento al cliente dagli ordini (imposta cliente_id a null per mantenere l'ordine nello storico)
  db.find('ordini', o => o.cliente_id === Number(id)).forEach(o => {
    db.update('ordini', o.id, { cliente_id: null });
  });

  db.delete('clienti', id);

  res.json({ messaggio: 'Cliente eliminato con successo.' });
});

module.exports = router;
