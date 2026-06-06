function permettiRuoli(...ruoliAmmessi) {
  return (req, res, next) => {
    if (!req.utente) {
      return res.status(401).json({ errore: 'Utente non autenticato.' });
    }

    const { ruolo } = req.utente;

    // Se l'utente ha il ruolo di titolare ha sempre accesso (super-user)
    if (ruolo === 'titolare') {
      return next();
    }

    // Altrimenti controlliamo se il suo ruolo è nella lista di quelli ammessi
    if (ruoliAmmessi.includes(ruolo)) {
      return next();
    }

    return res.status(403).json({ errore: 'Accesso negato. Permessi insufficienti.' });
  };
}

module.exports = permettiRuoli;
