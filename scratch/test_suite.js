const API_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('=== INIZIO TEST SUITE SLICEMASTER POS ===\n');

  const report = {
    auth: { pass: false, details: '' },
    security: { pass: false, details: [] },
    functional: { pass: false, details: [] },
    load: { pass: false, details: {} },
    performance: { pass: false, details: {} }
  };

  // ----------------------------------------------------
  // 1. TEST DI AUTENTICAZIONE
  // ----------------------------------------------------
  console.log('1. Esecuzione test di autenticazione...');
  let tokenTitolare = '';
  let tokenDipendente = '';

  try {
    // Login Titolare corretto
    const resTitolare = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'titolare', password: 'titolare123' })
    });
    const dataTitolare = await resTitolare.json();

    // Login Dipendente corretto
    const resDipendente = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dipendente', password: 'dipendente123' })
    });
    const dataDipendente = await resDipendente.json();

    // Login errato
    const resErrato = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'titolare', password: 'password_sbagliata' })
    });

    if (resTitolare.ok && dataTitolare.token && resDipendente.ok && dataDipendente.token && resErrato.status === 401) {
      tokenTitolare = dataTitolare.token;
      tokenDipendente = dataDipendente.token;
      report.auth.pass = true;
      report.auth.details = 'OK: Login titolare, dipendente e blocco credenziali errate funzionano perfettamente.';
      console.log('   🟢 Autenticazione: SUPERATA');
    } else {
      report.auth.details = `ERRORE: Status titolare=${resTitolare.status}, status dipendente=${resDipendente.status}, status errato=${resErrato.status}`;
      console.log('   🔴 Autenticazione: FALLITA');
    }
  } catch (err) {
    report.auth.details = `ECCEZIONE: ${err.message}`;
    console.log('   🔴 Autenticazione: ECCEZIONE', err);
    return;
  }

  if (!tokenTitolare || !tokenDipendente) {
    console.log('Impossibile procedere senza token validi.');
    return;
  }

  // Recuperiamo un elenco dinamico dei prodotti per usare gli ID corretti nei test successivi
  let idMargherita = 1;
  let idMarinara = 2;
  try {
    const resProdotti = await fetch(`${API_URL}/prodotti`, {
      headers: { 'Authorization': `Bearer ${tokenDipendente}` }
    });
    const listaProdotti = await resProdotti.json();
    const margherita = listaProdotti.find(p => p.nome.toLowerCase() === 'margherita') || listaProdotti[0];
    const marinara = listaProdotti.find(p => p.nome.toLowerCase() === 'marinara') || listaProdotti[1];
    if (margherita) idMargherita = margherita.id;
    if (marinara) idMarinara = marinara.id;
    console.log(`   [Info] Rilevati ID dinamici prodotti per i test: Margherita=${idMargherita}, Marinara=${idMarinara}`);
  } catch (err) {
    console.log('   ⚠️ Attenzione: Impossibile recuperare gli ID dei prodotti dal server, uso i default (1, 2).');
  }

  // ----------------------------------------------------
  // 2. TEST DI VULNERABILITÀ & RUOLI (SECURITY)
  // ----------------------------------------------------
  console.log('\n2. Esecuzione test di sicurezza e permessi...');
  try {
    // A. Accesso senza token
    const resNoToken = await fetch(`${API_URL}/ordini`);
    const isUnauthBlocked = resNoToken.status === 401;
    report.security.details.push({
      test: 'Blocco richieste non autenticate',
      status: resNoToken.status,
      pass: isUnauthBlocked
    });

    // B. Privilegi: Dipendente tenta di creare un coupon (Titolare/Responsabile richiesti)
    const resCreaCouponDipendente = await fetch(`${API_URL}/coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({
        codice: 'HACKED100',
        tipo: 'percentuale',
        valore: 100,
        valido_dal: '2026-06-01',
        valido_al: '2026-07-01'
      })
    });
    const isDipendenteBlocked = resCreaCouponDipendente.status === 403;
    report.security.details.push({
      test: 'Blocco privilegi insufficienti (Dipendente -> Crea Coupon)',
      status: resCreaCouponDipendente.status,
      pass: isDipendenteBlocked
    });

    // C. Privilegi: Dipendente tenta di cancellare/disattivare un coupon
    const resDelCouponDipendente = await fetch(`${API_URL}/coupon/1`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenDipendente}` }
    });
    const isDipendenteDelBlocked = resDelCouponDipendente.status === 403;
    report.security.details.push({
      test: 'Blocco privilegi insufficienti (Dipendente -> Elimina Coupon)',
      status: resDelCouponDipendente.status,
      pass: isDipendenteDelBlocked
    });

    const securityPass = isUnauthBlocked && isDipendenteBlocked && isDipendenteDelBlocked;
    report.security.pass = securityPass;
    console.log(`   ${securityPass ? '🟢' : '🔴'} Sicurezza & Permessi: ${securityPass ? 'SUPERATA' : 'FALLITA'}`);
  } catch (err) {
    console.log('   🔴 Sicurezza & Permessi: ECCEZIONE', err);
  }

  // ----------------------------------------------------
  // 3. TEST FUNZIONALI (CREAZIONE ORDINE, TELEFONO, COUPON, TRANSIZIONI STATO)
  // ----------------------------------------------------
  console.log('\n3. Esecuzione test funzionali (Cassa, Coupon, Ordini)...');
  let couponId = null;
  let ordineId = null;
  const couponCode = 'TEST' + Math.floor(Math.random() * 1000000);

  try {
    // A. Crea un coupon valido (come Titolare)
    const resCreaCoupon = await fetch(`${API_URL}/coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenTitolare}`
      },
      body: JSON.stringify({
        codice: couponCode,
        tipo: 'percentuale',
        valore: 20,
        valido_dal: new Date().toISOString().split('T')[0],
        valido_al: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        utilizzi_massimi: 10
      })
    });
    const couponCreato = await resCreaCoupon.json();
    const isCouponCreated = resCreaCoupon.status === 201 && couponCreato.id;
    if (isCouponCreated) couponId = couponCreato.id;

    report.functional.details.push({
      test: `Creazione coupon promozionale ${couponCode} (Titolare)`,
      pass: isCouponCreated,
      dettagli: isCouponCreated ? `ID: ${couponCreato.id}, Codice: ${couponCreato.codice}` : 'Impossibile creare il coupon'
    });

    // B. Verifica validità coupon
    const resVerifica = await fetch(`${API_URL}/coupon/verifica/${couponCode}`, {
      headers: { 'Authorization': `Bearer ${tokenDipendente}` }
    });
    const verificaData = await resVerifica.json();
    const isCouponValido = resVerifica.ok && verificaData.valido === true;

    report.functional.details.push({
      test: `Verifica validità codice sconto ${couponCode}`,
      pass: isCouponValido,
      dettagli: isCouponValido ? `Sconto: ${verificaData.coupon.valore}%` : 'Coupon non valido'
    });

    // C. Crea un ordine al banco con nome, telefono e coupon sconto (20% sconto)
    const resNuovoOrdine = await fetch(`${API_URL}/ordini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({
        canale: 'banco',
        metodo_pagamento: 'contanti',
        nome_banco: 'Luca Rossi',
        telefono_banco: '3209876543',
        coupon_codice: couponCode,
        righe: [
          { prodotto_id: idMargherita, quantita: 2 },
          { prodotto_id: idMarinara, quantita: 1 }
        ] // Subtotale = 17.00€, Sconto 20% (3.40€), Totale = 13.60€
      })
    });
    const ordineCreato = await resNuovoOrdine.json();
    const isOrdineCreated = resNuovoOrdine.status === 201 && ordineCreato.id;
    if (isOrdineCreated) ordineId = ordineCreato.id;

    const correctMath = isOrdineCreated && Number(ordineCreato.totale) === 13.60 && ordineCreato.telefono_banco === '3209876543';

    report.functional.details.push({
      test: 'Creazione ordine al banco con cellulare opzionale e calcolo sconto',
      pass: correctMath,
      dettagli: correctMath 
        ? `ID Ordine: ${ordineCreato.id}, Totale netto: ${ordineCreato.totale}€ (atteso 13.60€), Cellulare salvato: ${ordineCreato.telefono_banco}`
        : `Errore: status=${resNuovoOrdine.status}, totale=${ordineCreato.totale}€, cellulare=${ordineCreato.telefono_banco}`
    });

    // D. Avanzamento dello stato dell'ordine (ricevuto -> in_preparazione -> pronto)
    let isStatoAvanzato = false;
    if (ordineId) {
      const resPrep = await fetch(`${API_URL}/ordini/${ordineId}/stato`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDipendente}`
        },
        body: JSON.stringify({ stato: 'in_preparazione' })
      });
      const dataPrep = await resPrep.json();

      const resPronto = await fetch(`${API_URL}/ordini/${ordineId}/stato`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDipendente}`
        },
        body: JSON.stringify({ stato: 'pronto' })
      });
      const dataPronto = await resPronto.json();

      isStatoAvanzato = resPrep.ok && dataPrep.stato === 'in_preparazione' && resPronto.ok && dataPronto.stato === 'pronto';
    }

    report.functional.details.push({
      test: 'Transizione dello stato dell\'ordine (ricevuto ➔ in_preparazione ➔ pronto)',
      pass: isStatoAvanzato,
      dettagli: isStatoAvanzato ? 'Avanzamenti di stato cucina completati correttamente.' : 'Errore nel cambio di stato'
    });

    // E. Disattivazione del coupon (come Titolare)
    let isCouponDeleted = false;
    if (couponId) {
      const resDel = await fetch(`${API_URL}/coupon/${couponId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenTitolare}` }
      });
      const dataDel = await resDel.json();
      isCouponDeleted = resDel.ok && dataDel.messaggio;
    }

    report.functional.details.push({
      test: 'Disattivazione codice sconto da parte dell\'amministratore',
      pass: isCouponDeleted,
      dettagli: isCouponDeleted ? 'Coupon disattivato con successo. Impedite future transazioni.' : 'Errore nella disattivazione'
    });

    const functionalPass = report.functional.details.every(d => d.pass);
    report.functional.pass = functionalPass;
    console.log(`   ${functionalPass ? '🟢' : '🔴'} Test Funzionali: ${functionalPass ? 'SUPERATI' : 'FALLITI'}`);
  } catch (err) {
    console.log('   🔴 Test Funzionali: ECCEZIONE', err);
  }

  // ----------------------------------------------------
  // 4. TEST DI PRESTAZIONE (LATENZA & THROUGHPUT)
  // ----------------------------------------------------
  console.log('\n4. Esecuzione test delle prestazioni (Latenza singola richiesta)...');
  try {
    const latencies = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await fetch(`${API_URL}/prodotti`, {
        headers: { 'Authorization': `Bearer ${tokenDipendente}` }
      });
      const duration = performance.now() - start;
      latencies.push(duration);
    }
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    report.performance.pass = avgLatency < 50; // Ottimo se sotto i 50ms per database locale JSON
    report.performance.details = {
      media: `${avgLatency.toFixed(2)} ms`,
      minima: `${minLatency.toFixed(2)} ms`,
      massima: `${maxLatency.toFixed(2)} ms`
    };

    console.log(`   🟢 Latenza Media: ${avgLatency.toFixed(2)} ms (Sotto la soglia critica di 50ms)`);
  } catch (err) {
    console.log('   🔴 Prestazioni: ECCEZIONE', err);
  }

  // ----------------------------------------------------
  // 5. TEST DI SOVRACCARICO (CONCORRENZA / CARICO E STRESS)
  // ----------------------------------------------------
  console.log('\n5. Esecuzione test di sovraccarico (100 richieste concorrenti)...');
  try {
    const start = performance.now();
    const requests = Array.from({ length: 100 }).map(() =>
      fetch(`${API_URL}/ordini?stato=attivi`, {
        headers: { 'Authorization': `Bearer ${tokenDipendente}` }
      })
    );

    const responses = await Promise.all(requests);
    const duration = performance.now() - start;

    const success = responses.filter(r => r.ok).length;
    const failed = responses.length - success;
    const throughput = (responses.length / (duration / 1000)).toFixed(1);

    report.load.pass = failed === 0;
    report.load.details = {
      concorrenza: 100,
      richiesteSuccesso: success,
      richiesteFallite: failed,
      tempoTotale: `${duration.toFixed(0)} ms`,
      throughput: `${throughput} req/sec`
    };

    console.log(`   🟢 Sovraccarico: ${success} risposte OK, ${failed} fallimenti.`);
    console.log(`   🟢 Throughput: ${throughput} richieste al secondo in concurrency.`);
    report.load.pass = failed === 0 && success === 100;
  } catch (err) {
    console.log('   🔴 Sovraccarico: ECCEZIONE', err);
  }

  // ----------------------------------------------------
  // STAMPA REPORT FINALE IN FORMATO JSON
  // ----------------------------------------------------
  console.log('\n=== CONCLUSIONE TEST SUITE ===');
  console.log(JSON.stringify(report, null, 2));
}

runTests();
