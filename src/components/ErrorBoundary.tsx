import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A freshly deployed build invalidates the hashed chunk filenames of any
 * previously loaded SPA tab. When the user navigates to a lazy route after
 * the deploy, the dynamic import() fails with "Failed to fetch dynamically
 * imported module". Treat this as a signal that the tab is stale and
 * hard-reload — picks up the fresh index + chunks, no user action needed.
 */
const isStaleChunkError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk \S+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
};

// Guard against reload loops: only auto-reload once per tab life.
const STALE_RELOAD_KEY = "fiatex:stale-chunk-reloaded";

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);

    // Stale-chunk: reload once (guarded) to pick up the new bundle.
    if (isStaleChunkError(error) && typeof window !== "undefined") {
      try {
        if (!window.sessionStorage.getItem(STALE_RELOAD_KEY)) {
          window.sessionStorage.setItem(STALE_RELOAD_KEY, "1");
          window.location.reload();
        }
      } catch {
        // sessionStorage can throw in privacy mode — fall through to UI
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Что-то пошло не так</h1>
              <p className="text-muted-foreground">
                Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-xs text-left bg-secondary/50 rounded-lg p-4 overflow-auto max-h-32 text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <Button variant="gradient" onClick={this.handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
