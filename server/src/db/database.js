const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const isSupabase = !!(supabaseUrl && supabaseKey);
const supabase = isSupabase ? createClient(supabaseUrl, supabaseKey) : null;

// Caching in memoria per velocizzare le tabelle statiche del menu
const cache = {};
const cacheableTables = ['categorie', 'prodotti', 'ingredienti', 'prodotto_ingredienti'];

function invalidateCache(tabella) {
  if (cacheableTables.includes(tabella)) {
    delete cache[tabella];
    console.log(`[Cache] Invalidata cache in memoria per la tabella: ${tabella}`);
  }
}


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

// Carica il database da file o crea uno schema iniziale se non esiste (solo se non siamo su Supabase)
let data = { ...schemaIniziale, impostazioni: {} };

if (!isSupabase) {
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
      if (!data.impostazioni) {
        data.impostazioni = {};
      }
    } catch (err) {
      console.error('Errore durante il caricamento del database JSON, creo un database vuoto:', err);
      data = { ...schemaIniziale, impostazioni: {} };
    }
  } else {
    salvaSuDiscoSync();
  }
}

// Coda di scrittura asincrona per evitare corruzione
let scritturaInCorso = false;
let scritturaPianificata = false;

function salvaSuDiscoSync() {
  if (isSupabase) return;
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function salvaSuDisco() {
  if (isSupabase) return;
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
  isSupabase,
  supabase,

  async caricaImpostazioni() {
    if (isSupabase) {
      try {
        const { data: row, error } = await supabase
          .from('impostazioni')
          .select('*')
          .eq('chiave', 'config')
          .maybeSingle();
        if (error) {
          console.error('Errore nel caricamento delle impostazioni da Supabase:', error);
        }
        if (row) {
          this.data.impostazioni = JSON.parse(row.valore_json);
        } else {
          this.data.impostazioni = {};
        }
      } catch (err) {
        console.error('Errore durante la connessione a Supabase per impostazioni:', err);
        this.data.impostazioni = {};
      }
    }
  },

  async saveImpostazioni(impostazioni) {
    this.data.impostazioni = impostazioni;
    if (isSupabase) {
      const { error } = await supabase
        .from('impostazioni')
        .upsert({
          chiave: 'config',
          valore_json: JSON.stringify(impostazioni)
        });
      if (error) throw error;
    } else {
      this.save();
    }
  },

  // Recupera tutti gli elementi di una tabella
  async getAll(tabella) {
    if (isSupabase) {
      if (cacheableTables.includes(tabella)) {
        if (cache[tabella]) {
          return cache[tabella];
        }
        let query = supabase.from(tabella).select('*');
        if (tabella !== 'prodotto_ingredienti' && tabella !== 'impostazioni') {
          query = query.order('id', { ascending: true });
        }
        const { data: rows, error } = await query;
        if (error) throw error;
        cache[tabella] = rows || [];
        return cache[tabella];
      }
      
      let query = supabase.from(tabella).select('*');
      if (tabella !== 'prodotto_ingredienti' && tabella !== 'impostazioni') {
        query = query.order('id', { ascending: true });
      }
      const { data: rows, error } = await query;
      if (error) throw error;
      return rows || [];
    } else {
      return this.data[tabella] || [];
    }
  },

  // Trova un elemento per ID
  async getById(tabella, id) {
    if (isSupabase) {
      if (cacheableTables.includes(tabella)) {
        const list = await this.getAll(tabella);
        return list.find(item => item.id === Number(id)) || null;
      }
      const { data: row, error } = await supabase
        .from(tabella)
        .select('*')
        .eq('id', Number(id))
        .maybeSingle();
      if (error) throw error;
      return row || null;
    } else {
      const items = await this.getAll(tabella);
      return items.find(item => item.id === Number(id)) || null;
    }
  },

  // Cerca elementi che corrispondono a un filtro
  async find(tabella, queryObj) {
    if (isSupabase) {
      if (typeof queryObj === 'function') {
        const list = await this.getAll(tabella);
        return list.filter(queryObj);
      } else if (typeof queryObj === 'object' && queryObj !== null) {
        let query = supabase.from(tabella).select('*');
        for (const [key, val] of Object.entries(queryObj)) {
          query = query.eq(key, val);
        }
        if (tabella !== 'prodotto_ingredienti' && tabella !== 'impostazioni') {
          query = query.order('id', { ascending: true });
        }
        const { data: rows, error } = await query;
        if (error) throw error;
        return rows || [];
      }
    } else {
      const list = await this.getAll(tabella);
      if (typeof queryObj === 'function') {
        return list.filter(queryObj);
      } else if (typeof queryObj === 'object' && queryObj !== null) {
        return list.filter(item => {
          return Object.entries(queryObj).every(([key, val]) => item[key] === val);
        });
      }
    }
    return [];
  },

  // Cerca un singolo elemento
  async findOne(tabella, queryObj) {
    if (isSupabase) {
      if (typeof queryObj === 'function') {
        const list = await this.getAll(tabella);
        return list.find(queryObj);
      } else if (typeof queryObj === 'object' && queryObj !== null) {
        let query = supabase.from(tabella).select('*');
        for (const [key, val] of Object.entries(queryObj)) {
          query = query.eq(key, val);
        }
        const { data: row, error } = await query.maybeSingle();
        if (error) throw error;
        return row || null;
      }
    } else {
      const list = await this.getAll(tabella);
      if (typeof queryObj === 'function') {
        return list.find(queryObj);
      } else if (typeof queryObj === 'object' && queryObj !== null) {
        return list.find(item => {
          return Object.entries(queryObj).every(([key, val]) => item[key] === val);
        });
      }
    }
    return null;
  },

  // Inserisce un nuovo elemento con ID autoincrementale
  async insert(tabella, record) {
    invalidateCache(tabella);
    if (isSupabase) {
      const cleaned = { ...record };
      const { data: row, error } = await supabase
        .from(tabella)
        .insert(cleaned)
        .select()
        .single();
      if (error) throw error;
      return row;
    } else {
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
    }
  },

  // Inserisce una relazione senza ID incrementale (chiave composta)
  async insertRelation(tabella, record) {
    invalidateCache(tabella);
    if (isSupabase) {
      const { data: rows, error } = await supabase
        .from(tabella)
        .insert(record)
        .select();
      if (error) throw error;
      return rows[0] || record;
    } else {
      if (!this.data[tabella]) {
        this.data[tabella] = [];
      }
      this.data[tabella].push(record);
      salvaSuDisco();
      return record;
    }
  },

  // Aggiorna un elemento esistente per ID
  async update(tabella, id, campiAggiornati) {
    invalidateCache(tabella);
    if (isSupabase) {
      const cleaned = { ...campiAggiornati };
      delete cleaned.id;
      const { data: row, error } = await supabase
        .from(tabella)
        .update(cleaned)
        .eq('id', Number(id))
        .select()
        .single();
      if (error) throw error;
      return row;
    } else {
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
    }
  },

  // Rimuove un elemento per ID
  async delete(tabella, id) {
    invalidateCache(tabella);
    if (isSupabase) {
      const { error } = await supabase
        .from(tabella)
        .delete()
        .eq('id', Number(id));
      if (error) throw error;
      return true;
    } else {
      const tabellaDati = this.data[tabella] || [];
      const index = tabellaDati.findIndex(item => item.id === Number(id));

      if (index === -1) return false;

      tabellaDati.splice(index, 1);
      salvaSuDisco();
      return true;
    }
  },

  // Rimuove elementi che soddisfano una condizione campo = valore
  async deleteWhere(tabella, campo, valore) {
    invalidateCache(tabella);
    if (isSupabase) {
      const { error } = await supabase
        .from(tabella)
        .delete()
        .eq(campo, valore);
      if (error) throw error;
      return true;
    } else {
      if (this.data[tabella]) {
        this.data[tabella] = this.data[tabella].filter(item => item[campo] !== valore);
        salvaSuDisco();
        return true;
      }
      return false;
    }
  },

  // Pulisce una tabella (usato nel seeding)
  async clear(tabella) {
    invalidateCache(tabella);
    if (isSupabase) {
      let query = supabase.from(tabella).delete();
      if (tabella === 'prodotto_ingredienti') {
        query = query.neq('prodotto_id', -1);
      } else if (tabella === 'impostazioni') {
        query = query.neq('chiave', '');
      } else {
        query = query.neq('id', -1);
      }
      const { error } = await query;
      if (error) throw error;
    } else {
      this.data[tabella] = [];
      salvaSuDiscoSync();
    }
  },

  // Salva esplicitamente lo stato corrente
  save() {
    if (!isSupabase) {
      salvaSuDiscoSync();
    }
  }
};

module.exports = db;
