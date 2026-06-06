const db = require('./database');

function initDb() {
  // Con il database JSON, lo schema viene già inizializzato in database.js.
  // Questa funzione assicura solo che il database sia pronto e persistito su disco.
  try {
    db.save();
    console.log('Database JSON caricato e inizializzato correttamente.');
  } catch (err) {
    console.error('Errore durante l\'inizializzazione del database JSON:', err);
    throw err;
  }
}

module.exports = { initDb };
