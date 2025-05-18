import React, { lazy, Suspense } from "react";

// Error boundary component for handling lazy loading failures
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Lazy loading failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-700">
            Error loading component
          </h2>
          <p className="text-red-600">
            {this.state.error?.message || "Unknown error"}
          </p>
          <button
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Creates a lazy-loaded component with a loading fallback and error boundary
 * @param {Function} importFn - Dynamic import function (e.g., () => import('./Component'))
 * @param {Object} options - Additional options
 * @param {React.ReactNode} options.fallback - Custom loading component
 * @returns {React.LazyExoticComponent} - Lazy-loaded component wrapped in Suspense and ErrorBoundary
 */
export const lazyLoad = (importFn, options = {}) => {
  const LazyComponent = lazy(importFn);
  const fallback = options.fallback || (
    <div className="p-4 flex justify-center items-center">Loading...</div>
  );

  return (props) => (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};
