const fs = require('fs');
const path = require('path');

function eseguiBackup() {
  try {
    const dbPath = process.env.DB_PATH 
      ? path.resolve(process.env.DB_PATH) 
      : path.resolve(__dirname, '..', 'db', 'pizzeria_db.json');

    if (!fs.existsSync(dbPath)) {
      console.warn(`[Backup] File database non trovato in: ${dbPath}. Salto il backup.`);
      return;
    }

    const dataDir = path.dirname(dbPath);
    const backupsDir = path.join(dataDir, 'backups');

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const ora = new Date();
    const yyyy = ora.getFullYear();
    const mm = String(ora.getMonth() + 1).padStart(2, '0');
    const dd = String(ora.getDate()).padStart(2, '0');
    const hh = String(ora.getHours()).padStart(2, '0');
    const min = String(ora.getMinutes()).padStart(2, '0');
    const ss = String(ora.getSeconds()).padStart(2, '0');
    
    const timestamp = `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
    const backupPath = path.join(backupsDir, `pizzeria_db_backup_${timestamp}.json`);

    fs.copyFileSync(dbPath, backupPath);
    console.log(`[Backup] Copia di sicurezza creata con successo in: ${backupPath}`);
  } catch (err) {
    console.error('[Backup] Errore durante l\'esecuzione del backup automatico:', err);
  }
}

function pianificaBackup() {
  console.log('[Backup] Scheduler backup automatico avviato.');
  
  // Eseguiamo un backup iniziale al boot per testare la routine ed assicurarci che ci sia un backup iniziale
  eseguiBackup();

  const controllaOra = () => {
    const oraAttuale = new Date();
    const oraBackup = new Date();
    oraBackup.setHours(3, 0, 0, 0);

    if (oraAttuale.getTime() >= oraBackup.getTime()) {
      oraBackup.setDate(oraBackup.getDate() + 1);
    }

    const delay = oraBackup.getTime() - oraAttuale.getTime();
    console.log(`[Backup] Prossimo backup pianificato tra ${Math.round(delay / 1000 / 60)} minuti (alle 03:00)`);

    setTimeout(() => {
      eseguiBackup();
      // Dopo il primo trigger, impostiamo l'intervallo a ogni 24 ore
      setInterval(eseguiBackup, 24 * 60 * 60 * 1000);
    }, delay);
  };

  controllaOra();
}

module.exports = { eseguiBackup, pianificaBackup };
