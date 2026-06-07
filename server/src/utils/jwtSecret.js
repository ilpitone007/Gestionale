const crypto = require('crypto');

// Carica il segreto dall'ambiente. Se non fornito, genera una chiave sicura casuale in memoria all'avvio.
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  ATTENZIONE: JWT_SECRET non configurato in .env. Generata una chiave segreta sicura casuale in memoria.');
}

module.exports = jwtSecret;
