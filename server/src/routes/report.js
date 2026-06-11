const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// Tutte le rotte dei report richiedono autenticazione e ruolo minimo Responsabile
router.use(authMiddleware);
router.use(permettiRuoli('responsabile', 'titolare'));

// Helper per formattare le date
const ottieniDataOggi = () => new Date().toISOString().split('T')[0];

// GET /api/report/dashboard - KPI veloci per la home
router.get('/dashboard', async (req, res) => {
  const oggi = ottieniDataOggi();
  try {
    const ordini = await db.getAll('ordini');
    
    // Filtra gli ordini di oggi che non sono annullati
    const ordiniOggi = ordini.filter(o => o.creato_il.startsWith(oggi) && o.stato !== 'annullato');
    
    const totaleIncassoOggi = ordiniOggi.reduce((somma, o) => somma + o.totale, 0);
    const numeroOrdiniOggi = ordiniOggi.length;
    const scontrinoMedioOggi = numeroOrdiniOggi > 0 ? (totaleIncassoOggi / numeroOrdiniOggi) : 0;
    
    // Ordini attivi in questo momento
    const ordiniAttivi = ordini.filter(o => ['ricevuto', 'in_preparazione', 'pronto'].includes(o.stato)).length;

    res.json({
      totale_incasso_oggi: totaleIncassoOggi,
      numero_ordini_oggi: numeroOrdiniOggi,
      scontrino_medio_oggi: scontrinoMedioOggi,
      ordini_attivi: ordiniAttivi
    });
  } catch (err) {
    console.error('Errore report dashboard:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// GET /api/report/incassi - Andamento incassi e scontrini
router.get('/incassi', async (req, res) => {
  const { da_data, a_data } = req.query;
  try {
    const allOrdini = await db.getAll('ordini');
    const ordini = allOrdini.filter(o => o.stato !== 'annullato');

    let ordiniFiltrati = ordini;
    if (da_data && a_data) {
      ordiniFiltrati = ordini.filter(o => {
        const dataOrdine = o.creato_il.split(' ')[0];
        return dataOrdine >= da_data && dataOrdine <= a_data;
      });
    }

    // Raggruppa per giorno
    const raggruppato = {};
    ordiniFiltrati.forEach(o => {
      const giorno = o.creato_il.split(' ')[0];
      if (!raggruppato[giorno]) {
        raggruppato[giorno] = { giorno, incasso: 0, ordini: 0 };
      }
      raggruppato[giorno].incasso += o.totale;
      raggruppato[giorno].ordini += 1;
    });

    const andamento = Object.values(raggruppato).sort((a, b) => a.giorno.localeCompare(b.giorno));
    res.json(andamento);
  } catch (err) {
    console.error('Errore report incassi:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// GET /api/report/prodotti-top - Classifica prodotti più venduti
router.get('/prodotti-top', async (req, res) => {
  const { da_data, a_data } = req.query;
  try {
    const ordini = await db.getAll('ordini');
    const validOrdini = ordini.filter(o => o.stato !== 'annullato');
    const righe = await db.getAll('righe_ordine');
    const prodotti = await db.getAll('prodotti');

    let ordiniValidiIds = validOrdini.map(o => o.id);
    if (da_data && a_data) {
      ordiniValidiIds = validOrdini.filter(o => {
        const data = o.creato_il.split(' ')[0];
        return data >= da_data && data <= a_data;
      }).map(o => o.id);
    }
    const ordiniValidiSet = new Set(ordiniValidiIds);

    // Conta le quantità vendute per ciascun prodotto
    const conteggio = {};
    righe.forEach(r => {
      if (!ordiniValidiSet.has(r.ordine_id)) return;

      if (!conteggio[r.prodotto_id]) {
        const prod = prodotti.find(p => p.id === r.prodotto_id);
        conteggio[r.prodotto_id] = {
          prodotto_id: r.prodotto_id,
          nome: prod ? prod.nome : 'Prodotto Sconosciuto',
          quantita: 0,
          incasso: 0
        };
      }
      conteggio[r.prodotto_id].quantita += r.quantita;
      conteggio[r.prodotto_id].incasso += r.prezzo_unitario * r.quantita;
    });

    const classifica = Object.values(conteggio).sort((a, b) => b.quantita - a.quantita);
    res.json(classifica);
  } catch (err) {
    console.error('Errore report prodotti top:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// GET /api/report/orari - Analisi fasce orarie di punta
router.get('/orari', async (req, res) => {
  try {
    const allOrdini = await db.getAll('ordini');
    const ordini = allOrdini.filter(o => o.stato !== 'annullato');

    // Inizializza le 24 ore
    const fasce = {};
    for (let i = 0; i < 24; i++) {
      const oraStr = String(i).padStart(2, '0');
      fasce[oraStr] = { ora: `${oraStr}:00`, ordini: 0, incasso: 0 };
    }

    ordini.forEach(o => {
      // Estrae l'ora dal timestamp "YYYY-MM-DD HH:MM:SS"
      const ora = o.creato_il.split(' ')[1].split(':')[0];
      if (fasce[ora]) {
        fasce[ora].ordini += 1;
        fasce[ora].incasso += o.totale;
      }
    });

    // Filtra solo le ore di apertura tipiche (es. 12:00-15:00 e 18:00-23:00) o ritorna tutto
    const risultati = Object.values(fasce);
    res.json(risultati);
  } catch (err) {
    console.error('Errore report orari:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// GET /api/report/margini - Analisi dei margini di profitto ricavo vs costo
router.get('/margini', async (req, res) => {
  const { da_data, a_data } = req.query;
  try {
    const ordini = await db.getAll('ordini');
    const validOrdini = ordini.filter(o => o.stato !== 'annullato');
    const righe = await db.getAll('righe_ordine');
    const prodotti = await db.getAll('prodotti');

    let ordiniValidiIds = validOrdini.map(o => o.id);
    if (da_data && a_data) {
      ordiniValidiIds = validOrdini.filter(o => {
        const data = o.creato_il.split(' ')[0];
        return data >= da_data && data <= a_data;
      }).map(o => o.id);
    }
    const ordiniValidiSet = new Set(ordiniValidiIds);

    let ricavoTotale = 0;
    let costoTotale = 0;

    righe.forEach(r => {
      if (!ordiniValidiSet.has(r.ordine_id)) return;

      const prod = prodotti.find(p => p.id === r.prodotto_id);
      const costoProdotto = (r.costo_unitario !== undefined && r.costo_unitario !== null) ? r.costo_unitario : (prod ? prod.costo : 0.0);

      ricavoTotale += r.prezzo_unitario * r.quantita;
      costoTotale += costoProdotto * r.quantita;
    });

    const profittoLordo = ricavoTotale - costoTotale;
    const marginePercentuale = ricavoTotale > 0 ? ((profittoLordo / ricavoTotale) * 100) : 0;

    res.json({
      ricavo_totale: ricavoTotale,
      costo_totale: costoTotale,
      profitto_lordo: profittoLordo,
      margine_percentuale: marginePercentuale
    });
  } catch (err) {
    console.error('Errore report margini:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// GET /api/report/confronto - Confronto tra periodi (es. questa settimana vs scorsa)
router.get('/confronto', async (req, res) => {
  try {
    const allOrdini = await db.getAll('ordini');
    const ordini = allOrdini.filter(o => o.stato !== 'annullato');
    const oggi = new Date();
    
    // Calcoliamo i timestamp per determinare:
    // - Questa settimana (ultimi 7 giorni)
    // - Settimana precedente (giorni da -14 a -7)
    const msInGiorno = 24 * 60 * 60 * 1000;
    
    const inizioQuestaSettimana = new Date(oggi.getTime() - 7 * msInGiorno).toISOString().split('T')[0];
    const fineQuestaSettimana = oggi.toISOString().split('T')[0];
    
    const inizioScorsaSettimana = new Date(oggi.getTime() - 14 * msInGiorno).toISOString().split('T')[0];
    const fineScorsaSettimana = inizioQuestaSettimana;

    // Filtra ordini per i due periodi
    const ordiniQuestaSettimana = ordini.filter(o => {
      const data = o.creato_il.split(' ')[0];
      return data >= inizioQuestaSettimana && data <= fineQuestaSettimana;
    });

    const ordiniScorsaSettimana = ordini.filter(o => {
      const data = o.creato_il.split(' ')[0];
      return data >= inizioScorsaSettimana && data < fineScorsaSettimana;
    });

    const incassoQuesta = ordiniQuestaSettimana.reduce((s, o) => s + o.totale, 0);
    const incassoScorsa = ordiniScorsaSettimana.reduce((s, o) => s + o.totale, 0);
    
    const ordiniQuestaCount = ordiniQuestaSettimana.length;
    const ordiniScorsaCount = ordiniScorsaSettimana.length;

    res.json({
      questa_settimana: {
        incasso: incassoQuesta,
        ordini: ordiniQuestaCount,
        periodo: `${inizioQuestaSettimana} a ${fineQuestaSettimana}`
      },
      scorsa_settimana: {
        incasso: incassoScorsa,
        ordini: ordiniScorsaCount,
        periodo: `${inizioScorsaSettimana} a ${fineScorsaSettimana}`
      },
      differenza_percentuale_incasso: incassoScorsa > 0 ? (((incassoQuesta - incassoScorsa) / incassoScorsa) * 100) : 0
    });
  } catch (err) {
    console.error('Errore report confronto:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

module.exports = router;
