const ipRequests = new Map();

// Pulisce periodicamente la mappa dei blocchi per evitare consumi di memoria
setInterval(() => {
  const adesso = Date.now();
  for (const [ip, data] of ipRequests.entries()) {
    if (adesso > data.resetTime) {
      ipRequests.delete(ip);
    }
  }
}, 60000); // Esegui pulizia ogni minuto

/**
 * Crea un middleware di rate limiter in memoria (zero-dipendenze).
 * @param {Object} opzioni
 * @param {number} opzioni.finestraMs - Finestra temporale in millisecondi
 * @param {number} opzioni.limiteMax - Massimo numero di richieste consentite nella finestra
 * @param {string} opzioni.messaggio - Messaggio di errore da restituire
 */
function creaRateLimiter({ finestraMs, limiteMax, messaggio }) {
  return (req, res, next) => {
    // Estrae l'IP del client in modo sicuro
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const adesso = Date.now();

    if (!ipRequests.has(ip)) {
      ipRequests.set(ip, {
        conteggio: 1,
        resetTime: adesso + finestraMs
      });
      return next();
    }

    const data = ipRequests.get(ip);

    // Se la finestra temporale è scaduta, resetta il contatore
    if (adesso > data.resetTime) {
      data.conteggio = 1;
      data.resetTime = adesso + finestraMs;
      return next();
    }

    // Incrementa il contatore
    data.conteggio += 1;

    // Se si supera il limite, blocca la richiesta
    if (data.conteggio > limiteMax) {
      return res.status(429).json({
        errore: messaggio || 'Troppe richieste da questo indirizzo IP. Riprova più tardi.'
      });
    }

    next();
  };
}

module.exports = { creaRateLimiter };
