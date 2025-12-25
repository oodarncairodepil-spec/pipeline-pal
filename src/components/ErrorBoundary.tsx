import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center p-6">
          <div className="max-w-md w-full border rounded-lg p-4 bg-card text-card-foreground">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-2">{this.state.error?.message || 'Unexpected error occurred.'}</p>
            <div className="flex justify-end mt-4">
              <button
                className="inline-flex items-center gap-2 h-9 rounded-md px-3 text-sm bg-primary text-primary-foreground"
                onClick={() => { this.setState({ hasError: false, error: undefined }); location.reload(); }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

