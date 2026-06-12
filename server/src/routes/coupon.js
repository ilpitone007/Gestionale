const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// GET /api/coupon - Lista coupon
router.get('/', authMiddleware, async (req, res) => {
  try {
    const coupon = await db.getAll('coupon');
    res.json(coupon);
  } catch (err) {
    console.error('Errore lettura coupon:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// GET /api/coupon/verifica/:codice - Verifica validità coupon
router.get('/verifica/:codice', authMiddleware, async (req, res) => {
  const { codice } = req.params;
  const { cliente_id } = req.query; // Opzionale, per verificare se è un coupon assegnato al cliente

  try {
    const coupon = await db.findOne('coupon', { codice: codice.toUpperCase() });

    if (!coupon || coupon.attivo === 0) {
      return res.status(404).json({ errore: 'Codice coupon non valido o inesistente.' });
    }

    // Verifica date
    const oggi = new Date().toISOString().split('T')[0];
    if (oggi < coupon.valido_dal || oggi > coupon.valido_al) {
      return res.status(400).json({ errore: 'Il coupon è scaduto o non ancora attivo.' });
    }

    // Verifica utilizzi massimi
    if (coupon.utilizzi_correnti >= coupon.utilizzi_massimi) {
      return res.status(400).json({ errore: 'Il coupon ha raggiunto il limite massimo di utilizzi.' });
    }

    // Se è specificato un cliente_id, controlliamo se il coupon è personale
    if (cliente_id) {
      const associazione = await db.findOne('coupon_clienti', { coupon_id: coupon.id, cliente_id: Number(cliente_id) });

      // Se l'associazione esiste ma è già utilizzato
      if (associazione && associazione.utilizzato === 1) {
        return res.status(400).json({ errore: 'Questo coupon è già stato utilizzato da questo cliente.' });
      }
    }

    res.json({
      valido: true,
      coupon: {
        id: coupon.id,
        codice: coupon.codice,
        tipo: coupon.tipo,
        valore: coupon.valore,
        prodotto_gratis_id: coupon.prodotto_gratis_id
      }
    });
  } catch (err) {
    console.error('Errore verifica coupon:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// POST /api/coupon - Crea coupon (Solo Titolare o Responsabile)
router.post('/', authMiddleware, permettiRuoli('titolare', 'responsabile'), async (req, res) => {
  const { codice, tipo, valore, prodotto_gratis_id, valido_dal, valido_al, utilizzi_massimi } = req.body;

  if (!codice || !tipo || valore === undefined || !valido_dal || !valido_al) {
    return res.status(400).json({ errore: 'Codice, tipo, valore, valido_dal e valido_al sono obbligatori.' });
  }

  try {
    const codiceEsistente = await db.findOne('coupon', { codice: codice.toUpperCase() });
    if (codiceEsistente) {
      return res.status(400).json({ errore: 'Questo codice coupon esiste già.' });
    }

    const nuovoCoupon = await db.insert('coupon', {
      codice: codice.toUpperCase(),
      tipo,
      valore: Number(valore),
      prodotto_gratis_id: prodotto_gratis_id ? Number(prodotto_gratis_id) : null,
      valido_dal,
      valido_al,
      utilizzi_massimi: utilizzi_massimi ? Number(utilizzi_massimi) : 9999,
      utilizzi_correnti: 0,
      attivo: 1
    });

    res.status(201).json(nuovoCoupon);
  } catch (err) {
    console.error('Errore creazione coupon:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// POST /api/coupon/assegna - Assegna coupon a un cliente (Titolare o Responsabile)
router.post('/assegna', authMiddleware, permettiRuoli('titolare', 'responsabile'), async (req, res) => {
  const { coupon_id, cliente_id, assegna_a_tutti } = req.body;

  if (!coupon_id) {
    return res.status(400).json({ errore: 'ID coupon obbligatorio.' });
  }

  try {
    const coupon = await db.getById('coupon', coupon_id);
    if (!coupon) {
      return res.status(404).json({ errore: 'Coupon non trovato.' });
    }

    if (assegna_a_tutti) {
      const clienti = await db.getAll('clienti');
      for (const c of clienti) {
        // Verifica se già assegnato e non utilizzato
        const giaAssegnato = await db.findOne('coupon_clienti', { coupon_id: coupon.id, cliente_id: c.id });
        if (!giaAssegnato) {
          await db.insert('coupon_clienti', {
            coupon_id: coupon.id,
            cliente_id: c.id,
            utilizzato: 0,
            assegnato_il: new Date().toISOString()
          });
        }
      }
      return res.json({ messaggio: `Coupon assegnato con successo a tutti i ${clienti.length} clienti.` });
    }

    if (!cliente_id) {
      return res.status(400).json({ errore: 'ID cliente obbligatorio se non assegnato a tutti.' });
    }

    const cliente = await db.getById('clienti', cliente_id);
    if (!cliente) {
      return res.status(404).json({ errore: 'Cliente non trovato.' });
    }

    // Verifica se già assegnato
    const giaAssegnato = await db.findOne('coupon_clienti', { coupon_id: coupon.id, cliente_id: Number(cliente_id) });
    if (giaAssegnato) {
      return res.status(400).json({ errore: 'Questo coupon è già stato assegnato a questo cliente (attivo o già utilizzato).' });
    }

    await db.insert('coupon_clienti', {
      coupon_id: coupon.id,
      cliente_id: Number(cliente_id),
      utilizzato: 0,
      assegnato_il: new Date().toISOString()
    });

    res.json({ messaggio: 'Coupon assegnato al cliente con successo.' });
  } catch (err) {
    console.error('Errore assegnazione coupon:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// DELETE /api/coupon/:id - Disattiva coupon (Titolare o Responsabile)
router.delete('/:id', authMiddleware, permettiRuoli('titolare', 'responsabile'), async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await db.getById('coupon', id);
    if (!coupon) {
      return res.status(404).json({ errore: 'Coupon non trovato.' });
    }

    // Disattiviamo invece di eliminare per mantenere lo storico degli utilizzi negli ordini
    await db.update('coupon', id, { attivo: 0 });
    res.json({ messaggio: 'Coupon disattivato con successo.' });
  } catch (err) {
    console.error('Errore disattivazione coupon:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

module.exports = router;
