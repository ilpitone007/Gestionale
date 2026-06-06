const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // Recupera il token dall'header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

  if (!token) {
    return res.status(401).json({ errore: 'Accesso negato. Token non fornito.' });
  }

  try {
    // Verifica il token utilizzando la chiave segreta (in produzione definita in .env)
    const secret = process.env.JWT_SECRET || 'pizzeria_super_secret_key_2026';
    const utenteDecodificato = jwt.verify(token, secret);
    
    // Allega le info dell'utente alla richiesta
    req.utente = utenteDecodificato;
    next();
  } catch (err) {
    return res.status(403).json({ errore: 'Token non valido o scaduto.' });
  }
}

module.exports = authMiddleware;
