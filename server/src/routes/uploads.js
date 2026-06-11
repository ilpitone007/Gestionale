const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const permettiRuoli = require('../middleware/ruoli');

// Rotta per caricare il logo (solo Titolare)
// Registriamo un parser specifico con limite di 2MB per consentire immagini più grandi di 100kb
router.post('/logo', express.json({ limit: '2mb' }), authMiddleware, permettiRuoli('titolare'), async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ errore: 'Nessuna immagine fornita.' });
  }

  // Verifica il formato base64
  const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ errore: 'Formato immagine non valido. Deve essere un URI base64 valido.' });
  }

  const estensione = matches[1].toLowerCase();
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Limite di dimensione 2MB
  if (buffer.length > 2 * 1024 * 1024) {
    return res.status(400).json({ errore: 'La dimensione dell\'immagine supera il limite di 2MB.' });
  }

  // Definisce la cartella di destinazione
  const dbPath = process.env.DB_PATH 
    ? path.resolve(process.env.DB_PATH) 
    : path.resolve(__dirname, '..', 'db', 'pizzeria_db.json');
  const dataDir = path.dirname(dbPath);
  const uploadsDir = path.join(dataDir, 'uploads');

  try {
    if (!fs.existsSync(uploadsDir)) {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    }

    // Usiamo un nome fisso "logo" con l'estensione originale per evitare di accumulare loghi obsoleti
    const nomeFile = `logo.${estensione}`;
    const percorsoSalvataggio = path.join(uploadsDir, nomeFile);

    // Cancella eventuali vecchi loghi con estensioni diverse per pulizia
    const estensioniSupportate = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    for (const ext of estensioniSupportate) {
      if (ext !== estensione) {
        const vecchioLogo = path.join(uploadsDir, `logo.${ext}`);
        if (fs.existsSync(vecchioLogo)) {
          try { await fs.promises.unlink(vecchioLogo); } catch (e) {}
        }
      }
    }

    await fs.promises.writeFile(percorsoSalvataggio, buffer);

    // Ritorniamo l'URL pubblico con un parametro timestamp per forzare il refresh della cache del browser
    const urlPubblico = `/api/uploads/${nomeFile}?t=${Date.now()}`;
    res.json({ url: urlPubblico });
  } catch (err) {
    console.error('[Upload] Errore nel salvataggio dell\'immagine:', err);
    res.status(500).json({ errore: 'Impossibile salvare l\'immagine sul server.' });
  }
});

module.exports = router;
