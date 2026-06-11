const API_URL = 'http://localhost:5001/api';

async function runSecurityTests() {
  console.log('=== AVVIO SECURITY & STRESS TEST SUITE ===\n');

  const report = {
    loginTypeValidation: { pass: false, details: '' },
    loginRateLimiter: { pass: false, details: '' },
    logFloodingLimiter: { pass: false, details: '' },
    orderQuantityValidation: { pass: false, details: '' },
    orderNegativeDiscountValidation: { pass: false, details: '' },
    completedOrderLock: { pass: false, details: '' }
  };

  // Helper per login valido (serve per ottenere il token per i test successivi)
  let tokenDipendente = '';
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dipendente', password: 'dipendente123' })
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      tokenDipendente = data.token;
    }
  } catch (e) {
    console.error('Impossibile ottenere token dipendente per i test:', e.message);
  }

  // ----------------------------------------------------
  // 1. Test Validazione Tipi su Login
  // ----------------------------------------------------
  console.log('1. Test validazione tipi su login (prevenzione TypeError/crash)...');
  try {
    const badLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: [], password: '123' }) // Passa un array anziché una stringa
    });
    const data = await badLoginRes.json();
    if (badLoginRes.status === 400 && data.errore) {
      report.loginTypeValidation.pass = true;
      report.loginTypeValidation.details = `OK: Ricevuto errore 400 come atteso: "${data.errore}"`;
      console.log('   🟢 Test superato: bloccato username non stringa.');
    } else {
      report.loginTypeValidation.details = `FALLITO: Stato ${badLoginRes.status}`;
      console.log('   🔴 Test fallito: il server non ha bloccato il tipo di dato errato.');
    }
  } catch (err) {
    report.loginTypeValidation.details = `ECCEZIONE: ${err.message}`;
    console.log('   🔴 Test fallito con eccezione:', err.message);
  }

  // ----------------------------------------------------
  // 2. Test Rate Limiter su Login
  // ----------------------------------------------------
  console.log('\n2. Test rate-limiting su login (brute-force protection)...');
  try {
    let blockedCount = 0;
    let successCount = 0;
    let rateLimited = false;

    // Eseguiamo 15 tentativi consecutivi (limite impostato a 10 ogni 5m)
    for (let i = 1; i <= 15; i++) {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'dipendente', password: 'password_errata' })
      });
      if (res.status === 429) {
        rateLimited = true;
        blockedCount++;
      } else if (res.status === 401) {
        successCount++;
      }
    }

    if (rateLimited && blockedCount > 0) {
      report.loginRateLimiter.pass = true;
      report.loginRateLimiter.details = `OK: Bloccate ${blockedCount} richieste con 429. Tentativi non bloccati: ${successCount}`;
      console.log(`   🟢 Test superato: bloccato dal rate-limiter dopo 10 tentativi falliti.`);
    } else {
      report.loginRateLimiter.details = `FALLITO: Nessun blocco 429 registrato. Richieste gestite: ${successCount}`;
      console.log('   🔴 Test fallito: il rate limiter non ha bloccato i tentativi.');
    }
  } catch (err) {
    report.loginRateLimiter.details = `ECCEZIONE: ${err.message}`;
    console.log('   🔴 Test fallito con eccezione:', err.message);
  }

  // ----------------------------------------------------
  // 3. Test Rate Limiter su Log Flooding
  // ----------------------------------------------------
  console.log('\n3. Test rate-limiting su inserimento log client (DoS protection)...');
  try {
    let blockedCount = 0;
    let rateLimited = false;

    // Eseguiamo 10 tentativi di scrittura log (limite impostato a 5 al minuto)
    for (let i = 1; i <= 10; i++) {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDipendente}`
        },
        body: JSON.stringify({ messaggio: 'Test log spam', tipo: 'INFO' })
      });
      if (res.status === 429) {
        rateLimited = true;
        blockedCount++;
      }
    }

    if (rateLimited && blockedCount > 0) {
      report.logFloodingLimiter.pass = true;
      report.logFloodingLimiter.details = `OK: Bloccati ${blockedCount} tentativi di spam log con stato 429.`;
      console.log(`   🟢 Test superato: log flooding bloccato (bloccati ${blockedCount} invii).`);
    } else {
      report.logFloodingLimiter.details = 'FALLITO: Nessun blocco 429 sui log.';
      console.log('   🔴 Test fallito: il rate limiter sui log non è intervenuto.');
    }
  } catch (err) {
    report.logFloodingLimiter.details = `ECCEZIONE: ${err.message}`;
    console.log('   🔴 Test fallito con eccezione:', err.message);
  }

  // ----------------------------------------------------
  // 4. Test Validazione Quantità negli Ordini
  // ----------------------------------------------------
  console.log('\n4. Test validazione quantità negli ordini (quantità <= 0, > 100)...');
  try {
    // A. Quantità <= 0
    const resBadQuantita = await fetch(`${API_URL}/ordini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({
        canale: 'banco',
        metodo_pagamento: 'contanti',
        righe: [{ prodotto_id: 1, quantita: 0 }]
      })
    });

    // B. Quantità > 100
    const resExcessiveQuantita = await fetch(`${API_URL}/ordini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({
        canale: 'banco',
        metodo_pagamento: 'contanti',
        righe: [{ prodotto_id: 1, quantita: 150 }]
      })
    });

    if (resBadQuantita.status === 400 && resExcessiveQuantita.status === 400) {
      report.orderQuantityValidation.pass = true;
      report.orderQuantityValidation.details = 'OK: Bloccati correttamente sia ordini con quantita=0 che quantita > 100.';
      console.log('   🟢 Test superato: bloccati ordini con quantità invalida o eccessiva.');
    } else {
      report.orderQuantityValidation.details = `FALLITO: quantita_0_status=${resBadQuantita.status}, quantita_150_status=${resExcessiveQuantita.status}`;
      console.log('   🔴 Test fallito: il server ha accettato quantità non valide.');
    }
  } catch (err) {
    report.orderQuantityValidation.details = `ECCEZIONE: ${err.message}`;
    console.log('   🔴 Test fallito con eccezione:', err.message);
  }

  // ----------------------------------------------------
  // 5. Test Sconto Negativo
  // ----------------------------------------------------
  console.log('\n5. Test validazione sconti negativi negli ordini...');
  try {
    const resNegativeDiscount = await fetch(`${API_URL}/ordini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({
        canale: 'banco',
        metodo_pagamento: 'contanti',
        sconto: -10, // Sconto negativo
        righe: [{ prodotto_id: 1, quantita: 2 }]
      })
    });

    if (resNegativeDiscount.status === 400) {
      report.orderNegativeDiscountValidation.pass = true;
      report.orderNegativeDiscountValidation.details = 'OK: Ricevuto errore 400 su sconto negativo.';
      console.log('   🟢 Test superato: sconto negativo rifiutato.');
    } else {
      report.orderNegativeDiscountValidation.details = `FALLITO: Stato ${resNegativeDiscount.status}`;
      console.log('   🔴 Test fallito: sconto negativo accettato dal backend.');
    }
  } catch (err) {
    report.orderNegativeDiscountValidation.details = `ECCEZIONE: ${err.message}`;
    console.log('   🔴 Test fallito con eccezione:', err.message);
  }

  // ----------------------------------------------------
  // 6. Test Blocco Modifiche su Ordini Completati
  // ----------------------------------------------------
  console.log('\n6. Test blocco modifiche su ordini già completati/pronti...');
  try {
    // Per testare, creiamo un ordine, lo avanziamo a 'pronto' e poi proviamo a modificarlo
    const resCrea = await fetch(`${API_URL}/ordini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({
        canale: 'banco',
        metodo_pagamento: 'contanti',
        righe: [{ prodotto_id: 1, quantita: 1 }]
      })
    });
    const ordine = await resCrea.json();

    // Lo avanziamo a in_preparazione poi a pronto (rispettando la macchina a stati)
    await fetch(`${API_URL}/ordini/${ordine.id}/stato`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({ stato: 'in_preparazione' })
    });

    await fetch(`${API_URL}/ordini/${ordine.id}/stato`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({ stato: 'pronto' })
    });

    // Tentativo di modifica dell'ordine pronto
    const resModifica = await fetch(`${API_URL}/ordini/${ordine.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDipendente}`
      },
      body: JSON.stringify({
        righe: [{ prodotto_id: 1, quantita: 5 }],
        nota: 'Hackerato'
      })
    });

    if (resModifica.status === 400) {
      report.completedOrderLock.pass = true;
      report.completedOrderLock.details = 'OK: Ricevuto errore 400 quando si tenta di modificare un ordine già pronto.';
      console.log('   🟢 Test superato: modifiche su ordine in stato "pronto" bloccate correttamente.');
    } else {
      report.completedOrderLock.details = `FALLITO: Modifica consentita, status=${resModifica.status}`;
      console.log('   🔴 Test fallito: il server ha permesso di modificare un ordine già pronto.');
    }
  } catch (err) {
    report.completedOrderLock.details = `ECCEZIONE: ${err.message}`;
    console.log('   🔴 Test fallito con eccezione:', err.message);
  }

  console.log('\n=== CONCLUSIONE SECURITY & STRESS TEST ===');
  console.log(JSON.stringify(report, null, 2));
}

runSecurityTests();
