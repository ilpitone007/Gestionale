const db = require('../db/database');

/**
 * Calcola i punti da assegnare per un ordine
 * Regola: 1 punto per ogni € intero speso (al netto di sconti)
 */
function calcolaPuntiOrdine(totaleOrdine) {
  return Math.floor(totaleOrdine);
}

/**
 * Conta quante pizze sono presenti in un elenco di righe d'ordine
 * Identifica le pizze in base al campo personalizzabile = 1 o categoria
 */
function contaPizzeNelleRighe(righe) {
  let conteggio = 0;
  
  righe.forEach(riga => {
    const prodotto = db.getById('prodotti', riga.prodotto_id);
    if (prodotto && prodotto.personalizzabile === 1) {
      conteggio += riga.quantita;
    }
  });

  return conteggio;
}

module.exports = {
  calcolaPuntiOrdine,
  contaPizzeNelleRighe
};
