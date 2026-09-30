import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Algo ha salido mal</h1>
          <p className="text-muted-foreground max-w-md mb-8">
            {this.state.error?.message || "Ha ocurrido un error inesperado en la aplicaci\u00f3n. Por favor, recarga la p\u00e1gina."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>Recargar la aplicaci\u00f3n</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
