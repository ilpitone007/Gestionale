import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, formatDate } from '@/utils';
import type { OrdineAPI } from '@/api/ordini';
import './print.css';

interface PrintPreviewProps {
  ordine: OrdineAPI;
  onClose: () => void;
}

export default function PrintPreview({ ordine, onClose }: PrintPreviewProps) {
  const { settings } = useSettings();
  const receiptRef = useRef<HTMLDivElement>(null);

  const subtotale = (ordine.righe ?? []).reduce(
    (acc, r) => acc + (r.prezzo_unitario ?? r.prodotto?.prezzo ?? 0) * r.quantita,
    0
  );
  const sconto = ordine.sconto ?? 0;
  const totale = ordine.totale ?? subtotale - sconto;

  const handlePrint = () => {
    const printContents = receiptRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scontrino ${ordine.numero_ordine}</title>
          <style>
            body { margin: 0; padding: 12px; font-family: 'Courier New', monospace; font-size: 12px; color: #111; }
            .receipt-header { text-align: center; margin-bottom: 8px; }
            .receipt-divider { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
            .receipt-row { display: flex; justify-content: space-between; gap: 8px; }
            .receipt-row .left { flex: 1; }
            .receipt-row .right { white-space: nowrap; font-weight: bold; }
            .receipt-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; padding-top: 4px; }
            .receipt-footer { text-align: center; margin-top: 8px; font-size: 10px; color: #555; }
            img { max-width: 80px; margin-bottom: 4px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContents}
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-elevated w-full max-w-sm flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-text-primary flex items-center gap-2">
            <Printer size={18} /> Anteprima scontrino
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        {/* Receipt preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-bg">
          <div ref={receiptRef} className="receipt" style={{ padding: '4px', backgroundColor: '#fff', color: '#000' }}>
            {/* Intestazione */}
            <div className="receipt-header">
              {settings.logo && (
                <img src={settings.logo} alt="logo" style={{ maxWidth: 80, marginBottom: 4 }} />
              )}
              <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>{settings.nomePizzeria}</div>
              <div style={{ fontSize: '10px', margin: '2px 0 4px', fontWeight: 'bold', color: '#d00' }}>
                *** DOCUMENTO NON VALIDO AI FINI FISCALI ***
              </div>
              <div style={{ fontSize: '10px', color: '#444' }}>
                {[
                  settings.indirizzo,
                  settings.telefono ? `Tel: ${settings.telefono}` : null,
                  settings.piva ? `P.IVA: ${settings.piva}` : null
                ].filter(Boolean).join(' - ')}
              </div>
            </div>

            <hr className="receipt-divider" />

            {/* Dati ordine ed info cliente */}
            <div className="receipt-row" style={{ fontSize: '11px' }}>
              <span className="left" style={{ fontWeight: 'bold' }}>Ordine #{ordine.numero_ordine} ({ordine.canale})</span>
              <span className="right" style={{ fontSize: '10px' }}>{formatDate(ordine.creato_il)}</span>
            </div>

            <div className="receipt-row" style={{ fontSize: '11px', marginTop: '2px' }}>
              <span className="left">
                {ordine.cliente
                  ? `Cliente: ${ordine.cliente.nome} ${ordine.cliente.cognome}`
                  : ordine.nome_banco
                    ? `cliente banco: ${ordine.nome_banco}`
                    : 'cliente banco'
                }
              </span>
              <span className="right" style={{ fontStyle: 'italic' }}>
                {ordine.cliente?.telefono || ordine.telefono_banco || ''}
              </span>
            </div>

            <hr className="receipt-divider" />

            {/* Righe articoli */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(ordine.righe ?? []).map((r, i) => {
                const prezzoUnit = r.prezzo_unitario ?? r.prodotto?.prezzo ?? 0;
                const rigaTotale = prezzoUnit * r.quantita;
                return (
                  <div key={i} style={{ fontSize: '11px' }}>
                    <div className="receipt-row">
                      <span className="left">
                        {r.quantita}x {r.prodotto?.nome ?? `Prodotto #${r.prodotto_id}`}
                      </span>
                      <span className="right">{formatCurrency(rigaTotale)}</span>
                    </div>
                    {r.nota && (
                      <div style={{ color: '#555', paddingLeft: '14px', fontSize: '9px', fontStyle: 'italic' }}>
                        * {r.nota}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <hr className="receipt-divider" />

            {/* Totali e Pagamento */}
            {sconto > 0 && (
              <>
                <div className="receipt-row" style={{ fontSize: '11px' }}>
                  <span className="left">Subtotale</span>
                  <span className="right">{formatCurrency(subtotale)}</span>
                </div>
                <div className="receipt-row" style={{ fontSize: '11px', color: '#222' }}>
                  <span className="left">Sconto</span>
                  <span className="right">-{formatCurrency(sconto)}</span>
                </div>
              </>
            )}

            <div className="receipt-total" style={{ fontSize: '14px', fontWeight: 'bold', borderTop: sconto > 0 ? '1px dashed #ddd' : 'none', paddingTop: '2px' }}>
              <span>TOTALE</span>
              <span>{formatCurrency(totale)}</span>
            </div>

            <div className="receipt-row" style={{ marginTop: '4px', fontSize: '11px' }}>
              <span className="left">Metodo di Pagamento:</span>
              <span className="right" style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{ordine.metodo_pagamento}</span>
            </div>

            {ordine.nota && (
              <>
                <hr className="receipt-divider" />
                <div style={{ fontSize: '10px', fontStyle: 'italic' }}>Nota: {ordine.nota}</div>
              </>
            )}

            <hr className="receipt-divider" />
            <div className="receipt-footer" style={{ fontSize: '10px' }}>
              <div>{settings.footerScontrino}</div>
              <div style={{ fontSize: '9px', color: '#777', marginTop: '4px', fontWeight: 'bold' }}>
                DOCUMENTO SENZA VALENZA FISCALE
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Chiudi
          </button>
          <button onClick={handlePrint} className="btn-primary flex-1 justify-center">
            <Printer size={14} /> Stampa
          </button>
        </div>
      </div>
    </div>
  );
}
