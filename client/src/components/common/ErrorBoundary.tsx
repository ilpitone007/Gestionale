import React, { Component, ErrorInfo, ReactNode } from 'react';
import axios from 'axios';
import { AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Logga l'errore al server in modalità fire-and-forget
    try {
      axios.post('/api/logs', {
        messaggio: error.message || 'Crash di rendering React',
        stack: `${error.stack || ''}\n\n[Component Stack]:\n${errorInfo.componentStack || ''}`,
        tipo: 'REACT_CRASH',
        url: window.location.pathname + window.location.search,
        metodo: 'RENDER'
      }).catch(err => {
        console.error('Impossibile inviare il log di errore al server:', err);
      });
    } catch (e) {
      console.error('Errore durante la chiamata di logging:', e);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (window.confirm('Sei sicuro di voler pulire la sessione? Verrai disconnesso e la cache locale verrà svuotata.')) {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-2xl border border-gray-200 shadow-xl p-8 flex flex-col items-center text-center">
            {/* Warning Icon Container with subtle animation */}
            <div className="w-16 h-16 bg-[#DC2626]/10 rounded-full flex items-center justify-center text-[#DC2626] mb-6 animate-pulse">
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-2xl font-bold text-[#0B1F3A] mb-2">
              Si è verificato un errore inatteso
            </h1>
            
            <p className="text-sm text-[#6B7280] mb-8 max-w-md">
              SliceMaster POS ha riscontrato un problema durante la visualizzazione di questa schermata. L'errore è stato registrato automaticamente nel log di sistema.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full mb-8 justify-center">
              <button
                onClick={this.handleReload}
                className="bg-[#C8102E] text-white font-semibold px-5 py-3 rounded-xl hover:bg-[#a50d25] active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <RefreshCw size={16} />
                Ricarica pagina
              </button>
              
              <button
                onClick={this.handleReset}
                className="bg-white text-[#0B1F3A] font-semibold px-5 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 text-sm"
              >
                <Trash2 size={16} className="text-gray-500" />
                Ripristina sessione
              </button>
            </div>

            {/* Expandable Technical Details */}
            <div className="w-full text-left border-t border-gray-100 pt-6">
              <button
                onClick={this.toggleDetails}
                className="flex items-center justify-between w-full text-xs font-semibold text-[#6B7280] hover:text-[#0B1F3A] uppercase tracking-wider transition-colors focus:outline-none"
              >
                <span>Dettagli tecnici dell'errore</span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {this.state.showDetails && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-x-auto max-h-60 text-left">
                  <p className="text-xs font-bold text-[#DC2626] mb-2 font-mono">
                    {this.state.error?.name}: {this.state.error?.message}
                  </p>
                  <pre className="text-[10px] font-mono text-gray-600 whitespace-pre leading-relaxed">
                    {this.state.error?.stack || 'Nessuno stack trace disponibile'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
