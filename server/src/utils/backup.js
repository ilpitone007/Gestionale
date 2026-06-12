const fs = require('fs');
const path = require('path');
const db = require('../db/database');

async function eseguiBackup() {
  try {
    const dbPath = process.env.DB_PATH 
      ? path.resolve(process.env.DB_PATH) 
      : path.resolve(__dirname, '..', 'db', 'pizzeria_db.json');
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

    if (db.isSupabase) {
      // In Supabase mode, retrieve all data from the cloud and store it locally
      const tabelle = [
        'utenti',
        'categorie',
        'prodotti',
        'ingredienti',
        'prodotto_ingredienti',
        'clienti',
        'ordini',
        'righe_ordine',
        'coupon',
        'coupon_clienti',
        'storico_punti',
        'logs'
      ];
      
      const backupData = {
        impostazioni: db.data.impostazioni || {}
      };

      for (const tabella of tabelle) {
        backupData[tabella] = await db.getAll(tabella);
      }

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      console.log(`[Backup] Copia di sicurezza dei dati Supabase creata con successo in: ${backupPath}`);
    } else {
      if (!fs.existsSync(dbPath)) {
        console.warn(`[Backup] File database non trovato in: ${dbPath}. Salto il backup.`);
        return;
      }
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[Backup] Copia di sicurezza locale creata con successo in: ${backupPath}`);
    }
  } catch (err) {
    console.error('[Backup] Errore durante l\'esecuzione del backup automatico:', err);
  }
}

function pianificaBackup() {
  console.log('[Backup] Scheduler backup automatico avviato.');
  
  // Eseguiamo un backup iniziale al boot (asincrono)
  eseguiBackup().catch(err => {
    console.error('[Backup] Errore nel backup iniziale:', err);
  });

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
      eseguiBackup().catch(err => {
        console.error('[Backup] Errore nel backup pianificato:', err);
      });
      // Dopo il primo trigger, impostiamo l'intervallo a ogni 24 ore
      setInterval(() => {
        eseguiBackup().catch(err => {
          console.error('[Backup] Errore nel backup ricorrente:', err);
        });
      }, 24 * 60 * 60 * 1000);
    }, delay);
  };

  controllaOra();
}

module.exports = { eseguiBackup, pianificaBackup };
