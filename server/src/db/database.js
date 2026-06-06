const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH 
  ? path.resolve(process.env.DB_PATH) 
  : path.resolve(__dirname, 'pizzeria_db.json');

// Struttura iniziale del database vuoto
const schemaIniziale = {
  utenti: [],
  categorie: [],
  prodotti: [],
  ingredienti: [],
  prodotto_ingredienti: [],
  clienti: [],
  ordini: [],
  righe_ordine: [],
  coupon: [],
  coupon_clienti: [],
  storico_punti: [],
  logs: []
};

// Carica il database da file o crea uno schema iniziale se non esiste
let data = { ...schemaIniziale };

if (fs.existsSync(dbPath)) {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    data = JSON.parse(raw);
    
    // Assicuriamoci che tutte le tabelle dello schema siano presenti
    for (const key of Object.keys(schemaIniziale)) {
      if (!data[key]) {
        data[key] = [];
      }
    }
  } catch (err) {
    console.error('Errore durante il caricamento del database JSON, creo un database vuoto:', err);
    data = { ...schemaIniziale };
  }
} else {
  salvaSuDiscoSync();
}

// Coda di scrittura asincrona per evitare corruzione
let scritturaInCorso = false;
let scritturaPianificata = false;

function salvaSuDiscoSync() {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function salvaSuDisco() {
  if (scritturaInCorso) {
    scritturaPianificata = true;
    return;
  }

  scritturaInCorso = true;
  fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8', (err) => {
    scritturaInCorso = false;
    if (err) {
      console.error('Errore durante il salvataggio del database su disco:', err);
    }
    if (scritturaPianificata) {
      scritturaPianificata = false;
      salvaSuDisco();
    }
  });
}

// Interfaccia del Database
const db = {
  // Riferimento diretto ai dati (per operazioni flessibili)
  data,

  // Recupera tutti gli elementi di una tabella
  getAll(tabella) {
    return this.data[tabella] || [];
  },

  // Trova un elemento per ID
  getById(tabella, id) {
    return this.getAll(tabella).find(item => item.id === Number(id));
  },

  // Cerca elementi che corrispondono a un filtro
  find(tabella, filtroFn) {
    return this.getAll(tabella).filter(filtroFn);
  },

  // Cerca un singolo elemento
  findOne(tabella, filtroFn) {
    return this.getAll(tabella).find(filtroFn);
  },

  // Inserisce un nuovo elemento con ID autoincrementale
  insert(tabella, record) {
    if (!this.data[tabella]) {
      this.data[tabella] = [];
    }

    const tabellaDati = this.data[tabella];
    
    // Calcola il prossimo ID
    const maxId = tabellaDati.reduce((max, item) => (item.id > max ? item.id : max), 0);
    const nuovoRecord = {
      id: maxId + 1,
      ...record
    };

    tabellaDati.push(nuovoRecord);
    salvaSuDisco();
    return nuovoRecord;
  },

  // Inserisce una relazione senza ID incrementale (chiave composta)
  insertRelation(tabella, record) {
    if (!this.data[tabella]) {
      this.data[tabella] = [];
    }
    this.data[tabella].push(record);
    salvaSuDisco();
    return record;
  },

  // Aggiorna un elemento esistente per ID
  update(tabella, id, campiAggiornati) {
    const tabellaDati = this.data[tabella] || [];
    const index = tabellaDati.findIndex(item => item.id === Number(id));
    
    if (index === -1) return null;

    tabellaDati[index] = {
      ...tabellaDati[index],
      ...campiAggiornati,
      id: Number(id) // Previene sovrascrittura dell'id
    };

    salvaSuDisco();
    return tabellaDati[index];
  },

  // Rimuove un elemento per ID
  delete(tabella, id) {
    const tabellaDati = this.data[tabella] || [];
    const index = tabellaDati.findIndex(item => item.id === Number(id));

    if (index === -1) return false;

    tabellaDati.splice(index, 1);
    salvaSuDisco();
    return true;
  },

  // Pulisce una tabella (usato nel seeding)
  clear(tabella) {
    this.data[tabella] = [];
    salvaSuDiscoSync();
  },

  // Salva esplicitamente lo stato corrente
  save() {
    salvaSuDiscoSync();
  }
};

module.exports = db;
