import React, { ReactNode, Suspense } from "react";

interface SuspenseProps {
  children?: ReactNode;

  /** A fallback react tree to show when a Suspense child (like React.lazy) suspends */
  fallback: NonNullable<ReactNode> | null;
  /**
   * Tells React whether to “skip” revealing this boundary during the initial load.
   * This API will likely be removed in a future release.
   */
  // NOTE: this is unflagged and is respected even in stable builds
  unstable_avoidThisFallback?: boolean;
}

class PSuspenseErrorBoundary extends React.Component {
  state: { hasError: boolean };

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (error instanceof Error) {
      console.error(error, errorInfo);
    }
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <div/>;
    }

    return this.props.children;
  }
}

export const PSuspense: React.FC<SuspenseProps> = ({ children, fallback, unstable_avoidThisFallback }) => {
  const onServer: boolean = typeof window === "undefined";

  if (onServer) {
    return <PSuspenseErrorBoundary>{children}</PSuspenseErrorBoundary>;
  }

  return (
    <Suspense fallback={fallback} unstable_avoidThisFallback={unstable_avoidThisFallback}>
      {children}
    </Suspense>
  );
};
