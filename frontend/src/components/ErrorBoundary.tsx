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
    error: null,
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
        <main className="auth-stage">
          <section className="auth-paper paper-panel landing-tape text-center" role="alert">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Algo ha salido mal</h1>
            <p className="text-muted-foreground max-w-md mb-8">
              Ha ocurrido un error inesperado. Recarga la aplicación para volver a intentarlo.
            </p>
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              <RefreshCcw className="w-5 h-5" />
              <span>Recargar la aplicaci\u00f3n</span>
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
