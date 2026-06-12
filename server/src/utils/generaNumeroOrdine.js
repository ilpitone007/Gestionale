const db = require('../db/database');

async function generaNumeroOrdine() {
  const oggi = new Date();
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  const dataString = `${yyyy}${mm}${dd}`; // Formato YYYYMMDD

  // Trova tutti gli ordini creati oggi
  const prefisso = `ORD-${dataString}-`;
  let ordiniOggi = [];

  if (db.isSupabase) {
    const { data, error } = await db.supabase
      .from('ordini')
      .select('numero_ordine')
      .like('numero_ordine', `${prefisso}%`);
    if (error) {
      console.error('Errore nel recupero dei numeri d\'ordine da Supabase:', error);
    } else {
      ordiniOggi = data || [];
    }
  } else {
    ordiniOggi = await db.find('ordini', ord => ord.numero_ordine.startsWith(prefisso));
  }

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
