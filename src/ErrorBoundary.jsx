import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // Es deixa per logging extern si cal.
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary">
        <div className="error-card">
          <h2>Ups… alguna cosa ha petat.</h2>
          <p>Torna-ho a provar i recuperem la partida.</p>
          {import.meta.env.DEV && this.state.error ? (
            <pre>{this.state.error.message}</pre>
          ) : null}
          <button type="button" onClick={this.handleReload}>
            Recarrega
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
