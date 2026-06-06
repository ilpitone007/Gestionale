const db = require('./database');
const bcrypt = require('bcryptjs');

async function seedDb() {
  console.log('Avvio popolamento database JSON con menu completo e dati demo (seed)...');

  // Password hashate per il login dello staff
  const salt = await bcrypt.genSalt(10);
  const hashTitolare = await bcrypt.hash('titolare123', salt);
  const hashResponsabile = await bcrypt.hash('responsabile123', salt);
  const hashDipendente = await bcrypt.hash('dipendente123', salt);

  try {
    // Pulisci tutte le tabelle per evitare duplicati
    db.clear('storico_punti');
    db.clear('coupon_clienti');
    db.clear('coupon');
    db.clear('righe_ordine');
    db.clear('ordini');
    db.clear('clienti');
    db.clear('prodotto_ingredienti');
    db.clear('ingredienti');
    db.clear('prodotti');
    db.clear('categorie');
    db.clear('utenti');

    // 1. Inserisci UTENTI dello staff
    const uTitolare = db.insert('utenti', { username: 'titolare', password_hash: hashTitolare, nome: 'Mario', cognome: 'Rossi', ruolo: 'titolare', attivo: 1, creato_il: new Date().toISOString() });
    const uResponsabile = db.insert('utenti', { username: 'responsabile', password_hash: hashResponsabile, nome: 'Luigi', cognome: 'Verdi', ruolo: 'responsabile', attivo: 1, creato_il: new Date().toISOString() });
    const uDipendente = db.insert('utenti', { username: 'dipendente', password_hash: hashDipendente, nome: 'Giovanni', cognome: 'Bianchi', ruolo: 'dipendente', attivo: 1, creato_il: new Date().toISOString() });

    // 2. Inserisci CATEGORIE del menu
    const catPizze = db.insert('categorie', { nome: 'Pizze', categoria_padre_id: null, ordine_visualizzazione: 1, attiva: 1 }).id;
    const catFritti = db.insert('categorie', { nome: 'Fritti Tradizionali', categoria_padre_id: null, ordine_visualizzazione: 2, attiva: 1 }).id;
    const catPrimi = db.insert('categorie', { nome: 'Primi Piatti', categoria_padre_id: null, ordine_visualizzazione: 3, attiva: 1 }).id;
    const catDolci = db.insert('categorie', { nome: 'Dolci Artigianali', categoria_padre_id: null, ordine_visualizzazione: 4, attiva: 1 }).id;
    const catBevande = db.insert('categorie', { nome: 'Bevande e Birre', categoria_padre_id: null, ordine_visualizzazione: 5, attiva: 1 }).id;

    // Sotto-categorie Pizze
    const subClassiche = db.insert('categorie', { nome: 'Pizze Classiche', categoria_padre_id: catPizze, ordine_visualizzazione: 1, attiva: 1 }).id;
    const subSpeciali = db.insert('categorie', { nome: 'Pizze Speciali', categoria_padre_id: catPizze, ordine_visualizzazione: 2, attiva: 1 }).id;
    const subGourmet = db.insert('categorie', { nome: 'Pizze Gourmet', categoria_padre_id: catPizze, ordine_visualizzazione: 3, attiva: 1 }).id;

    // 3. Inserisci INGREDIENTI
    const ingPomodoro = db.insert('ingredienti', { nome: 'Pomodoro', prezzo_aggiunta: 0.50, prezzo_rimozione: 0.0, tipo: 'base', disponibile: 1 }).id;
    const ingMozzarella = db.insert('ingredienti', { nome: 'Mozzarella', prezzo_aggiunta: 0.80, prezzo_rimozione: 0.0, tipo: 'base', disponibile: 1 }).id;
    const ingSotto = db.insert('ingredienti', { nome: 'Prosciutto Cotto', prezzo_aggiunta: 1.20, prezzo_rimozione: 0.0, tipo: 'extra', disponibile: 1 }).id;
    const ingFunghi = db.insert('ingredienti', { nome: 'Funghi Champignon', prezzo_aggiunta: 1.00, prezzo_rimozione: 0.0, tipo: 'extra', disponibile: 1 }).id;
    const ingSalame = db.insert('ingredienti', { nome: 'Salame Piccante', prezzo_aggiunta: 1.20, prezzo_rimozione: 0.0, tipo: 'extra', disponibile: 1 }).id;
    const ingCarciofi = db.insert('ingredienti', { nome: 'Carciofini sott\'olio', prezzo_aggiunta: 1.00, prezzo_rimozione: 0.0, tipo: 'extra', disponibile: 1 }).id;
    const ingOlive = db.insert('ingredienti', { nome: 'Olive Nere', prezzo_aggiunta: 0.80, prezzo_rimozione: 0.0, tipo: 'extra', disponibile: 1 }).id;
    const ingAcciughe = db.insert('ingredienti', { nome: 'Alici di Cetara', prezzo_aggiunta: 1.50, prezzo_rimozione: 0.0, tipo: 'extra', disponibile: 1 }).id;
    
    // Ingredienti Premium/Gourmet
    const ingGorgonzola = db.insert('ingredienti', { nome: 'Gorgonzola DOP', prezzo_aggiunta: 1.50, prezzo_rimozione: 0.0, tipo: 'premium', disponibile: 1 }).id;
    const ingNduja = db.insert('ingredienti', { nome: 'Nduja di Spilinga', prezzo_aggiunta: 1.50, prezzo_rimozione: 0.0, tipo: 'premium', disponibile: 1 }).id;
    const ingBurrata = db.insert('ingredienti', { nome: 'Burrata Pugliese', prezzo_aggiunta: 2.50, prezzo_rimozione: 0.0, tipo: 'premium', disponibile: 1 }).id;
    const ingTartufo = db.insert('ingredienti', { nome: 'Salsa al Tartufo', prezzo_aggiunta: 3.00, prezzo_rimozione: 0.0, tipo: 'premium', disponibile: 1 }).id;
    const ingFriarielli = db.insert('ingredienti', { nome: 'Friarielli Napoletani', prezzo_aggiunta: 1.80, prezzo_rimozione: 0.0, tipo: 'premium', disponibile: 1 }).id;
    const ingSalsiccia = db.insert('ingredienti', { nome: 'Salsiccia di maiale', prezzo_aggiunta: 1.50, prezzo_rimozione: 0.0, tipo: 'premium', disponibile: 1 }).id;
    const ingPistacchio = db.insert('ingredienti', { nome: 'Pesto di Pistacchio', prezzo_aggiunta: 2.20, prezzo_rimozione: 0.0, tipo: 'premium', disponibile: 1 }).id;
    const ingMortadella = db.insert('ingredienti', { nome: 'Mortadella Bologna IGP', prezzo_aggiunta: 1.80, prezzo_rimozione: 0.0, tipo: 'premium', disponibile: 1 }).id;

    // 4. Inserisci PRODOTTI del menu

    // --- PIZZE CLASSICHE ---
    const pMargherita = db.insert('prodotti', { categoria_id: subClassiche, nome: 'Margherita', descrizione: 'Pomodoro, mozzarella e basilico fresco', prezzo: 6.00, costo: 1.60, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 1 }).id;
    const pMarinara = db.insert('prodotti', { categoria_id: subClassiche, nome: 'Marinara', descrizione: 'Pomodoro, aglio, origano e olio EVO', prezzo: 5.00, costo: 1.00, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 2 }).id;
    const pNapoli = db.insert('prodotti', { categoria_id: subClassiche, nome: 'Napoli', descrizione: 'Pomodoro, mozzarella, alici di Cetara e origano', prezzo: 7.50, costo: 2.10, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 3 }).id;
    const pDiavola = db.insert('prodotti', { categoria_id: subClassiche, nome: 'Diavola', descrizione: 'Pomodoro, mozzarella e salame piccante calabrese', prezzo: 7.50, costo: 2.00, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 4 }).id;
    const pCapricciosa = db.insert('prodotti', { categoria_id: subClassiche, nome: 'Capricciosa', descrizione: 'Pomodoro, mozzarella, cotto, funghi, carciofini e olive nere', prezzo: 8.50, costo: 2.60, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 5 }).id;
    const pQuattroFormaggi = db.insert('prodotti', { categoria_id: subClassiche, nome: 'Quattro Formaggi', descrizione: 'Mozzarella, gorgonzola DOP, provola affumicata, scaglie di parmigiano', prezzo: 8.50, costo: 2.30, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 6 }).id;
    const pBufalina = db.insert('prodotti', { categoria_id: subClassiche, nome: 'Bufalina', descrizione: 'Pomodoro, mozzarella di bufala campana DOP e basilico', prezzo: 8.00, costo: 2.20, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 7 }).id;

    // --- PIZZE SPECIALI ---
    const pSalsicciaFriarielli = db.insert('prodotti', { categoria_id: subSpeciali, nome: 'Salsiccia e Friarielli', descrizione: 'Bianca con mozzarella, salsiccia fresca e friarielli saltati', prezzo: 9.50, costo: 2.80, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 1 }).id;
    const pCalabrese = db.insert('prodotti', { categoria_id: subSpeciali, nome: 'Calabrese Suprema', descrizione: 'Pomodoro, mozzarella, salame piccante e nduja di Spilinga', prezzo: 9.00, costo: 2.60, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 2 }).id;
    const pQuattroStagioni = db.insert('prodotti', { categoria_id: subSpeciali, nome: 'Quattro Stagioni', descrizione: 'Pomodoro, mozzarella, suddivisa in: cotto, funghi, carciofini, salame', prezzo: 8.50, costo: 2.50, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 3 }).id;
    const pOrtolana = db.insert('prodotti', { categoria_id: subSpeciali, nome: 'Ortolana', descrizione: 'Pomodoro, mozzarella, zucchine, melanzane e peperoni grigliati', prezzo: 8.00, costo: 2.10, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 4 }).id;

    // --- PIZZE GOURMET ---
    const pReginaGourmet = db.insert('prodotti', { categoria_id: subGourmet, nome: 'Regina Gourmet', descrizione: 'Mozzarella di bufala, pomodorini secchi, burrata fresca pugliese e olio al basilico', prezzo: 12.50, costo: 4.00, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 1 }).id;
    const pTartufata = db.insert('prodotti', { categoria_id: subGourmet, nome: 'Tartufata', descrizione: 'Mozzarella, salsa al tartufo, funghi porcini, scaglie di grana e olio tartufato', prezzo: 13.00, costo: 4.50, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 2 }).id;
    const pPistacchiosa = db.insert('prodotti', { categoria_id: subGourmet, nome: 'Pistacchiosa', descrizione: 'Mozzarella, pesto di pistacchio, mortadella Bologna IGP e granella di pistacchi', prezzo: 12.50, costo: 3.80, personalizzabile: 1, disponibile: 1, ordine_visualizzazione: 3 }).id;

    // --- FRITTI TRADIZIONALI ---
    db.insert('prodotti', { categoria_id: catFritti, nome: 'Supplì Classico', descrizione: 'Riso al pomodoro con cuore di mozzarella filante', prezzo: 1.80, costo: 0.40, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 1 });
    db.insert('prodotti', { categoria_id: catFritti, nome: 'Supplì Cacio e Pepe', descrizione: 'Riso con pecorino romano DOP, pepe nero e mozzarella', prezzo: 2.00, costo: 0.50, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 2 });
    db.insert('prodotti', { categoria_id: catFritti, nome: 'Crocchetta di Patate', descrizione: 'Patate fresche, prezzemolo, parmigiano e mozzarella', prezzo: 1.50, costo: 0.30, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 3 });
    db.insert('prodotti', { categoria_id: catFritti, nome: 'Frittatina Napoletana', descrizione: 'Bucatini con besciamella, carne macinata, piselli e provola impanati e fritti', prezzo: 2.50, costo: 0.70, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 4 });
    db.insert('prodotti', { categoria_id: catFritti, nome: 'Fiore di Zucca', descrizione: 'Fiore di zucca pastellato ripieno di ricotta e acciughe', prezzo: 2.20, costo: 0.60, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 5 });

    // --- PRIMI PIATTI ---
    db.insert('prodotti', { categoria_id: catPrimi, nome: 'Lasagna alla Bolognese', descrizione: 'Lasagna classica fatta in casa con ragù di carne e besciamella', prezzo: 8.50, costo: 2.60, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 1 });
    db.insert('prodotti', { categoria_id: catPrimi, nome: 'Gnocchi alla Sorrentina', descrizione: 'Gnocchi di patate al pomodoro, mozzarella filante e basilico al forno', prezzo: 8.00, costo: 2.00, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 2 });

    // --- DOLCI ARTIGIANALI ---
    db.insert('prodotti', { categoria_id: catDolci, nome: 'Tiramisù al Caffè', descrizione: 'Tiramisù artigianale monoporzione con mascarpone e caffè espresso', prezzo: 4.50, costo: 1.10, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 1 });
    db.insert('prodotti', { categoria_id: catDolci, nome: 'Babà Napoletano', descrizione: 'Babà classico napoletano bagnato al rum', prezzo: 4.00, costo: 0.90, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 2 });
    db.insert('prodotti', { categoria_id: catDolci, nome: 'Panna Cotta ai Frutti di Bosco', descrizione: 'Panna cotta artigianale servita con salsa ai frutti di bosco', prezzo: 4.00, costo: 0.85, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 3 });

    // --- BEVANDE E BIRRE ---
    db.insert('prodotti', { categoria_id: catBevande, nome: 'Acqua Minerale Naturale 50cl', descrizione: 'In bottiglia di plastica', prezzo: 1.00, costo: 0.15, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 1 });
    db.insert('prodotti', { categoria_id: catBevande, nome: 'Acqua Minerale Frizzante 50cl', descrizione: 'In bottiglia di plastica', prezzo: 1.00, costo: 0.15, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 2 });
    db.insert('prodotti', { categoria_id: catBevande, nome: 'Coca Cola Lattina 33cl', descrizione: 'Coca Cola classica', prezzo: 2.20, costo: 0.55, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 3 });
    db.insert('prodotti', { categoria_id: catBevande, nome: 'Coca Zero Lattina 33cl', descrizione: 'Coca Cola senza zuccheri', prezzo: 2.20, costo: 0.55, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 4 });
    db.insert('prodotti', { categoria_id: catBevande, nome: 'Fanta Lattina 33cl', descrizione: 'Fanta orange', prezzo: 2.20, costo: 0.55, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 5 });
    db.insert('prodotti', { categoria_id: catBevande, nome: 'Sprite Lattina 33cl', descrizione: 'Sprite limone', prezzo: 2.20, costo: 0.55, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 6 });
    db.insert('prodotti', { categoria_id: catBevande, nome: 'Birra Moretti Ricetta Classica 66cl', descrizione: 'Birra lager italiana', prezzo: 3.50, costo: 1.05, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 7 });
    db.insert('prodotti', { categoria_id: catBevande, nome: 'Birra Ichnusa Non Filtrata 50cl', descrizione: 'Birra bionda sarda a bassa fermentazione', prezzo: 3.80, costo: 1.25, personalizzabile: 0, disponibile: 1, ordine_visualizzazione: 8 });

    // 5. Inserisci ASSOCIAZIONI PRODOTTO_INGREDIENTI (Ricetta Base delle Pizze)

    // Margherita: Pomodoro + Mozzarella
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pMargherita, ingrediente_id: ingPomodoro, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pMargherita, ingrediente_id: ingMozzarella, predefinito: 1 });

    // Marinara: Pomodoro
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pMarinara, ingrediente_id: ingPomodoro, predefinito: 1 });

    // Napoli: Pomodoro + Mozzarella + Acciughe
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pNapoli, ingrediente_id: ingPomodoro, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pNapoli, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pNapoli, ingrediente_id: ingAcciughe, predefinito: 1 });

    // Diavola: Pomodoro + Mozzarella + Salame Piccante
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pDiavola, ingrediente_id: ingPomodoro, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pDiavola, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pDiavola, ingrediente_id: ingSalame, predefinito: 1 });

    // Capricciosa: Pomodoro + Mozzarella + Cotto + Funghi + Carciofini + Olive
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCapricciosa, ingrediente_id: ingPomodoro, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCapricciosa, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCapricciosa, ingrediente_id: ingSotto, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCapricciosa, ingrediente_id: ingFunghi, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCapricciosa, ingrediente_id: ingCarciofi, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCapricciosa, ingrediente_id: ingOlive, predefinito: 1 });

    // Quattro Formaggi: Mozzarella + Gorgonzola
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pQuattroFormaggi, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pQuattroFormaggi, ingrediente_id: ingGorgonzola, predefinito: 1 });

    // Bufalina: Pomodoro + Mozzarella (Bufala)
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pBufalina, ingrediente_id: ingPomodoro, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pBufalina, ingrediente_id: ingMozzarella, predefinito: 1 }); // bufala mappata come mozzarella base

    // Salsiccia e Friarielli: Mozzarella + Salsiccia + Friarielli
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pSalsicciaFriarielli, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pSalsicciaFriarielli, ingrediente_id: ingSalsiccia, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pSalsicciaFriarielli, ingrediente_id: ingFriarielli, predefinito: 1 });

    // Calabrese: Pomodoro + Mozzarella + Salame + Nduja
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCalabrese, ingrediente_id: ingPomodoro, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCalabrese, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCalabrese, ingrediente_id: ingSalame, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pCalabrese, ingrediente_id: ingNduja, predefinito: 1 });

    // Quattro Stagioni: Pomodoro + Mozzarella + Cotto + Funghi + Carciofini + Salame
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pQuattroStagioni, ingrediente_id: ingPomodoro, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pQuattroStagioni, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pQuattroStagioni, ingrediente_id: ingSotto, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pQuattroStagioni, ingrediente_id: ingFunghi, predefinito: 1 });

    // Ortolana: Pomodoro + Mozzarella
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pOrtolana, ingrediente_id: ingPomodoro, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pOrtolana, ingrediente_id: ingMozzarella, predefinito: 1 });

    // Regina Gourmet: Mozzarella + Burrata
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pReginaGourmet, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pReginaGourmet, ingrediente_id: ingBurrata, predefinito: 1 });

    // Tartufata: Mozzarella + Tartufo + Funghi
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pTartufata, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pTartufata, ingrediente_id: ingTartufo, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pTartufata, ingrediente_id: ingFunghi, predefinito: 1 });

    // Pistacchiosa: Mozzarella + Pistacchio + Mortadella
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pPistacchiosa, ingrediente_id: ingMozzarella, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pPistacchiosa, ingrediente_id: ingPistacchio, predefinito: 1 });
    db.insertRelation('prodotto_ingredienti', { prodotto_id: pPistacchiosa, ingrediente_id: ingMortadella, predefinito: 1 });

    // 6. Inserisci CLIENTI
    const c1 = db.insert('clienti', { nome: 'Giuseppe', cognome: 'Rossi', telefono: '3331234567', email: 'giuseppe.rossi@email.com', note: 'Pizza ben cotta, quasi bruciacchiata al bordo', punti_fedelta: 140, contatore_pizze: 4, creato_il: '2026-05-01 12:00:00', ultimo_ordine: '2026-05-28 20:30:00' }).id;
    const c2 = db.insert('clienti', { nome: 'Laura', cognome: 'Bianchi', telefono: '3479876543', email: 'laura.bianchi@email.com', note: 'Allergica a crostacei e frutti di mare', punti_fedelta: 45, contatore_pizze: 1, creato_il: '2026-05-10 15:20:00', ultimo_ordine: '2026-05-25 19:40:00' }).id;
    const c3 = db.insert('clienti', { nome: 'Marco', cognome: 'Neri', telefono: '3291122334', email: null, note: 'Citofono rotto int. 12, suonare Rossi al piano terra', punti_fedelta: 245, contatore_pizze: 8, creato_il: '2026-05-05 18:00:00', ultimo_ordine: '2026-05-29 21:00:00' }).id;
    const c4 = db.insert('clienti', { nome: 'Francesca', cognome: 'Verdi', telefono: '3404455667', email: 'fran.verdi@email.com', note: null, punti_fedelta: 15, contatore_pizze: 0, creato_il: '2026-05-28 19:00:00', ultimo_ordine: '2026-05-28 20:05:00' }).id;

    // 7. Inserisci COUPON
    const cp1 = db.insert('coupon', { codice: 'SCONTO10', tipo: 'percentuale', valore: 10.0, prodotto_gratis_id: null, valido_dal: '2026-01-01', valido_al: '2026-12-31', utilizzi_massimi: 9999, utilizzi_correnti: 0, attivo: 1 }).id;
    const cp2 = db.insert('coupon', { codice: 'PIZZA5EURO', tipo: 'fisso', valore: 5.0, prodotto_gratis_id: null, valido_dal: '2026-01-01', valido_al: '2026-12-31', utilizzi_massimi: 9999, utilizzi_correnti: 0, attivo: 1 }).id;

    // Assegna coupon
    db.insert('coupon_clienti', { coupon_id: cp1, cliente_id: c1, utilizzato: 0, assegnato_il: '2026-05-01 12:00:00', utilizzato_il: null });
    db.insert('coupon_clienti', { coupon_id: cp2, cliente_id: c2, utilizzato: 0, assegnato_il: '2026-05-10 15:20:00', utilizzato_il: null });

    // 8. Storico Punti
    db.insert('storico_punti', { cliente_id: c1, ordine_id: null, punti: 50, descrizione: 'Punti iscrizione omaggio', data: '2026-05-10 18:30:00' });
    db.insert('storico_punti', { cliente_id: c1, ordine_id: null, punti: 90, descrizione: 'Punti spesi in ordini precedenti', data: '2026-05-20 20:15:00' });
    db.insert('storico_punti', { cliente_id: c2, ordine_id: null, punti: 45, descrizione: 'Punti accreditati per ordine', data: '2026-05-25 19:40:00' });
    db.insert('storico_punti', { cliente_id: c3, ordine_id: null, punti: 245, descrizione: 'Punti accreditati da storico transazioni', data: '2026-05-15 21:00:00' });
    db.insert('storico_punti', { cliente_id: c4, ordine_id: null, punti: 15, descrizione: 'Punti per ordine registrato', data: '2026-05-28 20:05:00' });

    // Ordini passati per popolare i report iniziali
    const o1 = db.insert('ordini', {
      numero_ordine: 'ORD-20260528-001',
      cliente_id: c1,
      utente_id: uDipendente.id,
      stato: 'ritirato',
      canale: 'telefono',
      metodo_pagamento: 'contanti',
      totale: 15.50,
      sconto: 0.0,
      nota: 'Consegna rapida',
      creato_il: '2026-05-28 19:30:00',
      pronto_il: '2026-05-28 19:45:00',
      ritirato_il: '2026-05-28 20:30:00'
    }).id;

    db.insert('righe_ordine', { ordine_id: o1, prodotto_id: pMargherita, quantita: 2, prezzo_unitario: 6.00, personalizzazioni_json: JSON.stringify({ aggiunti: [], rimossi: [] }), nota: '' });
    db.insert('righe_ordine', { ordine_id: o1, prodotto_id: pBufalina, quantita: 1, prezzo_unitario: 8.00, personalizzazioni_json: JSON.stringify({ aggiunti: [], rimossi: [] }), nota: '' });

    const o2 = db.insert('ordini', {
      numero_ordine: 'ORD-20260529-001',
      cliente_id: c3,
      utente_id: uResponsabile.id,
      stato: 'ritirato',
      canale: 'banco',
      metodo_pagamento: 'pos',
      totale: 25.00,
      sconto: 0.0,
      nota: '',
      creato_il: '2026-05-29 20:00:00',
      pronto_il: '2026-05-29 20:20:00',
      ritirato_il: '2026-05-29 21:00:00'
    }).id;

    db.insert('righe_ordine', { ordine_id: o2, prodotto_id: pDiavola, quantita: 2, prezzo_unitario: 7.50, personalizzazioni_json: JSON.stringify({ aggiunti: [], rimossi: [] }), nota: '' });
    db.insert('righe_ordine', { ordine_id: o2, prodotto_id: pReginaGourmet, quantita: 1, prezzo_unitario: 12.50, personalizzazioni_json: JSON.stringify({ aggiunti: [ingTartufo], rimossi: [ingMozzarella] }), nota: 'Sostituire mozzarella con burrata' });

    db.save();
    console.log('Database JSON popolato con successo con menu completo ed ordini demo.');
  } catch (err) {
    console.error('Errore durante il seeding del database JSON:', err);
    throw err;
  }
}

module.exports = { seedDb };
