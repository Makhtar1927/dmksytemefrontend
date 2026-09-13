import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary a intercepté une erreur critique:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Une interruption temporaire est survenue</h2>
              <p className="text-sm text-slate-400">
                L'application a évité un écran blanc. Cliquez sur le bouton ci-dessous pour relancer l'affichage en toute sécurité.
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              <RefreshCw size={18} className="animate-spin-hover" />
              Recharger l'affichage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
