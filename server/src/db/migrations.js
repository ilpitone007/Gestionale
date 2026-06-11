const db = require('./database');

async function initDb() {
  // Con il database JSON, lo schema viene già inizializzato in database.js.
  // Questa funzione assicura solo che il database sia pronto e persistito su disco o Supabase.
  try {
    if (db.isSupabase) {
      await db.caricaImpostazioni();
      console.log('Database Supabase connesso e impostazioni caricate.');
    } else {
      db.save();
      console.log('Database JSON caricato e inizializzato correttamente.');
    }
  } catch (err) {
    console.error('Errore durante l\'inizializzazione del database:', err);
    throw err;
  }
}

module.exports = { initDb };
