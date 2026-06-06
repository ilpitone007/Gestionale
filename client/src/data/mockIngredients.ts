import type { Ingrediente } from '@/types';

export const mockIngredienti: Ingrediente[] = [
  { id: 1, codice: 'ING-001', nome: 'Mozzarella fior di latte', categoria: 'Base', quantita: 4.5, unita: 'kg', sogliMinima: 2, costoUnitario: 8.00, prezzoExtra: 1.00, disponibile: true, ultimaModifica: 'Oggi' },
  { id: 2, codice: 'ING-002', nome: 'Mozzarella di bufala', categoria: 'Speciale', quantita: 1.2, unita: 'kg', sogliMinima: 1, costoUnitario: 12.00, prezzoExtra: 2.50, disponibile: true, ultimaModifica: 'Oggi' },
  { id: 3, codice: 'ING-003', nome: 'Funghi champignon', categoria: 'Topping', quantita: 0.0, unita: 'kg', sogliMinima: 1, costoUnitario: 6.00, prezzoExtra: 1.00, disponibile: false, ultimaModifica: '2 giorni fa' },
  { id: 4, codice: 'ING-004', nome: 'Salame piccante', categoria: 'Topping', quantita: 2.0, unita: 'kg', sogliMinima: 1, costoUnitario: 9.00, prezzoExtra: 1.50, disponibile: true, ultimaModifica: 'Ieri' },
  { id: 5, codice: 'ING-005', nome: 'Acciughe', categoria: 'Topping', quantita: 0.8, unita: 'kg', sogliMinima: 0.5, costoUnitario: 10.00, prezzoExtra: 2.00, disponibile: true, ultimaModifica: '4 giorni fa' },
  { id: 6, codice: 'ING-006', nome: 'Mascarpone', categoria: 'Dolci', quantita: 0.6, unita: 'kg', sogliMinima: 1, costoUnitario: 7.00, prezzoExtra: 0.80, disponibile: true, ultimaModifica: 'Oggi' },
  { id: 7, codice: 'ING-007', nome: 'Pomodoro San Marzano', categoria: 'Base', quantita: 8.0, unita: 'kg', sogliMinima: 3, costoUnitario: 4.50, prezzoExtra: 0.50, disponibile: true, ultimaModifica: 'Oggi' },
  { id: 8, codice: 'ING-008', nome: 'Basilico fresco', categoria: 'Base', quantita: 0.3, unita: 'kg', sogliMinima: 0.2, costoUnitario: 15.00, prezzoExtra: 0.00, disponibile: true, ultimaModifica: 'Oggi' },
];
