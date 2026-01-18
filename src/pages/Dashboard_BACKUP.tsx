import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/auth');
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin w-12 h- 12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-lg text-muted-foreground">Carregando dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
            <div className="text-center max-w-md">
                <h1 className="text-3xl font-bold mb-4">Dashboard Temporário</h1>
                <p className="text-muted-foreground mb-6">
                    Estamos finalizando as correções. O dashboard completo estará disponível em breve.
                </p>
                <p className="text-sm text-muted-foreground">
                    Usuário: {user?.email}
                </p>
                <button
                    onClick={() => navigate('/auth')}
                    className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Voltar para Login
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
