const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const generaNumeroOrdine = require('../utils/generaNumeroOrdine');
const { calcolaPuntiOrdine, contaPizzeNelleRighe } = require('../utils/calcolaPunti');

// GET /api/ordini - Lista ordini (con filtri)
router.get('/', authMiddleware, async (req, res) => {
  const { stato, limit, page } = req.query;
  try {
    let ordini = await db.getAll('ordini');

    // Filtra per stato
    if (stato) {
      if (stato === 'attivi') {
        // Ordini in corso: ricevuto, in_preparazione, pronto
        ordini = ordini.filter(o => ['ricevuto', 'in_preparazione', 'pronto'].includes(o.stato));
      } else {
        ordini = ordini.filter(o => o.stato === stato);
      }
    }

    // Ordina per data decrescente
    ordini.sort((a, b) => new Date(b.creato_il) - new Date(a.creato_il));

    const totalCount = ordini.length;
    let totalPages = 1;

    // Applica eventuale paginazione (page e limit) o limite classico
    if (limit) {
      const limitInt = parseInt(limit, 10);
      if (page) {
        const pageInt = parseInt(page, 10) || 1;
        totalPages = Math.ceil(totalCount / limitInt) || 1;
        const start = (pageInt - 1) * limitInt;
        ordini = ordini.slice(start, start + limitInt);
      } else {
        ordini = ordini.slice(0, limitInt);
      }
    }

    // Arricchiamo con le info del cliente (se presente) e dell'utente che ha preso l'ordine
    const clienti = await db.getAll('clienti');
    const utenti = await db.getAll('utenti');

    const ordiniArricchiti = ordini.map(o => {
      const cliente = o.cliente_id ? clienti.find(c => c.id === o.cliente_id) : null;
      const utente = utenti.find(u => u.id === o.utente_id);

      // Escludiamo password hash per sicurezza
      const utenteInfo = utente ? { id: utente.id, username: utente.username, nome: utente.nome, cognome: utente.cognome } : null;

      return {
        ...o,
        cliente,
        operatore: utenteInfo
      };
    });

    res.setHeader('X-Total-Count', totalCount.toString());
    res.setHeader('X-Total-Pages', totalPages.toString());
    res.json(ordiniArricchiti);
  } catch (err) {
    console.error('Errore lettura ordini:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// GET /api/ordini/:id - Dettaglio ordine con righe
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const ordine = await db.getById('ordini', id);

    if (!ordine) {
      return res.status(404).json({ errore: 'Ordine non trovato.' });
    }

    // Recupera le righe associate a questo ordine
    const righe = await db.find('righe_ordine', { ordine_id: Number(id) });
    const prodotti = await db.getAll('prodotti');

    const righeArricchite = righe.map(r => {
      const prodotto = prodotti.find(p => p.id === r.prodotto_id);
      return {
        ...r,
        prodotto,
        personalizzazioni: r.personalizzazioni_json ? JSON.parse(r.personalizzazioni_json) : null
      };
    });

    const cliente = ordine.cliente_id ? await db.getById('clienti', ordine.cliente_id) : null;
    const utente = await db.getById('utenti', ordine.utente_id);
    const utenteInfo = utente ? { id: utente.id, username: utente.username, nome: utente.nome, cognome: utente.cognome } : null;

    res.json({
      ...ordine,
      cliente,
      operatore: utenteInfo,
      righe: righeArricchite
    });
  } catch (err) {
    console.error('Errore lettura dettaglio ordine:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// POST /api/ordini - Crea un nuovo ordine
router.post('/', authMiddleware, async (req, res) => {
  const {
    cliente_id,
    nome_banco,       // Nome libero per ordini senza cliente registrato
    telefono_banco,   // Cellulare opzionale per ordini banco/telefono
    canale,
    metodo_pagamento,
    righe,
    sconto,
    coupon_codice,
    riscatta_punti,
    riscatta_pizze_omaggio,
    nota
  } = req.body;

  if (!canale || !metodo_pagamento || !Array.isArray(righe) || righe.length === 0) {
    return res.status(400).json({ errore: 'Canale, metodo di pagamento e prodotti sono obbligatori.' });
  }

  // Validazione tipi di dato
  if (typeof canale !== 'string' || typeof metodo_pagamento !== 'string') {
    return res.status(400).json({ errore: 'Canale e metodo di pagamento devono essere stringhe valide.' });
  }

  if (sconto !== undefined && (typeof sconto !== 'number' || sconto < 0 || isNaN(sconto))) {
    return res.status(400).json({ errore: 'Lo sconto deve essere un numero positivo.' });
  }

  if (nome_banco !== undefined && nome_banco !== null && typeof nome_banco !== 'string') {
    return res.status(400).json({ errore: 'Il nome del cliente al banco deve essere una stringa.' });
  }

  if (telefono_banco !== undefined && telefono_banco !== null && typeof telefono_banco !== 'string') {
    return res.status(400).json({ errore: 'Il telefono del cliente al banco deve essere una stringa.' });
  }

  if (nota !== undefined && nota !== null && typeof nota !== 'string') {
    return res.status(400).json({ errore: 'La nota deve essere una stringa.' });
  }

  try {
    // Genera numero ordine
    const numero_ordine = await generaNumeroOrdine();
    let totale = 0;
    const dataCreazione = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Gestione Cliente e Fidelizzazione (caricato in anticipo per poter validare gli omaggi)
    let cliente = null;
    if (cliente_id) {
      cliente = await db.getById('clienti', Number(cliente_id));
      if (!cliente) {
        return res.status(404).json({ errore: 'Cliente specificato non esistente.' });
      }
    }

    // Calcola totale lordo e valida prodotti
    const righeDaInserire = [];
    const prodotti = await db.getAll('prodotti');
    let omaggiApplicati = 0;

    for (const riga of righe) {
      // Validazione riga
      if (!riga || typeof riga.prodotto_id !== 'number' || typeof riga.quantita !== 'number' || riga.quantita <= 0 || !Number.isInteger(riga.quantita)) {
        return res.status(400).json({ errore: 'Ciascun prodotto deve avere un ID valido e una quantità intera positiva.' });
      }

      if (riga.quantita > 100) {
        return res.status(400).json({ errore: 'La quantità massima consentita per singolo prodotto è 100.' });
      }

      const prodotto = prodotti.find(p => p.id === riga.prodotto_id);
      if (!prodotto) {
        return res.status(400).json({ errore: `Prodotto con ID ${riga.prodotto_id} non esistente.` });
      }

      let prezzoUnitario = prodotto.prezzo;

      // Calcola il prezzo con personalizzazioni (se presenti)
      const personalizzazioni = riga.personalizzazioni || { aggiunti: [], rimossi: [] };
      if (prodotto.personalizzabile === 1) {
        // Aggiungi prezzi ingredienti extra
        if (Array.isArray(personalizzazioni.aggiunti)) {
          for (const ingId of personalizzazioni.aggiunti) {
            const ing = await db.getById('ingredienti', ingId);
            if (ing) {
              prezzoUnitario += ing.prezzo_aggiunta;
            }
          }
        }
      }

      // Se riscattato come omaggio (es. pizza gratis), il prezzo unitario della riga diventa 0 (previa validazione)
      if (riga.prezzo_omaggio) {
        if (cliente && riscatta_pizze_omaggio && cliente.contatore_pizze >= (omaggiApplicati + 1) * 10) {
          prezzoUnitario = 0;
          omaggiApplicati++;
        } else {
          riga.prezzo_omaggio = false;
        }
      }

      const totaleRiga = prezzoUnitario * riga.quantita;
      totale += totaleRiga;

      righeDaInserire.push({
        prodotto_id: prodotto.id,
        quantita: riga.quantita,
        prezzo_unitario: prezzoUnitario,
        costo_unitario: prodotto.costo,
        personalizzazioni_json: JSON.stringify(personalizzazioni),
        nota: riga.nota || ''
      });
    }

    // Gestione Sconti e Coupon
    let scontoApplicato = sconto ? Number(sconto) : 0.0;
    let couponUsato = null;

    // Problem 9: Limitazioni sconto manuale
    if (sconto !== undefined) {
      const scontoNum = Number(sconto);
      if (scontoNum > (totale * 0.3) && req.utente.ruolo === 'dipendente') {
        return res.status(403).json({ errore: 'I dipendenti non possono applicare uno sconto manuale superiore al 30%.' });
      }
      if (scontoNum > totale) {
        return res.status(400).json({ errore: 'Lo sconto non può essere superiore al totale dell\'ordine.' });
      }
    }

    if (coupon_codice) {
      const cp = await db.findOne('coupon', { codice: coupon_codice.toUpperCase(), attivo: 1 });
      if (cp) {
        const oggi = new Date().toISOString().split('T')[0];
        if (oggi >= cp.valido_dal && oggi <= cp.valido_al && cp.utilizzi_correnti < cp.utilizzi_massimi) {
          couponUsato = cp;
          
          if (cp.tipo === 'percentuale') {
            scontoApplicato += (totale * cp.valore) / 100;
          } else if (cp.tipo === 'fisso') {
            scontoApplicato += cp.valore;
          }
        }
      }
    }

    // Gestione Fidelizzazione
    let puntiSpesi = 0;
    let pizzeDaDetrarre = 0;
    if (cliente) {
      // Gestione riscatto punti (es: 100 punti = 5€ di sconto)
      if (riscatta_punti && cliente.punti_fedelta >= 100) {
        const scontiPunti = Math.floor(cliente.punti_fedelta / 100) * 5; // 5€ di sconto ogni 100 punti
        scontoApplicato += scontiPunti;
        puntiSpesi = Math.floor(cliente.punti_fedelta / 100) * 100;

        // Detrae i punti immediatamente
        await db.update('clienti', cliente.id, {
          punti_fedelta: cliente.punti_fedelta - puntiSpesi
        });

        // Salva lo storico punti negativo
        await db.insert('storico_punti', {
          cliente_id: cliente.id,
          ordine_id: null, // Verrà impostato dopo la creazione dell'ordine
          punti: -puntiSpesi,
          descrizione: `Sconto punti di ${scontiPunti}€ applicato all'ordine`,
          data: dataCreazione
        });
        
        // Ricarica cliente con dati aggiornati
        cliente = await db.getById('clienti', cliente.id);
      }

      // Gestione riscatto pizza omaggio (es: 10 pizze ordinate = 1 pizza omaggio)
      if (riscatta_pizze_omaggio && omaggiApplicati > 0) {
        pizzeDaDetrarre = omaggiApplicati * 10;
        // Detrae pizze dal contatore
        await db.update('clienti', cliente.id, {
          contatore_pizze: Math.max(0, cliente.contatore_pizze - pizzeDaDetrarre)
        });
        
        // Ricarica cliente
        cliente = await db.getById('clienti', cliente.id);
      }
    }

    // Assicurati che lo sconto non superi il totale
    if (scontoApplicato > totale) {
      scontoApplicato = totale;
    }

    // Calcolo totaleNetto (corretto: DOPO aver applicato sconti coupon, sconti manuali e sconti punti fedeltà)
    const totaleNetto = Math.max(0, totale - scontoApplicato);

    // Inserimento ORDINE
    const nuovoOrdine = await db.insert('ordini', {
      numero_ordine,
      cliente_id: cliente_id ? Number(cliente_id) : null,
      nome_banco: !cliente_id && nome_banco ? nome_banco.trim() : null,
      telefono_banco: !cliente_id && telefono_banco ? telefono_banco.trim() : null,
      utente_id: req.utente.id,
      stato: 'ricevuto',
      canale,
      metodo_pagamento,
      totale: totaleNetto,
      sconto: scontoApplicato,
      nota: nota || '',
      creato_il: dataCreazione,
      pronto_il: null,
      ritirato_il: null,
      punti_riscattati: puntiSpesi,
      pizze_omaggio_riscattate: pizzeDaDetrarre
    });

    // Associa ID ordine alle righe ed inserisci
    for (const riga of righeDaInserire) {
      await db.insert('righe_ordine', {
        ...riga,
        ordine_id: nuovoOrdine.id
      });
    }

    // Aggiorna lo storico dei punti con l'ID dell'ordine inserito (se c'era riscatto punti)
    if (cliente_id && riscatta_punti) {
      const ultimoStorico = await db.findOne('storico_punti', sp => sp.cliente_id === cliente.id && sp.ordine_id === null && sp.punti < 0);
      if (ultimoStorico) {
        await db.update('storico_punti', ultimoStorico.id, { ordine_id: nuovoOrdine.id });
      }
    }

    // Incrementa il contatore degli utilizzi del coupon
    if (couponUsato) {
      await db.update('coupon', couponUsato.id, {
        utilizzi_correnti: couponUsato.utilizzi_correnti + 1
      });

      // Se era un coupon assegnato al cliente, lo segna come utilizzato
      if (cliente_id) {
        const associazione = await db.findOne('coupon_clienti', { coupon_id: couponUsato.id, cliente_id: cliente.id, utilizzato: 0 });
        if (associazione) {
          await db.update('coupon_clienti', associazione.id, {
            utilizzato: 1,
            utilizzato_il: dataCreazione
          });
        }
      }
    }

    res.status(201).json({
      ...nuovoOrdine,
      righe: righeDaInserire.map(r => ({
        ...r,
        prodotto: prodotti.find(p => p.id === r.prodotto_id),
        personalizzazioni: JSON.parse(r.personalizzazioni_json)
      }))
    });
  } catch (err) {
    console.error('Errore creazione ordine:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// PUT /api/ordini/:id/stato - Cambia lo stato dell'ordine (Ricevuto -> In Preparazione -> Pronto -> Ritirato)
router.put('/:id/stato', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { stato } = req.body;

  if (!stato) {
    return res.status(400).json({ errore: 'Stato obbligatorio.' });
  }

  const STATI_VALIDI = ['ricevuto', 'in_preparazione', 'pronto', 'ritirato', 'annullato'];
  const TRANSIZIONI = {
    ricevuto: ['in_preparazione', 'annullato'],
    in_preparazione: ['pronto', 'annullato'],
    pronto: ['ritirato', 'annullato'],
    ritirato: [],
    annullato: []
  };

  if (!STATI_VALIDI.includes(stato)) {
    return res.status(400).json({ errore: 'Stato specificato non valido.' });
  }

  try {
    const ordine = await db.getById('ordini', id);
    if (!ordine) {
      return res.status(404).json({ errore: 'Ordine non trovato.' });
    }

    const statoPrecedente = ordine.stato;
    if (statoPrecedente === 'ritirato' || statoPrecedente === 'annullato') {
      return res.status(400).json({ errore: `Impossibile modificare lo stato di un ordine già finalizzato (${statoPrecedente}).` });
    }

    const transizioniConsentite = TRANSIZIONI[statoPrecedente] || [];
    if (!transizioniConsentite.includes(stato)) {
      return res.status(400).json({ errore: `Transizione di stato da ${statoPrecedente} a ${stato} non consentita.` });
    }

    const datiAggiornati = { stato };
    const oraCorrente = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (stato === 'pronto') {
      datiAggiornati.pronto_il = oraCorrente;
    } else if (stato === 'ritirato') {
      datiAggiornati.ritirato_il = oraCorrente;

      // Se l'ordine viene segnato come RITIRATO, accreditiamo i punti e incrementiamo le pizze per il programma fedeltà
      if (ordine.cliente_id && ordine.punti_accreditati !== 1) {
        datiAggiornati.punti_accreditati = 1;
        const cliente = await db.getById('clienti', ordine.cliente_id);
        if (cliente) {
          // Calcola i punti guadagnati
          const puntiGuadagnati = calcolaPuntiOrdine(ordine.totale);

          // Calcola le pizze ordinate per la carta fedeltà
          const righe = await db.find('righe_ordine', { ordine_id: ordine.id });
          const pizzeOrdinate = contaPizzeNelleRighe(righe);

          // Aggiorna il profilo del cliente
          await db.update('clienti', cliente.id, {
            punti_fedelta: cliente.punti_fedelta + puntiGuadagnati,
            contatore_pizze: cliente.contatore_pizze + pizzeOrdinate,
            ultimo_ordine: oraCorrente
          });

          // Aggiungi record nello storico punti
          if (puntiGuadagnati > 0) {
            await db.insert('storico_punti', {
              cliente_id: cliente.id,
              ordine_id: ordine.id,
              punti: puntiGuadagnati,
              descrizione: `Punti accumulati con l'ordine ${ordine.numero_ordine}`,
              data: oraCorrente
            });
          }
        }
      }
    } else if (stato === 'annullato') {
      if (ordine.cliente_id) {
        const cliente = await db.getById('clienti', ordine.cliente_id);
        if (cliente) {
          const puntiRiscattati = ordine.punti_riscattati || 0;
          const pizzeOmaggioRiscattate = ordine.pizze_omaggio_riscattate || 0;

          if (puntiRiscattati > 0 || pizzeOmaggioRiscattate > 0) {
            await db.update('clienti', cliente.id, {
              punti_fedelta: cliente.punti_fedelta + puntiRiscattati,
              contatore_pizze: cliente.contatore_pizze + pizzeOmaggioRiscattate
            });

            if (puntiRiscattati > 0) {
              await db.insert('storico_punti', {
                cliente_id: cliente.id,
                ordine_id: ordine.id,
                punti: puntiRiscattati,
                descrizione: `Rimborso punti per annullamento ordine ${ordine.numero_ordine}`,
                data: oraCorrente
              });
            }
          }
        }
      }
    }

    const ordineAggiornato = await db.update('ordini', id, datiAggiornati);
    res.json(ordineAggiornato);
  } catch (err) {
    console.error('Errore aggiornamento stato ordine:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// PUT /api/ordini/:id - Modifica un ordine esistente (solo stato ricevuto/in_preparazione)
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { righe, nota, canale, metodo_pagamento, sconto, nome_banco, telefono_banco } = req.body;

  try {
    const ordine = await db.getById('ordini', id);
    if (!ordine) {
      return res.status(404).json({ errore: 'Ordine non trovato.' });
    }

    if (!['ricevuto', 'in_preparazione'].includes(ordine.stato)) {
      return res.status(400).json({ errore: `Impossibile modificare un ordine in stato "${ordine.stato}".` });
    }

    if (!Array.isArray(righe) || righe.length === 0) {
      return res.status(400).json({ errore: 'Le righe ordine sono obbligatorie.' });
    }

    // Validazioni tipi di dato
    if (canale !== undefined && typeof canale !== 'string') {
      return res.status(400).json({ errore: 'Il canale deve essere una stringa.' });
    }

    if (metodo_pagamento !== undefined && typeof metodo_pagamento !== 'string') {
      return res.status(400).json({ errore: 'Il metodo di pagamento deve essere una stringa.' });
    }

    if (sconto !== undefined && (typeof sconto !== 'number' || sconto < 0 || isNaN(sconto))) {
      return res.status(400).json({ errore: 'Lo sconto deve essere un numero positivo.' });
    }

    if (nome_banco !== undefined && nome_banco !== null && typeof nome_banco !== 'string') {
      return res.status(400).json({ errore: 'Il nome del cliente al banco deve essere una stringa.' });
    }

    if (telefono_banco !== undefined && telefono_banco !== null && typeof telefono_banco !== 'string') {
      return res.status(400).json({ errore: 'Il telefono del cliente al banco deve essere una stringa.' });
    }

    if (nota !== undefined && nota !== null && typeof nota !== 'string') {
      return res.status(400).json({ errore: 'La nota deve essere una stringa.' });
    }

    const prodotti = await db.getAll('prodotti');
    let totale = 0;
    const righeDaInserire = [];

    for (const riga of righe) {
      // Validazione riga
      if (!riga || typeof riga.prodotto_id !== 'number' || typeof riga.quantita !== 'number' || riga.quantita <= 0 || !Number.isInteger(riga.quantita)) {
        return res.status(400).json({ errore: 'Ciascun prodotto deve avere un ID valido e una quantità intera positiva.' });
      }

      if (riga.quantita > 100) {
        return res.status(400).json({ errore: 'La quantità massima consentita per singolo prodotto è 100.' });
      }

      const prodotto = prodotti.find(p => p.id === riga.prodotto_id);
      if (!prodotto) {
        return res.status(400).json({ errore: `Prodotto ID ${riga.prodotto_id} non trovato.` });
      }
      // Il prezzo unitario deve essere determinato sul server
      const prezzoUnitario = prodotto.prezzo;
      totale += prezzoUnitario * riga.quantita;
      righeDaInserire.push({
        ordine_id: Number(id),
        prodotto_id: prodotto.id,
        quantita: riga.quantita,
        prezzo_unitario: prezzoUnitario,
        costo_unitario: prodotto.costo,
        personalizzazioni_json: JSON.stringify({ aggiunti: [], rimossi: [] }),
        nota: riga.nota || ''
      });
    }

    const scontoApplicato = sconto !== undefined ? Number(sconto) : ordine.sconto;
    
    if (sconto !== undefined) {
      if (scontoApplicato > (totale * 0.3) && req.utente.ruolo === 'dipendente') {
        return res.status(403).json({ errore: 'I dipendenti non possono applicare uno sconto manuale superiore al 30%.' });
      }
      if (scontoApplicato > totale) {
        return res.status(400).json({ errore: 'Lo sconto non può essere superiore al totale dell\'ordine.' });
      }
    }

    const totaleNetto = Math.max(0, totale - scontoApplicato);

    // Elimina le vecchie righe
    const vecchieRighe = await db.find('righe_ordine', { ordine_id: Number(id) });
    for (const r of vecchieRighe) {
      await db.delete('righe_ordine', r.id);
    }

    // Inserisci le nuove righe
    for (const r of righeDaInserire) {
      await db.insert('righe_ordine', r);
    }

    // Aggiorna l'ordine
    const ordineAggiornato = await db.update('ordini', id, {
      totale: totaleNetto,
      sconto: scontoApplicato,
      nota: nota !== undefined ? nota : ordine.nota,
      canale: canale || ordine.canale,
      metodo_pagamento: metodo_pagamento || ordine.metodo_pagamento,
      nome_banco: nome_banco !== undefined ? (nome_banco ? nome_banco.trim() : null) : ordine.nome_banco,
      telefono_banco: telefono_banco !== undefined ? (telefono_banco ? telefono_banco.trim() : null) : ordine.telefono_banco,
    });

    const nuoveRighe = await db.find('righe_ordine', { ordine_id: Number(id) });
    const righeArricchite = nuoveRighe.map(r => ({
      ...r,
      prodotto: prodotti.find(p => p.id === r.prodotto_id)
    }));

    res.json({ ...ordineAggiornato, righe: righeArricchite });
  } catch (err) {
    console.error('Errore modifica ordine:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

module.exports = router;

