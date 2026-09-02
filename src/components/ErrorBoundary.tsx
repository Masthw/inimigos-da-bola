import { Component, type ReactNode } from 'react';
import { Button } from './ui/Button';
import { MaterialIcon } from './ui/MaterialIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: { componentStack: string }) {
    console.error('Unhandled error:', _error, _errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
          <div className="max-w-md w-full text-center">
            <MaterialIcon name="error" className="w-16 h-16 text-error mx-auto mb-4" />
            <h1 className="text-headline-lg font-display font-black text-on-surface tracking-tighter mb-2">
              ALGO DEU ERRADO
            </h1>
            <p className="text-body-md text-on-surface-variant mb-6">
              Ocorreu um erro inesperado. Volte para a página inicial e tente novamente.
            </p>
            <div className="flex flex-col gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => window.location.assign("/")}
                icon={<MaterialIcon name="home" />}
              >
                VOLTAR PARA HOME
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
