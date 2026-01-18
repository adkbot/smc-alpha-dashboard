import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, TrendingUp, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-block">
            <div className="flex items-center gap-2 justify-center mb-4">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
              <h1 className="text-5xl font-bold tracking-wider">
                <span className="text-foreground">SMC</span>
                <span className="text-primary ml-2">PRO</span>
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-accent rounded-full bg-accent/10">
              <span className="text-accent text-sm font-bold">AI POWERED</span>
              <span className="text-xs text-muted-foreground">by Gemini</span>
            </div>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma profissional de análise SMC com inteligência artificial
            para trading de Cripto e Forex
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 my-12">
          <div className="p-6 rounded-lg bg-card border border-border hover:border-primary transition-colors">
            <BarChart3 className="w-12 h-12 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-bold mb-2">Análise SMC Avançada</h3>
            <p className="text-sm text-muted-foreground">
              Estrutura de mercado, BOS, CHOCH e zonas de liquidez em tempo real
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border border-border hover:border-success transition-colors">
            <TrendingUp className="w-12 h-12 text-success mb-4 mx-auto" />
            <h3 className="text-lg font-bold mb-2">Gerenciamento de Risco</h3>
            <p className="text-sm text-muted-foreground">
              Calculadora R:R, relatórios de Win/Loss e sincronização de contas
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border border-border hover:border-accent transition-colors">
            <Shield className="w-12 h-12 text-accent mb-4 mx-auto" />
            <h3 className="text-lg font-bold mb-2">AI Copilot</h3>
            <p className="text-sm text-muted-foreground">
              Análise de viés e recomendações contextuais por IA
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6"
          onClick={() => navigate("/auth")}
        >
          Acessar Plataforma
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>

        <p className="text-xs text-muted-foreground mt-8">
          Suporta Binance, Forex e outras corretoras via API
        </p>
      </div>
    </div>
  );
};

export default Index;
