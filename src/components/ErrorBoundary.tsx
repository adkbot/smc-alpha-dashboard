import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary para capturar crashes do React e evitar tela preta
 * Protege toda a aplicação de crashes inesperados
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Atualiza o state para que a próxima renderização mostre a UI de fallback
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log do erro para debugging
        console.error('🛑 Error Boundary capturou um erro:', error);
        console.error('📊 Component Stack:', errorInfo.componentStack);

        this.setState({
            error,
            errorInfo
        });
    }

    private handleReset = () => {
        // Limpa o erro e tenta renderizar novamente
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    private handleGoHome = () => {
        // Limpa localStorage e vai para home
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            // UI customizada quando há erro
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <Card className="max-w-2xl w-full p-8 border-destructive">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-destructive" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-foreground mb-2">
                                    Oops! Algo deu errado
                                </h1>
                                <p className="text-muted-foreground">
                                    A aplicação encontrou um erro inesperado. Não se preocupe, seus dados estão seguros.
                                </p>
                            </div>

                            {/* Mostrar erro apenas em desenvolvimento */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="w-full bg-muted p-4 rounded-lg text-left">
                                    <p className="text-sm font-mono text-destructive mb-2">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <details className="text-xs text-muted-foreground">
                                            <summary className="cursor-pointer font-semibold mb-1">
                                                Stack trace
                                            </summary>
                                            <pre className="overflow-auto">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4 flex-wrap justify-center">
                                <Button
                                    onClick={this.handleReset}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Tentar Novamente
                                </Button>

                                <Button
                                    onClick={this.handleGoHome}
                                    variant="outline"
                                >
                                    <Home className="w-4 h-4 mr-2" />
                                    Voltar ao Início
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Se o problema persistir, tente limpar o cache do navegador ou entre em contato com o suporte.
                            </p>
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
