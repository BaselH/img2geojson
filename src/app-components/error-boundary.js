import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error
    };
  }

  componentDidCatch(error) {
    if (typeof console !== 'undefined' && console.error) {
      console.error(error);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-error">
        <div className="app-error__card">
          <h1>img2geojson could not start</h1>
          <p>
            The page hit a runtime error before it finished loading. Reload once and
            check the browser console if it happens again.
          </p>
          <pre>{this.state.error.message || 'Unknown startup error'}</pre>
          <button onClick={this.handleReload} type="button">
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
