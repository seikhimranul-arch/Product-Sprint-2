import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App render error", { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-on-surface flex items-center justify-center px-6">
          <div className="max-w-md text-center bg-surface-container/30 border border-white/10 rounded-xl p-8">
            <h1 className="text-headline-md mb-3">Something went wrong</h1>
            <p className="text-body-sm text-on-surface-variant mb-6">
              FintLer hit an unexpected error. Refresh the app to try again.
            </p>
            <button
              className="bg-primary text-on-primary px-5 py-2.5 rounded-lg text-body-sm"
              onClick={() => window.location.reload()}
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
