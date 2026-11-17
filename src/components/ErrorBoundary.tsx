import React from 'react';
import { ShieldIcon } from './SportIcons';

interface ErrorBoundaryProps {
  children?: any;
  onResetSave?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg =
      error instanceof Error
        ? error.message
        : 'Une erreur d’affichage inattendue est survenue.';
    return {
      hasError: true,
      errorMessage: msg
    };
  }

  componentDidCatch(error: unknown) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[VeloLegends ErrorBoundary]', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-lg w-full rounded-3xl bg-slate-900 border-2 border-rose-500/60 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-rose-400">
              <ShieldIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-white">
              Incident Technique Détecté
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Le module d’interface a rencontré une exception. Votre progression est protégée dans votre navigateur.
            </p>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] font-mono text-rose-300">
              {this.state.errorMessage}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition"
              >
                Recharger la vue
              </button>
              {this.props.onResetSave && (
                <button
                  type="button"
                  onClick={() => {
                    this.props.onResetSave?.();
                    this.setState({ hasError: false, errorMessage: '' });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                >
                  Réinitialiser les données locales
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
