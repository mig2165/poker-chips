import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
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
        <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-red-950 text-red-50">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <pre className="text-xs bg-red-900/50 p-4 rounded-xl overflow-auto max-w-full">
            {this.state.error?.message}
          </pre>
          <button 
            className="mt-6 px-4 py-2 bg-red-800 rounded-lg font-bold"
            onClick={() => window.location.href = '/'}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
