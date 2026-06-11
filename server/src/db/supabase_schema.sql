-- SCHEMA DATABASE PER SUPABASE (POSTGRESQL)
-- Copia e incolla questo script nel SQL Editor di Supabase ed eseguilo per creare le tabelle.

-- 1. UTENTI
CREATE TABLE IF NOT EXISTS utenti (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    ruolo VARCHAR(50) NOT NULL,
    attivo SMALLINT NOT NULL DEFAULT 1,
    creato_il VARCHAR(50)
);

-- 2. CATEGORIE
CREATE TABLE IF NOT EXISTS categorie (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria_padre_id INTEGER REFERENCES categorie(id) ON DELETE SET NULL,
    ordine_visualizzazione INTEGER NOT NULL DEFAULT 0,
    attiva SMALLINT NOT NULL DEFAULT 1
);

-- 3. PRODOTTI
CREATE TABLE IF NOT EXISTS prodotti (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorie(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    descrizione TEXT,
    prezzo NUMERIC(10, 2) NOT NULL,
    costo NUMERIC(10, 2) NOT NULL,
    personalizzabile SMALLINT NOT NULL DEFAULT 1,
    disponibile SMALLINT NOT NULL DEFAULT 1,
    ordine_visualizzazione INTEGER NOT NULL DEFAULT 0,
    attivo SMALLINT NOT NULL DEFAULT 1
);

-- 4. INGREDIENTI
CREATE TABLE IF NOT EXISTS ingredienti (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    prezzo_aggiunta NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    prezzo_rimozione NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tipo VARCHAR(50) DEFAULT 'extra',
    disponibile SMALLINT NOT NULL DEFAULT 1
);

-- 5. PRODOTTO INGREDIENTI
CREATE TABLE IF NOT EXISTS prodotto_ingredienti (
    prodotto_id INTEGER REFERENCES prodotti(id) ON DELETE CASCADE,
    ingrediente_id INTEGER REFERENCES ingredienti(id) ON DELETE CASCADE,
    PRIMARY KEY (prodotto_id, ingrediente_id)
);

-- 6. CLIENTI
CREATE TABLE IF NOT EXISTS clienti (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    punti_fedelta INTEGER DEFAULT 0,
    contatore_pizze INTEGER DEFAULT 0,
    note TEXT,
    creato_il VARCHAR(50),
    ultimo_ordine VARCHAR(50)
);

-- 7. ORDINI
CREATE TABLE IF NOT EXISTS ordini (
    id SERIAL PRIMARY KEY,
    numero_ordine VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INTEGER REFERENCES clienti(id) ON DELETE SET NULL,
    nome_banco VARCHAR(150),
    telefono_banco VARCHAR(50),
    utente_id INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
    stato VARCHAR(50) NOT NULL DEFAULT 'ricevuto',
    canale VARCHAR(50) NOT NULL,
    metodo_pagamento VARCHAR(50) NOT NULL,
    totale NUMERIC(10, 2) NOT NULL,
    sconto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    nota TEXT,
    creato_il VARCHAR(50),
    pronto_il VARCHAR(50),
    ritirato_il VARCHAR(50),
    punti_riscattati INTEGER DEFAULT 0,
    pizze_omaggio_riscattate INTEGER DEFAULT 0,
    punti_accreditati SMALLINT DEFAULT 0
);

-- 8. RIGHE ORDINE
CREATE TABLE IF NOT EXISTS righe_ordine (
    id SERIAL PRIMARY KEY,
    ordine_id INTEGER REFERENCES ordini(id) ON DELETE CASCADE,
    prodotto_id INTEGER REFERENCES prodotti(id) ON DELETE SET NULL,
    quantita INTEGER NOT NULL DEFAULT 1,
    prezzo_unitario NUMERIC(10, 2) NOT NULL,
    costo_unitario NUMERIC(10, 2),
    personalizzazioni_json TEXT,
    nota TEXT
);

-- 9. COUPON
CREATE TABLE IF NOT EXISTS coupon (
    id SERIAL PRIMARY KEY,
    codice VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    valore NUMERIC(10, 2) NOT NULL,
    valido_dal VARCHAR(20) NOT NULL,
    valido_al VARCHAR(20) NOT NULL,
    utilizzi_massimi INTEGER NOT NULL DEFAULT 100,
    utilizzi_correnti INTEGER DEFAULT 0,
    attivo SMALLINT NOT NULL DEFAULT 1
);

-- 10. COUPON CLIENTI
CREATE TABLE IF NOT EXISTS coupon_clienti (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER REFERENCES coupon(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES clienti(id) ON DELETE CASCADE,
    utilizzato SMALLINT DEFAULT 0,
    utilizzato_il VARCHAR(50)
);

-- 11. STORICO PUNTI
CREATE TABLE IF NOT EXISTS storico_punti (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clienti(id) ON DELETE CASCADE,
    ordine_id INTEGER REFERENCES ordini(id) ON DELETE SET NULL,
    punti INTEGER NOT NULL,
    descrizione VARCHAR(255),
    data VARCHAR(50)
);

-- 12. LOGS
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    messaggio TEXT NOT NULL,
    stack TEXT,
    metodo VARCHAR(10),
    url VARCHAR(255),
    creato_il VARCHAR(50)
);

-- 13. IMPOSTAZIONI
CREATE TABLE IF NOT EXISTS impostazioni (
    chiave VARCHAR(100) PRIMARY KEY,
    valore_json TEXT NOT NULL
);
