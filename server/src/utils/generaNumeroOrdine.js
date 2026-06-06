const db = require('../db/database');

function generaNumeroOrdine() {
  const oggi = new Date();
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  const dataString = `${yyyy}${mm}${dd}`; // Formato YYYYMMDD

  // Trova tutti gli ordini creati oggi
  const prefisso = `ORD-${dataString}-`;
  const ordiniOggi = db.find('ordini', ord => ord.numero_ordine.startsWith(prefisso));

  // Determina il prossimo numero progressivo
  let progressivo = 1;
  if (ordiniOggi.length > 0) {
    const numeri = ordiniOggi.map(ord => {
      const parti = ord.numero_ordine.split('-');
      return parseInt(parti[2], 10);
    });
    progressivo = Math.max(...numeri) + 1;
  }

  const progressivoString = String(progressivo).padStart(3, '0');
  return `${prefisso}${progressivoString}`;
}

module.exports = generaNumeroOrdine;
