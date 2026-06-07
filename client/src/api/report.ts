import api from './client';

export interface DashboardKPIs {
  totale_incasso_oggi: number;
  numero_ordini_oggi: number;
  scontrino_medio_oggi: number;
  ordini_attivi: number;
}

export interface AndamentoIncassi {
  giorno: string;
  incasso: number;
  ordini: number;
}

export interface ClassificaProdotto {
  prodotto_id: number;
  nome: string;
  quantita: number;
  incasso: number;
}

export interface FasciaOraria {
  ora: string;
  ordini: number;
  incasso: number;
}

export interface MarginiProfitto {
  ricavo_totale: number;
  costo_totale: number;
  profitto_lordo: number;
  margine_percentuale: number;
}

export interface ConfrontoSettimana {
  questa_settimana: {
    incasso: number;
    ordini: number;
    periodo: string;
  };
  scorsa_settimana: {
    incasso: number;
    ordini: number;
    periodo: string;
  };
  differenza_percentuale_incasso: number;
}

export const getDashboardKPIs = () =>
  api.get<DashboardKPIs>('/report/dashboard').then(r => r.data);

export const getAndamentoIncassi = (daData?: string, aData?: string) =>
  api.get<AndamentoIncassi[]>('/report/incassi', { params: { da_data: daData, a_data: aData } }).then(r => r.data);

export const getTopProdotti = (daData?: string, aData?: string) =>
  api.get<ClassificaProdotto[]>('/report/prodotti-top', { params: { da_data: daData, a_data: aData } }).then(r => r.data);

export const getFasceOrarie = () =>
  api.get<FasciaOraria[]>('/report/orari').then(r => r.data);

export const getMargini = (daData?: string, aData?: string) =>
  api.get<MarginiProfitto>('/report/margini', { params: { da_data: daData, a_data: aData } }).then(r => r.data);

export const getConfronto = () =>
  api.get<ConfrontoSettimana>('/report/confronto').then(r => r.data);
