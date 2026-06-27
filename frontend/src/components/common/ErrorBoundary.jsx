import { Component } from 'react';

/**
 * Catches render-time errors in the subtree so a single broken component
 * (e.g. a chart) no longer white-screens the entire app. Shows the error
 * details inline instead of unmounting the whole React tree.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Surface full details in the console for debugging
        console.error('[ErrorBoundary] Caught render error:', error, info);
        this.setState({ info });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, info: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '24px',
                    margin: '24px',
                    border: '1px solid var(--danger-500, #dc2626)',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary, #fff)',
                    color: 'var(--text-primary, #111827)',
                    fontFamily: 'monospace',
                    maxWidth: '900px',
                }}>
                    <h2 style={{ color: '#dc2626', marginTop: 0 }}>Something went wrong on this page</h2>
                    <p style={{ fontWeight: 700 }}>{this.state.error?.message || String(this.state.error)}</p>
                    <pre style={{
                        whiteSpace: 'pre-wrap',
                        fontSize: 12,
                        background: 'rgba(0,0,0,0.05)',
                        padding: 12,
                        borderRadius: 8,
                        maxHeight: 360,
                        overflow: 'auto',
                    }}>
                        {this.state.error?.stack}
                        {this.state.info?.componentStack}
                    </pre>
                    <button
                        onClick={this.handleReset}
                        style={{
                            marginTop: 12,
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: 8,
                            background: '#3355dd',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
